"""
Pulls forest/environmental clearance records from data.gov.in (the same
OGD API used in scrapers/parivesh_ogd.py) and stores them as RAW records
in the data lake, for later cross-referencing against tenders and news.

Requires DATA_GOV_API_KEY and DATA_GOV_RESOURCE_ID in your .env — see
.env.example. If you haven't set these up yet, this script will just
print instructions and exit; the rest of the lake still works fine
without it (news + tenders don't need this key).
"""
import os
import hashlib
from datetime import datetime
import requests
from dotenv import load_dotenv
from lake.schema import get_connection

load_dotenv()

DATA_GOV_API_KEY = os.getenv("DATA_GOV_API_KEY")
DATA_GOV_RESOURCE_ID = os.getenv("DATA_GOV_RESOURCE_ID")
OGD_BASE = "https://api.data.gov.in/resource"


def stable_id(*parts) -> str:
    return hashlib.sha256("|".join(str(p) for p in parts).encode()).hexdigest()[:16]


def fetch_records(limit: int = 500):
    url = f"{OGD_BASE}/{DATA_GOV_RESOURCE_ID}"
    params = {"api-key": DATA_GOV_API_KEY, "format": "json", "limit": limit}
    resp = requests.get(url, params=params, timeout=30)
    resp.raise_for_status()
    return resp.json().get("records", [])


def run():
    if not DATA_GOV_API_KEY or not DATA_GOV_RESOURCE_ID:
        print("Missing DATA_GOV_API_KEY or DATA_GOV_RESOURCE_ID in .env.")
        print("Get a free key at https://data.gov.in -> account -> API Keys.")
        print("Skipping forest-clearance ingestion (news + tenders still work without this).")
        return

    records = fetch_records()
    lake = get_connection()
    ingested = 0
    for record in records:
        project_name = record.get("project_name") or record.get("proposal_name")
        if not project_name:
            continue
        row_id = stable_id("forest", project_name, record.get("state", ""))
        lake.execute(
            """INSERT OR REPLACE INTO raw_forest_clearances
               (id, project_name, state, district, clearance_type, clearance_date,
                area_hectares, detail_url, ingested_at, source_dataset)
               VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (
                row_id,
                project_name,
                record.get("state") or record.get("state_name"),
                record.get("district"),
                record.get("clearance_type") or record.get("category"),
                record.get("date"),
                None,
                "https://parivesh.nic.in/",
                datetime.utcnow().isoformat(),
                "PARIVESH via data.gov.in",
            ),
        )
        ingested += 1
    lake.commit()
    lake.close()
    print(f"Ingested {ingested} forest clearance records into the data lake.")


if __name__ == "__main__":
    run()
