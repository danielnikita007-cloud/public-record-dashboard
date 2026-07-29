import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { insertPolitician, getPoliticians } from '@/lib/db';

// Factual record from an official ECI affidavit — no accusation involved,
// so this publishes immediately, unlike case submissions.
export async function GET() {
  try {
    return NextResponse.json(await getPoliticians());
  } catch (e) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, constituency, party, source_url, source_note } = body;
  if (!name || !source_url || !source_note) {
    return NextResponse.json({ error: 'name, source_url, and source_note are required.' }, { status: 400 });
  }
  const id = nanoid(10);
  try {
    await insertPolitician({ id, name, constituency, party, source_url, source_note });
  } catch (e) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
  return NextResponse.json({ status: 'recorded', id });
}
