import { Deckr } from '../api/client.js';
import { useQuery } from './cache.js';

export const FONT_ROLES = [
  { key: 'display', label: 'Display (Baloo)' },
  { key: 'body', label: 'Body (Nunito)' },
  { key: 'mono', label: 'Mono (JetBrains)' },
  { key: 'hand', label: 'Hand (Patrick)' },
  { key: 'label', label: 'Label (Archivo)' },
];

// the card-theme custom properties a colour value can reference
export const COLOR_TOKENS = ['card-ink', 'theme-ink', 'pastel', 'pastel-2', 'card-body'];

export function resolveColor(value) {
  if (!value) return undefined;
  if (value.startsWith('token:')) return `var(--${value.slice(6)})`;
  return value;
}

export function resolveFont(value) {
  return `var(--font-${value || 'body'})`;
}

export function isDesignAvailable(design, now = new Date()) {
  if (!design) return false;
  if (design.status && design.status !== 'published') return false;
  const av = design.availability || {};
  if (av.mode !== 'window') return true;
  const start = av.start ? new Date(av.start) : null;
  const end = av.end ? new Date(av.end) : null;
  return (!start || start <= now) && (!end || now <= end);
}

// summary string for a design's availability, for the admin list
export function availabilitySummary(design) {
  const av = design.availability || {};
  if (av.mode !== 'window') return 'Always';
  const fmt = (d) => (d ? new Date(d).toLocaleDateString() : '?');
  return `${fmt(av.start)} - ${fmt(av.end)}`;
}

// all published designs currently open - drives the card builder picker
export function usePublishedDesigns() {
  const { data } = useQuery('designs', Deckr.publishedDesigns, { ttl: 60_000 });
  return data?.designs || [];
}

// resolve a single design by slug for the card renderer. Prefers the open list,
// falls back to a direct fetch so a card that already uses a now-closed design
// keeps rendering.
export function useDesign(slug) {
  const open = usePublishedDesigns();
  const fromList = slug ? open.find((d) => d.slug === slug) : null;
  const { data } = useQuery(
    slug && !fromList ? `design:${slug}` : null,
    () => Deckr.getDesign(slug),
    { ttl: 5 * 60_000 }
  );
  if (!slug) return null;
  return fromList || data?.design || null;
}
