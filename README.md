# The Public Record — Pilot Dashboard

A working investigative-dashboard pilot: topic map → sourced case cards → legal context panel →
editorial intake/review pipeline. Built so nothing reaches the public site without editor approval
and a named source.

This pilot uses a local JSON file as its database (`data/db.json`) so it runs immediately with no
external accounts. When you're ready for real public traffic, swap it for Postgres — see Phase 3 below.

---

## 1. Run it locally (10 minutes)

You need [Node.js](https://nodejs.org) (v18 or newer) installed. Then:

```bash
cd investigative-dashboard
npm install
cp .env.example .env.local
npm run dev
```

Open **http://localhost:3000**. You'll see the topic index. The map will show a placeholder message
until you add a Mapbox token (next step, optional for local testing).

Try the pipeline:
1. Go to **/admin/submit**, add a test case with a source URL.
2. Go to **/admin/review**, click **Approve & publish**.
3. Go to **/dashboard/deforestation** — your case now appears publicly.

---

## 2. Deploy it live (this week)

### Step A — Put the code on GitHub
1. Create a free GitHub account if you don't have one.
2. Create a new repository, e.g. `public-record-dashboard`.
3. Upload this whole folder to it (GitHub's web uploader works fine — drag and drop the folder contents).

### Step B — Deploy the frontend on Vercel
1. Go to [vercel.com](https://vercel.com), sign up with your GitHub account.
2. Click **New Project** → select your repository → **Deploy**. Vercel auto-detects Next.js; no config needed.
3. After the first deploy, go to **Project Settings → Environment Variables** and add:
   - `NEXT_PUBLIC_MAPBOX_TOKEN` — get a free token at https://account.mapbox.com/access-tokens/
4. Redeploy (Vercel does this automatically after saving env variables, or click **Redeploy**).

You now have a live URL like `public-record-dashboard.vercel.app`. You can attach a custom domain
later under **Project Settings → Domains**.

**Important — restrict the admin pages before this is truly public.** `/admin/submit` and
`/admin/review` currently have no login. Cheapest fix for a pilot: put the whole site behind
Vercel's built-in **Password Protection** (Project Settings → Deployment Protection) while you're
still the only editor, or ask me to add simple email/password auth (I can build this — it's a
half-day addition using NextAuth) before you open submissions to other contributors.

---

## 3. Real database (Postgres) — required for anything you want to keep

Your site now uses a real Postgres database instead of a file that gets wiped on every
Render redeploy. This is not optional anymore — the site will show database errors
until this is set up.

### Step A — Create the database on Render
1. Render dashboard → **New +** → **PostgreSQL**
2. Name it (e.g. `public-record-db`), choose the **Free** tier, click **Create Database**
3. On the database's info page, copy the **Internal Database URL**

### Step B — Connect your web service to it
1. Go to your web service (the site itself) → **Environment**
2. Add a variable: `DATABASE_URL` = (paste the Internal Database URL from Step A)
3. Save — this triggers a redeploy automatically

That's it — no manual table creation needed. The first request after deploy
automatically creates the `cases` and `stats` tables if they don't exist yet.

### Local development
Add `DATABASE_URL` to your own `.env.local` file, pointing at any Postgres instance
(a local install, or even the same Render database — Render also exposes an
**External Database URL** for connecting from outside their network).

---

## 4. What needs to be "linked" — in plain terms

Here's everything that connects this dashboard to the outside world, and what each one is for:

| What | Why you need it | Where to get it | Required to launch? |
|---|---|---|---|
| **GitHub account** | Stores your code, connects to Vercel | github.com | Yes |
| **Vercel account** | Hosts the live website | vercel.com | Yes |
| **Mapbox token** | Powers the interactive map | account.mapbox.com (free tier) | No — site works without it, just no map |
| **Supabase (Postgres)** | Real database once you outgrow the pilot file-store | supabase.com (free tier) | No — only when scaling past the pilot |
| **DocumentCloud account** | Lets you host and embed the actual PDF sources (RTI replies, court orders) so readers can view them in-browser | documentcloud.org (free for journalists/nonprofits) | No — you can link directly to source URLs instead |
| **Custom domain** | e.g. thepublicrecord.in instead of a vercel.app subdomain | any domain registrar | No |
| **Media lawyer review** | One-time check on high-risk content categories (corporate monopoly claims especially) before public launch | — | **Strongly recommended before publishing the corporate-monopolies topic specifically** |

Nothing above is required to get the site *running* — only GitHub + Vercel are needed for a live
pilot URL. Everything else is an upgrade you add as the project grows.

---

## 5. Where your actual editorial work happens

The code doesn't know what's true — you and your editors do. Your workflow, once live:

1. Read a government report / court order / journalist's published piece.
2. Go to `/admin/submit`, enter the case with that source's URL and publisher name.
3. Go to `/admin/review`, re-check the source link, and approve or reject.
4. Approved cases appear instantly on the public dashboard, map, and chart.

That review step is the whole safety model — keep it as a real human check, not a rubber stamp,
especially for the corporate-monopolies and corruption topics.
