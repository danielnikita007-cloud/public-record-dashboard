import { NextRequest, NextResponse } from 'next/server';
import { getRelationshipsByStatus, getPublishedNetwork } from '@/lib/db';

// Public route: only ever returns published relationships.
export async function GET(req: NextRequest) {
  const statusFilter = req.nextUrl.searchParams.get('review_status');
  try {
    // Admin use passes review_status=pending_review; public callers get published-only.
    const relationships = statusFilter
      ? await getRelationshipsByStatus(statusFilter)
      : await getPublishedNetwork();
    return NextResponse.json(relationships);
  } catch (e) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
