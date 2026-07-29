import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { insertTenderRecord, getTenderRecords } from '@/lib/db';

export async function GET() {
  try {
    return NextResponse.json(await getTenderRecords());
  } catch (e) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { company_id, company_name, awarding_org, value_inr, award_date, source_url } = body;
  if (!company_name || !awarding_org || !source_url) {
    return NextResponse.json({ error: 'company_name, awarding_org, and source_url are required.' }, { status: 400 });
  }
  const id = nanoid(10);
  try {
    await insertTenderRecord({ id, company_id, company_name, awarding_org, value_inr, award_date, source_url });
  } catch (e) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
  return NextResponse.json({ status: 'recorded', id });
}
