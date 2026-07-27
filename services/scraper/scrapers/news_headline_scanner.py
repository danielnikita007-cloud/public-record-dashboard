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
from urllib.parse import quote

load_dotenv()

DASHBOARD_API_URL = os.getenv("DASHBOARD_API_URL")

# One search query per topic. Extend this dict as you add topics beyond the pilot.
TOPIC_QUERIES = {
    "deforestation": "illegal tree felling OR forest clearance violation India",
    "exam-leaks": "exam paper leak India",
    "corruption": "CAG report corruption India",
    "caste-certification": "fake caste certificate case India",
    "land-allocation": "land allocation scam India",
}

GOOGLE_NEWS_RSS = "https://news.google.com/rss/search?q={query}&hl=en-IN&gl=IN&ceid=IN:en"


def fetch_headlines(topic_slug: str, query: str, limit: int = 10):
    url = GOOGLE_NEWS_RSS.format(query=quote(query))
    feed = feedparser.parse(url)
    return feed.entries[:limit]


def entry_to_draft(topic_slug: str, entry) -> dict:
    publisher = entry.get("source", {}).get("title", "Unknown outlet")
    return {
        "title": entry.title,
        "summary": (
            "[AUTO-DRAFTED FROM NEWS HEADLINE — NOT YET REVIEWED. "
            "An editor must read the full article and rewrite this summary "
            "with proper attribution before this case can be approved.]"
        ),
        "topic_slug": topic_slug,
        "status": "alleged",
        "submitted_by": "auto-scraper-news",
        "sources": [
            {
                "url": entry.link,
                "publisher": publisher,
                "source_tier": "news_outlet",
                "published_date": entry.get("published", ""),
            }
        ],
        "legal_violations": [],
    }


def submit_draft(draft: dict):
    resp = requests.post(DASHBOARD_API_URL, json=draft, timeout=15)
    if resp.status_code == 200:
        print(f"Draft created: {draft['title']}")
    else:
        print(f"Failed to submit '{draft['title']}': {resp.status_code} {resp.text}")


def run():
    for topic_slug, query in TOPIC_QUERIES.items():
        entries = fetch_headlines(topic_slug, query)
        print(f"[{topic_slug}] found {len(entries)} headlines")
        for entry in entries:
            submit_draft(entry_to_draft(topic_slug, entry))


if __name__ == "__main__":
    run()
