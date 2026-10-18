// Shapes shared by the chat API route and the chat page.

export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
}

/** One line of the chat API's streamed (newline-delimited JSON) response. */
export type ChatEvent =
  | { type: "status"; text: string }
  | { type: "reply"; text: string }
  | { type: "error"; text: string };

export const PASSWORD_HEADER = "x-app-password";
