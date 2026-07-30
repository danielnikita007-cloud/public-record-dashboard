"""
Reads across ALL sources in the data lake and produces two different
kinds of output, following the same safety split used everywhere else
in this project:

1. NUMERIC AGGREGATES (counts/sums) -> published immediately via
   /api/stats. E.g. "14 forest-clearance records and 9 flagged news
   headlines mention Odisha this quarter" is just a tally — no claim
   about wrongdoing, so no review needed.

2. CROSS-SOURCE CORRELATIONS -> drafted via /api/cases/draft, into your
   normal review queue. E.g. "a large single-bid tender AND a reported
   illegal-felling headline both reference the same state within a
   similar period" is a genuine editorial judgment call — it might be
   coincidence, or worth digging into. A human decides, same as always.

The state-matching used to connect records across sources is DELIBERATELY
CRUDE (simple text matching on state names) — good enough to surface
candidates for a human to check, nowhere near good enough to publish a
claim from directly. Every correlation drafted says so explicitly.
"""
import os
from collections import defaultdict
from datetime import datetime
import requests
from dotenv import load_dotenv
from lake.schema import get_connection

load_dotenv()

DASHBOARD_API_URL = os.getenv("DASHBOARD_API_URL")
STATS_API_URL = os.getenv("DASHBOARD_STATS_API_URL") or (
    DASHBOARD_API_URL.replace("/cases/draft", "/stats") if DASHBOARD_API_URL else None
)

MIN_TENDER_VALUE_FOR_CORRELATION = 5_000_000  # ₹50 lakh, same bar as tender_watch.py
MAX_CORRELATION_DRAFTS = 20


def push_stat(topic_slug, metric_type, label, value, unit, scope=None, source_url=None):
    if not STATS_API_URL:
        print("No stats API URL configured — skipping stat push. Set DASHBOARD_STATS_API_URL in .env.")
        return
    payload = {
        "topic_slug": topic_slug, "metric_type": metric_type, "label": label,
        "value": value, "unit": unit, "scope": scope,
        "source_dataset": "Data lake (multi-source aggregate)", "source_url": source_url,
    }
    try:
        resp = requests.post(STATS_API_URL, json=payload, timeout=15)
        print(f"Stat: {label} = {value} {unit}" if resp.status_code == 200 else f"Stat failed: {resp.text}")
    except requests.RequestException as e:
        print(f"Network error pushing stat: {e}")


def push_draft(title, summary, topic_slug, source_url):
    if not DASHBOARD_API_URL:
        print("No cases API URL configured — skipping draft. Set DASHBOARD_API_URL in .env.")
        return
    payload = {
        "title": title,
        "summary": summary,
        "topic_slug": topic_slug,
        "status": "alleged",
        "submitted_by": "auto-scraper-lake-insights",
        "sources": [{
            "url": source_url or "https://tender.sarthaksidhant.com/",
            "publisher": "Data lake cross-source correlation (multiple public datasets)",
            "source_tier": "primary_govt",
            "published_date": "",
        }],
        "legal_violations": [],
    }
    try:
        resp = requests.post(DASHBOARD_API_URL, json=payload, timeout=15)
        print(f"Draft: {title}" if resp.status_code == 200 else f"Draft failed: {resp.text}")
    except requests.RequestException as e:
        print(f"Network error pushing draft: {e}")


def generate_numeric_stats(conn):
    print("--- Generating numeric aggregates ---")
    cur = conn.cursor()

    cur.execute("SELECT state_guess, COUNT(*) FROM raw_news WHERE state_guess IS NOT NULL GROUP BY state_guess ORDER BY 2 DESC LIMIT 10")
    for state, count in cur.fetchall():
        push_stat("deforestation", "topic_case_count", f"{state} — flagged news mentions", count, "count", scope=state)

    cur.execute("SELECT state, COUNT(*) FROM raw_forest_clearances WHERE state IS NOT NULL GROUP BY state ORDER BY 2 DESC LIMIT 10")
    for state, count in cur.fetchall():
        push_stat("deforestation", "topic_case_count", f"{state} — forest clearance records", count, "count", scope=state)

    cur.execute("SELECT COUNT(*) FROM raw_tenders WHERE num_bids = 1")
    single_bid_total = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM raw_tenders")
    tender_total = cur.fetchone()[0]
    if tender_total:
        push_stat(
            "land-allocation", "single_bid_rate", "Single-bid awards in ingested lake sample",
            round((single_bid_total / tender_total) * 100, 2), "percent",
            scope=f"sample of {tender_total:,} records",
        )


def generate_correlations(conn):
    print("--- Generating cross-source correlation candidates (for review) ---")
    cur = conn.cursor()

    # States that show up in BOTH a large single-bid tender's org_name/title text
    # AND a flagged deforestation news headline — crude text matching only.
    cur.execute(
        "SELECT DISTINCT state_guess FROM raw_news WHERE topic_keyword='deforestation' AND state_guess IS NOT NULL"
    )
    news_states = {row[0] for row in cur.fetchall()}

    cur.execute(
        """SELECT title, org_name, detail_url, contract_value_inr FROM raw_tenders
           WHERE num_bids = 1 AND contract_value_inr >= ?""",
        (MIN_TENDER_VALUE_FOR_CORRELATION,),
    )
    large_single_bid_tenders = cur.fetchall()

    drafted = 0
    for state in news_states:
        if drafted >= MAX_CORRELATION_DRAFTS:
            break
        matching_tenders = [t for t in large_single_bid_tenders if state.lower() in (t[1] or "").lower() or state.lower() in (t[0] or "").lower()]
        if not matching_tenders:
            continue
        title, org_name, detail_url, value = matching_tenders[0]
        push_draft(
            title=f"Possible correlation in {state}: forest-related news coverage + large single-bid tender",
            summary=(
                f"[AUTO-DRAFTED CORRELATION — WEAK SIGNAL, EDITOR MUST VERIFY] "
                f"The data lake found both (a) recent news coverage matching deforestation-related "
                f"keywords mentioning '{state}', and (b) a single-bid tender awarded for ₹{value:,.0f} "
                f"to '{org_name}' whose text also references '{state}'. This is a crude text-based "
                f"correlation, not a confirmed link — the two may be entirely unrelated. An editor "
                f"must independently verify both the news report and the tender record before writing "
                f"any public claim connecting them, and should NOT publish this as a single case unless "
                f"an actual connection is confirmed from primary sources."
            ),
            topic_slug="deforestation",
            source_url=detail_url,
        )
        drafted += 1
    print(f"Correlation candidates drafted: {drafted}")


def run():
    conn = get_connection()
    generate_numeric_stats(conn)
    generate_correlations(conn)
    conn.close()


if __name__ == "__main__":
    run()
