import { formatNumber } from './format.js';

const isSlug = (s) => typeof s === 'string' && /^[\w.-]+\/[\w.-]+$/.test(s);

export function repoLink(card) {
  if (card.repoUrl) return card.repoUrl;
  if (isSlug(card.repoName)) return `https://github.com/${card.repoName}`;
  return '';
}

/**
 * A Markdown "Projects" block from a deck, ready to paste into a README, a
 * resume, or a LinkedIn "Projects" section. Private cards are skipped. Input
 * order is preserved (the dashboard hands us newest first).
 */
export function cardsToMarkdown(cards = [], { heading = '## Projects' } = {}) {
  const rows = (cards || []).filter((c) => c && c.isPublic !== false);
  if (!rows.length) return `${heading}\n\n_No public project cards yet._\n`;

  const out = [heading, ''];
  for (const c of rows) {
    const name = c.projectName || 'Untitled project';
    const repo = repoLink(c);
    out.push(`### ${repo ? `[${name}](${repo})` : name}`);

    if (c.description) out.push(c.description);

    const meta = [];
    if (c.primaryLanguage) meta.push(c.primaryLanguage);
    if ((c.techStack || []).length) meta.push(c.techStack.join(', '));
    if (c.buildTime) meta.push(`built in ${c.buildTime}`);
    meta.push(c.teamType === 'team' ? `team${c.teamSize ? ` of ${c.teamSize}` : ''}` : 'solo');
    if (c.githubStars) meta.push(`${formatNumber(c.githubStars)} stars`);
    if (meta.length) out.push(`*${meta.join(' · ')}*`);

    const links = [];
    if (repo) links.push(`[Repo](${repo})`);
    if (c.portfolioUrl) links.push(`[Live](${c.portfolioUrl})`);
    if (links.length) out.push(links.join(' · '));

    if (c.whatLearned) out.push(`> ${c.whatLearned}`);
    out.push('');
  }
  return `${out.join('\n').trim()}\n`;
}

export function downloadText(text, filename) {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
