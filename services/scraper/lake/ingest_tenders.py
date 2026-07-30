"""
Copies (normalizes) records from your local aoc_tenders.db — the same
file tender_watch.py reads — into the shared data lake, so cross-source
insight generation can query it alongside forest clearances, news, and
fund data.

This does NOT replace tender_watch.py — that script still does its own
direct single-bid/short-window/repeat-winner flagging straight from
aoc_tenders.db. This ingester is only for enabling CROSS-source questions
later, in generate_insights.py.
"""
import os
import json
import sqlite3
import hashlib
from datetime import datetime
from lake.schema import get_connection

SOURCE_DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "aoc_tenders.db")
MAX_ROWS = 300_000  # ingest a large sample; raise if you want the full ~4.9M


def parse_inr(raw: str) -> float:
    if not raw:
        return 0.0
    digits = "".join(c for c in raw if c.isdigit() or c == ".")
    try:
        return float(digits) if digits else 0.0
    except ValueError:
        return 0.0


def stable_id(*parts) -> str:
    return hashlib.sha256("|".join(str(p) for p in parts).encode()).hexdigest()[:16]


def run():
    if not os.path.exists(SOURCE_DB_PATH):
        print(f"No aoc_tenders.db found at {SOURCE_DB_PATH} — download it first (see TENDER_WATCH_README.md).")
        return

    src = sqlite3.connect(SOURCE_DB_PATH)
    lake = get_connection()
    cur = src.cursor()
    cur.execute(
        """SELECT t.internal_id, t.title, t.org_name, t.detail_url, t.aoc_date, t.closing_date, d.details_json
           FROM aoc_tenders t JOIN aoc_details d ON t.internal_id = d.internal_id
           LIMIT ?""",
        (MAX_ROWS,),
    )

    ingested = 0
    for internal_id, title, org_name, detail_url, aoc_date, closing_date, details_json in cur:
        try:
            details = json.loads(details_json) if details_json else {}
        except json.JSONDecodeError:
            details = {}

        bids_raw = details.get("Number of bids received", "")
        try:
            num_bids = int("".join(c for c in bids_raw if c.isdigit()))
        except (ValueError, TypeError):
            num_bids = None

        row_id = stable_id("tender", internal_id)
        lake.execute(
            """INSERT OR REPLACE INTO raw_tenders
               (id, title, org_name, state, detail_url, aoc_date, closing_date,
                num_bids, winner, contract_value_inr, ingested_at, source_dataset)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                row_id,
                title,
                org_name,
                None,  # state isn't always a direct column in the source — leave for future enrichment
                detail_url,
                aoc_date,
                closing_date,
                num_bids,
                details.get("Name of the selected bidder(s)"),
                parse_inr(details.get("Contract Value", "")),
                datetime.utcnow().isoformat(),
                "CPPP aoc_tenders.db (tender.sarthaksidhant.com)",
            ),
        )
        ingested += 1

    lake.commit()
    src.close()
    lake.close()
    print(f"Ingested {ingested} tender records into the data lake.")


if __name__ == "__main__":
    run()
