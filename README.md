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

## 3. Migrate to a real database (once the pilot has real content)

The file-based store (`lib/db.ts`) works for a low-traffic pilot but won't hold up under real public
load or multiple simultaneous editors. When you're ready:

1. Create a free Postgres database at [supabase.com](https://supabase.com) (easiest option — has a
   spreadsheet-like table editor, good for a non-technical admin).
2. Run the `schema.sql` and `legal-reference` seed (from our earlier messages — I can regenerate
   these as files if you want them bundled here too) in Supabase's SQL editor.
3. Replace `lib/db.ts` with a Postgres client (`@supabase/supabase-js` or plain `pg`) pointed at
   your Supabase connection string. Because `lib/types.ts` already matches the schema, none of the
   page or API route code needs to change — only the three functions inside `lib/db.ts`.
4. Add `DATABASE_URL` (or Supabase URL/key) to Vercel's environment variables.

I'm glad to do this migration for you when you're ready — it's a contained, mechanical change.

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
