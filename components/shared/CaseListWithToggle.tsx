'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Case } from '@/lib/types';

const STATUS_LABEL: Record<string, string> = {
  alleged: 'Alleged',
  under_investigation: 'Under investigation',
  court_confirmed: 'Court confirmed',
  closed: 'Closed',
};

/*
  Verification tiers, as surfaced to the public:

    VERIFIED  -> status 'court_confirmed' (final judgments, judicial
                 orders, official CAG findings)
    ALLEGED   -> status 'alleged' / 'under_investigation' (FIRs,
                 show-cause notices, cited investigative reporting)

  There is deliberately NO public "speculation" view. Unverified claims
  about named bodies or people are held at draft stage for editors and
  are never rendered here — publishing something while labelling it
  unverified is still publishing it.
*/
const VERIFIED_STATUSES = ['court_confirmed'];
const ALLEGED_STATUSES = ['alleged', 'under_investigation'];

export default function CaseListWithToggle({ cases }: { cases: Case[] }) {
  const [showAlleged, setShowAlleged] = useState(true);

  const visible = cases.filter((c) =>
    showAlleged
      ? [...VERIFIED_STATUSES, ...ALLEGED_STATUSES, 'closed'].includes(c.status)
      : VERIFIED_STATUSES.includes(c.status)
  );

  const verifiedCount = cases.filter((c) => VERIFIED_STATUSES.includes(c.status)).length;
  const allegedCount = cases.filter((c) => ALLEGED_STATUSES.includes(c.status)).length;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={() => setShowAlleged(false)}
          className={`status-tab border ${
            !showAlleged
              ? 'bg-verified/20 text-verified border-verified/50'
              : 'bg-transparent text-paper/40 border-paper/20'
          }`}
        >
          Verified public records ({verifiedCount})
        </button>
        <button
          onClick={() => setShowAlleged(true)}
          className={`status-tab border ${
            showAlleged
              ? 'bg-gold/20 text-gold border-gold/50'
              : 'bg-transparent text-paper/40 border-paper/20'
          }`}
        >
          Include reported allegations ({allegedCount})
        </button>
      </div>

      <p className="text-[11px] text-paper/40 font-mono mb-4 leading-relaxed">
        {!showAlleged
          ? 'Showing only entries backed by a final judgment, judicial order, or official audit finding.'
          : 'Now also showing entries based on FIRs, notices, or cited investigative reporting — these describe what a source reported, not established fact.'}
      </p>

      {visible.length === 0 && (
        <div className="case-card p-6 text-sm text-ink/50 font-mono">
          {cases.length === 0
            ? 'No cases published yet for this topic.'
            : 'No entries at this verification level yet — try including reported allegations.'}
        </div>
      )}

      <div className="space-y-3">
        {visible.map((c) => (
          <Link
            key={c.id}
            href={`/investigation/${c.id}`}
            className="case-card p-5 flex items-center justify-between hover:border-gold/60 border block"
          >
            <div>
              <h3 className="font-display text-lg font-semibold">{c.title}</h3>
              <p className="text-sm text-ink/60 mt-1">
                {c.state}
                {c.district ? `, ${c.district}` : ''} · {c.sources.length} source
                {c.sources.length !== 1 ? 's' : ''}
              </p>
            </div>
            <span
              className={`status-tab border shrink-0 ${
                VERIFIED_STATUSES.includes(c.status)
                  ? 'bg-verified/15 text-verified border-verified/40'
                  : 'bg-gold/15 text-ink border-ink/20'
              }`}
            >
              {STATUS_LABEL[c.status]}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
