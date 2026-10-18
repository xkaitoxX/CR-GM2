# Seller Assistant

A website that helps run a small Amazon UK reselling business. A team of AI agents does the work: you talk to one **manager**, it hands jobs to its **helpers**, and you get one clear answer. Customer messages are answered by themselves, and anything the AI can't solve comes to you as a ticket with a link.

The full plan is in [docs/business-plan.md](docs/business-plan.md). The setup guide is [further down](#setting-it-up).

## What it does

### Pages

- **Assistant** (`/`): chat with the manager. Your chat is kept on your device; **New chat** clears it. Things to try:
  - "What should I do today?"
  - "Suggest a test basket of trending items for £200"
  - "Is this garlic press a good deal? It costs £2.10 on Alibaba and sells for £12.99 on Amazon"
  - "Write a message to this Alibaba supplier asking for 200 units"
  - "Write my monthly report"
- **Dashboard** (`/dashboard`): how the business is doing over 7, 30 or 90 days.
  - **Today**: what needs you today, most urgent first. That means tickets close to Amazon's 24-hour limit, items to reorder, ads losing money, season deadlines (such as "get Christmas stock to Amazon by 1 Nov") and good news, plus a short note from the manager once a day.
  - Key numbers compared with the period before, "What needs your attention", and charts of profit, sales and where the money goes.
  - **Your items**, with pictures, in a **List** (crypto-app style, with mini charts and ▲/▼ %) or **Cards** (shop style, with badges such as "Best seller" and "Low stock").
- **Inbox** (`/inbox`): every customer message and feedback, what the AI did with each one, and a 24-hour timer.
  - **Reply to simple messages automatically** switch.
  - **Check email now** button.
  - A box to paste messages or seller feedback that didn't come by email.
  - **Fact sheets**: the facts about each item (size, material, how to use it, what's in the box). The AI only answers from these, so it never makes things up.
  - **What the AI did**: a log of every reply, ticket and email check.
- **Tickets** (`/tickets`): issues the AI handed to you, most urgent first. Each ticket has its own page (the link in your email) with:
  - the customer's message
  - the AI's summary
  - a suggested reply you can edit and send
  - notes, and a button to mark it resolved (or reopen it)
- **Calculator** (`/calculator`): the same profit maths the agents use, for trying your own numbers.

### The AI team

| Agent | What it does |
|---|---|
| **Manager** | The one you talk to. Hands out jobs, reads your sales numbers, suggests prices, and writes the daily note. |
| **Deals and Trends helper** | Checks a product: Amazon price, competing sellers, cheaper places to buy, FBA fees, demand and risks. |
| **Marketing helper** | Finds trending and best-selling items and suggests a **basket** to buy. Two modes: "test" (a few of each) or "scale" (more of the winners). Also does restock lists, the UK seasons calendar, ad budgets, and listing and social-post wording, with a check against Amazon's title rules. |
| **Suppliers helper** | Writes questions for Alibaba suppliers, reads their replies and compares offers. The comparison uses the **real cost delivered to the UK**: freight, customs duty, clearance and import VAT. It flags warning signs, such as no Trade Assurance, a new supplier, or a price far below everyone else. |
| **Customers and Admin helper** | Answers customer messages from your fact sheets, writes polite feedback replies, keeps your to-do list and writes the monthly report. |

Normal code does all the maths and the safety rules: profit, prices, baskets, import costs and which replies are safe to send. The AI does the research and the writing. The agents never buy anything, pay for anything or change your Amazon listings.

### How customer messages are handled

1. Amazon emails you each buyer message. The website checks your inbox, either on a schedule or when you press **Check email now**.
2. The Customers helper writes a reply using your fact sheets.
3. **Simple messages** get the reply sent straight away by email, and Amazon passes it on to the buyer. Simple means delivery questions, how-to questions, product questions, thank-yous and normal feedback.
4. **Anything risky** becomes a ticket: refunds, returns, damage, missing items, complaints, safety, legal threats, A-to-z claims, negative feedback, or anything the AI isn't sure about. The customer gets a polite holding reply, so you stay within Amazon's 24 hours, and you get an email with a link to the ticket.
5. Replies follow Amazon's messaging rules: no links, no asking for reviews, and no promised refunds.

Turn the switch off on the Inbox page and nothing is sent by itself. Every reply then waits for you as "Ready to send". The same happens for messages you paste in, because there's no email address to reply to: copy the reply into Seller Central.

**Seller feedback:** paste it into the Inbox and the AI writes a reply. Amazon doesn't let other tools post feedback replies, so you copy the reply into Seller Central. Amazon doesn't allow public replies to product reviews at all.

### What's not connected yet

- **Sales numbers** on the dashboard are **example data** until the Amazon seller account (SP-API) is connected. The one place to plug in real data is `getBusinessData()` in `src/lib/business/example-data.ts`.
- **Item photos** show initials until real photo links are added. Amazon catalogue photos (`m.media-amazon.com`) are already allowed in `next.config.ts`.

## Setting it up

You need accounts with **Anthropic** (the AI), **Vercel** (hosting) and **Supabase** (the database). An email account and a schedule for checking email are optional. Everything has a free plan except the AI, which costs a few pounds a month at side-project use.

Every setting goes in **Vercel → your project → Settings → Environment Variables**. For running it on your own computer, use `.env.local` instead. `.env.example` lists them all. After changing settings in Vercel, open **Deployments** and **Redeploy** the latest one so the change takes effect.

### 1. The AI (required)

1. Go to [console.anthropic.com](https://console.anthropic.com) and add some credit.
2. Under **Settings → Limits**, set a **monthly spending limit** so the bill can't surprise you.
3. Under **Settings → API keys**, create a key and save it as **`ANTHROPIC_API_KEY`**.

All agents use **Claude Haiku 5.5**, the cheapest Claude model. Most of the cost is web searches, about 1p each, when the helpers research products. To use a stronger model, set **`AI_MODEL`** (for example `claude-sonnet-5-5`). It costs more.

### 2. Password and website address (required)

- **`APP_PASSWORD`**: any password you choose. The website asks for it once per device, so strangers can't read your messages or spend your AI credit.
- **`APP_URL`**: your website's address, for example `https://seller-assistant.vercel.app`. Ticket links in emails use it.
- **`SHOP_NAME`** (optional): the name replies are signed with, for example `Bright Home Goods`. Without it, replies are signed "Customer Service".

### 3. Putting it online (Vercel, free plan)

1. Sign in at [vercel.com](https://vercel.com) with your GitHub account.
2. **Add New → Project**, then pick this repository.
3. Add the settings from steps 1 and 2 under **Environment Variables**.
4. Press **Deploy**. Every push after that updates the site automatically.

### 4. The database (Supabase, free plan)

Without a database, tickets, messages, fact sheets and settings are **lost whenever the website restarts**. The Inbox shows "Not saved yet (no database)" until this step is done.

1. Create a free project at [supabase.com](https://supabase.com). The London region is closest.
2. Open **SQL Editor → New query**, paste everything from [`supabase/schema.sql`](supabase/schema.sql), and press **Run**.
3. In **Project Settings**:
   - Copy the **Project URL** (under **Data API**) into **`SUPABASE_URL`**.
   - Copy the **secret** key (or the older `service_role` key, under **API Keys**) into **`SUPABASE_SERVICE_ROLE_KEY`**.

   Keep that key private: it can read and change everything. The website only uses it on the server.

Supabase pauses free projects after a week without use. The email check below uses it every day, which keeps it awake.

### 5. Email (optional, needed for automatic replies)

The website reads your inbox to find Amazon buyer messages and supplier emails, and sends replies from the same address. It never deletes or moves your emails.

1. Use an email address just for the shop. **Gmail is easiest.**
2. Turn on **2-Step Verification**: Google Account → Security.
3. Create an **app password**: Google Account → Security → 2-Step Verification → **App passwords**. It's 16 letters.
4. Add these settings:
   - **`EMAIL_USER`**: the email address
   - **`EMAIL_PASSWORD`**: the app password, not your normal password
   - **`OWNER_EMAIL`**: where ticket alerts go, for example your personal email
5. In **Amazon Seller Central → Settings → Notification Preferences**, send **Buyer Messages** to this address.
6. Make sure Amazon accepts replies from this address. Amazon only passes on emails from addresses it knows, so it should be your Seller Central email or an approved sender under **Messaging permissions**. If Amazon's menu names differ, search Seller Central help for "Buyer-Seller Messaging".

**Other providers:**
- iCloud and Yahoo work the same way, with their own app passwords.
- For any other provider, also set **`EMAIL_IMAP_HOST`** and **`EMAIL_SMTP_HOST`**, plus **`EMAIL_IMAP_PORT`** (usually 993) and **`EMAIL_SMTP_PORT`** (465 or 587) if they differ.
- Outlook.com may no longer allow app passwords, so use Gmail if it doesn't work.

### 6. Checking email on a schedule

Amazon expects replies within 24 hours, so the website should check email every 15 minutes.

1. Set **`CRON_SECRET`** to a long random password. Scheduled checks use it instead of the website password.
2. The free Vercel plan only runs scheduled jobs **once a day**. `vercel.json` already checks at 8:00 every morning.
3. For checks every 15 minutes, create a free job at [cron-job.org](https://cron-job.org):
   - **URL:** `https://<your site>/api/email/sync`
   - **Schedule:** every 15 minutes
   - **Advanced → Headers:** add `Authorization` with the value `Bearer <your CRON_SECRET>`

If cron-job.org reports a timeout on a busy day, that's fine. Emails are only marked as handled once they're done, so the next check picks up anything that was missed.

### Checking it works

1. Open the website and enter your password.
2. Go to **Inbox** and paste a test message, such as "When will my order arrive?". You should see a reply marked "Ready to send". Pasted messages didn't come by email, so you copy the reply into Seller Central. Then paste "It arrived broken, I want a refund". You should get a ticket, and an email with its link if email is set up.
3. Send yourself a test email and press **Check email now**. The result appears under **What the AI did**.

## How the code fits together

- `src/lib/ai/`: the agents.
  - `manager.ts`: the manager.
  - `helpers/`: the four helpers.
  - `tools/`: the maths and rules the agents can use.
  - `morning.ts`: the Today plan.
  - `config.ts`: the model and shared business facts.
- `src/lib/profit.ts`, `pricing.ts`, `basket.ts`, `suppliers.ts`, `seasons.ts`, `ads.ts`, `listing.ts`: the business rules. These are normal code with tests.
- `src/lib/customers/`:
  - `reply-policy.ts`: which replies are safe to send by themselves.
  - `inbox.ts`: replies, tickets, holding replies and owner alerts.
- `src/lib/email/`: reading the inbox (IMAP), sorting emails and sending replies (SMTP).
- `src/lib/store/`: the database (Supabase, or in memory when it isn't set up).
- `src/lib/business/`: sales data (example data for now) and the dashboard numbers.
- `src/app/api/`: the website's server routes. They all need the website password, and the email check also accepts `CRON_SECRET`.

## Running it locally

```bash
cp .env.example .env.local   # then fill in the values
npm install
npm run dev    # http://localhost:3000
npm test       # unit tests (no AI calls, no cost)
npm run lint
npm run build
```

Locally, the website works without `APP_PASSWORD`, and without Supabase it keeps records in memory.
