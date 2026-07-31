'use client';
import { useState } from 'react';
import { StatEntry } from '@/lib/types';

function formatValue(s: StatEntry): string {
  const value = s?.value;
  if (value === undefined || value === null || isNaN(value)) return '—';
  if (s.unit === 'inr') {
    if (value >= 1e7) return `₹${(value / 1e7).toFixed(2)} Cr`;
    if (value >= 1e5) return `₹${(value / 1e5).toFixed(2)} L`;
    return `₹${value.toLocaleString('en-IN')}`;
  }
  if (s.unit === 'percent') return `${value.toFixed(1)}%`;
  return value.toLocaleString('en-IN');
}

/*
  Interpretation guidance shown on drill-down. Deliberately states what a
  metric does NOT establish, so a reader doesn't take a high number as a
  finding of wrongdoing.
*/
const METRIC_GUIDANCE: Record<string, string> = {
  org_award_concentration:
    'The Herfindahl-Hirschman Index (HHI) is the standard measure competition regulators use for market concentration, on a 0–10,000 scale. Higher means a few vendors hold most of the awarded value. As rough orientation, competition authorities often treat above 2,500 as highly concentrated — though those thresholds were written for product markets, not public procurement. High concentration can reflect a closed market, but equally a specialised field with few qualified suppliers. It indicates where to look, not what was found.',
  single_bid_rate:
    'Share of awards that drew exactly one bidder. Tenders are meant to attract competing bids, so a high rate is worth examining — but single bids are common and entirely innocent for small, urgent, or highly specialised contracts. This is not evidence of impropriety on its own.',
  vendor_contract_value:
    'Total value of contracts recorded against this vendor name in the dataset sample. Name-matching is literal, so related entities under different registered names are counted separately, and the true total for a corporate group may be higher.',
  vendor_contract_count:
    'Number of contract records naming this vendor as the winning bidder in the dataset sample. A large contractor legitimately winning many contracts will rank highly here.',
  short_window_rate:
    'Share of awards with an unusually short gap between bid closing and award. Can indicate a compressed process, or simply an efficient one for a straightforward contract.',
  topic_case_count:
    'A count of records matching this topic in the underlying dataset.',
};

export default function MetricGrid({ stats }: { stats: StatEntry[] }) {
  const [selected, setSelected] = useState<StatEntry | null>(null);

  if (!stats || stats.length === 0) {
    return (
      <div className="case-card p-6 text-sm text-ink/50 font-mono">
        No metrics computed yet — run the anomaly engine (services/scraper/scrapers/anomaly_engine.py)
        to populate this grid from public procurement records.
      </div>
    );
  }

  // Group by metric type so related measures sit together
  const groups = stats.reduce((acc, s) => {
    (acc[s.metric_type] ||= []).push(s);
    return acc;
  }, {} as Record<string, StatEntry[]>);

  const GROUP_TITLE: Record<string, string> = {
    org_award_concentration: 'Vendor concentration by organisation',
    single_bid_rate: 'Single-bid award rates',
    vendor_contract_value: 'Vendors by total awarded value',
    vendor_contract_count: 'Vendors by contract count',
    short_window_rate: 'Short bid-window rates',
    topic_case_count: 'Record counts',
  };

  return (
    <div className="space-y-6">
      {Object.entries(groups).map(([metricType, entries]) => (
        <div key={metricType}>
          <h3 className="font-mono text-xs uppercase tracking-widest text-paper/50 mb-3">
            {GROUP_TITLE[metricType] || metricType.replace(/_/g, ' ')}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {entries
              .slice()
              .sort((a, b) => b.value - a.value)
              .slice(0, 12)
              .map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelected(s)}
                  className="case-card p-4 text-left hover:border-gold/60 border border-transparent transition-colors"
                >
                  <p className="font-mono text-[10px] uppercase tracking-wide text-ink/40 line-clamp-2 min-h-[24px]">
                    {s.label}
                  </p>
                  <p className="font-display text-2xl font-semibold text-ink mt-1">{formatValue(s)}</p>
                  {s.scope && <p className="text-[10px] text-ink/40 mt-1 truncate">{s.scope}</p>}
                </button>
              ))}
          </div>
        </div>
      ))}

      {/* Drill-down panel */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex justify-end"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-paper text-ink w-full max-w-md h-full overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h3 className="font-display text-xl font-semibold">{selected.label}</h3>
              <button onClick={() => setSelected(null)} className="font-mono text-sm text-ink/40 hover:text-ink">
                ✕
              </button>
            </div>

            <p className="font-display text-4xl font-semibold mt-4">{formatValue(selected)}</p>
            {selected.scope && <p className="text-sm text-ink/60 mt-1">{selected.scope}</p>}

            <div className="mt-6 border-l-2 border-gold pl-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink/50 mb-2">
                How to read this
              </p>
              <p className="text-sm text-ink/70 leading-relaxed">
                {METRIC_GUIDANCE[selected.metric_type] ||
                  'A descriptive statistic computed from public records.'}
              </p>
            </div>

            <div className="mt-6">
              <p className="font-mono text-[10px] uppercase tracking-widest text-ink/50 mb-1">Source</p>
              <p className="text-sm text-ink/70">{selected.source_dataset}</p>
              {selected.source_url && (
                <a
                  href={selected.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-record underline mt-1 inline-block"
                >
                  View underlying record ↗
                </a>
              )}
              <p className="text-[11px] text-ink/40 font-mono mt-3">
                Computed {new Date(selected.computed_at).toLocaleDateString('en-IN')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
