import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// This is the ONLY route the public-facing dashboard pages call.
// It hard-filters to review_status === 'published' so nothing
// unreviewed can ever appear on the live site.
export async function GET(req: NextRequest, { params }: { params: { topic: string } }) {
  const db = await getDb();
  const cases = db.data!.cases.filter(
    (c) => c.topic_slug === params.topic && c.review_status === 'published'
  );
  return NextResponse.json(cases);
}
