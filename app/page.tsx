import Link from 'next/link';
import topics from '@/data/topics.json';
import MacroBudgetTreemap from '@/components/charts/MacroBudgetTreemap';
import ObservatoryHeader from '@/components/shared/ObservatoryHeader';
import SectorDeepDives from '@/components/charts/SectorDeepDives';

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <ObservatoryHeader />

      <div className="max-w-2xl mb-10">
        <span className="font-mono text-xs text-gold tracking-widest uppercase">Vol. I — Pilot Edition</span>
        <h1 className="font-display text-5xl font-semibold text-paper mt-3 leading-tight">
          Where does the money actually go?
        </h1>
        <p className="text-paper/60 mt-4 leading-relaxed">
          Every figure below comes from an official budget document, court filing, or audit report —
          click any tile to see sourced ground-reality notes, not just the headline number.
        </p>
      </div>

      <MacroBudgetTreemap />

      <div className="mt-10">
        <h2 className="font-mono text-xs uppercase tracking-widest text-paper/50 mb-4">
          Sector deep-dives — real ground-reality data
        </h2>
        <SectorDeepDives />
      </div>

      <div className="mt-14">
        <h2 className="font-mono text-xs uppercase tracking-widest text-paper/50 mb-4">
          Thematic deep-dives
        </h2>
        <div className="grid md:grid-cols-2 gap-5">
          {topics.map((t, i) => (
            <Link
              key={t.slug}
              href={`/dashboard/${t.slug}`}
              className="case-card p-6 hover:border-gold/60 border transition-colors group"
            >
              <div className="flex items-start justify-between">
                <span className="font-mono text-xs text-ink/40">{String(i + 1).padStart(2, '0')}</span>
              </div>
              <h2 className="font-display text-xl font-semibold mt-2 group-hover:text-record">{t.title}</h2>
              <p className="text-sm text-ink/60 mt-2 leading-relaxed">{t.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

