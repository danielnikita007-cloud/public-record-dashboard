"""
Scans the CAG (Comptroller and Auditor General of India) audit report
listing at cag.gov.in for reports matching your topic keywords, and
creates DRAFT cases tagged 'primary_govt' — the highest source tier this
project uses, since a CAG report is an official, tabled-in-legislature
audit finding, not an allegation.

Same safety rule as every other scraper here: this only captures the
report TITLE and its own page link — it does not read or summarize the
report's actual contents. An editor must open the linked report, read
what it actually says, and write the real summary before approving.

IMPORTANT — page structure may need adjusting:
CAG's website structure can change, and this script's HTML selectors
are based on the page's structure at the time this was written. If this
script finds 0 results, open cag.gov.in/en/audit-report/audit-report-list
in a browser, right-click a report title -> Inspect, and check whether
the tag/class names below still match. Look for REPORT_ITEM_SELECTOR.
"""
import os
import re
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from urllib.parse import urljoin

load_dotenv()

DASHBOARD_API_URL = os.getenv("DASHBOARD_API_URL")
BASE_URL = "https://cag.gov.in"
LIST_URL = "https://cag.gov.in/en/audit-report/audit-report-list"

# Keywords -> which of your dashboard topics they map to.
TOPIC_KEYWORDS = {
    "deforestation": ["forest", "afforestation", "environment", "wildlife"],
    "land-allocation": ["land allotment", "land acquisition", "housing", "urban development"],
    "corruption": ["irregularit", "misappropriation", "financial management", "public works", "scheduled caste", "scheduled tribe", "caste certificate"],
    "exam-leaks": ["education department", "examination", "school education"],
}

# Reports older than this are less useful for an "ongoing" investigations
# dashboard — adjust freely, or remove the filter to see everything.
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; PublicRecordDashboardBot/1.0)"}


def topic_for_title(title: str):
    title_lower = title.lower()
    for topic_slug, keywords in TOPIC_KEYWORDS.items():
        if any(kw in title_lower for kw in keywords):
            return topic_slug
    return None


def fetch_report_list(page: int = 0):
    """Fetch one page of the CAG report listing. Returns list of (title, url, date)."""
    resp = requests.get(LIST_URL, params={"page": page}, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    results = []
    # CAG's listing renders each report as a heading with a nearby date label.
    # This selector targets any element whose text contains "Report" and is
    # a link — adjust here first if the site's markup has changed.
    for link in soup.find_all("a", href=True):
        text = link.get_text(strip=True)
        if not text or "report" not in text.lower():
            continue
        if len(text) < 15:  # skip nav links like "Reports"
            continue
        full_url = urljoin(BASE_URL, link["href"])
        results.append((text, full_url))

    return results


def push_topic_count_stat(topic_slug: str, count: int):
    """A count of matching report TITLES is a plain fact about the public
    listing — not a claim about wrongdoing — so this publishes immediately
    via /api/stats, same as the tender aggregate numbers."""
    stats_url = os.getenv("DASHBOARD_STATS_API_URL") or (
        DASHBOARD_API_URL.replace("/cases/draft", "/stats") if DASHBOARD_API_URL else None
    )
    if not stats_url or count == 0:
        return
    payload = {
        "topic_slug": topic_slug,
        "metric_type": "topic_case_count",
        "label": "CAG audit reports found (title match)",
        "value": count,
        "unit": "count",
        "scope": "cag.gov.in report listing",
        "source_dataset": "Comptroller and Auditor General of India (CAG) — audit report list",
        "source_url": LIST_URL,
    }
    try:
        resp = requests.post(stats_url, json=payload, timeout=15)
        if resp.status_code == 200:
            print(f"Stat recorded: {topic_slug} — {count} CAG reports matched")
        else:
            print(f"Failed to record stat: {resp.status_code} {resp.text}")
    except requests.RequestException as e:
        print(f"Network error recording stat: {e}")


def run(max_pages: int = 5, max_drafts_per_topic: int = 10):
    drafts_per_topic = {slug: 0 for slug in TOPIC_KEYWORDS}
    matched_per_topic = {slug: 0 for slug in TOPIC_KEYWORDS}
    seen_urls = set()

    for page in range(max_pages):
        print(f"Fetching CAG report list page {page}...")
        try:
            reports = fetch_report_list(page)
        except requests.RequestException as e:
            print(f"Failed to fetch page {page}: {e}")
            break

        if not reports:
            print("No more reports found — stopping.")
            break

        for title, url in reports:
            if url in seen_urls:
                continue
            seen_urls.add(url)

            topic_slug = topic_for_title(title)
            if not topic_slug:
                continue
            matched_per_topic[topic_slug] += 1
            if drafts_per_topic[topic_slug] >= max_drafts_per_topic:
                continue

            draft = {
                "title": f"CAG audit report: {title}",
                "summary": (
                    "[AUTO-DRAFTED FROM CAG REPORT LISTING — NOT YET REVIEWED. "
                    "An editor must open the linked report, read the actual audit "
                    "findings, and write a real summary with specific figures before "
                    "this case can be approved. A report appearing here means its "
                    "TITLE matched a topic keyword — it does not mean the report "
                    "confirms any specific wrongdoing until read.]"
                ),
                "topic_slug": topic_slug,
                "status": "alleged",
                "submitted_by": "auto-scraper-cag",
                "sources": [{
                    "url": url,
                    "publisher": "Comptroller and Auditor General of India (CAG)",
                    "source_tier": "primary_govt",
                    "published_date": "",
                }],
                "legal_violations": [],
            }

            try:
                resp = requests.post(DASHBOARD_API_URL, json=draft, timeout=15)
                if resp.status_code == 200:
                    print(f"Draft created [{topic_slug}]: {title[:80]}")
                    drafts_per_topic[topic_slug] += 1
                else:
                    print(f"Failed to submit: {resp.status_code} {resp.text}")
            except requests.RequestException as e:
                print(f"Network error submitting draft: {e}")

    print("\nSummary:")
    for slug, count in drafts_per_topic.items():
        print(f"  {slug}: {count} drafts created ({matched_per_topic[slug]} total matched)")

    print("\nPushing numeric counts (published immediately, no review needed)...")
    for slug, count in matched_per_topic.items():
        push_topic_count_stat(slug, count)


if __name__ == "__main__":
    run()
