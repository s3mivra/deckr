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
const FONT = 'Verdana,DejaVu Sans,Geneva,sans-serif';
const MONO = "'DejaVu Sans Mono',Consolas,Menlo,monospace";

// the hard offset shadow is always dark, even under the charcoal theme where
// t.text is light. Same reason the charcoal card keeps a dark outer frame.
const SHADOW = '#1b1626';
const darkFrame = (theme) => (theme === 'charcoal' ? '#1b1626' : '#211a2b');

// linguist-ish colours, so the language dot reads the way a dev expects
const LANG = {
  javascript: '#f1e05a', typescript: '#3178c6', python: '#3572a5', go: '#00add8',
  rust: '#dea584', java: '#b07219', 'c#': '#178600', 'c++': '#f34b7d', c: '#555555',
  ruby: '#701516', php: '#4f5d95', swift: '#f05138', kotlin: '#a97bff', dart: '#00b4ab',
  elixir: '#6e4a7e', scala: '#c22d40', html: '#e34c26', css: '#563d7c', shell: '#89e051',
  vue: '#41b883', svelte: '#ff3e00', lua: '#000080', 'jupyter notebook': '#da5b0b',
  haskell: '#5e5086', clojure: '#db5855', zig: '#ec915c',
};
const langColor = (l = '') => LANG[String(l).trim().toLowerCase()] || '#9b95a8';

// status pill: semantic colour, but muted so it still sits in the cute palette
const STATUS = {
  idea: { bg: '#dcecff', ink: '#235b9e', label: 'IDEA' },
  'in-progress': { bg: '#fdeec2', ink: '#8a5f0c', label: 'IN PROGRESS' },
  shipped: { bg: '#d9f2e3', ink: '#1f7a54', label: 'SHIPPED' },
  live: { bg: '#c6efd6', ink: '#15643a', label: 'LIVE' },
  archived: { bg: '#e7e3ee', ink: '#5a5470', label: 'ARCHIVED' },
};
const statusStyle = (s) => STATUS[s] || STATUS['in-progress'];

const esc = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/** Rough advance width for Verdana, good enough for wrapping and chip sizing. */
const textWidth = (s = '', size = 12) => String(s).length * size * 0.58;

const fmtCount = (n = 0) => {
  const v = Number(n) || 0;
  if (v < 1000) return String(v);
  const k = v / 1000;
  return `${k >= 10 ? Math.round(k) : k.toFixed(1)}k`.replace('.0k', 'k');
};

/** Trim a single line to a pixel width, adding an ellipsis when it overflows. */
function ellipsize(s = '', size, maxWidth, hardCap = 60) {
  let out = String(s).slice(0, hardCap).trim();
  if (textWidth(out, size) <= maxWidth) return out;
  while (out && textWidth(`${out}...`, size) > maxWidth) out = out.slice(0, -1);
  return `${out.trimEnd()}...`;
}

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

/** Tech pills. Bold, 2px frame, stops before it would reach the counters. */
function chips(items, startX, y, t, frame, size = 10) {
  let x = startX;
  const out = [];
  for (const item of items) {
    const w = textWidth(item, size) + 16;
    if (x + w > 292) break;
    out.push(
      `<g><rect x="${x.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="20" rx="10" fill="${t.body}" stroke="${frame}" stroke-width="2"/>` +
        `<text x="${(x + w / 2).toFixed(1)}" y="${y + 14}" font-family="${FONT}" font-size="${size}" font-weight="bold" fill="${t.text}" text-anchor="middle">${esc(item)}</text></g>`
    );
    x += w + 6;
  }
  return out.join('');
}

/** Deterministic decorative barcode from the card id. Pure rects, kept light. */
function barcode(id = '', x, y, h, fill) {
  let cx = x;
  let out = '';
  for (let i = 0; i < 22 && cx < x + 62; i += 1) {
    const v = parseInt(id[i % id.length] || '0', 16);
    const w = 1 + (v % 2);
    if (i % 2 === 0) {
      out += `<rect x="${cx.toFixed(1)}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
    }
    cx += w + 1.5;
  }
  return `<g opacity="0.7">${out}</g>`;
}

// small solid glyphs, drawn rather than typed, so no symbol font is needed
const STAR = 'M7 0.6 8.85 4.55 13.3 5.05 10 8.05 10.95 12.45 7 10.2 3.05 12.45 4 8.05 0.7 5.05 5.15 4.55Z';
const HEART =
  'M6.4 11.5C6.4 11.5 0.8 7.7 0.8 3.9 0.8 1.7 2.7 0.5 4.4 1.15 5.3 1.5 6 2.35 6.4 3.2 6.8 2.35 7.5 1.5 8.4 1.15 10.1 0.5 12 1.7 12 3.9 12 7.7 6.4 11.5 6.4 11.5Z';

export function cardSvg(card, owner) {
  const t = THEMES[card.theme] || THEMES.butter;
  // frame + shadow are always dark so the outline reads on any page. Everything
  // drawn on the body (strokes, text) uses t.text, which flips light on charcoal.
  const frame = darkFrame(card.theme);
  const line = t.text;
  const SEP = '  ·  ';
  const W = 440;
  const id = String(card._id || '');

  const name = String(card.projectName || 'Untitled project');
  const st = statusStyle(card.status);
  const pillW = Math.round(textWidth(st.label, 9) + 22);
  const pillX = W - 18 - pillW;

  const nameSize = name.length > 28 ? 15 : name.length > 18 ? 18 : 22;
  const nameShown = ellipsize(name, nameSize, pillX - 20 - 82, 40);

  const lang = String(card.primaryLanguage || '').trim();
  const metaBits = [];
  if (owner) metaBits.push(`by ${String(owner.displayName || owner.username).slice(0, 18)}`);
  if (card.buildTime) metaBits.push(String(card.buildTime).slice(0, 22));
  const metaText = [lang, ...metaBits].filter(Boolean).join(SEP);

  const desc = wrap(card.description || '', 11.5, 404, 2);
  const stack = (Array.isArray(card.techStack) ? card.techStack : []).filter(Boolean).slice(0, 4);
  const handle = card.repoName || (owner ? `@${owner.username}` : '');

  const stars = fmtCount(card.githubStars);
  const likes = fmtCount(card.likeCount);
  const sGlyph = 13;
  const hGlyph = 12;
  const gap = 5;
  const midGap = 13;
  const sw = textWidth(stars, 10.5);
  const counterW = sGlyph + gap + sw + midGap + hGlyph + gap + textWidth(likes, 10.5);
  const countersX = W - 18 - counterW;
  const heartFill = (card.likeCount || 0) > 0 ? '#d6437f' : t.ink;
  const countersLive = (card.githubStars || 0) || (card.likeCount || 0);

  const code = codeFor(card);
  const codeSize = code.length >= 5 ? 12 : code.length === 4 ? 13.5 : 15;

  // the stats sit on the meta line, the chips get their own clean row, and the
  // card height follows the content so a bare card is short, never hollow
  const SQ = 46;
  const META_Y = SQ + 37;
  const DESC_Y = 108;
  const metaShown = ellipsize(metaText, 10.5, countersX - (lang ? 96 : 82) - 10, 80);
  const descBottom = desc.length ? DESC_Y + (desc.length - 1) * 15 + 7 : SQ + 52;
  const chipsY = descBottom + 13;
  const bodyBottom = stack.length ? chipsY + 20 : descBottom;
  const sepY = bodyBottom + 17;
  // the body is inset 6px from the right and bottom of the canvas so the hard
  // offset shadow has somewhere to land instead of being clipped to a sliver
  const H = sepY + 30;
  const BW = W - 12;
  const BH = H - 12;

  const descRows = desc
    .map(
      (l, i) =>
        `<text x="18" y="${DESC_Y + i * 15}" font-family="${FONT}" font-size="11.5" fill="${t.ink}">${esc(l)}</text>`
    )
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(name)} on Deckr, status ${esc(st.label)}">
  <title>${esc(name)} on Deckr</title>
  <defs><clipPath id="dk"><rect x="2" y="2" width="${BW}" height="${BH}" rx="16"/></clipPath></defs>

  <rect x="8" y="8" width="${BW}" height="${BH}" rx="16" fill="${SHADOW}"/>

  <g clip-path="url(#dk)">
    <rect x="2" y="2" width="${BW}" height="${BH}" fill="${t.body}"/>
    <rect x="2" y="2" width="${BW}" height="34" fill="${t.pastel}"/>
    <rect x="2" y="33.5" width="${BW}" height="2.5" fill="${line}"/>

    <text x="18" y="22" font-family="${FONT}" font-size="11" font-weight="bold" letter-spacing="2.5" fill="${t.text}">DECKR</text>
    <text x="${W - 22}" y="22" font-family="${FONT}" font-size="10" fill="${t.text}" opacity="0.72" text-anchor="end">${esc(handle).slice(0, 46)}</text>

    <rect x="18" y="${SQ}" width="52" height="52" rx="14" fill="${t.pastel}" stroke="${line}" stroke-width="2"/>
    <text x="44" y="${SQ + 31}" font-family="${FONT}" font-size="${codeSize}" font-weight="bold" fill="${t.ink}" text-anchor="middle">${esc(code)}</text>

    <rect x="${pillX}" y="${SQ + 1}" width="${pillW}" height="19" rx="9.5" fill="${st.bg}" stroke="${line}" stroke-width="2"/>
    <text x="${(pillX + pillW / 2).toFixed(1)}" y="${SQ + 14}" font-family="${FONT}" font-size="9" font-weight="bold" letter-spacing="0.6" fill="${st.ink}" text-anchor="middle">${st.label}</text>

    <text x="82" y="${SQ + 18}" font-family="${FONT}" font-size="${nameSize}" font-weight="bold" fill="${t.text}">${esc(nameShown)}</text>

    ${lang ? `<circle cx="86" cy="${META_Y - 3.5}" r="4" fill="${langColor(lang)}" stroke="${line}" stroke-width="1.2"/>` : ''}
    <text x="${lang ? 96 : 82}" y="${META_Y}" font-family="${FONT}" font-size="10.5" fill="${t.ink}">${esc(metaShown)}</text>

    <g transform="translate(${countersX.toFixed(1)}, ${META_Y - 11})" opacity="${countersLive ? '1' : '0.5'}">
      <path d="${STAR}" fill="${t.ink}"/>
      <text x="${(sGlyph + gap).toFixed(1)}" y="11" font-family="${FONT}" font-size="10.5" font-weight="bold" fill="${t.ink}">${stars}</text>
      <path d="${HEART}" transform="translate(${(sGlyph + gap + sw + midGap).toFixed(1)}, 0.5)" fill="${heartFill}"/>
      <text x="${(sGlyph + gap + sw + midGap + hGlyph + gap).toFixed(1)}" y="11" font-family="${FONT}" font-size="10.5" font-weight="bold" fill="${t.ink}">${likes}</text>
    </g>

    ${descRows}

    ${chips(stack, 18, chipsY, t, line)}

    <path d="M18 ${sepY} H${W - 18}" stroke="${line}" stroke-width="1.2" stroke-dasharray="2 3" opacity="0.5"/>

    ${barcode(id, 18, sepY + 6, 10, line)}
    <text x="90" y="${sepY + 14}" font-family="${MONO}" font-size="8.5" letter-spacing="1" fill="${t.ink}" opacity="0.8">LOT ${esc(id.slice(-6).toUpperCase())}</text>
    <text x="${W - 18}" y="${sepY + 14}" font-family="${FONT}" font-size="9.5" font-weight="bold" fill="${t.text}" text-anchor="end">open on deckr  ›</text>
  </g>

  <rect x="2" y="2" width="${BW}" height="${BH}" rx="16" fill="none" stroke="${frame}" stroke-width="3"/>
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

    const notFound = `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="64" viewBox="0 0 440 64" role="img" aria-label="Card not found">
  <rect x="8" y="8" width="428" height="52" rx="14" fill="${SHADOW}"/>
  <rect x="2" y="2" width="428" height="52" rx="14" fill="#fffdf8" stroke="#211a2b" stroke-width="3"/>
  <text x="220" y="35" font-family="${FONT}" font-size="12.5" font-weight="bold" fill="#211a2b" text-anchor="middle">Deckr card not found</text>
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
