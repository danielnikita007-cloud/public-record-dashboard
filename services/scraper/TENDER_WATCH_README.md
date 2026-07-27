# Tender Watch — CPPP Procurement Red-Flag Scanner

This module works with the open procurement dataset published at
https://tender.sarthaksidhant.com/ — ~16.5M records scraped from India's
Central Public Procurement Portal (CPPP) and republished openly by an
independent developer, explicitly inviting reuse for analysis like this.

## Why this can't be fully automated end-to-end

The files are large SQLite databases (millions of rows) hosted on Google
Drive / S3 / MEGA mirrors — interactive download pages, not a plain API.
So there's one manual step: **you download the .db file once**, then this
script does all the analysis and draft-creation automatically from there.

## Step 1 — Download the data (one-time, manual)

1. Go to https://tender.sarthaksidhant.com/
2. Download **aoc_tenders.db** (Awards of Contract — this is the one with
   actual outcomes: who won, contract value, number of bids). Any mirror
   link works (Google Drive, S3, MEGA).
3. **Verify the file wasn't corrupted** — this matters more than usual
   since you're trusting this data on a public dashboard. On Mac/Linux:
   ```
   sha256sum aoc_tenders.db
   ```
   On Windows (PowerShell):
   ```
   Get-FileHash -Path aoc_tenders.db -Algorithm SHA256
   ```
   Compare the result to the hash published on the site
   (`ec8ef7711a17b7cae9e0414c2403b119a0a31c4dec49ed7055b38ec0df5f7586`
   at time of writing — always check the live page for the current value).
4. Place the file in `services/scraper/data/aoc_tenders.db`
   (create the `data` folder if it doesn't exist).

## Step 2 — Run the red-flag scan

```
cd services/scraper
pip install -r requirements.txt
python scrapers/tender_watch.py
```

This reads the local `.db` file (never uploads it anywhere), finds
contracts matching known red-flag patterns, and creates **draft** cases
via your dashboard's `/api/cases/draft` endpoint — same as the other
scrapers, landing in `pending_review`, never published automatically.

## What counts as a "red flag" here — and what it does NOT mean

The flags below are the exact ones the dataset's own publisher suggests
looking at. They indicate a contract is *worth a human looking into* —
they are not proof of wrongdoing on their own. Single-bid tenders and
short bid windows happen for innocent reasons too (niche technical
requirements, genuine urgency, etc.). This is why every flagged contract
still goes to your review queue instead of straight to the public site —
an editor needs to actually look at the tender document before writing
any claim about it.

- **Single-bid awards** — only one bidder submitted, which can indicate
  a pre-selected winner, but can also just mean a niche/small tender.
- **Very short bid windows** — under 3 days between publish and closing,
  which limits who can realistically compete.
- **Repeat winners** — the same bidder name winning an unusually high
  number of contracts from the same organisation (worth checking for
  favoritism, but also just how some markets naturally consolidate).

Adjust the thresholds in `scrapers/tender_watch.py` (`MIN_BID_WINDOW_DAYS`,
`REPEAT_WINNER_THRESHOLD`) to taste.
