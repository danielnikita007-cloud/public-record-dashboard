'use client';
import { useState } from 'react';
import { Treemap, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import budgetData from '@/data/budget-sectors.json';

interface BreakdownItem {
  label: string;
  value_inr_crore: number;
}

interface Sector {
  name: string;
  allocation_inr_crore: number;
  percent_of_total: number;
  source_url: string;
  ground_reality: string[];
  breakdown?: BreakdownItem[];
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
        <ResponsiveContainer width="100%" height={380}>
          <Treemap
            data={data}
            dataKey="size"
            stroke="none"
            isAnimationActive={false}
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

            {selected.breakdown && selected.breakdown.length > 0 && (
              <div className="mt-6">
                <p className="font-mono text-[10px] uppercase tracking-widest text-ink/50 mb-2">
                  Where this allocation breaks down (non-overlapping, sourced figures)
                </p>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={selected.breakdown} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#00000010" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }} />
                    <YAxis type="category" dataKey="label" width={150} tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }} />
                    <Tooltip formatter={(v: number) => formatCrore(v)} />
                    <Bar dataKey="value_inr_crore" fill="#B8862E" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

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
  const inset = 2; // gap between tiles, for a cleaner grid feel
  const ix = x + inset;
  const iy = y + inset;
  const iw = Math.max(width - inset * 2, 0);
  const ih = Math.max(height - inset * 2, 0);

  const showLabel = iw > 70 && ih > 40;
  const pct = sector?.percent_of_total !== undefined ? `${sector.percent_of_total}%` : '';
  const cx = ix + iw / 2;
  const cy = iy + ih / 2;

  // Text drawn with a dark outline (paintOrder stroke) so it stays readable
  // regardless of the tile's own fill color underneath — no separate
  // backdrop shape needed, and it holds up on both light and dark tiles.
  const textStyle = {
    paintOrder: 'stroke' as const,
    stroke: '#101826',
    strokeWidth: 3,
    strokeLinejoin: 'round' as const,
  };

  return (
    <g style={{ cursor: sector ? 'pointer' : 'default' }} onClick={() => sector && props.onSelect?.(sector)}>
      <rect x={ix} y={iy} width={iw} height={ih} fill={color} rx={3} />
      {showLabel && (
        <>
          <text
            x={cx}
            y={cy - 6}
            textAnchor="middle"
            fontSize={14}
            fontFamily="IBM Plex Mono"
            fill="#EEE9DC"
            fontWeight={700}
            style={textStyle}
          >
            {name || ''}
          </text>
          <text
            x={cx}
            y={cy + 14}
            textAnchor="middle"
            fontSize={12}
            fontFamily="IBM Plex Mono"
            fill="#EEE9DC"
            fontWeight={500}
            style={textStyle}
          >
            {formatCrore(size)}{pct && ` · ${pct}`}
          </text>
        </>
      )}
      {!showLabel && iw > 20 && ih > 20 && (
        <text x={cx} y={cy} textAnchor="middle" fontSize={10} fontFamily="IBM Plex Mono" fill="#EEE9DC" style={textStyle}>
          {pct}
        </text>
      )}
    </g>
  );
}
