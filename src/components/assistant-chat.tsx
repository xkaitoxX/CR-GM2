"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PASSWORD_HEADER, type ChatEvent, type ChatTurn } from "@/lib/chat";

const PASSWORD_KEY = "seller-assistant-password";

const SUGGESTIONS = [
  "Find me 3 items I could buy for under £10 and resell on Amazon UK",
  "Is this a good deal? Joseph Joseph garlic press, £6 in the shop",
  "What products are trending in the UK right now that I could resell?",
];

type Notice = { kind: "password" } | { kind: "not_configured" } | { kind: "error"; text: string } | null;

function readPassword() {
  try {
    return localStorage.getItem(PASSWORD_KEY) ?? "";
  } catch {
    return "";
  }
}

function savePassword(password: string) {
  try {
    localStorage.setItem(PASSWORD_KEY, password);
  } catch {
    // Private browsing: the password lasts until the page is closed.
  }
}

export default function AssistantChat() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [draft, setDraft] = useState("");
  const password = useRef("");
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    password.current = readPassword();
  }, []);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, statuses, notice]);

  async function ask(conversation: ChatTurn[]) {
    setPending(true);
    setStatuses([]);
    setNotice(null);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", [PASSWORD_HEADER]: password.current },
        body: JSON.stringify({ messages: conversation }),
      });
      if (response.status === 401) return setNotice({ kind: "password" });
      if (response.status === 503) return setNotice({ kind: "not_configured" });
      if (!response.ok || !response.body) {
        return setNotice({ kind: "error", text: "The assistant couldn't answer. Please try again." });
      }

      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffered = "";
      let answered = false;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffered += value;
        const lines = buffered.split("\n");
        buffered = lines.pop() ?? "";
        for (const line of lines.filter(Boolean)) {
          const event = JSON.parse(line) as ChatEvent;
          if (event.type === "status") setStatuses((s) => [...s, event.text]);
          if (event.type === "reply") {
            answered = true;
            setTurns((t) => [...t, { role: "assistant", text: event.text }]);
          }
          if (event.type === "error") {
            answered = true;
            setNotice({ kind: "error", text: event.text });
          }
        }
      }
      if (!answered) setNotice({ kind: "error", text: "The connection dropped before the answer arrived. Please try again." });
    } catch {
      setNotice({ kind: "error", text: "Couldn't reach the assistant. Check your internet connection and try again." });
    } finally {
      setPending(false);
    }
  }

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    const conversation: ChatTurn[] = [...turns, { role: "user", text: trimmed }];
    setTurns(conversation);
    setDraft("");
    void ask(conversation.slice(-40));
  }

  const retry = () => void ask(turns.slice(-40));

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-4 pb-4">
        {turns.length === 0 && (
          <div className="rounded-2xl bg-white p-5 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
            <h2 className="font-semibold">Hi! I&apos;m your manager.</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Tell me a product to check, or ask me to find deals or trends. My Deals and Trends helper does the
              research, and I give you the answer with the profit worked out. I never buy or send anything for you.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-xl px-3 py-2 text-left text-sm ring-1 ring-zinc-200 hover:bg-zinc-50 dark:ring-zinc-700 dark:hover:bg-zinc-800"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((turn, i) =>
          turn.role === "user" ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900">
                {turn.text}
              </p>
            </div>
          ) : (
            <div
              key={i}
              className="markdown max-w-full overflow-x-auto rounded-2xl bg-white px-4 py-3 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800"
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{ a: (props) => <a {...props} target="_blank" rel="noopener noreferrer" /> }}
              >
                {turn.text}
              </ReactMarkdown>
            </div>
          ),
        )}

        {pending && (
          <div className="rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800" aria-live="polite">
            <p className="font-medium">
              <span className="mr-2 inline-block size-2 animate-pulse rounded-full bg-emerald-500" />
              Working on it… research can take a minute or two.
            </p>
            {statuses.length > 0 && (
              <ul className="mt-2 space-y-1 text-zinc-600 dark:text-zinc-400">
                {statuses.slice(-6).map((s, i) => (
                  <li key={i}>• {s}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {notice?.kind === "password" && (
          <PasswordForm
            onSave={(value) => {
              password.current = value;
              savePassword(value);
              retry();
            }}
          />
        )}
        {notice?.kind === "not_configured" && (
          <NoticeBox>
            The AI isn&apos;t switched on yet. Add your Anthropic API key as <code>ANTHROPIC_API_KEY</code> in the
            website&apos;s settings (see the README), then try again.
          </NoticeBox>
        )}
        {notice?.kind === "error" && (
          <NoticeBox>
            {notice.text}{" "}
            <button type="button" onClick={retry} className="font-medium underline">
              Try again
            </button>
          </NoticeBox>
        )}
        <div ref={bottom} />
      </div>

      <form
        className="sticky bottom-0 -mx-4 border-t border-zinc-200 bg-zinc-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 dark:border-zinc-800 dark:bg-black/95"
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
      >
        <div className="flex items-end gap-2">
          <label htmlFor="chat-input" className="sr-only">
            Message
          </label>
          <textarea
            id="chat-input"
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(draft);
              }
            }}
            placeholder="Ask about a product or deal…"
            className="max-h-40 min-h-11 flex-1 resize-none rounded-xl bg-white px-3 py-2.5 ring-1 ring-zinc-300 outline-none focus:ring-2 focus:ring-zinc-900 dark:bg-zinc-900 dark:ring-zinc-700 dark:focus:ring-zinc-100"
          />
          <button
            type="submit"
            disabled={pending || !draft.trim()}
            className="h-11 rounded-xl bg-zinc-900 px-4 font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

function NoticeBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-100">
      {children}
    </div>
  );
}

function PasswordForm({ onSave }: { onSave: (password: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <form
      className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-600/20 dark:bg-amber-950 dark:text-amber-100"
      onSubmit={(e) => {
        e.preventDefault();
        if (value) onSave(value);
      }}
    >
      <label htmlFor="app-password" className="block font-medium">
        Enter the website password to use the assistant
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="app-password"
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="min-w-0 flex-1 rounded-lg bg-white px-3 py-2 text-zinc-900 ring-1 ring-amber-600/30 outline-none"
        />
        <button type="submit" className="rounded-lg bg-amber-900 px-3 py-2 font-medium text-white">
          Unlock
        </button>
      </div>
    </form>
  );
}
