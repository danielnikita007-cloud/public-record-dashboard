"""
Pulls forest/environmental clearance records from the government's own Open
Government Data (OGD) platform — data.gov.in — which republishes PARIVESH
clearance data through a documented, free, public API.

This is the LOW-RISK half of the pipeline: it only handles structured,
already-public government records (project name, location, clearance type,
dates). It never writes claims of wrongdoing — it just creates a draft
case so an editor can look up the record, decide if it's worth writing up,
and add legal/context notes before publishing.

Every record this script creates lands in review_status='pending_review'
via the same /api/cases/draft endpoint a human uses. Nothing it does
ever touches the public site directly.
"""
import os
import requests
from dotenv import load_dotenv

load_dotenv()

DASHBOARD_API_URL = os.getenv("DASHBOARD_API_URL")
DATA_GOV_API_KEY = os.getenv("DATA_GOV_API_KEY")
DATA_GOV_RESOURCE_ID = os.getenv("DATA_GOV_RESOURCE_ID")

OGD_BASE = "https://api.data.gov.in/resource"

# Keywords that flag a record as worth an editor's attention.
# Adjust freely — this is just a first-pass filter, not a verdict.
WATCH_KEYWORDS = ["diversion", "mining", "compensatory afforestation", "violation"]


def fetch_records(limit: int = 50):
    if not DATA_GOV_API_KEY or not DATA_GOV_RESOURCE_ID:
        print("Missing DATA_GOV_API_KEY or DATA_GOV_RESOURCE_ID in .env — see .env.example for how to get them.")
        return []

    url = f"{OGD_BASE}/{DATA_GOV_RESOURCE_ID}"
    params = {"api-key": DATA_GOV_API_KEY, "format": "json", "limit": limit}
    resp = requests.get(url, params=params, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    return data.get("records", [])


def record_to_draft(record: dict) -> dict | None:
    """Map a data.gov.in record into the dashboard's draft-case shape.
    Field names below are typical for this dataset but MAY DIFFER —
    print(record) once and adjust the .get() keys to match what you
    actually receive before relying on this in production."""

    project_name = record.get("project_name") or record.get("proposal_name")
    state = record.get("state") or record.get("state_name")
    if not project_name:
        return None

    summary_text = (
        f"[AUTO-DRAFTED FROM data.gov.in — EDITOR MUST VERIFY BEFORE PUBLISHING] "
        f"Government clearance record lists project '{project_name}' in {state or 'an unspecified state'}. "
        f"Raw record fields: {record}"
    )

    return {
        "title": f"Forest clearance record: {project_name}",
        "summary": summary_text,
        "topic_slug": "deforestation",
        "state": state,
        "status": "alleged",
        "submitted_by": "auto-scraper-parivesh",
        "sources": [
            {
                "url": "https://parivesh.nic.in/",
                "publisher": "PARIVESH / data.gov.in (Ministry of Environment, Forest & Climate Change)",
                "source_tier": "primary_govt",
                "published_date": record.get("date") or "",
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
    records = fetch_records()
    print(f"Fetched {len(records)} records from data.gov.in")
    for record in records:
        record_str = str(record).lower()
        if not any(k in record_str for k in WATCH_KEYWORDS):
            continue
        draft = record_to_draft(record)
        if draft:
            submit_draft(draft)


if __name__ == "__main__":
    run()
