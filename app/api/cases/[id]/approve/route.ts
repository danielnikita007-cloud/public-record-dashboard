import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const db = await getDb();
  const c = db.data!.cases.find((c) => c.id === params.id);
  if (!c) return NextResponse.json({ error: 'Case not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  c.review_status = 'published';
  c.reviewed_by = body.reviewed_by || 'editor';
  await db.write();

  return NextResponse.json({ status: 'published', caseId: c.id });
}
