import Anthropic from "@anthropic-ai/sdk";
import { denied } from "@/lib/api";
import { aiMorningNote, rulesSummary } from "@/lib/ai/morning";
import { inboxOverview } from "@/lib/ai/tools/inbox-tools";
import { toDay } from "@/lib/business/dates";
import { getBusinessData } from "@/lib/business/example-data";
import { summarise } from "@/lib/business/summary";
import { upcomingSeasons } from "@/lib/seasons";
import { getStore } from "@/lib/store/store";

/** The manager's note is written once a day per server, so it costs at most a few pence. */
const notes = globalThis as unknown as { __morningNote?: { day: string; text: string } };

export async function GET(request: Request) {
  const blocked = denied(request);
  if (blocked) return blocked;

  const today = toDay(new Date());
  const data = getBusinessData();
  const month = summarise(data, 30);
  const week = summarise(data, 7);
  const overview = await inboxOverview(getStore());
  const items = rulesSummary(month, overview, upcomingSeasons(today), today);

  let note = notes.__morningNote?.day === today ? notes.__morningNote.text : null;
  if (note === null && process.env.ANTHROPIC_API_KEY) {
    try {
      note = await aiMorningNote(new Anthropic(), {
        today,
        items,
        isExampleData: data.isExample,
        profitLast7Days: Math.round(week.totals.profit),
        profitPrevious7Days: Math.round(week.previous.profit),
      });
      notes.__morningNote = { day: today, text: note };
    } catch (error) {
      console.error(error);
    }
  }
  return Response.json({ today, items, note: note || null });
}
