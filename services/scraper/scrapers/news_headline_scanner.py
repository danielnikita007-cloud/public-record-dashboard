"""
Scans public news RSS feeds for headlines matching investigative keywords
and creates DRAFT cases (pending_review) so an editor can decide whether
to research and write them up properly.

IMPORTANT — what this script deliberately does NOT do:
- It does not read full articles or extract quotes.
- It does not write a case summary from the article content.
- It never touches review_status='published'.

It only captures: headline, source link, publisher, and date — enough
for an editor to recognize "this might be worth investigating" and go
read the actual piece themselves. This keeps the actual claim-writing
step in human hands, which is the whole point of the review pipeline.
"""
import os
import requests
import feedparser
from dotenv import load_dotenv
from urllib.parse import quote, urlparse

load_dotenv()

DASHBOARD_API_URL = os.getenv("DASHBOARD_API_URL")

# One base query per topic, PLUS site-restricted queries against outlets known
# for solid investigative/policy reporting and official government sources.
# Site-restricted queries return far less noise than an open-ended search.
TOPIC_QUERIES = {
    "deforestation": "illegal tree felling OR forest clearance violation India",
    "exam-leaks": "exam paper leak India",
    "corruption": "CAG report corruption India",
    "caste-certification": "fake caste certificate case India",
    "land-allocation": "land allocation scam India",
}

# Credible outlets known for policy/investigative reporting — searched
# specifically, in addition to the open query above, per topic.
QUALITY_OUTLETS = [
    "indianexpress.com",
    "thehindu.com",
    "scroll.in",
    "thewire.in",
    "downtoearth.org.in",   # strong on environment/forest specifically
]

# Official government sources — press releases, ministry statements, audits.
# These get tier 'primary_govt' automatically (see tier_for_url below).
GOVT_SOURCES = [
    "pib.gov.in",       # Press Information Bureau — official govt press releases
    "cag.gov.in",       # Comptroller & Auditor General reports
    "sansad.in",        # Parliament Q&A records
]

GOOGLE_NEWS_RSS = "https://news.google.com/rss/search?q={query}&hl=en-IN&gl=IN&ceid=IN:en"


def tier_for_url(url: str) -> str:
    domain = urlparse(url).netloc.lower()
    for govt_domain in GOVT_SOURCES:
        if govt_domain in domain:
            return "primary_govt"
    return "news_outlet"


def build_queries(base_query: str):
    """Yields the base open query, then one site-restricted query per quality
    outlet/govt source, so results skew toward sources worth an editor's time."""
    yield base_query
    for outlet in QUALITY_OUTLETS + GOVT_SOURCES:
        yield f"{base_query} site:{outlet}"


def fetch_headlines(query: str, limit: int = 5):
    url = GOOGLE_NEWS_RSS.format(query=quote(query))
    feed = feedparser.parse(url)
    return feed.entries[:limit]


def entry_to_draft(topic_slug: str, entry) -> dict:
    publisher = entry.get("source", {}).get("title", "Unknown outlet")
    tier = tier_for_url(entry.link)
    return {
        "title": entry.title,
        "summary": (
            "[AUTO-DRAFTED FROM NEWS HEADLINE — NOT YET REVIEWED. "
            "An editor must read the full article/report and rewrite this summary "
            "with proper attribution before this case can be approved.]"
        ),
        "topic_slug": topic_slug,
        "status": "alleged",
        "submitted_by": "auto-scraper-news",
        "sources": [
            {
                "url": entry.link,
                "publisher": publisher,
                "source_tier": tier,
                "published_date": entry.get("published", ""),
            }
        ],
        "legal_violations": [],
    }


def submit_draft(draft: dict):
    try:
        resp = requests.post(DASHBOARD_API_URL, json=draft, timeout=15)
        if resp.status_code == 200:
            print(f"Draft created [{draft['sources'][0]['source_tier']}]: {draft['title']}")
        else:
            print(f"Failed to submit '{draft['title']}': {resp.status_code} {resp.text}")
    except requests.RequestException as e:
        print(f"Network error submitting '{draft['title']}': {e}")


def run(max_per_topic: int = 15):
    for topic_slug, base_query in TOPIC_QUERIES.items():
        seen_urls = set()
        created = 0
        print(f"--- {topic_slug} ---")
        for query in build_queries(base_query):
            if created >= max_per_topic:
                break
            entries = fetch_headlines(query)
            for entry in entries:
                if created >= max_per_topic or entry.link in seen_urls:
                    continue
                seen_urls.add(entry.link)
                submit_draft(entry_to_draft(topic_slug, entry))
                created += 1
        print(f"[{topic_slug}] created {created} drafts")


if __name__ == "__main__":
    run()
