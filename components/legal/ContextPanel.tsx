'use client';
import { useState } from 'react';

interface ContextEntry {
  term: string;
  explanation: string;
  source_note: string;
  source_url?: string;
}

export default function ContextPanel({ entries }: { entries: ContextEntry[] }) {
  const [open, setOpen] = useState(true);

  if (!entries || entries.length === 0) return null;

  return (
    <div className="case-card p-5 border-l-2 border-gold">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left"
      >
        <h3 className="font-mono text-xs uppercase tracking-widest text-ink/50">
          Understanding this data — definitions & context
        </h3>
        <span className="font-mono text-xs text-ink/40">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          {entries.map((entry, i) => (
            <div key={i} className={i > 0 ? 'pt-4 border-t border-black/10' : ''}>
              <p className="font-display font-semibold text-ink text-[15px]">{entry.term}</p>
              <p className="text-sm text-ink/70 mt-1 leading-relaxed">{entry.explanation}</p>
              <p className="text-[11px] text-ink/40 font-mono mt-1.5">
                Source: {entry.source_note}
                {entry.source_url && (
                  <>
                    {' · '}
                    <a href={entry.source_url} target="_blank" rel="noopener noreferrer" className="underline hover:text-gold">
                      view
                    </a>
                  </>
                )}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
