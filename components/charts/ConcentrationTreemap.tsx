'use client';
import { useState } from 'react';
import { Treemap, ResponsiveContainer, Tooltip } from 'recharts';
import { StatEntry } from '@/lib/types';

/*
  Tile size = total value/count for that entity. Two views only:
  "Department" (by HHI scope grouping — approximated from concentration
  stats) and "Top Corporate Vendors" (by total contract value).

  NOTE ON SCOPE: the original spec asked for a third view, "State." That
  would need state-level monetary totals, which nothing we've ingested
  currently computes (existing state data is case COUNTS, not contract
  VALUES). Left out rather than built from the wrong unit of measurement —
  add a real state-value aggregation before enabling that option.
*/

type ViewMode = 'department' | 'vendor';

function formatInr(value: number): string {
  if (value >= 1e7) return `₹${(value / 1e7).toFixed(1)} Cr`;
  if (value >= 1e5) return `₹${(value / 1e5).toFixed(1)} L`;
  return `₹${value.toLocaleString('en-IN')}`;
}

const COLORS = ['#B8862E', '#8C7A4E', '#3F6B4F', '#1B2A3D', '#8B2E2E', '#6b7280'];

export default function ConcentrationTreemap({ stats }: { stats: StatEntry[] }) {
  const [view, setView] = useState<ViewMode>('vendor');

  const vendorData = stats
    .filter((s) => s.metric_type === 'vendor_contract_value')
    .map((s) => ({ name: s.label, size: s.value }))
    .sort((a, b) => b.size - a.size)
    .slice(0, 15);

  const departmentData = stats
    .filter((s) => s.metric_type === 'org_award_concentration' && s.label.startsWith('HHI'))
    .map((s) => ({ name: s.label.replace(/^HHI\s*—\s*/, ''), size: s.value }))
    .sort((a, b) => b.size - a.size)
    .slice(0, 15);

  const data = view === 'vendor' ? vendorData : departmentData;

  return (
    <div className="case-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-mono text-xs uppercase tracking-widest text-ink/50">
          Contract distribution
        </h3>
        <select
          value={view}
          onChange={(e) => setView(e.target.value as ViewMode)}
          className="text-xs font-mono border border-black/15 rounded-sm px-2 py-1 bg-paper"
        >
          <option value="vendor">See the breakdown by: Top Corporate Vendors</option>
          <option value="department">See the breakdown by: Department (HHI)</option>
        </select>
      </div>

      {data.length === 0 ? (
        <div className="h-[280px] flex items-center justify-center text-sm text-ink/50 font-mono text-center">
          No {view === 'vendor' ? 'vendor value' : 'department concentration'} data yet — run
          anomaly_engine.py / aggregate_stats.py to populate this view.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <Treemap
            data={data}
            dataKey="size"
            stroke="#101826"
            content={<TreemapTile isVendor={view === 'vendor'} />}
          />
        </ResponsiveContainer>
      )}
    </div>
  );
}

function TreemapTile(props: any) {
  const { x, y, width, height, index, name, size, isVendor } = props;
  if (width < 2 || height < 2) return null;
  const color = COLORS[index % COLORS.length];
  const showLabel = width > 60 && height > 30;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={color} stroke="#101826" strokeWidth={2} />
      {showLabel && (
        <>
          <text x={x + 6} y={y + 16} fontSize={11} fontFamily="IBM Plex Mono" fill="#101826" fontWeight={600}>
            {name && name.length > 22 ? name.slice(0, 20) + '…' : name}
          </text>
          <text x={x + 6} y={y + 30} fontSize={10} fontFamily="IBM Plex Mono" fill="#101826aa">
            {isVendor ? formatInr(size) : `HHI ${size.toFixed(0)}`}
          </text>
        </>
      )}
    </g>
  );
}
