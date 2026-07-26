'use client';
import { useEffect, useState } from 'react';
import { Case } from '@/lib/types';

export default function ReviewQueue() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/cases?review_status=pending_review');
    setCases(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function approve(id: string) {
    await fetch(`/api/cases/${id}/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    load();
  }
  async function reject(id: string) {
    const notes = prompt('Reason for rejection (optional):') || '';
    await fetch(`/api/cases/${id}/reject`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ review_notes: notes }) });
    load();
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <span className="font-mono text-xs text-gold tracking-widest uppercase">Editorial</span>
      <h1 className="font-display text-3xl font-semibold text-paper mt-2">Review queue</h1>
      <p className="text-paper/60 mt-2 text-sm">
        NOTE: this page has no authentication in the pilot build — restrict access before going public (see README).
      </p>

      <div className="mt-8 space-y-4">
        {loading && <p className="text-paper/50 text-sm">Loading…</p>}
        {!loading && cases.length === 0 && (
          <div className="case-card p-6 text-sm text-ink/50 font-mono">Nothing pending review.</div>
        )}
        {cases.map((c) => (
          <div key={c.id} className="case-card p-5">
            <div className="flex items-start justify-between">
              <h3 className="font-display text-lg font-semibold">{c.title}</h3>
              <span className="font-mono text-xs text-ink/40">{c.topic_slug}</span>
            </div>
            <p className="text-sm text-ink/70 mt-2 leading-relaxed">{c.summary}</p>
            <div className="mt-3 space-y-1">
              {c.sources.map((s, i) => (
                <a key={i} href={s.url} target="_blank" className="text-sm text-record underline block">
                  [{s.source_tier}] {s.publisher}
                </a>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => approve(c.id)} className="bg-verified text-paper px-3 py-1.5 rounded-sm text-xs font-mono uppercase">Approve & publish</button>
              <button onClick={() => reject(c.id)} className="bg-flagged text-paper px-3 py-1.5 rounded-sm text-xs font-mono uppercase">Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
