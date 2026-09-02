import { formatNumber, deriveAppCode, priceFor } from './format.js';

export const STATUS_LABEL = {
  idea: 'Idea',
  'in-progress': 'In progress',
  shipped: 'Shipped',
  live: 'Live',
  archived: 'Archived',
};

export function teamValue(card) {
  if (card.teamType !== 'team') return 'Solo';
  return card.teamSize ? `Team of ${card.teamSize}` : 'Team';
}

export function codeFor(card) {
  return (card.appCode || '').trim() || deriveAppCode(card.projectName || '');
}

// the fields a bound "field" element can pull from a card, with labels for the editor
export const BOUND_FIELDS = [
  { key: 'projectName', label: 'Project name' },
  { key: 'appCode', label: 'App code' },
  { key: 'description', label: 'Description' },
  { key: 'repoName', label: 'Repo (owner/name)' },
  { key: 'primaryLanguage', label: 'Main language' },
  { key: 'buildTime', label: 'Build time' },
  { key: 'status', label: 'Status' },
  { key: 'teamLabel', label: 'Solo / team' },
  { key: 'price', label: 'Price' },
  { key: 'stars', label: 'GitHub stars (number)' },
  { key: 'portfolioUrl', label: 'Live / portfolio URL' },
];

export function boundValue(bind, card = {}) {
  switch (bind) {
    case 'projectName':
      return card.projectName || 'Untitled project';
    case 'appCode':
      return codeFor(card);
    case 'description':
      return card.description || '';
    case 'repoName':
      return card.repoName || '';
    case 'primaryLanguage':
      return card.primaryLanguage || '';
    case 'buildTime':
      return card.buildTime || '';
    case 'status':
      return STATUS_LABEL[card.status] || card.status || '';
    case 'teamLabel':
      return teamValue(card);
    case 'price':
      return priceFor(card);
    case 'stars':
      return formatNumber(card.githubStars || 0);
    case 'portfolioUrl':
      return card.portfolioUrl || '';
    default:
      return '';
  }
}

// GitHub stars -> a 0..max integer for the star-rating element
export function starRating(stars = 0, max = 5, mode = 'scaled') {
  if (mode === 'exact') return Math.max(0, Math.min(max, Math.round(stars)));
  const steps = [1, 10, 50, 200, 1000, 5000];
  let filled = 0;
  for (const s of steps) {
    if (stars >= s) filled += 1;
  }
  return Math.max(0, Math.min(max, Math.round((filled / steps.length) * max)));
}
