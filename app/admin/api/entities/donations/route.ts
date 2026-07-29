import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { insertDonation, getDonations } from '@/lib/db';

// Factual record from an Election Commission / ADR donation filing.
export async function GET() {
  try {
    return NextResponse.json(await getDonations());
  } catch (e) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { donor_name, recipient_party, amount_inr, fiscal_year, source_url, source_note } = body;
  if (!donor_name || !recipient_party || amount_inr === undefined || !fiscal_year || !source_url || !source_note) {
    return NextResponse.json({ error: 'donor_name, recipient_party, amount_inr, fiscal_year, source_url, and source_note are required.' }, { status: 400 });
  }
  const id = nanoid(10);
  try {
    await insertDonation({ id, donor_name, recipient_party, amount_inr, fiscal_year, source_url, source_note });
  } catch (e) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
  return NextResponse.json({ status: 'recorded', id });
}
