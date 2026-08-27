const nf = new Intl.NumberFormat('en-US');

export const formatNumber = (n) => nf.format(Number(n) || 0);

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
