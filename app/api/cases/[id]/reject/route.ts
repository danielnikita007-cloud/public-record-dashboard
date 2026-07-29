import { NextRequest, NextResponse } from 'next/server';
import { rejectCase } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  try {
    const found = await rejectCase(params.id, body.reviewed_by || 'editor', body.review_notes || '');
    if (!found) return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    return NextResponse.json({ status: 'rejected', caseId: params.id });
  } catch (e: any) {
    console.error('Failed to reject case:', e);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
