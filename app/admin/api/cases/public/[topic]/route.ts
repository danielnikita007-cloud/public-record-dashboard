import { NextRequest, NextResponse } from 'next/server';
import { getPublishedCasesByTopic } from '@/lib/db';

// This is the ONLY route the public-facing dashboard pages call.
// It hard-filters to review_status = 'published' at the database level.
export async function GET(req: NextRequest, { params }: { params: { topic: string } }) {
  try {
    const cases = await getPublishedCasesByTopic(params.topic);
    return NextResponse.json(cases);
  } catch (e: any) {
    console.error('Failed to fetch public cases:', e);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
