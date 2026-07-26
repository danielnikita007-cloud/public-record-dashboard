import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// Admin-facing: returns ALL cases regardless of review status.
// In production, protect this route with auth middleware before deploying publicly.
export async function GET(req: NextRequest) {
  const db = await getDb();
  const statusFilter = req.nextUrl.searchParams.get('review_status');
  const cases = statusFilter
    ? db.data!.cases.filter((c) => c.review_status === statusFilter)
    : db.data!.cases;
  return NextResponse.json(cases.sort((a, b) => (a.created_at < b.created_at ? 1 : -1)));
}
