import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { insertRelationshipDraft } from '@/lib/db';

// This is the ONLY entry point for connecting two entities. Unlike the
// factual entity routes above, this ALWAYS lands in pending_review —
// a documented relationship still requires a human to confirm the
// underlying evidence before it appears on the public network view.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    entity_a_type, entity_a_id, entity_a_label,
    entity_b_type, entity_b_id, entity_b_label,
    relationship_note, evidence_urls, submitted_by,
  } = body;

  if (!entity_a_label || !entity_b_label || !relationship_note) {
    return NextResponse.json(
      { error: 'entity_a_label, entity_b_label, and relationship_note are required.' },
      { status: 400 }
    );
  }
  if (!evidence_urls || evidence_urls.length === 0) {
    return NextResponse.json(
      { error: 'At least one evidence URL is required to document a relationship.' },
      { status: 400 }
    );
  }

  const id = nanoid(10);
  try {
    await insertRelationshipDraft({
      id, entity_a_type, entity_a_id, entity_a_label,
      entity_b_type, entity_b_id, entity_b_label,
      relationship_note, evidence_urls, submitted_by,
    });
  } catch (e) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
  return NextResponse.json({ status: 'submitted', id });
}
