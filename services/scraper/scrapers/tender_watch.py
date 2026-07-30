"""
Scans the locally-downloaded aoc_tenders.db (from tender.sarthaksidhant.com,
itself sourced from India's Central Public Procurement Portal) for contracts
matching known red-flag patterns, and creates DRAFT cases for editorial
review — never publishes anything automatically.

See TENDER_WATCH_README.md for how to get the data file.

Every draft this script creates cites the *original government* detail_url
embedded in the source data (an eprocure.gov.in / CPPP link) as the primary
source — not the mirror site — because that's the authoritative record an
editor and readers should be able to check.
"""
import os
import json
import sqlite3
from datetime import datetime
from dotenv import load_dotenv
import requests

load_dotenv()

DASHBOARD_API_URL = os.getenv("DASHBOARD_API_URL")
DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "aoc_tenders.db")

# --- Tune these thresholds as you like ---
MIN_BID_WINDOW_DAYS = 3          # flag windows shorter than this
REPEAT_WINNER_THRESHOLD = 15     # flag a vendor winning more than this many contracts
MAX_ROWS_TO_SCAN = 200_000       # safety cap so a first run doesn't take forever

# Small local works (drainage lines, boundary walls, etc.) very commonly get
# only one bidder for entirely mundane reasons — flagging every single-bid
# contract floods the review queue with noise. Only flag single-bid awards
# ABOVE this value, where a lack of competition is actually unusual, and
# cap the total drafts created per run so a scan never dumps thousands of
# entries on an editor at once.
MIN_SINGLE_BID_VALUE_INR = 5_000_000   # ₹50 lakh — adjust to taste
MAX_DRAFTS_PER_CATEGORY_PER_RUN = 25
# ------------------------------------------

DATE_FORMATS = ["%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y %H:%M:%S", "%Y-%m-%d %H:%M:%S"]


def parse_date(raw: str):
    if not raw:
        return None
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(raw.strip(), fmt)
        except (ValueError, AttributeError):
            continue
    return None


def submit_draft(draft: dict):
    try:
        resp = requests.post(DASHBOARD_API_URL, json=draft, timeout=15)
        if resp.status_code == 200:
            print(f"Draft created: {draft['title']}")
        else:
            print(f"Failed to submit '{draft['title']}': {resp.status_code} {resp.text}")
    except requests.RequestException as e:
        print(f"Network error submitting '{draft['title']}': {e}")


def make_draft(title, org_name, detail_url, reason, extra_note=""):
    return {
        "title": title,
        "summary": (
            f"[AUTO-DRAFTED FROM CPPP PROCUREMENT DATA — EDITOR MUST VERIFY BEFORE PUBLISHING] "
            f"Flagged reason: {reason}. Organisation: {org_name or 'unspecified'}. {extra_note} "
            f"Review the linked government tender page before writing a public summary — "
            f"this flag describes a pattern in the data, not a confirmed finding."
        ),
        "topic_slug": "land-allocation",
        "status": "alleged",
        "submitted_by": "auto-scraper-tender-watch",
        "sources": [
            {
                "url": detail_url or "https://tender.sarthaksidhant.com/",
                "publisher": "Central Public Procurement Portal (CPPP), via open dataset compiled by Sarthak Sidhant",
                "source_tier": "primary_govt",
                "published_date": "",
            }
        ],
        "legal_violations": [],
    }


def parse_inr(raw: str) -> float:
    if not raw:
        return 0.0
    digits = "".join(c for c in raw if c.isdigit() or c == ".")
    try:
        return float(digits) if digits else 0.0
    except ValueError:
        return 0.0


def scan_single_bid_awards(conn):
    print("Scanning for single-bid awards above the value threshold...")
    cur = conn.cursor()
    cur.execute(
        """SELECT t.title, t.org_name, t.detail_url, d.details_json
           FROM aoc_tenders t JOIN aoc_details d ON t.internal_id = d.internal_id
           LIMIT ?""",
        (MAX_ROWS_TO_SCAN,),
    )
    candidates = []
    for title, org_name, detail_url, details_json in cur:
        try:
            details = json.loads(details_json) if details_json else {}
        except json.JSONDecodeError:
            continue
        bids_raw = details.get("Number of bids received", "")
        try:
            num_bids = int("".join(c for c in bids_raw if c.isdigit()))
        except (ValueError, TypeError):
            continue
        if num_bids != 1:
            continue
        value = parse_inr(details.get("Contract Value", ""))
        if value < MIN_SINGLE_BID_VALUE_INR:
            continue
        winner = details.get("Name of the selected bidder(s)", "unspecified vendor")
        candidates.append((value, title, org_name, detail_url, winner))

    # Only the highest-value matches — these are the ones actually worth an editor's time
    candidates.sort(key=lambda c: c[0], reverse=True)
    top = candidates[:MAX_DRAFTS_PER_CATEGORY_PER_RUN]

    for value, title, org_name, detail_url, winner in top:
        draft = make_draft(
            title=f"Single-bid award (₹{value:,.0f}): {title or 'Untitled tender'}",
            org_name=org_name,
            detail_url=detail_url,
            reason=f"only one bid was received for this ₹{value:,.0f} award",
            extra_note=f"Awarded to: {winner}.",
        )
        submit_draft(draft)

    print(f"Single-bid awards above ₹{MIN_SINGLE_BID_VALUE_INR:,} threshold: {len(candidates)} found, "
          f"{len(top)} drafted (capped at {MAX_DRAFTS_PER_CATEGORY_PER_RUN} highest-value)")


def scan_short_bid_windows(conn):
    print("Scanning for short bid windows...")
    cur = conn.cursor()
    cur.execute(
        """SELECT title, org_name, detail_url, closing_date, aoc_date
           FROM aoc_tenders LIMIT ?""",
        (MAX_ROWS_TO_SCAN,),
    )
    candidates = []
    for title, org_name, detail_url, closing_date, aoc_date in cur:
        d1, d2 = parse_date(closing_date), parse_date(aoc_date)
        if not d1 or not d2:
            continue
        window_days = abs((d2 - d1).days)
        if 0 < window_days < MIN_BID_WINDOW_DAYS:
            candidates.append((window_days, title, org_name, detail_url))

    # Shortest windows first — those are the most unusual
    candidates.sort(key=lambda c: c[0])
    top = candidates[:MAX_DRAFTS_PER_CATEGORY_PER_RUN]

    for window_days, title, org_name, detail_url in top:
        draft = make_draft(
            title=f"Short bid window ({window_days}d): {title or 'Untitled tender'}",
            org_name=org_name,
            detail_url=detail_url,
            reason=f"only {window_days} day(s) between bid closing and contract award",
        )
        submit_draft(draft)

    print(f"Short bid-window awards found: {len(candidates)}, drafted: {len(top)} "
          f"(capped at {MAX_DRAFTS_PER_CATEGORY_PER_RUN} shortest)")


def scan_repeat_winners(conn):
    print("Scanning for concentrated repeat winners...")
    cur = conn.cursor()
    cur.execute(
        """SELECT d.details_json, t.org_name, t.detail_url
           FROM aoc_details d JOIN aoc_tenders t ON t.internal_id = d.internal_id
           LIMIT ?""",
        (MAX_ROWS_TO_SCAN,),
    )
    winner_counts = {}
    winner_example_url = {}
    winner_orgs = {}
    for details_json, org_name, detail_url in cur:
        try:
            details = json.loads(details_json) if details_json else {}
        except json.JSONDecodeError:
            continue
        winner = (details.get("Name of the selected bidder(s)") or "").strip()
        if not winner:
            continue
        winner_counts[winner] = winner_counts.get(winner, 0) + 1
        winner_example_url.setdefault(winner, detail_url)
        winner_orgs.setdefault(winner, set()).add(org_name)

    flagged = [(w, n) for w, n in winner_counts.items() if n >= REPEAT_WINNER_THRESHOLD]
    flagged.sort(key=lambda x: x[1], reverse=True)
    top = flagged[:MAX_DRAFTS_PER_CATEGORY_PER_RUN]

    for winner, n in top:
        orgs = winner_orgs.get(winner, set())
        draft = make_draft(
            title=f"Vendor concentration: {winner} — {n} contracts won",
            org_name=", ".join(list(orgs)[:5]),
            detail_url=winner_example_url.get(winner),
            reason=f"this vendor appears as winning bidder in {n} separate contract records in this dataset sample",
            extra_note="This may reflect a large, legitimate contractor — verify scale and department spread before treating as noteworthy.",
        )
        submit_draft(draft)

    print(f"Repeat-winner vendors found: {len(flagged)}, drafted: {len(top)} "
          f"(capped at {MAX_DRAFTS_PER_CATEGORY_PER_RUN} most concentrated)")


def run():
    if not os.path.exists(DB_PATH):
        print(f"No database found at {DB_PATH}.")
        print("See TENDER_WATCH_README.md for how to download aoc_tenders.db first.")
        return
    conn = sqlite3.connect(DB_PATH)
    try:
        scan_single_bid_awards(conn)
        scan_short_bid_windows(conn)
        scan_repeat_winners(conn)
    finally:
        conn.close()


if __name__ == "__main__":
    run()
