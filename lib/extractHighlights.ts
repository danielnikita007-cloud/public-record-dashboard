/*
  Pulls out the standout figures from a case summary — ₹ amounts, areas,
  percentages, counts — and returns them as short labeled callouts, so a
  case reads as "here are the numbers that matter" first, prose second.

  This works directly off the existing summary text, so it needs no new
  data-entry fields — any already-submitted case benefits immediately.
*/

export interface Highlight {
  value: string;      // the number as it appeared, e.g. "₹39,443 crore"
  context: string;    // a short phrase around it, e.g. "in land allotments"
}

const CURRENCY_RE = /₹[\d,]+(?:\.\d+)?\s*(?:crore|lakh|cr\b)/gi;
const PERCENT_RE = /\b\d+(?:\.\d+)?\s*%/g;
const COUNT_RE = /\b\d{1,3}(?:,\d{2,3})+\b(?!\s*(?:crore|lakh))/g; // large comma-formatted counts, not currency

function extractContext(text: string, matchIndex: number, matchLength: number): string {
  const windowStart = Math.max(0, matchIndex - 45);
  const windowEnd = Math.min(text.length, matchIndex + matchLength + 45);
  let snippet = text.slice(windowStart, windowEnd).trim();
  // Trim to whole words at the edges
  if (windowStart > 0) snippet = snippet.replace(/^\S*\s/, '');
  if (windowEnd < text.length) snippet = snippet.replace(/\s\S*$/, '');
  return snippet;
}

export function extractHighlights(summary: string, max: number = 4): Highlight[] {
  const found: { value: string; index: number; context: string }[] = [];
  const seen = new Set<string>();

  for (const re of [CURRENCY_RE, PERCENT_RE, COUNT_RE]) {
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(summary)) !== null) {
      const value = match[0].trim();
      if (seen.has(value)) continue;
      seen.add(value);
      found.push({
        value,
        index: match.index,
        context: extractContext(summary, match.index, match[0].length),
      });
    }
  }

  // Prefer currency/crore figures first (usually the headline numbers),
  // then keep original document order within each type.
  found.sort((a, b) => {
    const aCurrency = /₹|crore|lakh/i.test(a.value) ? 0 : 1;
    const bCurrency = /₹|crore|lakh/i.test(b.value) ? 0 : 1;
    if (aCurrency !== bCurrency) return aCurrency - bCurrency;
    return a.index - b.index;
  });

  return found.slice(0, max).map((f) => ({ value: f.value, context: f.context }));
}
