import Link from 'next/link';
import topics from '@/data/topics.json';

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <div className="max-w-2xl mb-14">
        <span className="font-mono text-xs text-gold tracking-widest uppercase">Vol. I — Pilot Edition</span>
        <h1 className="font-display text-5xl font-semibold text-paper mt-3 leading-tight">
          Public-interest cases, tracked to source.
        </h1>
        <p className="text-paper/60 mt-4 leading-relaxed">
          Every entry links to a government record, a court filing, or a named journalist. Nothing is published
          without editorial review. Select a topic to see published cases, mapped and sourced.
        </p>
      </div>

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
  );
}
