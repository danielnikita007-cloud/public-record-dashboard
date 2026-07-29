import { NextRequest, NextResponse } from 'next/server';
import { approveCase } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  try {
    const found = await approveCase(params.id, body.reviewed_by || 'editor');
    if (!found) return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    return NextResponse.json({ status: 'published', caseId: params.id });
  } catch (e: any) {
    console.error('Failed to approve case:', e);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
