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

export type StatMetricType =
  | 'vendor_contract_count'
  | 'vendor_contract_value'
  | 'single_bid_rate'
  | 'org_award_concentration'
  | 'short_window_rate'
  | 'topic_case_count';

export interface StatEntry {
  id: string;
  topic_slug: string;
  metric_type: StatMetricType;
  label: string;
  value: number;
  unit: 'count' | 'inr' | 'percent';
  scope?: string;
  source_dataset: string;
  source_url?: string;
  computed_at: string;
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
  source_url: string;
  source_note: string;
  created_at: string;
}

export interface Company {
  id: string;
  name: string;
  cin?: string;
  source_url?: string;
  created_at: string;
}

export interface DeclaredDonation {
  id: string;
  donor_name: string;
  recipient_party: string;
  amount_inr: number;
  fiscal_year: string;
  source_url: string;
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

export interface DocumentedBusinessRelationship {
  id: string;
  entity_a_type: EntityType;
  entity_a_id: string;
  entity_a_label: string;
  entity_b_type: EntityType;
  entity_b_id: string;
  entity_b_label: string;
  relationship_note: string;
  evidence_urls: string[];
  review_status: NetworkReviewStatus;
  submitted_by?: string;
  reviewed_by?: string;
  created_at: string;
}
