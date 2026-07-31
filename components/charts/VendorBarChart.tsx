'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, LabelList } from 'recharts';
import { StatEntry } from '@/lib/types';

// A distinct, varied palette (not a single-hue gradient) so each bar reads
// as its own vendor at a glance, matching the "colourful" chart request.
const PALETTE = [
  '#B8862E', '#3F6B4F', '#8B2E2E', '#4A6670', '#8C7A4E',
  '#6b4e8c', '#2E7D6B', '#B85C38', '#5C6B8C', '#8C4E6B',
  '#6B8C4E', '#4E6B8C',
];

function isBadNumber(value: unknown): value is null | undefined {
  return value === undefined || value === null || (typeof value === 'number' && isNaN(value));
}

function formatValue(value: number, unit: string): string {
  if (isBadNumber(value)) return '—';
  if (unit === 'inr') {
    if (value >= 1e7) return `₹${(value / 1e7).toFixed(1)} Cr`;
    if (value >= 1e5) return `₹${(value / 1e5).toFixed(1)} L`;
    return `₹${value.toLocaleString('en-IN')}`;
  }
  return value.toLocaleString('en-IN');
}

export default function VendorBarChart({
  stats,
  metricType,
  title,
}: {
  stats: StatEntry[];
  metricType: string; // e.g. 'vendor_contract_count' or 'vendor_contract_value'
  title: string;
}) {
  const data = stats
    .filter((s) => s.metric_type === metricType && !isBadNumber(s.value))
    .slice()
    .sort((a, b) => b.value - a.value)
    .slice(0, 12)
    .map((s) => ({
      name: s.label.length > 26 ? s.label.slice(0, 24) + '…' : s.label,
      value: s.value,
      unit: s.unit,
      raw: s,
    }));

  if (data.length === 0) {
    return (
      <div className="case-card p-6 text-sm text-ink/50 font-mono">
        No vendor data yet for this metric.
      </div>
    );
  }

  return (
    <div className="case-card p-5">
      <h3 className="font-mono text-xs uppercase tracking-widest text-ink/50 mb-3">{title}</h3>
      <ResponsiveContainer width="100%" height={Math.max(280, data.length * 32)}>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 50 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#00000010" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }} />
          <YAxis
            type="category"
            dataKey="name"
            width={170}
            tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }}
          />
          <Tooltip
            formatter={(_v: number, _n: string, props: any) => [
              formatValue(props.payload.value, props.payload.unit),
              props.payload.raw.scope || '',
            ]}
            labelFormatter={(l) => l}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
            <LabelList
              dataKey="value"
              position="right"
              formatter={(v: number) => formatValue(v, data[0]?.unit)}
              style={{ fontSize: 10, fontFamily: 'IBM Plex Mono', fill: '#101826' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}