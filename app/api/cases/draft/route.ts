import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getDb } from '@/lib/db';
import { Case } from '@/lib/types';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, summary, topic_slug, state, district, lat, lng, status, amount_involved_inr, date_reported, sources, legal_violations, submitted_by } = body;

  if (!title || !summary || !topic_slug) {
    return NextResponse.json({ error: 'Title, summary, and topic are required.' }, { status: 400 });
  }
  if (!sources || sources.length === 0 || sources.some((s: any) => !s.url || !s.publisher)) {
    return NextResponse.json({ error: 'At least one source with a URL and publisher is required for every case.' }, { status: 400 });
  }

  const db = await getDb();
  const newCase: Case = {
    id: nanoid(10),
    topic_slug,
    title,
    summary,
    state,
    district,
    lat,
    lng,
    status: status || 'alleged',
    amount_involved_inr,
    date_reported,
    sources,
    legal_violations: legal_violations || [],
    review_status: 'pending_review',
    submitted_by: submitted_by || 'anonymous',
    created_at: new Date().toISOString(),
  };

  db.data!.cases.push(newCase);
  await db.write();

  return NextResponse.json({ status: 'submitted', caseId: newCase.id });
}
