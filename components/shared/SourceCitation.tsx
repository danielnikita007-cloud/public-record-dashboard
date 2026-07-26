import { CaseSource } from '@/lib/types';

const TIER_LABEL: Record<string, string> = {
  primary_govt: 'Government record',
  court_record: 'Court record',
  independent_journalist: 'Independent journalist',
  news_outlet: 'News outlet',
};

const TIER_COLOR: Record<string, string> = {
  primary_govt: 'bg-verified/15 text-verified border-verified/40',
  court_record: 'bg-verified/15 text-verified border-verified/40',
  independent_journalist: 'bg-gold/15 text-gold border-gold/40',
  news_outlet: 'bg-gold/15 text-gold border-gold/40',
};

export default function SourceCitation({ source }: { source: CaseSource }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 text-sm py-1.5 border-b border-black/5 last:border-0 hover:opacity-80"
    >
      <span className={`status-tab ${TIER_COLOR[source.source_tier]}`}>{TIER_LABEL[source.source_tier]}</span>
      <span className="text-ink/80">{source.publisher}</span>
      {source.published_date && <span className="text-ink/40 text-xs font-mono">{source.published_date}</span>}
      <span className="ml-auto text-ink/40 text-xs">↗</span>
    </a>
  );
}
