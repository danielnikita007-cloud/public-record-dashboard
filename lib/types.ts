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
