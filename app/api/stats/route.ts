import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getStatsDb } from '@/lib/db';
import { StatEntry } from '@/lib/types';

export async function GET(req: NextRequest) {
  const db = await getStatsDb();
  const topic = req.nextUrl.searchParams.get('topic');
  const metric = req.nextUrl.searchParams.get('metric_type');
  let stats = db.data!.stats;
  if (topic) stats = stats.filter((s) => s.topic_slug === topic);
  if (metric) stats = stats.filter((s) => s.metric_type === metric);
  return NextResponse.json(stats);
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

  const db = await getStatsDb();
  const entry: StatEntry = {
    id: nanoid(10),
    topic_slug,
    metric_type,
    label,
    value,
    unit,
    scope,
    source_dataset,
    source_url,
    computed_at: new Date().toISOString(),
  };
  db.data!.stats.push(entry);
  await db.write();

  return NextResponse.json({ status: 'recorded', id: entry.id });
}
