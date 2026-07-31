import { getCaseById } from '@/lib/db';
import { extractHighlights } from '@/lib/extractHighlights';
import SourceCitation from '@/components/shared/SourceCitation';
import LegalViolationPanel from '@/components/legal/LegalViolationPanel';
import { STATUS_COLOR, STATUS_LABEL } from '@/lib/chartTheme';

export default async function CasePage({ params }: { params: { id: string } }) {
  const c = await getCaseById(params.id);

  if (!c) {
    return <div className="max-w-3xl mx-auto px-6 py-16 text-paper">Case not found or not yet published.</div>;
  }

  const highlights = extractHighlights(c.summary, 4);
  const statusColor = STATUS_COLOR[c.status] || '#94a3b8';

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <span className="font-mono text-xs text-gold tracking-widest uppercase">{c.topic_slug.replace('-', ' ')}</span>
        <span
          className="status-tab border"
          style={{ backgroundColor: `${statusColor}22`, color: statusColor, borderColor: `${statusColor}66` }}
        >
          {STATUS_LABEL[c.status] || c.status}
        </span>
      </div>
      <h1 className="font-display text-4xl font-semibold text-paper leading-tight">{c.title}</h1>
      <p className="text-paper/50 text-sm mt-2 font-mono">
        {c.state}{c.district ? `, ${c.district}` : ''} {c.date_reported ? `· reported ${c.date_reported}` : ''}
      </p>

      {/* The numbers that matter — pulled visually out of the summary */}
      {highlights.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
          {highlights.map((h, i) => (
            <div key={i} className="case-card p-4 border-l-2 border-gold">
              <p className="font-display text-2xl md:text-3xl font-semibold text-ink">{h.value}</p>
              <p className="text-[11px] text-ink/50 mt-1 leading-snug line-clamp-3">{h.context}</p>
            </div>
          ))}
        </div>
      )}

      {/* The story, in prose — same text, now supported by the numbers above rather than hiding them */}
      <div className="case-card p-6 mt-6">
        <p className="text-xs font-mono uppercase tracking-wide text-ink/40 mb-2">What happened — as reported by cited sources</p>
        <p className="leading-relaxed text-ink/90">{c.summary}</p>
      </div>

      {/* Legal/constitutional context */}
      <div className="mt-6">
        <LegalViolationPanel violations={c.legal_violations} />
      </div>

      {/* Sources — always visible, never buried */}
      <div className="case-card p-6 mt-6">
        <h3 className="font-mono text-xs uppercase tracking-widest text-ink/50 mb-2">
          Sources ({c.sources.length})
        </h3>
        {c.sources.map((s, i) => (
          <SourceCitation key={i} source={s} />
        ))}
        <p className="text-[11px] text-ink/40 font-mono mt-3">
          Every figure above comes from these sources — click through to verify independently.
        </p>
      </div>
    </div>
  );
}
