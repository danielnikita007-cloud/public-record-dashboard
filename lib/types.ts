export type SourceTier = 'primary_govt' | 'court_record' | 'independent_journalist' | 'news_outlet';

export interface CaseSource {
  url: string;
  publisher: string;
  source_tier: SourceTier;
  published_date?: string;
}

export type LegalStatus = 'alleged' | 'FIR_filed' | 'chargesheeted' | 'convicted' | 'acquitted' | 'pending';

export interface LegalViolation {
  constitutional_article?: string;
  statute?: string;
  violation_description: string;
  legal_status: LegalStatus;
}

export type ReviewStatus = 'draft' | 'pending_review' | 'published' | 'rejected';
export type CaseStatus = 'alleged' | 'under_investigation' | 'court_confirmed' | 'closed';

export interface Case {
  id: string;
  topic_slug: string;
  title: string;
  summary: string;
  state?: string;
  district?: string;
  lat?: number;
  lng?: number;
  status: CaseStatus;
  amount_involved_inr?: number;
  date_reported?: string;
  sources: CaseSource[];
  legal_violations: LegalViolation[];
  review_status: ReviewStatus;
  submitted_by?: string;
  reviewed_by?: string;
  review_notes?: string;
  created_at: string;
}

/*
  Aggregate numeric statistics — factual counts/sums computed directly from
  public government records (e.g. "Vendor X appears as awardee in N contracts
  totaling ₹Y in the CPPP dataset"). These are NOT narrative claims about
  wrongdoing, so unlike `Case` entries they do not require human review
  before publishing — a count is either accurate to the source data or not,
  there's no editorial judgment call being made. They always carry a
  `source_dataset` and `computed_at` so readers can trace the number back
  to where it came from and when it was last refreshed.
*/
export type StatMetricType =
  | 'vendor_contract_count'      // how many contracts a named vendor won
  | 'vendor_contract_value'      // total ₹ value awarded to a named vendor
  | 'single_bid_rate'            // % of tenders in a scope with only 1 bidder
  | 'org_award_concentration'    // how concentrated an organisation's awards are
  | 'short_window_rate'          // % of tenders with a bid window under N days
  | 'topic_case_count';          // published case counts per topic (for the homepage)

export interface StatEntry {
  id: string;
  topic_slug: string;
  metric_type: StatMetricType;
  label: string;              // human-readable, e.g. "MegaWin Contractors Ltd"
  value: number;
  unit: 'count' | 'inr' | 'percent';
  scope?: string;             // e.g. a state, organisation, or "national"
  source_dataset: string;     // e.g. "CPPP aoc_tenders.db via data.gov.in"
  source_url?: string;
  computed_at: string;        // ISO timestamp of when this number was generated
}

/*
  Public entity network — factual records about politicians, companies,
  declared donations, and tender awards, plus a separate, human-reviewed
  layer for any DOCUMENTED RELATIONSHIP between them.

  Terminology is deliberately neutral throughout: this describes what a
  primary source records, not a conclusion about wrongdoing.
    "Scam"              -> not used. See `AuditObservation` (CAG finding) or
                            `SingleBidContract` (a procurement pattern).
    "Illegal land grab" -> `DisputedAcquisitionRecord` (a compensation/transfer
                            discrepancy between two official figures).
    "Corruption link"    -> `DocumentedBusinessRelationship` (a sourced,
                            factual relationship — e.g. a declared donation
                            or a company directorship — not an accusation).
*/

export interface Politician {
  id: string;
  name: string;
  constituency?: string;
  party?: string;
  source_url: string;      // the ECI affidavit or official record this came from
  source_note: string;
  created_at: string;
}

export interface Company {
  id: string;
  name: string;
  cin?: string;            // Corporate Identification Number, if known
  source_url?: string;
  created_at: string;
}

export interface DeclaredDonation {
  id: string;
  donor_name: string;      // company or individual, as declared
  recipient_party: string;
  amount_inr: number;
  fiscal_year: string;
  source_url: string;      // Election Commission / ADR filing
  source_note: string;
  created_at: string;
}

export interface TenderRecord {
  id: string;
  company_id?: string;
  company_name: string;
  awarding_org: string;
  value_inr?: number;
  award_date?: string;
  source_url: string;
  created_at: string;
}

export type EntityType = 'politician' | 'company' | 'donation' | 'tender';
export type NetworkReviewStatus = 'pending_review' | 'published' | 'rejected';

/*
  A DocumentedBusinessRelationship is the only place two entities get
  connected — and it ALWAYS starts as pending_review. Same rule as
  every case on this site: a human must read the underlying sources and
  confirm the relationship before it appears publicly. This describes a
  connection ("X donated to Y the same year Z won a tender"), never an
  allegation of wrongdoing.
*/
export interface DocumentedBusinessRelationship {
  id: string;
  entity_a_type: EntityType;
  entity_a_id: string;
  entity_a_label: string;   // denormalized display name, so the review UI doesn't need joins
  entity_b_type: EntityType;
  entity_b_id: string;
  entity_b_label: string;
  relationship_note: string;  // factual description, e.g. "Donation recorded same fiscal year as tender award"
  evidence_urls: string[];
  review_status: NetworkReviewStatus;
  submitted_by?: string;
  reviewed_by?: string;
  created_at: string;
}
