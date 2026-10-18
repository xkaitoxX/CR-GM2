# Seller Assistant

A website that helps run a small Amazon UK reselling business. AI agents do the research: you ask the manager a question, it hands the work to its helpers, and you get one clear answer.

The full plan is in [docs/business-plan.md](docs/business-plan.md).

## What's built so far

- **Assistant** (`/`): chat with the **manager** agent. Ask it to check a product, find deals or spot trends. The manager hands research to the **Deals and Trends helper**, which searches the web for Amazon prices, competing sellers, cheaper places to buy, FBA fees, demand and risks.
- **Price suggestions:** the agents work out **what price to sell at**. That price competes with other sellers (it matches the Buy Box or the lowest FBA offer rather than starting a price war) and still makes a profit. They also give the lowest price that's still a good deal and the break-even price, and they warn when Amazon sells the item itself, the listing is crowded, or competitors are below your break-even price.
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
- `src/app/api/chat/route.ts`: runs the manager and streams progress to the chat page.

All agents use Claude Opus 5.5 through the Anthropic TypeScript SDK's tool runner, with server-side refusal fallback turned on.

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
