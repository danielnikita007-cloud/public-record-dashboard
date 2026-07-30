"""
Runs the full data-lake pipeline in order:
  1. Ingest tenders (from your local aoc_tenders.db)
  2. Ingest forest clearances (from data.gov.in, if configured)
  3. Ingest news headlines
  4. Ingest fund data (if configured)
  5. Generate insights (numeric stats published immediately,
     correlation candidates sent to your review queue)

Run this from the services/scraper folder:
    python -m lake.run_pipeline

(Uses `python -m` because this script imports from the `lake` package —
running it directly as `python lake/run_pipeline.py` won't resolve the
imports correctly.)
"""
from lake import ingest_tenders, ingest_forest_clearances, ingest_news, ingest_fund_data, generate_insights


def main():
    print("=== 1/5: Ingesting tenders ===")
    ingest_tenders.run()

    print("\n=== 2/5: Ingesting forest clearances ===")
    ingest_forest_clearances.run()

    print("\n=== 3/5: Ingesting news headlines ===")
    ingest_news.run()

    print("\n=== 4/5: Ingesting fund data ===")
    ingest_fund_data.run()

    print("\n=== 5/5: Generating insights ===")
    generate_insights.run()

    print("\nDone. Numeric stats are live on your dashboard now. "
          "Any correlation candidates are waiting in /admin/review.")


if __name__ == "__main__":
    main()
