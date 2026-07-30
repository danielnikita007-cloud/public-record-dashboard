'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList } from 'recharts';
import { StatEntry } from '@/lib/types';

function formatValue(entry: StatEntry): string {
  if (entry.unit === 'inr') {
    // Indian numbering (crore/lakh) reads more naturally for this audience
    if (entry.value >= 1e7) return `₹${(entry.value / 1e7).toFixed(2)} Cr`;
    if (entry.value >= 1e5) return `₹${(entry.value / 1e5).toFixed(2)} L`;
    return `₹${entry.value.toLocaleString('en-IN')}`;
  }
  if (entry.unit === 'percent') return `${entry.value.toFixed(1)}%`;
  return entry.value.toLocaleString('en-IN');
}

export default function AggregateStatsPanel({
  title,
  stats,
}: {
  title: string;
  stats: StatEntry[];
}) {
  if (!stats || stats.length === 0) {
    return (
      <div className="case-card p-6 text-sm text-ink/50 font-mono">
        No aggregate statistics available yet for this topic. Run the local data scanner
        (see services/scraper) to populate this section from public government records.
      </div>
    );
  }

  const chartData = stats
    .slice()
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
    .map((s) => ({ name: s.label.length > 22 ? s.label.slice(0, 20) + '…' : s.label, value: s.value, raw: s }));

  const latestComputed = stats.reduce((latest, s) => (s.computed_at > latest ? s.computed_at : latest), stats[0].computed_at);
  const datasets = Array.from(new Set(stats.map((s) => s.source_dataset)));

  return (
    <div className="case-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-mono text-xs uppercase tracking-widest text-ink/50">{title}</h3>
        <span className="font-mono text-[10px] text-ink/40">
          Updated {new Date(latestComputed).toLocaleDateString('en-IN')}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 30 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#00000010" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }} />
          <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} />
          <Tooltip
            formatter={(_value: number, _name: string, props: any) => [formatValue(props.payload.raw), '']}
            labelFormatter={(label) => label}
          />
          <Bar dataKey="value" fill="#B8862E" radius={[0, 3, 3, 0]}>
            <LabelList dataKey="value" position="right" formatter={(v: number) => v.toLocaleString('en-IN')} style={{ fontSize: 10, fontFamily: 'IBM Plex Mono', fill: '#000' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-[11px] text-ink/40 font-mono mt-2 leading-relaxed">
        These are raw counts/sums from public procurement records — not a finding of wrongdoing.
        Source: {datasets.join(', ')}.
      </p>
    </div>
  );
}
