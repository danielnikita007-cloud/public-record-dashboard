import Link from 'next/link';
import topics from '@/data/topics.json';
import { getDb } from '@/lib/db';
import MapboxLayer from '@/components/map/MapboxLayer';
import CaseSummaryChart from '@/components/charts/CaseSummaryChart';

const STATUS_LABEL: Record<string, string> = {
  alleged: 'Alleged',
  under_investigation: 'Under investigation',
  court_confirmed: 'Court confirmed',
  closed: 'Closed',
};

export default async function TopicDashboard({ params }: { params: { topic: string } }) {
  const topic = topics.find((t) => t.slug === params.topic);
  const db = await getDb();
  const cases = db.data!.cases.filter((c) => c.topic_slug === params.topic && c.review_status === 'published');

  if (!topic) {
    return <div className="max-w-6xl mx-auto px-6 py-16 text-paper">Topic not found.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <span className="font-mono text-xs text-gold tracking-widest uppercase">Topic</span>
      <h1 className="font-display text-4xl font-semibold text-paper mt-2">{topic.title}</h1>
      <p className="text-paper/60 mt-2 max-w-2xl leading-relaxed">{topic.description}</p>

      <div className="grid md:grid-cols-3 gap-5 mt-10">
        <div className="md:col-span-2">
          <MapboxLayer cases={cases} />
        </div>
        <CaseSummaryChart cases={cases} />
      </div>

      <div className="mt-10">
        <h2 className="font-mono text-xs uppercase tracking-widest text-paper/50 mb-4">
          Published cases ({cases.length})
        </h2>
        {cases.length === 0 && (
          <div className="case-card p-6 text-sm text-ink/50 font-mono">
            No cases published yet for this topic. Use "Submit a case" to add a sourced entry for editorial review.
          </div>
        )}
        <div className="space-y-3">
          {cases.map((c) => (
            <Link key={c.id} href={`/investigation/${c.id}`} className="case-card p-5 flex items-center justify-between hover:border-gold/60 border block">
              <div>
                <h3 className="font-display text-lg font-semibold">{c.title}</h3>
                <p className="text-sm text-ink/60 mt-1">{c.state}{c.district ? `, ${c.district}` : ''} · {c.sources.length} source{c.sources.length !== 1 ? 's' : ''}</p>
              </div>
              <span className="status-tab bg-gold/10 text-ink border-ink/20">{STATUS_LABEL[c.status]}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
