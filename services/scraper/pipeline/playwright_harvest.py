"""
Playwright-based harvesters for JavaScript-rendered government portals.

WHY PLAYWRIGHT: our earlier plain-HTTP scraper against cag.gov.in returned
0 results across every topic, because the report listing is rendered
client-side by JavaScript — requests/BeautifulSoup only ever see an empty
page skeleton. Playwright runs a real browser engine, so it sees the page
a human sees.

SETUP (one time):
    pip install playwright
    playwright install chromium

These harvesters COLLECT LINKS ONLY. They do not parse claims or write
case summaries — the harvested PDF URLs are handed to pdf_ingest.py, and
anything narrative still goes through your /admin/review queue.

RATE LIMITING: a deliberate delay is applied between page loads. These are
public government servers; there is no upside to hammering them and a real
downside (IP blocks) that would cost you the source entirely.
"""
import asyncio
import os
import re
from urllib.parse import urljoin

PAGE_DELAY_SECONDS = 2.0
NAV_TIMEOUT_MS = 45_000


async def _harvest_pdf_links(url: str, link_pattern: str, max_pages: int = 5,
                             next_selector: str | None = None) -> list[dict]:
    """Load a JS-rendered page, wait for content, collect matching links."""
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        raise RuntimeError(
            "Playwright not installed. Run:\n"
            "    pip install playwright\n"
            "    playwright install chromium"
        )

    results: list[dict] = []
    seen: set[str] = set()

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        page.set_default_navigation_timeout(NAV_TIMEOUT_MS)

        try:
            await page.goto(url, wait_until="networkidle")
        except Exception as e:
            await browser.close()
            raise RuntimeError(f"Could not load {url}: {e}")

        for page_num in range(max_pages):
            # Give client-side rendering a moment to finish populating the list
            await page.wait_for_timeout(1500)

            anchors = await page.eval_on_selector_all(
                "a",
                "els => els.map(e => ({href: e.href, text: (e.innerText || '').trim()}))",
            )

            for a in anchors:
                href = a.get("href") or ""
                text = a.get("text") or ""
                if not href or href in seen:
                    continue
                if re.search(link_pattern, href, re.I) or re.search(link_pattern, text, re.I):
                    seen.add(href)
                    results.append({"url": href, "title": text[:300]})

            if not next_selector:
                break
            try:
                nxt = await page.query_selector(next_selector)
                if not nxt:
                    break
                await nxt.click()
                await asyncio.sleep(PAGE_DELAY_SECONDS)
            except Exception:
                break

        await browser.close()

    return results


async def harvest_cag_reports(max_pages: int = 5) -> list[dict]:
    """CAG audit report listing — JS-rendered, hence Playwright."""
    url = "https://cag.gov.in/en/audit-report"
    print(f"  Loading {url} with a real browser engine...")
    links = await _harvest_pdf_links(url, r"\.pdf|audit-report/details", max_pages=max_pages)
    print(f"  Harvested {len(links)} candidate CAG report links.")
    return links


async def harvest_parivesh(max_pages: int = 3) -> list[dict]:
    """PARIVESH clearance listing, scraped directly rather than via the
    data.gov.in API (which needs a key you had trouble registering for)."""
    url = "https://parivesh.nic.in/"
    print(f"  Loading {url} with a real browser engine...")
    try:
        links = await _harvest_pdf_links(url, r"clearance|proposal|\.pdf", max_pages=max_pages)
    except RuntimeError as e:
        print(f"  PARIVESH harvest failed: {e}")
        return []
    print(f"  Harvested {len(links)} candidate PARIVESH links.")
    return links


def save_links(links: list[dict], out_path: str):
    """Write harvested URLs to a plain text file the PDF ingester reads."""
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("# Auto-harvested links. Review before ingesting.\n")
        for link in links:
            f.write(f"{link['url']}\n")
    print(f"  Wrote {len(links)} links to {out_path}")


async def main():
    here = os.path.dirname(__file__)

    cag = await harvest_cag_reports()
    if cag:
        save_links(cag, os.path.join(here, "cag_report_urls.txt"))

    await asyncio.sleep(PAGE_DELAY_SECONDS)

    parivesh = await harvest_parivesh()
    if parivesh:
        save_links(parivesh, os.path.join(here, "parivesh_urls.txt"))

    if not cag and not parivesh:
        print("\nNo links harvested. Government portals change their markup often —")
        print("open the URL in a normal browser and check whether the listing still exists")
        print("at that address before assuming the scraper is broken.")


if __name__ == "__main__":
    asyncio.run(main())
