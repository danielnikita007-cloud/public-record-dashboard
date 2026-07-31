// Single source of truth for status colors, used consistently across
// every chart, map, and toggle on the site — a reader who learns "gold =
// alleged" on one chart shouldn't have to relearn it on the next one.

export const STATUS_COLOR: Record<string, string> = {
  alleged: '#8C7A4E',
  under_investigation: '#B8862E',
  court_confirmed: '#3F6B4F',
  closed: '#6b7280',
};

export const STATUS_LABEL: Record<string, string> = {
  alleged: 'Alleged',
  under_investigation: 'Under investigation',
  court_confirmed: 'Court confirmed',
  closed: 'Closed',
};

export const ALL_STATUSES = ['alleged', 'under_investigation', 'court_confirmed', 'closed'] as const;

// A small reusable legend so any chart using these colors can show what
// they mean without repeating the color-to-label mapping inline.
export function statusLegendItems(statusesUsed?: string[]) {
  const statuses = statusesUsed || [...ALL_STATUSES];
  return statuses.map((s) => ({ status: s, color: STATUS_COLOR[s], label: STATUS_LABEL[s] }));
}
