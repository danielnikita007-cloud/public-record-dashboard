import { LegalViolation } from '@/lib/types';

const STATUS_LABEL: Record<string, string> = {
  alleged: 'Alleged',
  FIR_filed: 'FIR filed',
  chargesheeted: 'Chargesheeted',
  convicted: 'Convicted',
  acquitted: 'Acquitted',
  pending: 'Pending',
};

export default function LegalViolationPanel({ violations }: { violations: LegalViolation[] }) {
  if (!violations || violations.length === 0) return null;
  return (
    <div className="border-l-2 border-gold bg-record/60 p-5 rounded-sm">
      <h3 className="font-mono text-xs uppercase tracking-widest text-gold mb-3">
        Constitutional & Statutory Context
      </h3>
      <div className="space-y-4">
        {violations.map((v, i) => (
          <div key={i} className="text-sm">
            <div className="flex items-center gap-2 flex-wrap">
              {v.constitutional_article && (
                <span className="font-mono text-xs bg-paper/10 text-paper px-2 py-0.5 rounded-sm">{v.constitutional_article}</span>
              )}
              {v.statute && (
                <span className="font-mono text-xs bg-paper/10 text-paper px-2 py-0.5 rounded-sm">{v.statute}</span>
              )}
              <span className="status-tab bg-gold/15 text-gold border-gold/40 ml-auto">
                {STATUS_LABEL[v.legal_status]}
              </span>
            </div>
            <p className="text-paper/70 mt-1.5 leading-relaxed">{v.violation_description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
