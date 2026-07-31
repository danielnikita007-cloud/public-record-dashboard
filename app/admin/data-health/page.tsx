export const dynamic = 'force-dynamic';
import { getDataHealthSummary, getSuspiciousStats, STALE_DAYS_THRESHOLD } from '@/lib/db';

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
}

function formatValue(value: number, unit: string): string {
  if (unit === 'inr') {
    if (value >= 1e7) return `₹${(value / 1e7).toLocaleString('en-IN', { maximumFractionDigits: 1 })} Cr`;
    return `₹${value.toLocaleString('en-IN')}`;
  }
  if (unit === 'percent') return `${value.toFixed(1)}%`;
  return value.toLocaleString('en-IN');
}

export default async function DataHealthPage() {
  const { stats, cases } = await getDataHealthSummary();
  const suspicious = await getSuspiciousStats();

  return (
    <div className="max-w-6xl mx-auto px-6 py-12 text-paper">
      <span className="font-mono text-xs text-gold tracking-widest uppercase">Internal — not public</span>
      <h1 className="font-display text-3xl font-semibold mt-2">Data Health</h1>
      <p className="text-paper/60 mt-2 max-w-2xl">
        A quick-glance view of every data source: how fresh it is, how many rows it's produced, and
        anything that looks statistically implausible and worth checking before it reaches a public page.
      </p>

      {/* Suspicious values — the actual bug-finder */}
      <div className="mt-10">
        <h2 className="font-mono text-xs uppercase tracking-widest text-paper/50 mb-3">
          ⚠ Implausible values ({suspicious.length})
        </h2>
        {suspicious.length === 0 ? (
          <div className="case-card p-6 text-sm text-ink/50 font-mono">
            Nothing flagged — every INR stat is under the sanity threshold.
          </div>
        ) : (
          <div className="case-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-black/10 text-ink/50 font-mono text-xs uppercase">
                  <th className="p-3">Label</th>
                  <th className="p-3">Topic</th>
                  <th className="p-3">Value</th>
                  <th className="p-3">Source</th>
                  <th className="p-3">Computed</th>
                </tr>
              </thead>
              <tbody>
                {suspicious.map((s) => (
                  <tr key={s.id} className="border-b border-black/5">
                    <td className="p-3 text-ink">{s.label}</td>
                    <td className="p-3 text-ink/60 font-mono text-xs">{s.topic_slug}</td>
                    <td className="p-3 text-red-700 font-semibold">{formatValue(s.value, s.unit)}</td>
                    <td className="p-3 text-ink/60 font-mono text-xs">{s.source_dataset}</td>
                    <td className="p-3 text-ink/40 font-mono text-xs">
                      {new Date(s.computed_at).toLocaleDateString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Per-source freshness and row counts */}
      <div className="mt-10">
        <h2 className="font-mono text-xs uppercase tracking-widest text-paper/50 mb-3">
          Sources — freshness &amp; volume
        </h2>
        <div className="case-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-black/10 text-ink/50 font-mono text-xs uppercase">
                <th className="p-3">Source dataset</th>
                <th className="p-3">Topic</th>
                <th className="p-3">Rows</th>
                <th className="p-3">Range (min–max)</th>
                <th className="p-3">Last updated</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s, i) => {
                const stale = daysSince(s.last_computed) > STALE_DAYS_THRESHOLD;
                return (
                  <tr key={i} className="border-b border-black/5">
                    <td className="p-3 text-ink">{s.source_dataset}</td>
                    <td className="p-3 text-ink/60 font-mono text-xs">{s.topic_slug}</td>
                    <td className="p-3 text-ink">{s.row_count}</td>
                    <td className="p-3 text-ink/60 text-xs">
                      {formatValue(s.min_value, s.unit)} – {formatValue(s.max_value, s.unit)}
                    </td>
                    <td className={`p-3 font-mono text-xs ${stale ? 'text-red-700 font-semibold' : 'text-ink/40'}`}>
                      {new Date(s.last_computed).toLocaleDateString('en-IN')}
                      {stale && ' (stale)'}
                    </td>
                  </tr>
                );
              })}
              {stats.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-ink/40 font-mono text-sm">
                    No stats in the database yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Case counts by topic and review status */}
      <div className="mt-10">
        <h2 className="font-mono text-xs uppercase tracking-widest text-paper/50 mb-3">
          Cases — by topic &amp; review status
        </h2>
        <div className="case-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-black/10 text-ink/50 font-mono text-xs uppercase">
                <th className="p-3">Topic</th>
                <th className="p-3">Status</th>
                <th className="p-3">Count</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c, i) => (
                <tr key={i} className="border-b border-black/5">
                  <td className="p-3 text-ink">{c.topic_slug}</td>
                  <td className="p-3 text-ink/60 font-mono text-xs">{c.review_status}</td>
                  <td className="p-3 text-ink">{c.count}</td>
                </tr>
              ))}
              {cases.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-6 text-center text-ink/40 font-mono text-sm">
                    No cases in the database yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}