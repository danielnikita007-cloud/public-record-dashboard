"""
Economic anomaly engine.

Computes objective, standard economic measures from the local CPPP tender
database and publishes them as numeric stats (Pipeline A — no review
needed, because these are arithmetic on public records, not claims about
anyone's conduct).

WHAT THESE METRICS DO AND DON'T MEAN
------------------------------------
Every measure here describes a PATTERN IN PROCUREMENT DATA. None of them
detects or proves wrongdoing, and the dashboard labels them accordingly:

  * HHI (Herfindahl-Hirschman Index) — the standard measure competition
    regulators use for market concentration. A high HHI means a few
    vendors hold most of a department's awarded value. That can indicate
    a closed market, but it can equally reflect a genuinely specialised
    field with few qualified suppliers. It is a prompt to look, not a finding.

  * Single-bid rate — share of awards that drew exactly one bidder.
    Same caveat: common and innocent for small or niche contracts.

  * Award value concentration (top-5 share) — what proportion of an
    organisation's total awarded value went to its five largest vendors.

These are published as descriptive statistics with their methodology
stated on the dashboard. They are deliberately NOT combined into any
composite "suspicion score" — collapsing several weak signals into one
number that looks like a verdict is exactly the kind of inference that
needs a journalist, not a script.
"""
import os
import json
import sqlite3
from collections import defaultdict
from dotenv import load_dotenv
import requests

load_dotenv()

DASHBOARD_API_URL = os.getenv("DASHBOARD_API_URL")
STATS_API_URL = os.getenv("DASHBOARD_STATS_API_URL") or (
    DASHBOARD_API_URL.replace("/cases/draft", "/stats") if DASHBOARD_API_URL else None
)
DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "aoc_tenders.db")

MAX_ROWS_TO_SCAN = 500_000
MIN_AWARDS_FOR_HHI = 10      # don't compute HHI for orgs with too few awards to be meaningful
TOP_N_ORGS = 12              # how many organisations to publish metrics for

SOURCE_DATASET = "CPPP aoc_tenders.db (via tender.sarthaksidhant.com, sourced from eprocure.gov.in)"


def parse_inr(raw: str) -> float:
    if not raw:
        return 0.0
    digits = "".join(c for c in raw if c.isdigit() or c == ".")
    try:
        return float(digits) if digits else 0.0
    except ValueError:
        return 0.0


def push_stat(topic_slug, metric_type, label, value, unit, scope=None):
    if not STATS_API_URL:
        print("Missing DASHBOARD_STATS_API_URL in .env — cannot publish stats.")
        return
    payload = {
        "topic_slug": topic_slug, "metric_type": metric_type, "label": label,
        "value": value, "unit": unit, "scope": scope,
        "source_dataset": SOURCE_DATASET,
    }
    try:
        resp = requests.post(STATS_API_URL, json=payload, timeout=15)
        if resp.status_code == 200:
            print(f"  {label} = {value} {unit}")
        else:
            print(f"  FAILED '{label}': {resp.status_code} {resp.text[:120]}")
    except requests.RequestException as e:
        print(f"  Network error on '{label}': {e}")


def load_awards(conn):
    """Returns {org_name: [(vendor, value_inr, num_bids), ...]}"""
    cur = conn.cursor()
    cur.execute(
        """SELECT t.org_name, d.details_json
           FROM aoc_tenders t JOIN aoc_details d ON t.internal_id = d.internal_id
           LIMIT ?""",
        (MAX_ROWS_TO_SCAN,),
    )
    by_org = defaultdict(list)
    for org_name, details_json in cur:
        if not org_name:
            continue
        try:
            details = json.loads(details_json) if details_json else {}
        except json.JSONDecodeError:
            continue
        vendor = (details.get("Name of the selected bidder(s)") or "").strip()
        if not vendor:
            continue
        value = parse_inr(details.get("Contract Value", ""))
        bids_raw = details.get("Number of bids received", "")
        digits = "".join(c for c in bids_raw if c.isdigit())
        num_bids = int(digits) if digits else None
        by_org[org_name].append((vendor, value, num_bids))
    return by_org


def compute_hhi(awards):
    """Herfindahl-Hirschman Index over awarded VALUE share, 0-10000 scale.
    Standard interpretation (US DOJ/FTC thresholds, used here only as a
    reference point — they were written for product markets, not
    government procurement, so treat them as rough orientation):
      < 1500  = unconcentrated
      1500-2500 = moderately concentrated
      > 2500  = highly concentrated
    """
    total_value = sum(v for _, v, _ in awards)
    if total_value <= 0:
        return None
    share_by_vendor = defaultdict(float)
    for vendor, value, _ in awards:
        share_by_vendor[vendor] += value
    hhi = sum(((v / total_value) * 100) ** 2 for v in share_by_vendor.values())
    return round(hhi, 1)


def compute_top5_share(awards):
    total_value = sum(v for _, v, _ in awards)
    if total_value <= 0:
        return None
    by_vendor = defaultdict(float)
    for vendor, value, _ in awards:
        by_vendor[vendor] += value
    top5 = sorted(by_vendor.values(), reverse=True)[:5]
    return round((sum(top5) / total_value) * 100, 2)


def compute_single_bid_rate(awards):
    counted = [b for _, _, b in awards if b is not None]
    if not counted:
        return None
    return round((sum(1 for b in counted if b == 1) / len(counted)) * 100, 2)


def compute_zscores_and_publish(by_org):
    """
    Single-Bid Anomaly Z-Score: Z = (X - mean) / stddev, computed across
    every organisation's single-bid rate in this dataset. A z-score tells
    you how many standard deviations an organisation's rate is from the
    average across all organisations analysed here — it flags STATISTICAL
    outliers relative to this dataset's own distribution, not a universal
    threshold, and not evidence of anything improper on its own.
    """
    import statistics

    org_rates = {}
    for org, awards in by_org.items():
        if len(awards) < MIN_AWARDS_FOR_HHI:
            continue
        rate = compute_single_bid_rate(awards)
        if rate is not None:
            org_rates[org] = rate

    if len(org_rates) < 3:
        print("Not enough organisations with single-bid data to compute meaningful Z-scores (need 3+).")
        return

    rates = list(org_rates.values())
    mean_rate = statistics.mean(rates)
    stdev_rate = statistics.stdev(rates) if len(rates) > 1 else 0

    if stdev_rate == 0:
        print("No variation in single-bid rates across organisations — Z-scores would be undefined.")
        return

    print(f"\nSingle-bid rate across {len(org_rates)} organisations: mean={mean_rate:.1f}%, stdev={stdev_rate:.1f}")
    for org, rate in sorted(org_rates.items(), key=lambda x: abs((x[1] - mean_rate) / stdev_rate), reverse=True)[:TOP_N_ORGS]:
        z = (rate - mean_rate) / stdev_rate
        label_org = org if len(org) <= 40 else org[:38] + "…"
        push_stat(
            "land-allocation", "single_bid_rate",
            f"Single-bid Z-score — {label_org}", round(z, 2), "count",
            scope=f"rate={rate:.1f}%, dataset mean={mean_rate:.1f}%",
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
        print("Loading awards from local tender database...")
        by_org = load_awards(conn)
        print(f"Loaded awards for {len(by_org)} organisations.")

        # Rank organisations by total awarded value — publish metrics for the largest,
        # since those are where concentration actually matters at scale.
        org_totals = {
            org: sum(v for _, v, _ in awards)
            for org, awards in by_org.items()
            if len(awards) >= MIN_AWARDS_FOR_HHI
        }
        top_orgs = sorted(org_totals.items(), key=lambda x: x[1], reverse=True)[:TOP_N_ORGS]

        print(f"\nPublishing concentration metrics for top {len(top_orgs)} organisations:")
        for org, total in top_orgs:
            awards = by_org[org]
            label_org = org if len(org) <= 45 else org[:43] + "…"

            hhi = compute_hhi(awards)
            if hhi is not None:
                push_stat(
                    "land-allocation", "org_award_concentration",
                    f"HHI — {label_org}", hhi, "count",
                    scope=f"{len(awards)} awards analysed",
                )

            top5 = compute_top5_share(awards)
            if top5 is not None:
                push_stat(
                    "land-allocation", "org_award_concentration",
                    f"Top-5 vendor share — {label_org}", top5, "percent",
                    scope=f"{len(awards)} awards analysed",
                )

            sbr = compute_single_bid_rate(awards)
            if sbr is not None:
                push_stat(
                    "land-allocation", "single_bid_rate",
                    f"Single-bid rate — {label_org}", sbr, "percent",
                    scope=f"{len(awards)} awards analysed",
                )

        print("\nDone. These are descriptive statistics from public procurement records —")
        print("they describe patterns, not findings of wrongdoing.")

        print("\nComputing single-bid anomaly Z-scores across all organisations...")
        compute_zscores_and_publish(by_org)
    finally:
        conn.close()


if __name__ == "__main__":
    run()
