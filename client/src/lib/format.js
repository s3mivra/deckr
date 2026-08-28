const nf = new Intl.NumberFormat('en-US');

export const formatNumber = (n) => nf.format(Number(n) || 0);

/**
 * A short badge code for a card. Uses the first word of the project name,
 * letters and digits only, up to 5 chars. Falls back to the whole name,
 * then to a dash.
 */
export function deriveAppCode(name = '') {
  const clean = (s) => String(s || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
  const first = clean(String(name).trim().split(/\s+/)[0]).slice(0, 5);
  if (first) return first;
  const whole = clean(name).slice(0, 5);
  return whole || '—';
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
