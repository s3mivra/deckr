import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon.jsx';
import { formatNumber } from '../lib/format.js';

const STATUS_LABEL = {
  idea: 'Idea',
  'in-progress': 'In progress',
  shipped: 'Shipped',
  live: 'Live',
  archived: 'Archived',
};

function teamValue(card) {
  if (card.teamType !== 'team') return 'Solo';
  return card.teamSize ? `Team (${card.teamSize} devs)` : 'Team';
}

function repoHref(card) {
  if (card.repoUrl) return card.repoUrl;
  if (card.repoName && /^[\w.-]+\/[\w.-]+$/.test(card.repoName)) {
    return `https://github.com/${card.repoName}`;
  }
  return null;
}

function titleSize(name = '') {
  const n = name.length;
  const longestWord = name.split(/[\s/_-]+/).reduce((m, w) => Math.max(m, w.length), 0);
  if (n > 34 || longestWord > 20) return '0.98rem';
  if (n > 24 || longestWord > 15) return '1.12rem';
  if (n > 16) return '1.3rem';
  return '1.5rem';
}

function prettyHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  }
}

function Front({ card, like }) {
  const category = card.teamType === 'team' ? 'Team build' : 'Solo build';
  const website = card.ownerWebsite;
  const likeCount = like ? like.count : card.likeCount || 0;
  const interactive = Boolean(like?.enabled && !like.isOwner);
  const showBadge = Boolean(like?.enabled) || likeCount > 0;

  return (
    <div className="flip-card__face flip-card__face--front">
      <div className="fc-header">
        <span className="fc-pill">{category}</span>
        {showBadge ? (
          interactive ? (
            <button
              type="button"
              className={`fc-likes fc-likes--btn ${like.liked ? 'is-on' : ''}`}
              disabled={like.busy}
              aria-pressed={like.liked}
              aria-label={like.liked ? 'Unlike this card' : 'Like this card'}
              title={like.liked ? 'Liked' : 'Like this card'}
              onClick={(e) => {
                e.stopPropagation();
                like.toggle();
              }}
            >
              <Icon name="star" size={13} strokeWidth={2.4} filled={like.liked} />
              {formatNumber(likeCount)}
            </button>
          ) : (
            <span className="fc-likes" title={`${likeCount} likes`}>
              <Icon name="star" size={13} strokeWidth={2.4} filled={Boolean(like?.liked)} />
              {formatNumber(likeCount)}
            </span>
          )
        ) : null}
      </div>

      <div className="fc-body">
        <h3 className="fc-title" style={{ '--fc-title-size': titleSize(card.projectName) }}>
          {card.projectName || 'Untitled project'}
        </h3>
        {card.repoName ? <span className="fc-handle">{card.repoName}</span> : null}
        {card.description ? <p className="fc-pitch">{card.description}</p> : null}
      </div>

      <div className="fc-footer">
        <div className="fc-stack">
          {(card.techStack || []).slice(0, 8).map((t) => (
            <span key={t} className="fc-chip">
              {t}
            </span>
          ))}
        </div>

        <div className="fc-foot">
          <span className="fc-flip">
            Tap to flip <Icon name="flip" size={11} strokeWidth={2.6} />
          </span>
          {website ? (
            <a
              className="fc-site"
              href={website}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              {prettyHost(website)} <Icon name="external" size={11} strokeWidth={2.6} />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Back({ card }) {
  const href = repoHref(card);
  const tiles = [
    ['Build time', card.buildTime || 'Not set'],
    ['Team / solo', teamValue(card)],
    ['Status', STATUS_LABEL[card.status] || card.status],
    ['GitHub stars', formatNumber(card.githubStars || 0)],
    ['Main language', card.primaryLanguage || 'Not set'],
    ['Toolkit', 'Built with Deckr'],
  ];

  return (
    <div className="flip-card__face flip-card__face--back">
      <div className="fc-header">
        <span className="fc-pill">{card.projectName || 'Project'}</span>
      </div>

      <div className="fc-grid">
        {tiles.map(([label, value]) => (
          <div className="fc-tile" key={label}>
            <b>{label}</b>
            <span title={value}>{value}</span>
          </div>
        ))}
      </div>

      <div className="fc-story">
        {card.whyBuilt ? (
          <>
            <h5>Why I built it</h5>
            <p>{card.whyBuilt}</p>
          </>
        ) : null}
        {card.hardestPart ? (
          <>
            <h5>Hardest part</h5>
            <p>{card.hardestPart}</p>
          </>
        ) : null}
        {card.whatLearned ? (
          <>
            <h5>What I learned</h5>
            <p>{card.whatLearned}</p>
          </>
        ) : null}
      </div>

      {(() => {
        const links = [];
        if (href) links.push(['Repo', href]);
        if (card.portfolioUrl) links.push(['Portfolio', card.portfolioUrl]);
        if (links.length === 0) {
          return (
            <div className="fc-cta fc-cta--single">
              <span className="is-empty">Links coming soon</span>
            </div>
          );
        }
        return (
          <div className={`fc-cta ${links.length === 1 ? 'fc-cta--single' : ''}`}>
            {links.map(([label, url]) => (
              <a
                key={label}
                href={url}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                {label} <Icon name="external" size={13} strokeWidth={2.6} />
              </a>
            ))}
          </div>
        );
      })()}
    </div>
  );
}

export default function FlipCard({ card, flipped, onToggle, like }) {
  const [internal, setInternal] = useState(false);
  const isControlled = typeof flipped === 'boolean';
  const isFlipped = isControlled ? flipped : internal;

  const toggle = () => {
    if (onToggle) onToggle(!isFlipped);
    if (!isControlled) setInternal((v) => !v);
  };

  return (
    <div
      className={`card-theme flip-card ${isFlipped ? 'is-flipped' : ''}`}
      data-theme={card.theme || 'butter'}
      role="button"
      tabIndex={0}
      aria-pressed={isFlipped}
      aria-label={`${card.projectName} card, ${isFlipped ? 'showing back' : 'showing front'}`}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      }}
    >
      <div className="flip-card__inner">
        <Front card={card} like={like} />
        <Back card={card} />
      </div>
    </div>
  );
}

export function CardZoom({ card, onClose, like }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return createPortal(
    <div className="zoom-overlay" onClick={onClose}>
      <button className="btn btn--ghost zoom-overlay__close" onClick={onClose}>
        Close
      </button>
      <div className="zoom-overlay__card" onClick={(e) => e.stopPropagation()}>
        <FlipCard card={card} like={like} />
      </div>
    </div>,
    document.body
  );
}
