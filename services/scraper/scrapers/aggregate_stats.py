"""
Computes purely numeric, sourced aggregates from the local CPPP tender
database and pushes them straight to /api/stats — publishing immediately,
with NO editorial review step.

This is intentionally different from tender_watch.py, which drafts
narrative "this contract looks worth investigating" cases into the review
queue. This script only ever produces counts and sums (e.g. "Vendor X
appears as awardee in N records totaling ₹Y") — a factual tally of what's
in the public dataset, not a claim about wrongdoing. There's no editorial
judgment being exercised, so there's nothing for a human to "approve" —
either the count matches the source data or it's a bug to fix in this
script, not a publishing decision.

Every stat is stamped with its source dataset so it's always traceable.
"""
import os
import json
import sqlite3
from collections import defaultdict
from dotenv import load_dotenv
import requests

load_dotenv()

STATS_API_URL = os.getenv("DASHBOARD_STATS_API_URL") or os.getenv("DASHBOARD_API_URL", "").replace(
    "/cases/draft", "/stats"
)
DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "aoc_tenders.db")
MAX_ROWS_TO_SCAN = 500_000
SOURCE_DATASET = "CPPP aoc_tenders.db (via tender.sarthaksidhant.com, sourced from eprocure.gov.in)"


def parse_inr(raw: str) -> float:
    if not raw:
        return 0.0
    digits = "".join(c for c in raw if c.isdigit() or c == ".")
    try:
        return float(digits) if digits else 0.0
    except ValueError:
        return 0.0


def push_stat(topic_slug, metric_type, label, value, unit, scope=None, source_url=None):
    payload = {
        "topic_slug": topic_slug,
        "metric_type": metric_type,
        "label": label,
        "value": value,
        "unit": unit,
        "scope": scope,
        "source_dataset": SOURCE_DATASET,
        "source_url": source_url,
    }
    try:
        resp = requests.post(STATS_API_URL, json=payload, timeout=15)
        if resp.status_code == 200:
            print(f"Stat recorded: {label} = {value} {unit}")
        else:
            print(f"Failed to record '{label}': {resp.status_code} {resp.text}")
    except requests.RequestException as e:
        print(f"Network error recording '{label}': {e}")


def compute_vendor_aggregates(conn):
    print("Computing vendor contract counts and values...")
    cur = conn.cursor()
    cur.execute(
        """SELECT d.details_json, t.detail_url FROM aoc_details d
           JOIN aoc_tenders t ON t.internal_id = d.internal_id
           LIMIT ?""",
        (MAX_ROWS_TO_SCAN,),
    )
    counts = defaultdict(int)
    values = defaultdict(float)
    example_url = {}

    for details_json, detail_url in cur:
        try:
            details = json.loads(details_json) if details_json else {}
        except json.JSONDecodeError:
            continue
        vendor = (details.get("Name of the selected bidder(s)") or "").strip()
        if not vendor:
            continue
        counts[vendor] += 1
        values[vendor] += parse_inr(details.get("Contract Value", ""))
        example_url.setdefault(vendor, detail_url)

    # Only publish the top N by count/value — a full 4.9M-row publish isn't useful on a dashboard
    top_by_count = sorted(counts.items(), key=lambda x: x[1], reverse=True)[:15]
    top_by_value = sorted(values.items(), key=lambda x: x[1], reverse=True)[:15]

    for vendor, n in top_by_count:
        push_stat(
            topic_slug="land-allocation",
            metric_type="vendor_contract_count",
            label=vendor,
            value=n,
            unit="count",
            scope="national",
            source_url=example_url.get(vendor),
        )

    for vendor, total in top_by_value:
        push_stat(
            topic_slug="land-allocation",
            metric_type="vendor_contract_value",
            label=vendor,
            value=round(total, 2),
            unit="inr",
            scope="national",
            source_url=example_url.get(vendor),
        )


def compute_single_bid_rate(conn):
    print("Computing single-bid rate...")
    cur = conn.cursor()
    cur.execute("SELECT details_json FROM aoc_details LIMIT ?", (MAX_ROWS_TO_SCAN,))
    total, single = 0, 0
    for (details_json,) in cur:
        try:
            details = json.loads(details_json) if details_json else {}
        except json.JSONDecodeError:
            continue
        bids_raw = details.get("Number of bids received", "")
        digits = "".join(c for c in bids_raw if c.isdigit())
        if not digits:
            continue
        total += 1
        if int(digits) == 1:
            single += 1

    if total > 0:
        rate = round((single / total) * 100, 2)
        push_stat(
            topic_slug="land-allocation",
            metric_type="single_bid_rate",
            label="Single-bid awards (% of sampled contracts)",
            value=rate,
            unit="percent",
            scope=f"national — sample of {total:,} records",
        )


def run():
    if not os.path.exists(DB_PATH):
        print(f"No database found at {DB_PATH}. See TENDER_WATCH_README.md.")
        return
    if not STATS_API_URL:
        print("Missing DASHBOARD_STATS_API_URL (or DASHBOARD_API_URL) in .env")
        return
    conn = sqlite3.connect(DB_PATH)
    try:
        compute_vendor_aggregates(conn)
        compute_single_bid_rate(conn)
    finally:
        conn.close()


if __name__ == "__main__":
    run()
