import { Router } from 'express';
import { Card } from '../models/Card.js';
import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

/* The card palette, duplicated here because the SVG cannot read the stylesheet.
   Keep in step with client/src/styles/cards.css. */
const THEMES = {
  butter: { pastel: '#fdeec2', deep: '#f6dc95', ink: '#8a5f0c', body: '#fffdf8', text: '#211a2b' },
  lilac: { pastel: '#e9e0ff', deep: '#d3c2ff', ink: '#5b3fbf', body: '#fffdf8', text: '#211a2b' },
  mint: { pastel: '#d9f2e3', deep: '#b4e5c9', ink: '#1f7a54', body: '#fffdf8', text: '#211a2b' },
  peach: { pastel: '#ffe2d6', deep: '#ffc7b0', ink: '#bf4f2a', body: '#fffdf8', text: '#211a2b' },
  sky: { pastel: '#dcecff', deep: '#bcd9ff', ink: '#235b9e', body: '#fffdf8', text: '#211a2b' },
  bubblegum: { pastel: '#ffe0ef', deep: '#ffc2dd', ink: '#c22e77', body: '#fffdf8', text: '#211a2b' },
  grape: { pastel: '#efe1fb', deep: '#ddc0f4', ink: '#7b2fae', body: '#fffdf8', text: '#211a2b' },
  tangerine: { pastel: '#ffe7cc', deep: '#ffcf9c', ink: '#b5610d', body: '#fffdf8', text: '#211a2b' },
  berry: { pastel: '#ffdcdc', deep: '#ffb8ba', ink: '#b32836', body: '#fffdf8', text: '#211a2b' },
  charcoal: { pastel: '#3a3350', deep: '#4a4166', ink: '#ffd479', body: '#262133', text: '#f4efff' },
};

// Verdana is the one sans face present on effectively every platform, which is
// why badge services use it. Anything web-loaded would not render on GitHub.
const FONT = "Verdana,DejaVu Sans,Geneva,sans-serif";

const esc = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/** Rough advance width for Verdana, good enough for wrapping and chip sizing. */
const textWidth = (s = '', size = 12) => String(s).length * size * 0.58;

/** Greedy word wrap to a pixel width, capped at `maxLines`. */
function wrap(text = '', size, maxWidth, maxLines) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (textWidth(next, size) > maxWidth && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines) break;
    } else {
      line = next;
    }
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && words.length) {
    // add an ellipsis if we ran out of room
    const joined = lines.join(' ');
    const consumed = joined.split(/\s+/).length;
    if (consumed < words.length) {
      let last = lines[maxLines - 1];
      while (last && textWidth(`${last}...`, size) > maxWidth) {
        last = last.split(' ').slice(0, -1).join(' ');
      }
      lines[maxLines - 1] = `${last}...`;
    }
  }
  return lines;
}

const codeFor = (card) => {
  const raw = (card.appCode || '').trim() || String(card.projectName || '').split(/\s+/)[0] || '';
  return raw.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 5) || 'CARD';
};

function chips(items, startX, y, t, size = 10) {
  let x = startX;
  const out = [];
  for (const item of items) {
    const w = textWidth(item, size) + 16;
    if (x + w > 420) break;
    out.push(
      `<g><rect x="${x}" y="${y}" width="${w.toFixed(1)}" height="20" rx="10" fill="${t.body}" stroke="${t.text}" stroke-width="2"/>` +
        `<text x="${(x + w / 2).toFixed(1)}" y="${y + 14}" font-family="${FONT}" font-size="${size}" font-weight="bold" fill="${t.text}" text-anchor="middle">${esc(item)}</text></g>`
    );
    x += w + 6;
  }
  return out.join('');
}

function cardSvg(card, owner) {
  const t = THEMES[card.theme] || THEMES.butter;
  const W = 440;
  const H = 180;
  const name = String(card.projectName || 'Untitled project');
  const nameSize = name.length > 26 ? 15 : name.length > 18 ? 18 : 22;
  const desc = wrap(card.description || '', 12, 322, 2);
  const stack = (Array.isArray(card.techStack) ? card.techStack : []).filter(Boolean).slice(0, 4);
  const handle = card.repoName || (owner ? `@${owner.username}` : '');

  const stats = [
    `${card.githubStars || 0} stars`,
    `${card.likeCount || 0} on Deckr`,
    owner ? `by ${owner.displayName || owner.username}` : null,
  ]
    .filter(Boolean)
    .join('  ·  ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(name)} on Deckr">
  <title>${esc(name)} on Deckr</title>
  <rect x="8" y="8" width="428" height="168" rx="14" fill="${t.text}"/>
  <rect x="2" y="2" width="428" height="168" rx="14" fill="${t.body}" stroke="${t.text}" stroke-width="3"/>
  <rect x="2" y="2" width="428" height="34" rx="14" fill="${t.pastel}"/>
  <rect x="2" y="24" width="428" height="12" fill="${t.pastel}"/>
  <path d="M2 36 H430" stroke="${t.text}" stroke-width="3"/>
  <text x="18" y="25" font-family="${FONT}" font-size="11" font-weight="bold" fill="${t.text}" letter-spacing="2">DECKR</text>
  <text x="412" y="25" font-family="${FONT}" font-size="10" fill="${t.ink}" text-anchor="end">${esc(handle).slice(0, 46)}</text>

  <rect x="18" y="52" width="56" height="56" rx="13" fill="${t.pastel}" stroke="${t.text}" stroke-width="2.5"/>
  <text x="46" y="87" font-family="${FONT}" font-size="14" font-weight="bold" fill="${t.ink}" text-anchor="middle">${esc(codeFor(card))}</text>

  <text x="88" y="72" font-family="${FONT}" font-size="${nameSize}" font-weight="bold" fill="${t.text}">${esc(name).slice(0, 40)}</text>
  ${desc
    .map(
      (line, i) =>
        `<text x="88" y="${94 + i * 16}" font-family="${FONT}" font-size="12" fill="${t.ink}">${esc(line)}</text>`
    )
    .join('\n  ')}

  ${chips(stack, 18, 124, t)}
  <text x="18" y="160" font-family="${FONT}" font-size="10" fill="${t.ink}">${esc(stats)}</text>
</svg>`;
}

router.get(
  '/embed/card/:id.svg',
  asyncHandler(async (req, res) => {
    const send = (svg, maxAge) => {
      res.set('Content-Type', 'image/svg+xml; charset=utf-8');
      res.set('Cache-Control', `public, max-age=${maxAge}`);
      res.send(svg);
    };

    const notFound = `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="60" role="img" aria-label="Card not found">
  <rect x="2" y="2" width="436" height="56" rx="12" fill="#fffdf8" stroke="#211a2b" stroke-width="3"/>
  <text x="220" y="35" font-family="${FONT}" font-size="13" fill="#211a2b" text-anchor="middle">Deckr card not found</text>
</svg>`;

    if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) return send(notFound, 60);

    const card = await Card.findById(req.params.id).populate(
      'owner',
      'username displayName isPublic'
    );
    if (!card || !card.isPublic || !card.owner || card.owner.isPublic === false) {
      return send(notFound, 60);
    }
    // short cache so an edited card refreshes, GitHub proxies on top of this
    return send(cardSvg(card, card.owner), 300);
  })
);

export default router;
