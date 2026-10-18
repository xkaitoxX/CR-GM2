# Seller Assistant

A website that helps run a small Amazon UK reselling business. AI agents do the research: you ask the manager a question, it hands the work to its helpers, and you get one clear answer.

The full plan is in [docs/business-plan.md](docs/business-plan.md).

## What's built so far

- **Assistant** (`/`): chat with the **manager** agent. Ask it to check a product, find deals or spot trends. The manager hands research to the **Deals and Trends helper**, which searches the web for Amazon prices, competing sellers, cheaper places to buy, FBA fees, demand and risks.
- **Price suggestions:** the agents work out **what price to sell at**. That price competes with other sellers (it matches the Buy Box or the lowest FBA offer rather than starting a price war) and still makes a profit. They also give the lowest price that's still a good deal and the break-even price, and they warn when Amazon sells the item itself, the listing is crowded, or competitors are below your break-even price.
- **Dashboard** (`/dashboard`): shows how the business is doing over the last 7, 30 or 90 days.
  - Key numbers (profit, sales, items sold, profit per item, return on money, stock at Amazon), each compared with the period before.
  - "What needs your attention": items to reorder, ads losing money, slow sellers, the top earner and the best seller.
  - Charts of profit, sales or items sold per day or week, profit by item, and where the sales money goes.
  - **Your items**, with a picture beside every item and a **List / Cards** switch.
    - **List:** like a crypto app, each row has a picture, a mini sales chart, and ▲/▼ % against the previous period. On phones it becomes compact rows.
    - **Cards:** like a clothing shop, each card has a big photo, price, profit per item, number sold, stock left, and badges such as "Best seller", "Low stock" or "Ads losing money".
    - Both views sort by popularity, profit, trend or stock running out.
  - Item pictures also appear in "Profit by item" and beside alerts. An item without a photo shows its initials on a coloured tile. Real photos come from the Amazon catalogue (`m.media-amazon.com` is already allowed in `next.config.ts`), or from files in `public/products/` for the example items.

  It shows **example data** until the Amazon seller account is connected. The manager reads the same numbers (`get_sales_report`), so you can ask it things like "what should I reorder?"
- **Profit calculator** (`/calculator`): the same maths the agents use, for trying your own numbers.

The agents research and advise only. They never buy, pay or send anything.

| Agent | Status |
|---|---|
| Manager | Built |
| Deals and Trends helper | Built (web search; exact Amazon data once the seller account is connected) |
| Suppliers helper | Coming next |
| Marketing helper | Planned |
| Customers and Admin helper | Planned |

### How it fits together

- `src/lib/ai/manager.ts`: the manager agent the owner chats with.
- `src/lib/ai/helpers/deals.ts`: the Deals and Trends helper. The manager calls it like a tool.
- `src/lib/ai/tools/profit-tool.ts` and `pricing-tool.ts`: the profit calculator and price suggester as tools, so agents never do the maths or pick prices themselves.
- `src/lib/profit.ts`: the profit maths (Amazon fees, VAT, return, break-even, lowest good-deal price).
- `src/lib/pricing.ts`: picks a competitive, profitable selling price from competitors' offers.
- `src/lib/business/`: products, sales and ad spend (`types.ts`), the example data and the one place to plug in real Amazon data (`example-data.ts`), and the dashboard numbers and alerts (`summary.ts`).
- `src/app/api/chat/route.ts`: runs the manager and streams progress to the chat page.

All agents use Claude Haiku 5.5, the cheapest Claude model, through the Anthropic TypeScript SDK's tool runner. Set `AI_MODEL` (for example `claude-sonnet-5-5`) to use a stronger model; refusal fallback switches on automatically for models that support it.

## Switching on the AI

The agents need two settings (see `.env.example`):

1. **`ANTHROPIC_API_KEY`**: create a key at console.anthropic.com. Set a monthly spending limit there so the bill can't surprise you.
2. **`APP_PASSWORD`**: any password you choose. The website asks for it once per device.

### Putting it online (Vercel, free plan)

1. Sign in at vercel.com with your GitHub account.
2. **Add New → Project**, then pick this repository.
3. Under **Environment Variables**, add `ANTHROPIC_API_KEY` and `APP_PASSWORD`.
4. Press **Deploy**. Every push after that updates the site automatically.

## Running it locally

```bash
cp .env.example .env.local   # then fill in the values
npm install
npm run dev    # http://localhost:3000
npm test       # unit tests (no AI calls, no cost)
npm run lint
npm run build
```
