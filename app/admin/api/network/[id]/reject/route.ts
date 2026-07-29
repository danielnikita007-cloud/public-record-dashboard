import { NextRequest, NextResponse } from 'next/server';
import { rejectRelationship } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  try {
    const found = await rejectRelationship(params.id, body.reviewed_by || 'editor');
    if (!found) return NextResponse.json({ error: 'Relationship not found' }, { status: 404 });
    return NextResponse.json({ status: 'rejected', id: params.id });
  } catch (e) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
