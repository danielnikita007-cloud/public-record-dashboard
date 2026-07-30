"""
Pulls news headlines (same Google News RSS approach as
scrapers/news_headline_scanner.py) but stores them as RAW records in the
data lake instead of immediately creating draft cases. This lets
generate_insights.py later cross-reference a headline against tender or
forest-clearance records from around the same time/place before deciding
whether it's worth drafting a case for review.
"""
import hashlib
from datetime import datetime
from urllib.parse import quote
import feedparser
from lake.schema import get_connection

TOPIC_QUERIES = {
    "deforestation": "illegal tree felling OR forest clearance violation India",
    "land-allocation": "land allocation scam OR tender scam India",
    "corruption": "CAG report corruption India",
}

# Very rough state-name detector for headline text — good enough to help
# generate_insights.py narrow down candidates, NOT precise geocoding.
INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
    "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
    "Uttarakhand", "West Bengal", "Delhi",
]

GOOGLE_NEWS_RSS = "https://news.google.com/rss/search?q={query}&hl=en-IN&gl=IN&ceid=IN:en"


def guess_state(text: str):
    for state in INDIAN_STATES:
        if state.lower() in text.lower():
            return state
    return None


def stable_id(*parts) -> str:
    return hashlib.sha256("|".join(str(p) for p in parts).encode()).hexdigest()[:16]


def run(limit_per_topic: int = 15):
    lake = get_connection()
    total = 0
    for topic_slug, query in TOPIC_QUERIES.items():
        feed = feedparser.parse(GOOGLE_NEWS_RSS.format(query=quote(query)))
        for entry in feed.entries[:limit_per_topic]:
            publisher = entry.get("source", {}).get("title", "Unknown outlet")
            row_id = stable_id("news", entry.link)
            lake.execute(
                """INSERT OR REPLACE INTO raw_news
                   (id, headline, publisher, url, published_date, topic_keyword,
                    state_guess, ingested_at, source_dataset)
                   VALUES (?,?,?,?,?,?,?,?,?)""",
                (
                    row_id,
                    entry.title,
                    publisher,
                    entry.link,
                    entry.get("published", ""),
                    topic_slug,
                    guess_state(entry.title),
                    datetime.utcnow().isoformat(),
                    "Google News RSS",
                ),
            )
            total += 1
        print(f"[{topic_slug}] ingested {len(feed.entries[:limit_per_topic])} headlines")
    lake.commit()
    lake.close()
    print(f"Total news records ingested: {total}")


if __name__ == "__main__":
    run()
