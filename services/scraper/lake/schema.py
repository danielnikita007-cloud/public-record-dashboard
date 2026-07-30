"""
Defines the local data-lake schema — a single SQLite file
(services/scraper/data/warehouse.db) that holds RAW records from every
source, before any insight/aggregation is generated from them.

Why a separate "lake" from the individual scrapers:
Each source (tenders, forest clearances, news, fund data) used to be
scanned in isolation, one script at a time. Storing everything in one
place first means later scripts can ask cross-source questions —
"was a forest clearance AND an unusually large single-bid tender both
recorded in the same district within the same few months?" — which no
single source's own script could answer on its own.

This file only ever stores what a source ACTUALLY published — no
interpretation, no claims. All the "is this worth flagging" judgment
happens later, in generate_insights.py, and any narrative conclusion
still goes through your normal /admin/review queue.
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "warehouse.db")


SCHEMA = """
CREATE TABLE IF NOT EXISTS raw_tenders (
    id TEXT PRIMARY KEY,
    title TEXT,
    org_name TEXT,
    state TEXT,
    detail_url TEXT,
    aoc_date TEXT,
    closing_date TEXT,
    num_bids INTEGER,
    winner TEXT,
    contract_value_inr REAL,
    ingested_at TEXT,
    source_dataset TEXT
);

CREATE TABLE IF NOT EXISTS raw_forest_clearances (
    id TEXT PRIMARY KEY,
    project_name TEXT,
    state TEXT,
    district TEXT,
    clearance_type TEXT,
    clearance_date TEXT,
    area_hectares REAL,
    detail_url TEXT,
    ingested_at TEXT,
    source_dataset TEXT
);

CREATE TABLE IF NOT EXISTS raw_news (
    id TEXT PRIMARY KEY,
    headline TEXT,
    publisher TEXT,
    url TEXT UNIQUE,
    published_date TEXT,
    topic_keyword TEXT,
    state_guess TEXT,
    ingested_at TEXT,
    source_dataset TEXT
);

CREATE TABLE IF NOT EXISTS raw_fund_records (
    id TEXT PRIMARY KEY,
    scheme_name TEXT,
    state TEXT,
    district TEXT,
    fiscal_year TEXT,
    amount_released_inr REAL,
    amount_utilized_inr REAL,
    detail_url TEXT,
    ingested_at TEXT,
    source_dataset TEXT
);

CREATE TABLE IF NOT EXISTS raw_parliament_qa (
    id TEXT PRIMARY KEY,
    question_title TEXT,
    ministry TEXT,
    session TEXT,
    answer_summary TEXT,
    url TEXT UNIQUE,
    answered_date TEXT,
    topic_keyword TEXT,
    ingested_at TEXT,
    source_dataset TEXT
);
"""


def get_connection():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.executescript(SCHEMA)
    return conn


if __name__ == "__main__":
    conn = get_connection()
    print(f"Data lake ready at {os.path.abspath(DB_PATH)}")
    conn.close()
