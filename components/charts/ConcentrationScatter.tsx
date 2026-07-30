'use client';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { StatEntry } from '@/lib/types';

/*
  Plots each organisation as one point: HHI (concentration) on the X axis,
  single-bid rate on the Y axis. Both are computed from the same public
  procurement records by anomaly_engine.py.

  NOTE ON SCOPE: the original request asked for "project overrun frequency"
  on the Y axis. That data doesn't exist in anything we've ingested — it
  would require completion-vs-schedule records per project, which CPPP
  award data doesn't contain. Single-bid rate is used instead because it's
  a real, computed figure from the same source. Swap this in once an
  overrun dataset is actually connected — don't relabel this chart as
  "overrun" without the underlying data to back it.
*/

interface OrgPoint {
  org: string;
  hhi: number;
  singleBidRate: number;
  awards: string;
}

function buildPoints(stats: StatEntry[]): OrgPoint[] {
  const hhiByOrg = new Map<string, { value: number; scope?: string }>();
  const sbrByOrg = new Map<string, number>();

  for (const s of stats) {
    if (s.metric_type === 'org_award_concentration' && s.label.startsWith('HHI')) {
      const org = s.label.replace(/^HHI\s*—\s*/, '');
      hhiByOrg.set(org, { value: s.value, scope: s.scope });
    }
    if (s.metric_type === 'single_bid_rate' && s.label.includes('—')) {
      const org = s.label.replace(/^Single-bid rate\s*—\s*/, '');
      sbrByOrg.set(org, s.value);
    }
  }

  const points: OrgPoint[] = [];
  for (const [org, hhi] of hhiByOrg) {
    const sbr = sbrByOrg.get(org);
    if (sbr === undefined) continue;
    points.push({ org, hhi: hhi.value, singleBidRate: sbr, awards: hhi.scope || '' });
  }
  return points;
}

// Standard reference threshold used by competition regulators for
// product markets — shown here only as rough orientation, not a rule
// written for government procurement specifically.
const HHI_HIGH_THRESHOLD = 2500;
const SBR_HIGH_THRESHOLD = 30;

export default function ConcentrationScatter({ stats }: { stats: StatEntry[] }) {
  const points = buildPoints(stats);

  if (points.length === 0) {
    return (
      <div className="case-card p-6 text-sm text-ink/50 font-mono h-[340px] flex items-center justify-center text-center">
        No paired concentration data yet — run anomaly_engine.py to compute HHI and single-bid rate
        together for the same organisations.
      </div>
    );
  }

  return (
    <div className="case-card p-5">
      <h3 className="font-mono text-xs uppercase tracking-widest text-ink/50 mb-1">
        Vendor concentration vs. single-bid rate, by organisation
      </h3>
      <p className="text-[11px] text-ink/40 font-mono mb-3">
        Each point is one organisation. Upper-right = high vendor concentration AND high single-bid
        rate — the pattern most worth an editor's attention, not proof of anything on its own.
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#00000010" />
          <XAxis
            type="number"
            dataKey="hhi"
            name="HHI"
            label={{ value: 'Concentration (HHI)', position: 'insideBottom', offset: -5, fontSize: 10 }}
            tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }}
          />
          <YAxis
            type="number"
            dataKey="singleBidRate"
            name="Single-bid rate"
            unit="%"
            label={{ value: 'Single-bid rate (%)', angle: -90, position: 'insideLeft', fontSize: 10 }}
            tick={{ fontSize: 10, fontFamily: 'IBM Plex Mono' }}
          />
          <ZAxis range={[80, 80]} />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            formatter={(value: number, name: string) => [name === 'hhi' ? value.toFixed(0) : `${value.toFixed(1)}%`, name]}
            labelFormatter={() => ''}
            content={({ active, payload }) => {
              if (!active || !payload || !payload[0]) return null;
              const p = payload[0].payload as OrgPoint;
              return (
                <div className="bg-ink text-paper text-xs font-mono p-2 rounded-sm border border-gold/30">
                  <p className="font-semibold">{p.org}</p>
                  <p>HHI: {p.hhi.toFixed(0)}</p>
                  <p>Single-bid rate: {p.singleBidRate.toFixed(1)}%</p>
                  {p.awards && <p className="text-paper/50">{p.awards}</p>}
                </div>
              );
            }}
          />
          <Scatter data={points}>
            {points.map((p, i) => (
              <Cell
                key={i}
                fill={
                  p.hhi > HHI_HIGH_THRESHOLD && p.singleBidRate > SBR_HIGH_THRESHOLD
                    ? '#8B2E2E'
                    : '#B8862E'
                }
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
