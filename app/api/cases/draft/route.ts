import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { insertCaseDraft } from '@/lib/db';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, summary, topic_slug, state, district, lat, lng, status, amount_involved_inr, date_reported, sources, legal_violations, submitted_by } = body;

  if (!title || !summary || !topic_slug) {
    return NextResponse.json({ error: 'Title, summary, and topic are required.' }, { status: 400 });
  }
  if (!sources || sources.length === 0 || sources.some((s: any) => !s.url || !s.publisher)) {
    return NextResponse.json({ error: 'At least one source with a URL and publisher is required for every case.' }, { status: 400 });
  }

  const id = nanoid(10);
  try {
    await insertCaseDraft({
      id,
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
      submitted_by: submitted_by || 'anonymous',
    });
  } catch (e: any) {
    console.error('Failed to insert case draft:', e);
    return NextResponse.json({ error: 'Database error — is DATABASE_URL configured?' }, { status: 500 });
  }

  return NextResponse.json({ status: 'submitted', caseId: id });
}
