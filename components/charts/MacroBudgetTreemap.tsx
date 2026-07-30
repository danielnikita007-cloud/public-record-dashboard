'use client';
import { useState } from 'react';
import { Treemap, ResponsiveContainer } from 'recharts';
import budgetData from '@/data/budget-sectors.json';

interface Sector {
  name: string;
  allocation_inr_crore: number;
  percent_of_total: number;
  source_url: string;
  ground_reality: string[];
}

const COLORS = ['#1B2A3D', '#B8862E', '#3F6B4F', '#8C7A4E', '#6b7280', '#8B2E2E', '#4A6670', '#2E4045'];

function formatCrore(n: number | undefined | null): string {
  if (n === undefined || n === null || isNaN(n)) return '—';
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} lakh cr`;
  return `₹${n.toLocaleString('en-IN')} cr`;
}

export default function MacroBudgetTreemap() {
  const [selected, setSelected] = useState<Sector | null>(null);
  const sectors = budgetData.sectors as Sector[];

  const data = sectors.map((s) => ({ name: s.name, size: s.allocation_inr_crore, sector: s }));

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="font-mono text-xs uppercase tracking-widest text-paper/50">
          Union Budget {budgetData.fiscal_year} — expenditure by ministry (top 7 + Others)
        </h2>
        <a href={budgetData.source_url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-gold underline font-mono">
          Source: PRS ↗
        </a>
      </div>
      <p className="text-[11px] text-paper/40 font-mono mb-3">
        Total budgeted expenditure: {formatCrore(budgetData.total_expenditure_inr_crore)}. Tile size = allocation. Click any tile for sourced ground-reality notes.
      </p>

      <div className="case-card p-4">
        <ResponsiveContainer width="100%" height={340}>
          <Treemap
            data={data}
            dataKey="size"
            stroke="#101826"
            content={<Tile onSelect={setSelected} />}
          />
        </ResponsiveContainer>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-end" onClick={() => setSelected(null)}>
          <div className="bg-paper text-ink w-full max-w-lg h-full overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-ink/40">Ministry</span>
                <h3 className="font-display text-2xl font-semibold">{selected.name}</h3>
              </div>
              <button onClick={() => setSelected(null)} className="font-mono text-sm text-ink/40 hover:text-ink">✕</button>
            </div>

            <p className="font-display text-3xl font-semibold mt-4">{formatCrore(selected.allocation_inr_crore)}</p>
            <p className="text-sm text-ink/60">{selected.percent_of_total}% of total Union Budget {budgetData.fiscal_year}</p>

            <div className="mt-6 border-l-2 border-gold pl-4 space-y-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink/50">
                Ground reality — where does this money actually go?
              </p>
              {selected.ground_reality.map((note, i) => (
                <p key={i} className="text-sm text-ink/70 leading-relaxed">{note}</p>
              ))}
            </div>

            <a href={selected.source_url} target="_blank" rel="noopener noreferrer" className="text-sm text-record underline mt-6 inline-block">
              View source document ↗
            </a>
            <p className="text-[11px] text-ink/40 font-mono mt-4">
              Allocation figures: {budgetData.source_note}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Tile(props: any) {
  const { x, y, width, height, index, name, size, sector } = props;
  if (width < 2 || height < 2 || size === undefined || size === null) return null;
  const color = COLORS[(index ?? 0) % COLORS.length];
  const showLabel = width > 55 && height > 28;
  const pct = sector?.percent_of_total !== undefined ? `${sector.percent_of_total}%` : '';
  return (
    <g style={{ cursor: sector ? 'pointer' : 'default' }} onClick={() => sector && props.onSelect?.(sector)}>
      <rect x={x} y={y} width={width} height={height} fill={color} stroke="#101826" strokeWidth={2} />
      {showLabel && (
        <>
          <text x={x + 8} y={y + 20} fontSize={13} fontFamily="IBM Plex Mono" fill="#EEE9DC" fontWeight={600}>
            {name || ''}
          </text>
          <text x={x + 8} y={y + 38} fontSize={11} fontFamily="IBM Plex Mono" fill="#EEE9DCaa">
            {formatCrore(size)} {pct && `· ${pct}`}
          </text>
        </>
      )}
    </g>
  );
}
