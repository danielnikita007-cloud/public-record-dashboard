'use client';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import deepDive from '@/data/deep-dive-sectors.json';
const COLORS = ['#B8862E', '#3F6B4F', '#8C7A4E', '#1B2A3D'];
function formatCount(n: number): string {
  if (n >= 1e7) return `${(n / 1e7).toFixed(2)} crore`;
  if (n >= 1e5) return `${(n / 1e5).toFixed(2)} lakh`;
  return n.toLocaleString('en-IN');
}
export default function SectorDeepDives() {
  const edu = deepDive.education;
  const env = deepDive.environment;
  return (
    <div className="grid md:grid-cols-2 gap-5">
      {/* Education */}
      <div className="case-card p-5">
        <div className="flex items-baseline justify-between mb-1">
          <h3 className="font-mono text-xs uppercase tracking-widest text-ink/50">{edu.title}</h3>
          <a href={edu.source_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-record underline">Source ↗</a>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3 mb-4">
          {edu.headline_stats.map((s, i) => (
            <div key={i} className="bg-black/[0.03] rounded-sm p-2">
              <p className="font-display text-lg font-semibold">{formatCount(s.value)}</p>
              <p className="text-[10px] text-ink/50 leading-tight mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] font-mono uppercase tracking-wide text-ink/40 mb-1">School ownership (%)</p>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={edu.school_ownership_breakdown}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="45%"
              outerRadius={65}
            >
              {edu.school_ownership_breakdown.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => `${v}%`} />
            <Legend
              wrapperStyle={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }}
              formatter={(name: string, entry: any) => `${name}: ${entry?.payload?.value ?? ''}%`}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-4 space-y-2 border-l-2 border-gold pl-3">
          {edu.ground_reality.map((note, i) => (
            <p key={i} className="text-xs text-ink/70 leading-relaxed">{note}</p>
          ))}
        </div>
        <p className="text-[10px] text-ink/40 font-mono mt-3">{edu.source_note}</p>
      </div>
      {/* Environment */}
      <div className="case-card p-5">
        <div className="flex items-baseline justify-between mb-1">
          <h3 className="font-mono text-xs uppercase tracking-widest text-ink/50">{env.title}</h3>
          <a href={env.source_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-record underline">Source ↗</a>
        </div>
        <div className="mt-3 space-y-3">
          {env.ndc_targets.map((t, i) => (
            <div key={i} className="bg-black/[0.03] rounded-sm p-3">
              <p className="text-sm font-semibold">{t.target}</p>
              <p className="text-xs text-ink/60">{t.goal}</p>
              <p className="text-xs text-verified mt-1 font-mono">{t.status}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-2 border-l-2 border-gold pl-3">
          {env.ground_reality.map((note, i) => (
            <p key={i} className="text-xs text-ink/70 leading-relaxed">{note}</p>
          ))}
        </div>
        <p className="text-[10px] text-ink/40 font-mono mt-3">{env.source_note}</p>
      </div>
    </div>
  );
}
