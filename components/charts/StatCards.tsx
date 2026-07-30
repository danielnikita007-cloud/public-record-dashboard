import { StatEntry, Case } from '@/lib/types';

function formatInr(value: number): string {
  if (value >= 1e7) return `₹${(value / 1e7).toFixed(1)} Cr`;
  if (value >= 1e5) return `₹${(value / 1e5).toFixed(1)} L`;
  return `₹${value.toLocaleString('en-IN')}`;
}

interface KpiCard {
  label: string;
  value: string;
  sublabel?: string;
}

export default function StatCards({ stats, cases }: { stats: StatEntry[]; cases: Case[] }) {
  const cards: KpiCard[] = [];

  cards.push({
    label: 'Published cases',
    value: String(cases.length),
    sublabel: cases.length > 0 ? `${new Set(cases.map((c) => c.state).filter(Boolean)).size} states` : undefined,
  });

  const valueStats = stats.filter((s) => s.unit === 'inr');
  if (valueStats.length > 0) {
    const total = valueStats.reduce((sum, s) => sum + s.value, 0);
    cards.push({ label: 'Total contract value tracked', value: formatInr(total), sublabel: `across ${valueStats.length} records` });
  }

  const percentStats = stats.filter((s) => s.unit === 'percent');
  percentStats.slice(0, 1).forEach((s) => {
    cards.push({ label: s.label, value: `${s.value.toFixed(1)}%`, sublabel: s.scope });
  });

  const countStats = stats.filter((s) => s.unit === 'count');
  if (countStats.length > 0) {
    const topCount = countStats.reduce((max, s) => (s.value > max.value ? s : max), countStats[0]);
    cards.push({ label: 'Highest single count', value: topCount.value.toLocaleString('en-IN'), sublabel: topCount.label });
  }

  if (cards.length === 1) {
    cards.push({ label: 'Numeric data', value: '—', sublabel: 'Run the data scanners to populate this' });
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((card, i) => (
        <div key={i} className="case-card p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink/40">{card.label}</p>
          <p className="font-display text-2xl md:text-3xl font-semibold text-ink mt-1">{card.value}</p>
          {card.sublabel && <p className="text-xs text-ink/50 mt-1 truncate">{card.sublabel}</p>}
        </div>
      ))}
    </div>
  );
}
