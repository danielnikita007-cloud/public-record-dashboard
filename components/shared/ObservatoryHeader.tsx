export default function ObservatoryHeader() {
  return (
    <div className="border-b border-gold/30 bg-record/40 -mx-6 px-6 py-6 mb-8">
      <div className="flex items-center gap-3">
        <span className="w-2 h-2 rounded-full bg-verified animate-pulse" />
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-gold">
          Public Record Observatory — Legally Verified Analytics
        </p>
      </div>
      <p className="text-paper/50 text-sm mt-2 max-w-2xl leading-relaxed">
        Factual anomalies derived from CAG audits, ECI disclosures, CPPP tenders, and cited news
        reporting. Every figure below is a descriptive statistic from a named public record — not a
        finding of wrongdoing. Click any element for its source and methodology.
      </p>
    </div>
  );
}
