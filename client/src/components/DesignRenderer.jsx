import { resolveColor, resolveFont } from '../lib/designs.js';
import { boundValue, starRating } from '../lib/cardValues.js';

// the design canvas is authored against a 320x480 front face; everything is
// expressed relative to that so it scales with the card's container query.
const W = 320;
const H = 480;
const cqw = (px) => `${px / (W / 100)}cqw`;
const pct = (px, total) => `${(px / total) * 100}%`;

function geom(el) {
  return {
    position: 'absolute',
    left: pct(el.x || 0, W),
    top: pct(el.y || 0, H),
    width: pct(el.w || 0, W),
    height: pct(el.h || 0, H),
    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
    zIndex: el.z || 0,
  };
}

function textStyle(el) {
  return {
    fontFamily: resolveFont(el.font),
    fontSize: cqw(el.size || 16),
    fontWeight: el.weight || 700,
    color: resolveColor(el.color) || 'var(--card-ink)',
    textAlign: el.align || 'left',
    textTransform: el.uppercase ? 'uppercase' : 'none',
    letterSpacing: el.letterSpacing ? cqw(el.letterSpacing) : undefined,
    lineHeight: el.lineHeight || 1.15,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    overflow: 'hidden',
    overflowWrap: 'anywhere',
  };
}

export function DesignElement({ el, card = {} }) {
  const base = geom(el);

  if (el.type === 'text' || el.type === 'field') {
    const raw = el.type === 'field' ? boundValue(el.bind, card) : el.text || '';
    const value = raw || el.emptyText || '';
    return (
      <div className="db-el db-el--text" style={{ ...base, ...textStyle(el) }} aria-hidden="true">
        {(el.prefix || '') + value + (el.suffix || '')}
      </div>
    );
  }

  if (el.type === 'stars') {
    const max = el.max || 5;
    const filled = starRating(card.githubStars || 0, max, el.starMode || 'scaled');
    return (
      <div
        className="db-el db-el--stars"
        style={{
          ...base,
          display: 'flex',
          alignItems: 'center',
          justifyContent: el.align === 'center' ? 'center' : el.align === 'right' ? 'flex-end' : 'flex-start',
          gap: cqw(el.gap ?? 3),
          fontSize: cqw(el.size || 16),
        }}
        aria-hidden="true"
      >
        {Array.from({ length: max }).map((_, i) => (
          <span key={i} style={{ color: resolveColor(i < filled ? el.filled : el.empty) || (i < filled ? 'var(--theme-ink)' : 'var(--card-ink)'), opacity: i < filled ? 1 : 0.28 }}>
            {'★'}
          </span>
        ))}
      </div>
    );
  }

  if (el.type === 'chips') {
    const list = (Array.isArray(card.techStack) ? card.techStack : []).filter(Boolean).slice(0, el.max || 6);
    return (
      <div
        className="db-el db-el--chips"
        style={{
          ...base,
          display: 'flex',
          flexWrap: 'wrap',
          alignContent: 'center',
          justifyContent: el.align === 'center' ? 'center' : el.align === 'right' ? 'flex-end' : 'flex-start',
          gap: cqw(el.gap ?? 4),
        }}
        aria-hidden="true"
      >
        {list.map((t) => (
          <span
            key={t}
            style={{
              fontFamily: resolveFont(el.font || 'body'),
              fontWeight: el.weight || 800,
              fontSize: cqw(el.size || 8),
              lineHeight: 1,
              padding: `${cqw(2)} ${cqw(6)}`,
              borderRadius: el.radius != null ? cqw(el.radius) : '999px',
              background: resolveColor(el.bg) || 'var(--card-body)',
              color: resolveColor(el.textColor) || 'var(--card-ink)',
              border: `2px solid ${resolveColor(el.borderColor) || 'var(--card-ink)'}`,
            }}
          >
            {t}
          </span>
        ))}
      </div>
    );
  }

  if (el.type === 'star') {
    return (
      <div className="db-el db-el--star" style={base} aria-hidden="true">
        <svg viewBox="0 0 40 40" width="100%" height="100%" preserveAspectRatio="none">
          <path
            d="M20 2L24.9 14.9L38.8 15.5L27.8 24.1L31.4 37.5L20 29.6L8.6 37.5L12.2 24.1L1.2 15.5L15.1 14.9Z"
            fill={resolveColor(el.fill) || 'var(--theme-ink)'}
            stroke={resolveColor(el.stroke) || 'none'}
            strokeWidth={el.strokeWidth || 0}
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }

  // rect / band / line - a filled box with an optional border
  return (
    <div
      className={`db-el db-el--${el.type}`}
      style={{
        ...base,
        background: resolveColor(el.fill) || 'var(--pastel)',
        border: el.strokeWidth
          ? `${el.strokeWidth}px solid ${resolveColor(el.stroke) || 'var(--card-ink)'}`
          : 'none',
        borderRadius: el.radius ? cqw(el.radius) : 0,
      }}
      aria-hidden="true"
    />
  );
}

export default function DesignRenderer({ design, card = {} }) {
  const elements = [...(design.elements || [])].sort((a, b) => (a.z || 0) - (b.z || 0));
  return (
    <div
      className="flip-card__face flip-card__face--front db-front"
      style={{ background: resolveColor(design.canvas?.background) || 'var(--card-body)' }}
    >
      {elements.map((el) => (
        <DesignElement key={el.id} el={el} card={card} />
      ))}
    </div>
  );
}
