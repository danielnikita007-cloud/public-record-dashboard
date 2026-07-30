"""
Ingests government scheme fund-release/utilization data into the lake.
This is deliberately generic — there isn't one single "the" fund dataset;
which one matters depends on what you're tracking (CAMPA/compensatory
afforestation funds pair naturally with the deforestation topic; MGNREGA
or PMAY fund utilization pairs with land-allocation/corruption topics).

Set FUND_DATASET_RESOURCE_ID in .env to whichever data.gov.in dataset
you want (search data.gov.in for e.g. "CAMPA fund utilization" or
"MGNREGA fund release" to find one and copy its resource_id from the
dataset's own API tab, same way as DATA_GOV_RESOURCE_ID).

Field names in `record.get(...)` below are a best guess and will likely
need small adjustments once you see a real dataset's actual column names
— run once, print(records[0]) to check, and adjust.
"""
import os
import hashlib
from datetime import datetime
import requests
from dotenv import load_dotenv
from lake.schema import get_connection

load_dotenv()

DATA_GOV_API_KEY = os.getenv("DATA_GOV_API_KEY")
FUND_DATASET_RESOURCE_ID = os.getenv("FUND_DATASET_RESOURCE_ID")
OGD_BASE = "https://api.data.gov.in/resource"


def stable_id(*parts) -> str:
    return hashlib.sha256("|".join(str(p) for p in parts).encode()).hexdigest()[:16]


def to_float(raw):
    if raw is None:
        return None
    try:
        return float(str(raw).replace(",", ""))
    except ValueError:
        return None


def run():
    if not DATA_GOV_API_KEY or not FUND_DATASET_RESOURCE_ID:
        print("Missing DATA_GOV_API_KEY or FUND_DATASET_RESOURCE_ID in .env.")
        print("Find a relevant fund dataset at data.gov.in (e.g. search 'CAMPA' or 'MGNREGA fund') and set its resource_id.")
        print("Skipping fund ingestion (rest of the lake still works without this).")
        return

    url = f"{OGD_BASE}/{FUND_DATASET_RESOURCE_ID}"
    resp = requests.get(url, params={"api-key": DATA_GOV_API_KEY, "format": "json", "limit": 500}, timeout=30)
    resp.raise_for_status()
    records = resp.json().get("records", [])

    if records:
        print("Sample record field names (check these match the .get() calls below):")
        print(list(records[0].keys()))

    lake = get_connection()
    ingested = 0
    for record in records:
        scheme = record.get("scheme_name") or record.get("scheme")
        state = record.get("state") or record.get("state_name")
        if not scheme:
            continue
        row_id = stable_id("fund", scheme, state, record.get("fiscal_year", ""))
        lake.execute(
            """INSERT OR REPLACE INTO raw_fund_records
               (id, scheme_name, state, district, fiscal_year, amount_released_inr,
                amount_utilized_inr, detail_url, ingested_at, source_dataset)
               VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (
                row_id,
                scheme,
                state,
                record.get("district"),
                record.get("fiscal_year") or record.get("year"),
                to_float(record.get("amount_released")),
                to_float(record.get("amount_utilized")),
                "https://data.gov.in/",
                datetime.utcnow().isoformat(),
                f"data.gov.in resource {FUND_DATASET_RESOURCE_ID}",
            ),
        )
        ingested += 1
    lake.commit()
    lake.close()
    print(f"Ingested {ingested} fund records into the data lake.")


if __name__ == "__main__":
    run()
