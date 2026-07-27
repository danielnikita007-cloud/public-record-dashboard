'use client';
import { useState } from 'react';
import topics from '@/data/topics.json';
import { SourceTier } from '@/lib/types';

type SourceRow = { url: string; publisher: string; source_tier: SourceTier; published_date: string };

export default function SubmitCase() {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [topicSlug, setTopicSlug] = useState(topics[0].slug);
  const [state, setState] = useState('');
  const [status, setStatus] = useState('alleged');
  const [sources, setSources] = useState<SourceRow[]>([
    { url: '', publisher: '', source_tier: 'independent_journalist', published_date: '' },
  ]);
  const [result, setResult] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateSource(i: number, key: keyof SourceRow, val: string) {
    const next = [...sources];
    (next[i] as any)[key] = val;
    setSources(next);
  }

  function addSource() {
    setSources([...sources, { url: '', publisher: '', source_tier: 'independent_journalist', published_date: '' }]);
  }

  async function submit() {
    setSubmitting(true);
    setResult(null);
    const res = await fetch('/api/cases/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, summary, topic_slug: topicSlug, state, status, sources }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setResult(`Error: ${data.error}`);
    } else {
      setResult(`Submitted for review — case ID ${data.caseId}. It will not appear publicly until an editor approves it.`);
      setTitle(''); setSummary(''); setState('');
      setSources([{ url: '', publisher: '', source_tier: 'independent_journalist', published_date: '' }]);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <span className="font-mono text-xs text-gold tracking-widest uppercase">Editorial intake</span>
      <h1 className="font-display text-3xl font-semibold text-paper mt-2">Submit a case for review</h1>
      <p className="text-paper/60 mt-2 text-sm leading-relaxed">
        Write only what your source(s) actually state. Every entry needs at least one source with a URL and
        publisher/journalist name — submissions without one are rejected automatically. Nothing goes live until
        an editor approves it in the review queue.
      </p>

      <div className="case-card p-6 mt-8 space-y-4">
        <div>
          <label className="text-xs font-mono uppercase text-ink/50">Topic</label>
          <select value={topicSlug} onChange={(e) => setTopicSlug(e.target.value)} className="w-full border border-black/15 p-2 rounded-sm mt-1">
            {topics.map((t) => <option key={t.slug} value={t.slug}>{t.title}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs font-mono uppercase text-ink/50">Case title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border border-black/15 p-2 rounded-sm mt-1" placeholder="e.g. Forest clearance granted for [project], [district]" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-mono uppercase text-ink/50">State</label>
            <input value={state} onChange={(e) => setState(e.target.value)} className="w-full border border-black/15 p-2 rounded-sm mt-1" />
          </div>
          <div>
            <label className="text-xs font-mono uppercase text-ink/50">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full border border-black/15 p-2 rounded-sm mt-1">
              <option value="alleged">Alleged</option>
              <option value="under_investigation">Under investigation</option>
              <option value="court_confirmed">Court confirmed</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-mono uppercase text-ink/50">Summary — attribute clearly ("According to [source]...")</label>
          <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={5} className="w-full border border-black/15 p-2 rounded-sm mt-1" />
        </div>

        <div>
          <label className="text-xs font-mono uppercase text-ink/50 block mb-2">Sources</label>
          {sources.map((s, i) => (
            <div key={i} className="border border-black/10 p-3 rounded-sm mb-2 space-y-2 bg-black/[0.02]">
              <input placeholder="Source URL" value={s.url} onChange={(e) => updateSource(i, 'url', e.target.value)} className="w-full border border-black/15 p-2 rounded-sm text-sm" />
              <input placeholder="Publisher / journalist name" value={s.publisher} onChange={(e) => updateSource(i, 'publisher', e.target.value)} className="w-full border border-black/15 p-2 rounded-sm text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <select value={s.source_tier} onChange={(e) => updateSource(i, 'source_tier', e.target.value)} className="w-full border border-black/15 p-2 rounded-sm text-sm">
                  <option value="primary_govt">Government report</option>
                  <option value="court_record">Court order / judgment</option>
                  <option value="independent_journalist">Independent journalist</option>
                  <option value="news_outlet">News outlet</option>
                </select>
                <input placeholder="Published date" value={s.published_date} onChange={(e) => updateSource(i, 'published_date', e.target.value)} className="w-full border border-black/15 p-2 rounded-sm text-sm" />
              </div>
            </div>
          ))}
          <button onClick={addSource} type="button" className="text-xs font-mono text-record underline">+ Add another source</button>
        </div>

        <button onClick={submit} disabled={submitting} className="bg-record text-paper px-5 py-2.5 rounded-sm text-sm font-mono uppercase tracking-wide disabled:opacity-50">
          {submitting ? 'Submitting…' : 'Submit for editorial review'}
        </button>

        {result && <p className="text-sm mt-2 text-ink/70">{result}</p>}
      </div>
    </div>
  );
}
