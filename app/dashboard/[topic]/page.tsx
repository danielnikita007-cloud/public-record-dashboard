import VendorBarChart from '@/components/charts/VendorBarChart';
import topics from '@/data/topics.json';
import topicContext from '@/data/topic-context.json';
import { getPublishedCasesByTopic, getStats } from '@/lib/db';
import CaseSummaryChart from '@/components/charts/CaseSummaryChart';
import AggregateStatsPanel from '@/components/charts/AggregateStatsPanel';
import ContextPanel from '@/components/legal/ContextPanel';
import StatCards from '@/components/charts/StatCards';
import MetricGrid from '@/components/charts/MetricGrid';
import CaseListWithToggle from '@/components/shared/CaseListWithToggle';
import ObservatoryHeader from '@/components/shared/ObservatoryHeader';
import ConcentrationScatter from '@/components/charts/ConcentrationScatter';
import ConcentrationTreemap from '@/components/charts/ConcentrationTreemap';

export default async function TopicDashboard({ params }: { params: { topic: string } }) {
  const topic = topics.find((t) => t.slug === params.topic);
  const cases = await getPublishedCasesByTopic(params.topic);
  const stats = await getStats(params.topic);

  if (!topic) {
    return <div className="max-w-6xl mx-auto px-6 py-16 text-paper">Topic not found.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <ObservatoryHeader />
      <span className="font-mono text-xs text-gold tracking-widest uppercase">Sector</span>
      <h1 className="font-display text-4xl font-semibold text-paper mt-2">{topic.title}</h1>
      <p className="text-paper/60 mt-2 max-w-2xl leading-relaxed">{topic.description}</p>

      <div className="mt-8">
        <StatCards stats={stats} cases={cases} />
      </div>

      {/* Metric grid replaces the map on sector views — click any card to drill down */}
      <div className="mt-8">
        <MetricGrid stats={stats} />
      </div>

      <div className="mt-5">
        <ConcentrationTreemap stats={stats} />
      </div>

<div className="mt-5">
  <VendorBarChart stats={stats} metricType="vendor_contract_count" title="Vendors by contract count" />
</div>
<div className="mt-5">
  <VendorBarChart stats={stats} metricType="vendor_contract_value" title="Vendors by total contract value" />
</div>
      <div className="mt-5">
        <ConcentrationScatter stats={stats} />
      </div>

      {stats.length > 0 && (
        <div className="grid md:grid-cols-3 gap-5 mt-8">
          <div className="md:col-span-2">
            <AggregateStatsPanel title="Distribution — public records" stats={stats} />
          </div>
          <CaseSummaryChart cases={cases} />
        </div>
      )}

      <div className="mt-8">
        <ContextPanel entries={(topicContext as Record<string, any[]>)[params.topic] || []} />
      </div>

      <div className="mt-10">
        <h2 className="font-mono text-xs uppercase tracking-widest text-paper/50 mb-4">
          Records ({cases.length})
        </h2>
        <CaseListWithToggle cases={cases} />
      </div>
    </div>
  );
}
