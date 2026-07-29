import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getStats, insertStat } from '@/lib/db';

/*
  Unlike /api/cases/draft, this endpoint publishes immediately — no review
  queue. These are counts/sums straight off public records, not a claim
  of wrongdoing, so there's no editorial judgment call to make.
*/

export async function GET(req: NextRequest) {
  const topic = req.nextUrl.searchParams.get('topic') || undefined;
  const metric = req.nextUrl.searchParams.get('metric_type') || undefined;
  try {
    const stats = await getStats(topic, metric);
    return NextResponse.json(stats);
  } catch (e: any) {
    console.error('Failed to fetch stats:', e);
    return NextResponse.json({ error: 'Database error — is DATABASE_URL configured?' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { topic_slug, metric_type, label, value, unit, scope, source_dataset, source_url } = body;

  if (!topic_slug || !metric_type || !label || value === undefined || !unit || !source_dataset) {
    return NextResponse.json(
      { error: 'topic_slug, metric_type, label, value, unit, and source_dataset are all required.' },
      { status: 400 }
    );
  }

  const id = nanoid(10);
  try {
    await insertStat({ id, topic_slug, metric_type, label, value, unit, scope, source_dataset, source_url });
  } catch (e: any) {
    console.error('Failed to insert stat:', e);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  return NextResponse.json({ status: 'recorded', id });
}
