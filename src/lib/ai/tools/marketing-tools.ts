import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { money, pct } from "@/lib/ai/tools/profit-tool";
import { suggestAdBudget } from "@/lib/ads";
import { planBasket, restockBasket, type Basket } from "@/lib/basket";
import { toDay } from "@/lib/business/dates";
import { getBusinessData } from "@/lib/business/example-data";
import { summarise } from "@/lib/business/summary";
import { checkListing } from "@/lib/listing";
import { upcomingSeasons } from "@/lib/seasons";

const roundBasket = (b: Basket) => ({
  budget: money(b.budget),
  spend: money(b.spend),
  leftover: money(b.leftover),
  expectedProfit: money(b.expectedProfit),
  returnOnMoneyPercent: pct(b.roiPercent),
  lines: b.lines.map((l) => ({
    name: l.name,
    quantity: l.quantity,
    costPerItem: money(l.unitCost),
    spend: money(l.spend),
    profitPerItem: money(l.profitPerItem),
    expectedProfit: money(l.expectedProfit),
    returnOnMoneyPercent: pct(l.roiPercent),
    daysToSell: Number.isFinite(l.daysToSell) ? l.daysToSell : null,
  })),
  skipped: b.skipped,
});

export const planBasketTool = betaZodTool({
  name: "plan_basket",
  description:
    "Choose what to buy with a budget from candidate items. mode 'test' buys 5-10 of each of several items to learn what sells " +
    "(best for a new seller or untested items); mode 'scale' buys more of proven items, with no item over 40% of the budget and " +
    "nothing beyond about 45 days of sales. Returns the basket, expected profit and skipped items with reasons. " +
    "Always use this to build a basket; never pick quantities yourself.",
  inputSchema: z.object({
    budget: z.number().positive().describe("£ to spend"),
    mode: z.enum(["test", "scale"]),
    candidates: z
      .array(
        z.object({
          name: z.string(),
          buyPrice: z.number().positive().describe("£ per item to buy, including import costs if importing"),
          sellPrice: z.number().positive().describe("£ expected Amazon UK selling price"),
          fulfilmentFee: z.number().min(0).optional().describe("£ FBA fee per item, if known"),
          monthlySales: z
            .number()
            .min(0)
            .describe("Items THIS seller can expect to sell per month: a cautious share, not the whole market"),
          moq: z.number().int().min(1).optional().describe("Supplier minimum order"),
        }),
      )
      .min(1),
  }),
  run: ({ budget, mode, candidates }) => JSON.stringify(roundBasket(planBasket(budget, candidates, mode))),
});

export const restockBasketTool = betaZodTool({
  name: "restock_basket",
  description:
    "Work out what to reorder from the owner's own sales and stock, most urgent first, to cover a number of days of sales within a budget. " +
    "Uses the same data as the dashboard (example data until Amazon is connected).",
  inputSchema: z.object({
    budget: z.number().positive().describe("£ to spend on restocking"),
    targetDays: z.number().int().min(7).max(120).optional().describe("Days of stock to cover. Default 45"),
  }),
  run: ({ budget, targetDays }) => {
    const data = getBusinessData();
    const products = new Map(data.products.map((p) => [p.id, p]));
    const rows = summarise(data, 30).products;
    const items = rows.map((row) => {
      const p = products.get(row.id)!;
      return {
        name: row.name,
        buyPrice: p.buyPrice,
        sellPrice: p.price,
        fulfilmentFee: p.fulfilmentFee,
        stockAtAmazon: row.stockAtAmazon,
        dailySales: row.daysOfStockLeft ? row.stockAtAmazon / row.daysOfStockLeft : 0,
      };
    });
    return JSON.stringify({ isExampleData: data.isExample, ...roundBasket(restockBasket(budget, items, targetDays)) });
  },
});

export const seasonCalendarTool = betaZodTool({
  name: "get_season_calendar",
  description:
    "UK shopping seasons coming up (Christmas, Black Friday, Prime Day, Mother's Day and so on) with how many days away, " +
    "the latest day to have stock at Amazon, and the latest day to order from overseas suppliers.",
  inputSchema: z.object({
    withinDays: z.number().int().min(7).max(365).optional().describe("How far ahead to look. Default 150"),
  }),
  run: ({ withinDays }) => JSON.stringify({ today: toDay(new Date()), seasons: upcomingSeasons(toDay(new Date()), withinDays) }),
});

export const adBudgetTool = betaZodTool({
  name: "suggest_ad_budget",
  description:
    "Work out how much an item can spend on Amazon ads without losing money: highest bid per click, target ad cost per sale, " +
    "and a starting daily budget (£3-£5, only for items already making a profit). Use calculate_profit first for the profit.",
  inputSchema: z.object({
    price: z.number().positive().describe("£ Amazon selling price"),
    profitBeforeAds: z.number().describe("£ profit per item before ads, from calculate_profit"),
    conversionRatePercent: z
      .number()
      .min(1)
      .max(50)
      .optional()
      .describe("% of ad clicks that buy. Default 10"),
  }),
  run: ({ price, profitBeforeAds, conversionRatePercent }) => {
    const a = suggestAdBudget(price, profitBeforeAds, conversionRatePercent);
    return JSON.stringify({
      ...a,
      breakEvenAcosPercent: pct(a.breakEvenAcosPercent),
      targetAcosPercent: pct(a.targetAcosPercent),
    });
  },
});

export const checkListingTool = betaZodTool({
  name: "check_listing",
  description:
    "Check an Amazon listing draft (title, bullet points, description) against Amazon's title rules (200 characters, no ! $ ? _ { } ^ ¬ ¦, " +
    "no word more than twice) and good practice (5 bullets, no promotional claims). Always check a listing before giving it to the owner, " +
    "and fix every problem.",
  inputSchema: z.object({
    title: z.string(),
    bullets: z.array(z.string()),
    description: z.string().optional(),
  }),
  run: (draft) => JSON.stringify(checkListing(draft)),
});
