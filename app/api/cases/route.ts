import { NextRequest, NextResponse } from 'next/server';
import { getCasesByReviewStatus } from '@/lib/db';

// Admin-facing: returns ALL cases regardless of review status (or filtered).
// In production, protect this route with auth middleware before deploying publicly.
export async function GET(req: NextRequest) {
  const statusFilter = req.nextUrl.searchParams.get('review_status');
  try {
    const cases = await getCasesByReviewStatus(statusFilter || undefined);
    return NextResponse.json(cases);
  } catch (e: any) {
    console.error('Failed to fetch cases:', e);
    return NextResponse.json({ error: 'Database error — is DATABASE_URL configured?' }, { status: 500 });
  }
}
