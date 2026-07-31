import { Pool } from 'pg';
import { Case, StatEntry, CaseSource, LegalViolation, Politician, Company, DeclaredDonation, TenderRecord, DocumentedBusinessRelationship } from './types';

/*
  Real Postgres storage — replaces the file-based lowdb pilot store.
  The old store lost all data on every Render redeploy/restart because
  it wrote to a file on an ephemeral filesystem. This connects to a real
  Render Postgres database instead, so data survives deploys.

  DATABASE_URL must be set in your environment (Render's "Internal
  Database URL" from your Postgres instance's dashboard page).
*/

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: (process.env.DATABASE_URL?.includes('render.com') || process.env.DATABASE_URL?.includes('supabase.com')) ? { rejectUnauthorized: false } : undefined,
});

let schemaReady: Promise<void> | null = null;

function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = pool.query(`
      CREATE TABLE IF NOT EXISTS cases (
        id TEXT PRIMARY KEY,
        topic_slug TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        state TEXT,
        district TEXT,
        lat DOUBLE PRECISION,
        lng DOUBLE PRECISION,
        status TEXT NOT NULL,
        amount_involved_inr BIGINT,
        date_reported TEXT,
        sources JSONB NOT NULL DEFAULT '[]',
        legal_violations JSONB NOT NULL DEFAULT '[]',
        review_status TEXT NOT NULL DEFAULT 'pending_review',
        submitted_by TEXT,
        reviewed_by TEXT,
        review_notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS stats (
        id TEXT PRIMARY KEY,
        topic_slug TEXT NOT NULL,
        metric_type TEXT NOT NULL,
        label TEXT NOT NULL,
        value DOUBLE PRECISION NOT NULL,
        unit TEXT NOT NULL,
        scope TEXT,
        source_dataset TEXT NOT NULL,
        source_url TEXT,
        computed_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_cases_topic_status ON cases(topic_slug, review_status);
      CREATE INDEX IF NOT EXISTS idx_stats_topic ON stats(topic_slug);

      -- Public entity network: factual entity tables (publish immediately —
      -- these are declared facts from official filings, not accusations)
      CREATE TABLE IF NOT EXISTS politicians (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        constituency TEXT,
        party TEXT,
        source_url TEXT NOT NULL,
        source_note TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS companies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        cin TEXT,
        source_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS declared_donations (
        id TEXT PRIMARY KEY,
        donor_name TEXT NOT NULL,
        recipient_party TEXT NOT NULL,
        amount_inr BIGINT NOT NULL,
        fiscal_year TEXT NOT NULL,
        source_url TEXT NOT NULL,
        source_note TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS tender_records (
        id TEXT PRIMARY KEY,
        company_id TEXT,
        company_name TEXT NOT NULL,
        awarding_org TEXT NOT NULL,
        value_inr BIGINT,
        award_date TEXT,
        source_url TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      -- Public entity network: the ONLY table where two entities get
      -- linked. Unlike the tables above, this always starts as
      -- pending_review — a documented relationship still requires a human
      -- to confirm it before it's shown as connected on the public site.
      CREATE TABLE IF NOT EXISTS public_entity_network (
        id TEXT PRIMARY KEY,
        entity_a_type TEXT NOT NULL,
        entity_a_id TEXT NOT NULL,
        entity_a_label TEXT NOT NULL,
        entity_b_type TEXT NOT NULL,
        entity_b_id TEXT NOT NULL,
        entity_b_label TEXT NOT NULL,
        relationship_note TEXT NOT NULL,
        evidence_urls JSONB NOT NULL DEFAULT '[]',
        review_status TEXT NOT NULL DEFAULT 'pending_review',
        submitted_by TEXT,
        reviewed_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_network_status ON public_entity_network(review_status);
    `).then(() => {});
  }
  return schemaReady;
}

function rowToCase(row: any): Case {
  return {
    id: row.id,
    topic_slug: row.topic_slug,
    title: row.title,
    summary: row.summary,
    state: row.state ?? undefined,
    district: row.district ?? undefined,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    status: row.status,
    amount_involved_inr: row.amount_involved_inr ?? undefined,
    date_reported: row.date_reported ?? undefined,
    sources: row.sources as CaseSource[],
    legal_violations: row.legal_violations as LegalViolation[],
    review_status: row.review_status,
    submitted_by: row.submitted_by ?? undefined,
    reviewed_by: row.reviewed_by ?? undefined,
    review_notes: row.review_notes ?? undefined,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

function rowToStat(row: any): StatEntry {
  return {
    id: row.id,
    topic_slug: row.topic_slug,
    metric_type: row.metric_type,
    label: row.label,
    value: Number(row.value),
    unit: row.unit,
    scope: row.scope ?? undefined,
    source_dataset: row.source_dataset,
    source_url: row.source_url ?? undefined,
    computed_at: row.computed_at instanceof Date ? row.computed_at.toISOString() : row.computed_at,
  };
}

export async function insertCaseDraft(input: Omit<Case, 'review_status' | 'created_at'>): Promise<void> {
  await ensureSchema();
  await pool.query(
    `INSERT INTO cases (id, topic_slug, title, summary, state, district, lat, lng, status,
       amount_involved_inr, date_reported, sources, legal_violations, review_status, submitted_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'pending_review',$14)`,
    [
      input.id, input.topic_slug, input.title, input.summary, input.state ?? null, input.district ?? null,
      input.lat ?? null, input.lng ?? null, input.status, input.amount_involved_inr ?? null,
      input.date_reported ?? null, JSON.stringify(input.sources), JSON.stringify(input.legal_violations),
      input.submitted_by ?? null,
    ]
  );
}

export async function getCasesByReviewStatus(reviewStatus?: string): Promise<Case[]> {
  await ensureSchema();
  const result = reviewStatus
    ? await pool.query('SELECT * FROM cases WHERE review_status = $1 ORDER BY created_at DESC', [reviewStatus])
    : await pool.query('SELECT * FROM cases ORDER BY created_at DESC');
  return result.rows.map(rowToCase);
}

export async function getPublishedCasesByTopic(topicSlug: string): Promise<Case[]> {
  await ensureSchema();
  const result = await pool.query(
    "SELECT * FROM cases WHERE topic_slug = $1 AND review_status = 'published' ORDER BY created_at DESC",
    [topicSlug]
  );
  return result.rows.map(rowToCase);
}

export async function getCaseById(id: string): Promise<Case | null> {
  await ensureSchema();
  const result = await pool.query("SELECT * FROM cases WHERE id = $1 AND review_status = 'published'", [id]);
  return result.rows.length ? rowToCase(result.rows[0]) : null;
}

export async function approveCase(id: string, reviewedBy: string): Promise<boolean> {
  await ensureSchema();
  const result = await pool.query(
    "UPDATE cases SET review_status = 'published', reviewed_by = $2 WHERE id = $1",
    [id, reviewedBy]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function rejectCase(id: string, reviewedBy: string, notes: string): Promise<boolean> {
  await ensureSchema();
  const result = await pool.query(
    "UPDATE cases SET review_status = 'rejected', reviewed_by = $2, review_notes = $3 WHERE id = $1",
    [id, reviewedBy, notes]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function insertStat(input: Omit<StatEntry, 'computed_at'>): Promise<void> {
  await ensureSchema();
  await pool.query(
    `INSERT INTO stats (id, topic_slug, metric_type, label, value, unit, scope, source_dataset, source_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [input.id, input.topic_slug, input.metric_type, input.label, input.value, input.unit,
     input.scope ?? null, input.source_dataset, input.source_url ?? null]
  );
}

export async function getStats(topicSlug?: string, metricType?: string): Promise<StatEntry[]> {
  await ensureSchema();
  const conditions: string[] = [];
  const values: any[] = [];
  if (topicSlug) { conditions.push(`topic_slug = $${values.length + 1}`); values.push(topicSlug); }
  if (metricType) { conditions.push(`metric_type = $${values.length + 1}`); values.push(metricType); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await pool.query(`SELECT * FROM stats ${where} ORDER BY computed_at DESC`, values);
  return result.rows.map(rowToStat);
}

// --- Public entity network: factual entity records (published immediately) ---

function rowToPolitician(row: any): Politician {
  return { id: row.id, name: row.name, constituency: row.constituency ?? undefined, party: row.party ?? undefined,
    source_url: row.source_url, source_note: row.source_note, created_at: row.created_at?.toISOString?.() ?? row.created_at };
}

export async function insertPolitician(input: Omit<Politician, 'created_at'>): Promise<void> {
  await ensureSchema();
  await pool.query(
    `INSERT INTO politicians (id, name, constituency, party, source_url, source_note) VALUES ($1,$2,$3,$4,$5,$6)`,
    [input.id, input.name, input.constituency ?? null, input.party ?? null, input.source_url, input.source_note]
  );
}

export async function getPoliticians(): Promise<Politician[]> {
  await ensureSchema();
  const result = await pool.query('SELECT * FROM politicians ORDER BY name');
  return result.rows.map(rowToPolitician);
}

function rowToCompany(row: any): Company {
  return { id: row.id, name: row.name, cin: row.cin ?? undefined, source_url: row.source_url ?? undefined,
    created_at: row.created_at?.toISOString?.() ?? row.created_at };
}

export async function insertCompany(input: Omit<Company, 'created_at'>): Promise<void> {
  await ensureSchema();
  await pool.query(
    `INSERT INTO companies (id, name, cin, source_url) VALUES ($1,$2,$3,$4)`,
    [input.id, input.name, input.cin ?? null, input.source_url ?? null]
  );
}

export async function getCompanies(): Promise<Company[]> {
  await ensureSchema();
  const result = await pool.query('SELECT * FROM companies ORDER BY name');
  return result.rows.map(rowToCompany);
}

function rowToDonation(row: any): DeclaredDonation {
  return { id: row.id, donor_name: row.donor_name, recipient_party: row.recipient_party,
    amount_inr: Number(row.amount_inr), fiscal_year: row.fiscal_year, source_url: row.source_url,
    source_note: row.source_note, created_at: row.created_at?.toISOString?.() ?? row.created_at };
}

export async function insertDonation(input: Omit<DeclaredDonation, 'created_at'>): Promise<void> {
  await ensureSchema();
  await pool.query(
    `INSERT INTO declared_donations (id, donor_name, recipient_party, amount_inr, fiscal_year, source_url, source_note)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [input.id, input.donor_name, input.recipient_party, input.amount_inr, input.fiscal_year, input.source_url, input.source_note]
  );
}

export async function getDonations(): Promise<DeclaredDonation[]> {
  await ensureSchema();
  const result = await pool.query('SELECT * FROM declared_donations ORDER BY created_at DESC');
  return result.rows.map(rowToDonation);
}

function rowToTenderRecord(row: any): TenderRecord {
  return { id: row.id, company_id: row.company_id ?? undefined, company_name: row.company_name,
    awarding_org: row.awarding_org, value_inr: row.value_inr ? Number(row.value_inr) : undefined,
    award_date: row.award_date ?? undefined, source_url: row.source_url,
    created_at: row.created_at?.toISOString?.() ?? row.created_at };
}

export async function insertTenderRecord(input: Omit<TenderRecord, 'created_at'>): Promise<void> {
  await ensureSchema();
  await pool.query(
    `INSERT INTO tender_records (id, company_id, company_name, awarding_org, value_inr, award_date, source_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [input.id, input.company_id ?? null, input.company_name, input.awarding_org, input.value_inr ?? null,
     input.award_date ?? null, input.source_url]
  );
}

export async function getTenderRecords(): Promise<TenderRecord[]> {
  await ensureSchema();
  const result = await pool.query('SELECT * FROM tender_records ORDER BY created_at DESC');
  return result.rows.map(rowToTenderRecord);
}

// --- Public entity network: relationships (ALWAYS require human review) ---

function rowToRelationship(row: any): DocumentedBusinessRelationship {
  return {
    id: row.id, entity_a_type: row.entity_a_type, entity_a_id: row.entity_a_id, entity_a_label: row.entity_a_label,
    entity_b_type: row.entity_b_type, entity_b_id: row.entity_b_id, entity_b_label: row.entity_b_label,
    relationship_note: row.relationship_note, evidence_urls: row.evidence_urls,
    review_status: row.review_status, submitted_by: row.submitted_by ?? undefined,
    reviewed_by: row.reviewed_by ?? undefined, created_at: row.created_at?.toISOString?.() ?? row.created_at,
  };
}

export async function insertRelationshipDraft(input: Omit<DocumentedBusinessRelationship, 'review_status' | 'created_at'>): Promise<void> {
  await ensureSchema();
  await pool.query(
    `INSERT INTO public_entity_network
       (id, entity_a_type, entity_a_id, entity_a_label, entity_b_type, entity_b_id, entity_b_label,
        relationship_note, evidence_urls, review_status, submitted_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending_review',$10)`,
    [input.id, input.entity_a_type, input.entity_a_id, input.entity_a_label, input.entity_b_type,
     input.entity_b_id, input.entity_b_label, input.relationship_note, JSON.stringify(input.evidence_urls),
     input.submitted_by ?? null]
  );
}

export async function getRelationshipsByStatus(status?: string): Promise<DocumentedBusinessRelationship[]> {
  await ensureSchema();
  const result = status
    ? await pool.query('SELECT * FROM public_entity_network WHERE review_status = $1 ORDER BY created_at DESC', [status])
    : await pool.query('SELECT * FROM public_entity_network ORDER BY created_at DESC');
  return result.rows.map(rowToRelationship);
}

export async function getPublishedNetwork(): Promise<DocumentedBusinessRelationship[]> {
  await ensureSchema();
  const result = await pool.query("SELECT * FROM public_entity_network WHERE review_status = 'published' ORDER BY created_at DESC");
  return result.rows.map(rowToRelationship);
}

export async function approveRelationship(id: string, reviewedBy: string): Promise<boolean> {
  await ensureSchema();
  const result = await pool.query(
    "UPDATE public_entity_network SET review_status = 'published', reviewed_by = $2 WHERE id = $1",
    [id, reviewedBy]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function rejectRelationship(id: string, reviewedBy: string): Promise<boolean> {
  await ensureSchema();
  const result = await pool.query(
    "UPDATE public_entity_network SET review_status = 'rejected', reviewed_by = $2 WHERE id = $1",
    [id, reviewedBy]
  );
  return (result.rowCount ?? 0) > 0;
}
