import { getCaseById } from '@/lib/db';
import SourceCitation from '@/components/shared/SourceCitation';
import LegalViolationPanel from '@/components/legal/LegalViolationPanel';

export default async function CasePage({ params }: { params: { id: string } }) {
  const c = await getCaseById(params.id);

  if (!c) {
    return <div className="max-w-3xl mx-auto px-6 py-16 text-paper">Case not found or not yet published.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <span className="font-mono text-xs text-gold tracking-widest uppercase">{c.topic_slug.replace('-', ' ')}</span>
      <h1 className="font-display text-4xl font-semibold text-paper mt-2 leading-tight">{c.title}</h1>
      <p className="text-paper/50 text-sm mt-2 font-mono">
        {c.state}{c.district ? `, ${c.district}` : ''} {c.date_reported ? `· reported ${c.date_reported}` : ''}
      </p>

      <div className="case-card p-6 mt-8">
        <p className="text-xs font-mono uppercase tracking-wide text-ink/40 mb-2">As reported by cited sources</p>
        <p className="leading-relaxed text-ink/90">{c.summary}</p>
      </div>

      <div className="mt-6">
        <LegalViolationPanel violations={c.legal_violations} />
      </div>

      <div className="case-card p-6 mt-6">
        <h3 className="font-mono text-xs uppercase tracking-widest text-ink/50 mb-2">Sources</h3>
        {c.sources.map((s, i) => (
          <SourceCitation key={i} source={s} />
        ))}
      </div>
    </div>
  );
}
