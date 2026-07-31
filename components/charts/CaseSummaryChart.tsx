'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { Case } from '@/lib/types';
import { STATUS_COLOR, STATUS_LABEL } from '@/lib/chartTheme';

export default function CaseSummaryChart({ cases }: { cases: Case[] }) {
  const byStatus: Record<string, number> = {};
  cases.forEach((c) => {
    byStatus[c.status] = (byStatus[c.status] || 0) + 1;
  });
  const data = Object.entries(byStatus).map(([status, count]) => ({
    status,
    label: STATUS_LABEL[status] || status,
    count,
  }));

  if (data.length === 0) {
    return (
      <div className="case-card p-6 text-sm text-ink/50 font-mono">
        No published cases yet for this topic — chart will populate once cases are approved.
      </div>
    );
  }

  return (
    <div className="case-card p-5">
      <h3 className="font-mono text-xs uppercase tracking-widest text-ink/50 mb-3">Cases by status</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#00000010" />
          <XAxis dataKey="label" tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }} interval={0} angle={-15} textAnchor="end" height={50} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} />
          <Tooltip formatter={(value: number) => [value, 'cases']} labelFormatter={(l) => l} />
          <Bar dataKey="count" radius={[3, 3, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={STATUS_COLOR[entry.status] || '#94a3b8'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-3 border-t border-black/10">
        {data.map((entry) => (
          <div key={entry.status} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: STATUS_COLOR[entry.status] || '#94a3b8' }}
            />
            <span className="text-[11px] font-mono text-ink/60">{entry.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
