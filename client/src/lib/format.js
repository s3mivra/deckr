const nf = new Intl.NumberFormat('en-US');

export const formatNumber = (n) => nf.format(Number(n) || 0);

/**
 * A short badge code for a card. Uses the first word of the project name,
 * letters and digits only, up to 5 chars. Falls back to the whole name.
 */
export function deriveAppCode(name = '') {
  const clean = (s) => String(s || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
  const first = clean(String(name).trim().split(/\s+/)[0]).slice(0, 5);
  if (first) return first;
  return clean(name).slice(0, 5);
}

/** Small stable hash so packaging copy is the same on every render. */
export function hashOf(input = '') {
  let h = 2166136261;
  const s = String(input);
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const pick = (list, seed) => list[hashOf(seed) % list.length];

/* ---------- packaging small print ---------- */

// rough "shelf price" from how long the build took, nudged by reach.
const PRICE_TIERS = [
  [/(hour|afternoon|evening|day\b|days\b|weekend)/i, 4.99],
  [/(1 week|one week|a week|2 week|two week|fortnight)/i, 12.99],
  [/(3 week|three week|1 month|one month|a month)/i, 24.99],
  [/(2 month|3 month|two month|three month|few month)/i, 49.99],
  [/(6 month|six month|half a year)/i, 99.99],
  [/(year|years)/i, 199.99],
];

export function priceFor(card = {}) {
  const t = String(card.buildTime || '');
  let base = 9.99;
  for (const [re, value] of PRICE_TIERS) {
    if (re.test(t)) {
      base = value;
      break;
    }
  }
  const stars = Number(card.githubStars) || 0;
  if (stars >= 1000) base *= 2;
  else if (stars >= 100) base *= 1.5;
  const shipped = card.status === 'shipped' || card.status === 'live';
  if (!shipped) base *= 0.6;
  // always land on a supermarket-looking .99 / .49
  const rounded = Math.max(0.99, Math.round(base) - 0.01);
  return `$${rounded.toFixed(2)}`;
}

const TRACE_OF = [
  'jQuery',
  'Stack Overflow',
  'console.log',
  'TODO comments',
  'regular expressions',
  'merge conflicts',
  'tabs and spaces',
  'copied snippets',
  'late nights',
];

/**
 * The allergy advice under the ingredients list. The real stack is already
 * printed above it, so this is only the "traces of" joke.
 */
export function tracesLine(card = {}) {
  const trace = pick(TRACE_OF, `${card.projectName || ''}${card.repoName || ''}`);
  return `May contain traces of ${trace}.`;
}

const STORAGE_BY_STATUS = {
  idea: 'Keep refrigerated. Not ready to serve.',
  'in-progress': 'Keep in a cool dry repo. Handle while warm.',
  shipped: 'Store at room temperature. Best served in production.',
  live: 'Keep warm. Check on it daily.',
  archived: 'Frozen on arrival. Thaw fully before reheating.',
};

export function storageLine(card = {}) {
  return STORAGE_BY_STATUS[card.status] || STORAGE_BY_STATUS['in-progress'];
}

const SUGGESTIONS = [
  'Serving suggestion: do not deploy on a Friday.',
  'Serving suggestion: pairs well with a second monitor.',
  'Best enjoyed with the tests passing.',
  'Serving suggestion: read the README first.',
  'Goes well with a fresh branch.',
  'Serve chilled, review warm.',
];

export function servingSuggestion(card = {}) {
  return pick(SUGGESTIONS, card.id || card.projectName || 'deckr');
}

/** Fake batch code, stable per card. */
export function lotNumber(card = {}) {
  const h = hashOf(card.id || card.projectName || 'deckr');
  const code = h.toString(36).toUpperCase().slice(0, 4).padEnd(4, 'X');
  const d = card.createdAt ? new Date(card.createdAt) : null;
  const stamp =
    d && !Number.isNaN(d.getTime())
      ? `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`
      : 'FRESH';
  return `LOT ${code} · ${stamp}`;
}

export function timeAgo(input) {
  if (!input) return '';
  const then = new Date(input).getTime();
  const secs = Math.round((Date.now() - then) / 1000);
  const table = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  if (secs < 45) return 'just now';
  for (const [unit, size] of table) {
    const value = Math.round(secs / size);
    if (value >= 1) return `${value} ${unit}${value > 1 ? 's' : ''} ago`;
  }
  return 'just now';
}
