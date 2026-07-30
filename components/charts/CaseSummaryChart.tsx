'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Case } from '@/lib/types';

export default function CaseSummaryChart({ cases }: { cases: Case[] }) {
  const byStatus: Record<string, number> = {};
  cases.forEach((c) => {
    byStatus[c.status] = (byStatus[c.status] || 0) + 1;
  });
  const data = Object.entries(byStatus).map(([status, count]) => ({ status, count }));

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
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#00000010" />
          <XAxis dataKey="status" tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} />
          <Tooltip />
          <Bar dataKey="count" fill="#B8862E" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
