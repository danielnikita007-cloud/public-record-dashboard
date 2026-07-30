"""
Entry point for running both scrapers on a schedule.

Local/manual use:
    python main.py --once        # run both scrapers a single time and exit

Scheduled use (e.g. as a Render Background Worker or a cron job):
    python main.py                # runs every 6 hours by default
"""
import sys
import time
from apscheduler.schedulers.blocking import BlockingScheduler
from scrapers import parivesh_ogd, news_headline_scanner


def run_all():
    print("--- Running PARIVESH/data.gov.in scraper ---")
    try:
        parivesh_ogd.run()
    except Exception as e:
        print(f"parivesh_ogd scraper failed: {e}")

    print("--- Running news headline scanner ---")
    try:
        news_headline_scanner.run()
    except Exception as e:
        print(f"news_headline_scanner failed: {e}")


if __name__ == "__main__":
    if "--once" in sys.argv:
        run_all()
    else:
        scheduler = BlockingScheduler()
        scheduler.add_job(run_all, "interval", hours=6, next_run_time=None)
        print("Scraper scheduler started — running every 6 hours. Ctrl+C to stop.")
        run_all()  # run once immediately on startup
        scheduler.start()
