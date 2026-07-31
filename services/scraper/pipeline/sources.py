"""
Source registry for the unified 10-year ingestion pipeline.

Every source is tagged with its REAL reachability status, verified rather
than assumed. Sources marked BLOCKED are deliberately not implemented —
writing a scraper against a CAPTCHA-gated or paywalled endpoint produces a
script that silently returns zero rows, which is worse than no script at
all because it looks like it worked.

If a BLOCKED source becomes available (you obtain an API key, a paid
account, or the portal changes), move it to AVAILABLE and implement the
corresponding module — the orchestrator picks it up automatically.
"""
from enum import Enum
from dataclasses import dataclass, field
from typing import Optional


class Status(str, Enum):
    AVAILABLE = "available"          # confirmed reachable, implemented
    NEEDS_KEY = "needs_key"          # reachable, but you must supply a credential
    NEEDS_MANUAL = "needs_manual"    # reachable only via a one-time manual download
    BLOCKED = "blocked"              # not obtainable — reason recorded below


@dataclass
class Source:
    key: str
    name: str
    module: int                      # which investigative module (1-5)
    status: Status
    note: str
    url: Optional[str] = None
    env_var: Optional[str] = None


SOURCES: list[Source] = [
    # --- Module 1: Infrastructure & Road Development ---
    Source(
        key="cppp_tenders", name="Central Public Procurement Portal (award records)",
        module=1, status=Status.NEEDS_MANUAL,
        note="Bulk dataset (~4.9M award records) published openly at tender.sarthaksidhant.com. "
             "Download aoc_tenders.db once, place in services/scraper/data/. The live CPPP portal "
             "itself does not expose a bulk REST endpoint for historical awards.",
        url="https://tender.sarthaksidhant.com/",
    ),
    Source(
        key="cag_audit_pdfs", name="CAG audit report PDFs",
        module=1, status=Status.NEEDS_MANUAL,
        note="cag.gov.in renders its report LIST via JavaScript, so a plain HTTP scraper sees an "
             "empty page (confirmed: our earlier scraper returned 0 results across all topics). "
             "Individual PDFs download fine once you have their URLs. Supply URLs in "
             "pipeline/cag_report_urls.txt (one per line) and this pipeline will parse them.",
        url="https://cag.gov.in/en/audit-report",
    ),

    # --- Module 2: Environment, Forestry & Reforestation ---
    Source(
        key="global_forest_watch", name="Global Forest Watch (tree cover loss)",
        module=2, status=Status.NEEDS_KEY,
        note="Genuine public API with historical annual tree-cover-loss data by admin region — "
             "the single best fit for 10-year reforestation/canopy tracking. Free API key from "
             "globalforestwatch.org. This is the highest-value environment source available.",
        url="https://data-api.globalforestwatch.org/",
        env_var="GFW_API_KEY",
    ),
    Source(
        key="parivesh_ogd", name="PARIVESH forest/environment clearances (via data.gov.in)",
        module=2, status=Status.NEEDS_KEY,
        note="data.gov.in republishes MoEFCC clearance data through a documented REST API. "
             "Requires a free data.gov.in API key plus the dataset's resource_id.",
        url="https://data.gov.in/",
        env_var="DATA_GOV_API_KEY",
    ),
    Source(
        key="egreenwatch_campa", name="e-Green Watch (CAMPA fund disbursements)",
        module=2, status=Status.BLOCKED,
        note="Portal requires authenticated session for state-level fund reports; no public bulk "
             "export. CAMPA findings are instead obtainable via CAG audit PDFs (see cag_audit_pdfs) "
             "— e.g. the Uttarakhand ₹13.86cr diversion finding already on this dashboard.",
        url="https://egreenwatch.nic.in/",
    ),

    # --- Module 3: Land Acquisition & Compensation ---
    Source(
        key="bhoomi_rashi", name="Bhoomi Rashi (NHAI land acquisition)",
        module=3, status=Status.BLOCKED,
        note="Login-gated; designed for departmental users, not public bulk access. Land "
             "compensation discrepancies are instead reachable through CAG land-audit PDFs and "
             "court judgments already covered by other modules.",
        url="https://bhoomirashi.gov.in/",
    ),
    Source(
        key="state_land_records", name="State land records (Bhoomi / Bhulekh / BhuNaksha)",
        module=3, status=Status.BLOCKED,
        note="Each state runs a separate portal, most requiring a survey number to query one parcel "
             "at a time, many with CAPTCHAs. There is no bulk historical export. Building 28+ "
             "individual scrapers for single-parcel lookups would not produce an aggregate dataset.",
    ),

    # --- Module 4: Bureaucratic Integrity ---
    Source(
        key="cvc_annual_reports", name="Central Vigilance Commission annual reports",
        module=4, status=Status.NEEDS_MANUAL,
        note="CVC publishes annual reports as PDFs with tabular disciplinary-case data. Direct PDF "
             "links are stable once known. Supply URLs in pipeline/cvc_report_urls.txt.",
        url="https://cvc.gov.in/",
    ),
    Source(
        key="ecourts", name="e-Courts judgment search",
        module=4, status=Status.BLOCKED,
        note="CAPTCHA-protected by design, as an explicit anti-scraping measure. Bypassing it is "
             "both a terms-of-service violation and something this pipeline will not attempt. "
             "Individual judgments remain accessible manually, and Indian Kanoon offers a "
             "searchable mirror for case lookup by a human researcher.",
        url="https://ecourts.gov.in/",
    ),

    # --- Module 5: Corporate & Financial Irregularities ---
    Source(
        key="cppp_corporate_analysis", name="Vendor concentration analysis (derived from CPPP)",
        module=5, status=Status.AVAILABLE,
        note="Single-bid anomalies, HHI concentration, and repeat-winner patterns are all "
             "computable from the CPPP award data you already hold locally — no external call "
             "needed. This is the fully working part of Module 5.",
    ),
    Source(
        key="mca21", name="MCA21 corporate master data (director/shell linkages)",
        module=5, status=Status.BLOCKED,
        note="MCA charges per-document fees and requires an authenticated account; there is no free "
             "bulk API for director-company linkage data. Third-party mirrors (ZaubaCorp, "
             "InstaFinancials) prohibit scraping in their terms of service. Director-network "
             "analysis needs a paid data licence — not a code problem.",
        url="https://www.mca.gov.in/",
    ),
    Source(
        key="sebi_orders", name="SEBI enforcement orders",
        module=5, status=Status.NEEDS_MANUAL,
        note="Enforcement orders are public PDFs, but there is no bulk index API. Supply order URLs "
             "in pipeline/sebi_order_urls.txt to have them parsed.",
        url="https://www.sebi.gov.in/enforcement.html",
    ),
]


MODULE_NAMES = {
    1: "Infrastructure & Road Development",
    2: "Environment, Forestry & Reforestation",
    3: "Land Acquisition & Compensation",
    4: "Bureaucratic Integrity & Administrative Corruption",
    5: "Corporate & Financial Irregularities",
}


def by_status(status: Status) -> list[Source]:
    return [s for s in SOURCES if s.status == status]


def print_registry():
    print("=" * 78)
    print("SOURCE REGISTRY — what this pipeline can and cannot reach")
    print("=" * 78)
    for module_num, module_name in MODULE_NAMES.items():
        print(f"\nModule {module_num}: {module_name}")
        for s in [s for s in SOURCES if s.module == module_num]:
            marker = {
                Status.AVAILABLE: "[OK]      ",
                Status.NEEDS_KEY: "[NEEDS KEY]",
                Status.NEEDS_MANUAL: "[MANUAL]  ",
                Status.BLOCKED: "[BLOCKED] ",
            }[s.status]
            print(f"  {marker} {s.name}")
            if s.env_var:
                print(f"             set {s.env_var} in .env")
    print()


if __name__ == "__main__":
    print_registry()
