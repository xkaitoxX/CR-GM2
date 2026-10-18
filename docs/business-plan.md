# Plan: Making Profit on Amazon UK, Plus an Assistant Website

## Context
You want to **make profit selling on Amazon**. It doesn't need to be your own brand at the start. You also want a website that works like an **assistant for the whole business**:
- **Find** cheap products and **trending** products.
- **Compare** prices with Amazon to see the profit.
- **Talk to suppliers** (Alibaba and others) and compare their answers.
- **Make ads** for your items.
- **Manage** profits, sales and stock.
- **Deal with** reviews and customers.
- **Do admin jobs**, such as reminders, to-do lists, expenses and reports.

Your limits:
- **Money for stock:** about £400 ($500)
- **Time:** 5–10 hours a week
- **Market:** Amazon UK first, Europe later
- **Website:** for you first, maybe sold to other sellers later

The website will be a **new project, separate from Atlas**.

---

## The idea in plain words
**Stage 1: resell to make money (no brand needed)**
1. Find items that are **cheaper in shops or from suppliers** than on Amazon.
2. Buy a few, send them to Amazon, and Amazon sells and ships them for you (this is called **FBA**).
3. Keep the difference as profit, then **buy more with the profit**.

**Stage 2: your own brand (later, once profits allow)**
Use the profits to start your own branded product from Alibaba. It has higher profit, and ads matter more at this stage.

**Rough example (Stage 1):**

| | £ per item |
|---|---|
| A shop sells it on clearance for | 6.00 |
| It sells on Amazon for | 16.99 |
| Amazon fees (selling fee and storage/delivery fee) | −5.10 |
| Shipping it to Amazon's warehouse | −0.50 |
| **Your profit** (before tax) | **≈ 5.39** |

That's **about 90% back** on the £6 you spent. Buy 10 and you make about £54. The website does this sum for every item.

**Why start by reselling?** It's the **cheapest way to start**. You can start with £150–250 and grow by reinvesting. You also learn how Amazon works before spending more on a brand.

---

## The website: 4 parts
**AI writes, you approve.** Nothing is sent or bought without your OK.

### Part A: Find (build first)
| Feature | What it does |
|---|---|
| **Profit calculator** | Type in the buying price and the Amazon price. It subtracts all fees and VAT, then shows profit and return. |
| **Deal finder** | Paste an Amazon link, a shop link or an Alibaba link. It shows:<br>• the Amazon price<br>• **how fast it sells**<br>• how many other sellers there are<br>• **"Am I allowed to sell this?"**, since some brands and categories are locked<br>• profit<br>Good deals are saved in a list, best first. |
| **Trend tracker** | A watchlist of products and searches. **Alerts** you when an item's sales jump, its price changes, or a search starts rising. Shows **trending products** you could sell. |

### Part B: Buy
| Feature | What it does |
|---|---|
| **Supplier helper** | AI writes your questions to Alibaba suppliers and wholesalers: what it's made of, size and weight, safety papers, minimum order, prices, sample cost and delivery time. You paste the answers back in. AI puts them **side by side** and warns about red flags. |
| **Buying and stock tracker** | Records what you bought, where, and for how much, and **saves receipts**. Amazon may ask for proof that items are genuine. Shows stock at Amazon and **low-stock alerts**. |

### Part C: Sell
| Feature | What it does |
|---|---|
| **Ads helper** | AI writes **ad text** and **product listing text** (title, bullet points, description) and **social media posts**. For Amazon ads it suggests keywords and a daily budget, then shows **whether each ad is making or losing money**. It suggests pausing the losers, and you approve. |
| **Reviews and customers** | Requests a review after each order, automatically, using Amazon's own allowed button. AI writes draft replies to customer messages and you approve them. |

### Part D: Manage
| Feature | What it does |
|---|---|
| **Profit dashboard** | Real profit after every cost: items, Amazon fees, ads, returns and shipping. Shows your best and worst products. |
| **Admin assistant** | A **daily to-do list**: buy these deals, reorder this, reply to these messages, these shipments are on the way. Also reminders (tax dates, reorders), an expense log, and a **monthly report** for you or an accountant. |

**Later:** add sign-up and payments so other sellers can use the website, once it works well for you.

### What AI does and what normal code does
Not everything needs AI. **Normal code is cheaper, faster and never makes things up**, so we use it for numbers and rules. AI is only for **reading, writing and judgment**.

| Normal code (no AI) | AI |
|---|---|
| Profit calculator, fees and VAT | Writing supplier questions |
| Fetching prices and sales data | Reading supplier replies and comparing them |
| "Am I allowed to sell this?" check | Writing ads, product listings and social posts |
| Trend alerts (e.g. "sales up 50% this week") | Suggesting ad keywords and explaining why an ad loses money |
| Stock tracker and low-stock alerts | Drafting replies to customers |
| Profit dashboard and ad profit/loss | Writing the daily to-do list and monthly report summary |
| Automatic review requests | Summarizing competitor reviews and explaining deals or trends |
| Reminders and expense log | |

### How the AI team works: one manager, 4 helpers
You talk to **one manager**. The manager hands jobs to **4 helpers** and collects their answers.

```
                        YOU
                         │  chat
                         ▼
               ┌───────────────────┐
               │   MANAGER (AI)    │  the only one you talk to
               └───────────────────┘
        hands out jobs │ and collects the answers
       ┌──────────┬────┴─────┬──────────────┐
       ▼          ▼          ▼              ▼
   Deals and   Suppliers  Marketing    Customers
   Trends      helper     helper       and Admin
   helper                              helper
       │          │          │              │
       └──────────┴────┬─────┴──────────────┘
                       ▼
               ┌───────────────────┐
               │  SHARED DATABASE  │  products, deals, suppliers, stock,
               │  ("one notebook") │  sales, ads, messages, to-dos
               └───────────────────┘
                       ▲
          Normal code keeps it up to date every few hours
          (Amazon, Keepa, Google Trends)
```

**How it works:**
1. You talk only to the **manager**.
2. The manager decides which helper or helpers the job needs and gives them instructions.
3. Each helper does its job with its own tools and reports back a short answer.
4. The manager puts the answers together and replies to you.
5. Anything that would **send, publish or spend** goes into an **Approvals inbox**. Nothing happens until you press Approve.

Everyone reads and writes **the same database**, so helpers don't need to pass lots of information to each other. They all see the same facts.

**Example:**
> **You:** "I have £100. What should I buy this week?"
> *The manager asks the Deals and Trends helper for the best deals under £100 that you're allowed to sell, and checks your stock and sales.*
> **Manager:** "Buy 6 garlic presses (about £4.10 profit each) and 4 cable organisers (about £3.20 each). Skip the phone stand, because its sales are falling. Total: £96. Add them to your shopping list?"
> **You:** "Yes. And ask the cable organiser supplier for a bulk price."
> *The manager asks the Suppliers helper to write the message. It appears in your Approvals inbox. You approve it, and it's emailed or you paste it into Alibaba.*

**Every morning, without you asking,** the manager writes your daily to-do list from what the helpers found.

**How we build it:**
- Start with **the manager only**, plus simple tools to look up deals, stock and sales.
- Add each helper when we build its part. For example, Part A adds the Deals and Trends helper.
- Each helper is the same Claude AI with **its own instructions and its own small set of tools**. The manager calls a helper the same way it uses a tool.
- Built with Anthropic's official TypeScript SDK and hosted with the website. No extra platforms.

**AI costs:**
- **Default model:** Claude Opus 5.5, Anthropic's current main model, for the manager and all helpers.
- **Rough cost** at side-project use: about **£20–£50 a month** with Opus 5.5 everywhere.
- **Option to save money (your choice):** use a cheaper Claude model (Sonnet 5.5 or Haiku 5.5) for simple helper jobs, such as pulling facts out of supplier replies. That could bring it down to about **£5–£20 a month**. We'd test that the quality stays good first.
- Set a **monthly spending limit** in your Anthropic account so the bill can never surprise you.

### What runs by itself and what needs your OK
| Runs automatically | Needs your approval | Never automatic |
|---|---|---|
| Updating prices, sales and stock | Sending any message (suppliers, customers) | Buying stock |
| Trend and low-stock alerts | Publishing ads or listings | Payments |
| Review requests | Pausing ads or lowering ad budgets | Raising ad spending |
| Daily to-do list | | |

### Limits to know about
- **Alibaba:** as far as I know, outside tools can't send messages for buyers, and robots can get your account blocked. So the website **writes** the message and you paste it and press send. If a supplier gives you an email, the website can send emails for you once you approve them.
- **Shop prices:** we only use sources that allow it, such as official product feeds and price-history services, or links you paste in. Copying websites with robots breaks their rules.
- **Ad pictures:** AI writes the words. For pictures we use your product photos with ready-made templates.

### Technical approach (low cost)
- Web app: **Next.js + Supabase**, hosted on **Vercel** (free tiers to start). New GitHub repository, separate from Atlas.
- **Amazon's official connection for sellers (SP-API):** prices, fees, "am I allowed to sell this?", orders, stock and review requests. It needs a Professional seller account.
- **Amazon Ads API:** creating and tracking Amazon ads. Amazon has to approve access.
- **Keepa:** paid, from about €20 a month. Gives price and sales history and powers the trend tracker. Add it once you're buying regularly.
- **Google Trends:** rising searches.
- **Claude API:** the manager and 4 helpers, built with the Anthropic TypeScript SDK's Tool Runner. See "How the AI team works" above for models and costs.
- **Gmail connection** (optional): sending supplier emails you've approved.

---

## Money plan (about £400)
| Cost | Amount |
|---|---|
| Amazon Professional seller account | about £25 a month + VAT |
| First stock: several products, a few of each | £200–£250 |
| Labels, boxes and tape | about £20 |
| Shipping boxes to Amazon's warehouse | about £10–£20 |
| Keepa (optional, later) | about €20 a month |
| Claude AI (manager and helpers) | about £5–£50 a month, depending on use and model choice. Turn on the AI features gradually. |
| Amazon ads | **only once an item is selling at a profit**, starting at £3–£5 a day |

**Golden rule:** put the profits back into stock until you have about £2,000. Then think about Stage 2, your own brand.

---

## Rules: never break these
**Amazon:**
- Only sell **new, genuine** items, and **keep every receipt or invoice**.
- Check "am I allowed to sell this?" **before** buying. Avoid brands known to complain about resellers, because complaints can close your account.
- **Never** offer gifts, refunds or discounts for reviews. Only message buyers through Amazon, about their order.
- Use only Amazon's official connections, never robots that copy Amazon's pages.

**Ads:** no false claims. Don't say "best", "No. 1" or "cures" unless it's true and allowed.

**Alibaba:** pay only through **Trade Assurance**, never by direct bank transfer outside Alibaba. Always get a sample before a bulk order.

---

## Timeline (5–10 hours a week)
| When | What you do |
|---|---|
| Weeks 1–3 | Learn the basics of Amazon UK reselling. **Build the profit calculator and deal finder.** Apply for the Amazon seller account, because ID checks take time. |
| Weeks 4–6 | Connect the website to Amazon and add the "am I allowed to sell this?" check. **Buy your first £150–250 of stock.** Send it to Amazon. |
| Weeks 7–12 | **First sales.** Build the buying and stock tracker, profit dashboard and trend tracker. Reinvest profits. |
| Months 4–6 | Build the ads helper, reviews and customers, and the admin assistant. Keep reinvesting. |
| Month 6+ | Once profits reach about £2,000, start Stage 2 (your own brand) with the supplier helper. Maybe add Europe, or sell the website to others. |

---

## Check before you start
- **Where you live affects tax.** If you don't live in the UK, you usually have to register for UK VAT from your first sale. Ask a local accountant.
- **If you have a job,** check your contract for rules about side businesses.

## How we'll know it's working
1. The calculator and deal finder work, and you've checked **30+ deals** with them.
2. First stock bought. Every item is allowed to sell and makes **at least £3 profit and 30% return**.
3. **First sale.**
4. **Money doubled.** You're buying new stock with profit only.
5. Steady monthly profit, then grow toward Stage 2.

## First thing to build after approval
**Part A: the profit calculator, then the deal finder.** I'll set up the new project and build a page where you type in an item's buying price and Amazon price and see the profit straight away.
