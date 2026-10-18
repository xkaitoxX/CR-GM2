// "5 h left to reply" / "Overdue by 2 h" for the 24-hour reply deadline.

export interface TimeLeft {
  text: string;
  overdue: boolean;
  /** Less than 4 hours left, or overdue. */
  urgent: boolean;
}

export function timeLeft(deadline: string, now = Date.now()): TimeLeft {
  const ms = Date.parse(deadline) - now;
  const hours = Math.abs(ms) / 3_600_000;
  const amount = hours < 1 ? `${Math.max(1, Math.round(hours * 60))} min` : `${Math.round(hours)} h`;
  return ms < 0
    ? { text: `Overdue by ${amount}`, overdue: true, urgent: true }
    : { text: `${amount} left to reply`, overdue: false, urgent: hours < 4 };
}

const dateTime = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** e.g. "18 Oct, 09:30" in the viewer's own time zone. */
export const formatWhen = (iso: string) => dateTime.format(new Date(iso));
