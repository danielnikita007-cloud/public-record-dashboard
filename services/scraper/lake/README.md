# Data Lake — Multi-Source Insight Layer

This is the "combine everything" layer: it pulls tenders, forest
clearances, news, and fund data into one local database
(`services/scraper/data/warehouse.db`) so insights can be generated
*across* sources, not just within one at a time.

## The safety split (same principle as everywhere else in this project)

| Output type | Example | Goes to |
|---|---|---|
| **Numeric aggregate** | "Odisha had 14 forest-clearance records this quarter" | Published immediately — it's just a count, no claim of wrongdoing |
| **Cross-source correlation** | "A large single-bid tender and a deforestation news story both mention Odisha" | Your `/admin/review` queue — a human must verify before this becomes a public claim |

The correlation matching is **deliberately crude** (simple text/state-name
matching) — good enough to surface a candidate worth a human's five
minutes, nowhere near good enough to publish a claim from directly. Every
drafted correlation says this explicitly in its own text.

## Setup

```
cd services/scraper
pip install -r requirements.txt
cp .env.example .env
```

Fill in `.env`:
- `DASHBOARD_API_URL` / `DASHBOARD_STATS_API_URL` — your live site (required)
- `DATA_GOV_API_KEY` / `DATA_GOV_RESOURCE_ID` — for forest clearance data (optional but recommended)
- `FUND_DATASET_RESOURCE_ID` — optional, only if you want fund-utilization data too

You'll also need `aoc_tenders.db` downloaded already (see `TENDER_WATCH_README.md`)
in `services/scraper/data/`.

## Running it

Run the whole pipeline in order:
```
python -m lake.run_pipeline
```

Or run individual steps if you only want one part:
```
python -m lake.ingest_tenders
python -m lake.ingest_forest_clearances
python -m lake.ingest_news
python -m lake.ingest_fund_data
python -m lake.generate_insights
```

(Note the `python -m lake.xxx` form, not `python lake/xxx.py` — these
scripts import from each other as a package, so they need to be run this
way for the imports to resolve.)

## What you'll see afterward

- New numeric charts on your dashboard topic pages (published instantly)
- New "Auto-drafted" correlation candidates in `/admin/review`, tagged
  `auto-scraper-lake-insights` — read the linked sources yourself before
  approving any of these; they are explicitly weak, unverified signals

## Extending it

Adding a new source is mostly: (1) add a table to `lake/schema.py`,
(2) write an `ingest_x.py` that fills it, (3) add a query in
`generate_insights.py` that reads from it alongside the others. The
`ingest_fund_data.py` script is intentionally generic since "which fund
dataset matters" depends on what you're tracking — point it at whichever
data.gov.in dataset fits your current focus.
