# Seller Assistant

A website that helps run a small Amazon UK reselling business: find profitable items, buy them, sell them and keep track of the money.

The full plan is in [docs/business-plan.md](docs/business-plan.md).

## What's built so far

- **Profit calculator** (`/`): enter the buying price and the Amazon price to see profit per item, return on money, margin and the break-even price. It includes Amazon's selling fee, FBA fee, storage, the UK digital services fee and VAT, whether or not you're VAT registered.

The maths is in `src/lib/profit.ts`, with tests in `src/lib/profit.test.ts`.

## Next up

- **Deal finder:** paste an Amazon, shop or Alibaba link, check whether you're allowed to sell the item, and save good deals.
- **Trend tracker**, then the buying, selling and managing parts of the plan.

## Running it

```bash
npm install
npm run dev    # http://localhost:3000
npm test       # profit maths tests
npm run lint
npm run build
```
