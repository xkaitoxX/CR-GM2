// "What to do today": a plan built by rules (free, instant), and an optional short note from the manager (AI).
import type Anthropic from "@anthropic-ai/sdk";
import { BUSINESS_CONTEXT, modelParams } from "@/lib/ai/config";
import type { inboxOverview } from "@/lib/ai/tools/inbox-tools";
import { formatDay } from "@/lib/business/dates";
import type { DashboardSummary } from "@/lib/business/summary";
import type { UpcomingSeason } from "@/lib/seasons";

export interface TodayItem {
  tone: "critical" | "warning" | "good" | "info";
  text: string;
  link?: string;
}

export type InboxOverview = Awaited<ReturnType<typeof inboxOverview>>;

/** Tickets with this few hours left go to the top. */
export const URGENT_HOURS = 6;
/** Seasons within this many days get a reminder. */
export const SEASON_REMINDER_DAYS = 60;
export const MAX_ITEMS = 6;

export function rulesSummary(
  summary: DashboardSummary,
  overview: InboxOverview | null,
  seasons: UpcomingSeason[],
  today: string,
): TodayItem[] {
  const items: TodayItem[] = [];

  if (overview) {
    const urgent = overview.openTickets.filter((t) => t.hoursLeftToReply <= URGENT_HOURS);
    for (const t of urgent) {
      items.push({
        tone: "critical",
        text:
          t.hoursLeftToReply < 0
            ? `Reply now: ${t.title} (overdue)`
            : `Reply to ${t.title}: ${Math.max(1, t.hoursLeftToReply)} h left`,
        link: t.link,
      });
    }
    const others = overview.openTickets.length - urgent.length;
    if (others > 0) items.push({ tone: "warning", text: `${others} more ticket${others === 1 ? "" : "s"} waiting for you`, link: "/tickets" });
    if (overview.repliesWaitingToBeSent > 0) {
      const n = overview.repliesWaitingToBeSent;
      items.push({ tone: "warning", text: `${n} customer repl${n === 1 ? "y is" : "ies are"} ready to send`, link: "/inbox" });
    }
  }

  for (const insight of summary.insights.filter((i) => i.severity === "critical" || i.severity === "warning")) {
    items.push({ tone: insight.severity === "critical" ? "critical" : "warning", text: insight.title, link: "/dashboard" });
  }

  for (const s of seasons.filter((s) => s.daysAway <= SEASON_REMINDER_DAYS && s.stockAtAmazonBy >= today)) {
    items.push({
      tone: "info",
      text: `${s.name} in ${s.daysAway} days: get stock to Amazon by ${formatDay(s.stockAtAmazonBy)}`,
    });
  }

  const good = summary.insights.find((i) => i.severity === "good");
  if (good) items.push({ tone: "good", text: good.title, link: "/dashboard" });

  if (items.length === 0) items.push({ tone: "good", text: "All clear today. Nothing needs you." });
  // Critical first, then the rest in the order added.
  const order: TodayItem["tone"][] = ["critical", "warning", "info", "good"];
  return items.sort((a, b) => order.indexOf(a.tone) - order.indexOf(b.tone)).slice(0, MAX_ITEMS);
}

/** One short note from the manager on top of the rules list. */
export async function aiMorningNote(
  client: Anthropic,
  input: { today: string; items: TodayItem[]; isExampleData: boolean; profitLast7Days: number; profitPrevious7Days: number },
): Promise<string> {
  const response = await client.beta.messages.create({
    ...modelParams("low"),
    max_tokens: 4000,
    system: `You are the manager of the owner's Amazon UK reselling assistant. Write a warm, short morning note (2-3 sentences, no lists) that tells the owner the single most important thing to do today and one piece of encouragement. Plain, simple English.${input.isExampleData ? " The sales numbers are example data, so don't present them as real." : ""}\n\n${BUSINESS_CONTEXT}`,
    messages: [{ role: "user", content: JSON.stringify(input) }],
  });
  if (response.stop_reason === "refusal") return "";
  return response.content
    .flatMap((b) => (b.type === "text" ? [b.text] : []))
    .join("")
    .trim();
}
