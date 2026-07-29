import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { insertCompany, getCompanies } from '@/lib/db';

export async function GET() {
  try {
    return NextResponse.json(await getCompanies());
  } catch (e) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, cin, source_url } = body;
  if (!name) return NextResponse.json({ error: 'name is required.' }, { status: 400 });
  const id = nanoid(10);
  try {
    await insertCompany({ id, name, cin, source_url });
  } catch (e) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
  return NextResponse.json({ status: 'recorded', id });
}
