import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import Icon from './Icon.jsx';
import {
  formatNumber,
  deriveAppCode,
  priceFor,
  tracesLine,
  storageLine,
  servingSuggestion,
  lotNumber,
} from '../lib/format.js';

const STATUS_LABEL = {
  idea: 'Idea',
  'in-progress': 'In progress',
  shipped: 'Shipped',
  live: 'Live',
  archived: 'Archived',
};

// status -> the little "freshness" burst word on the front
const BURST_WORD = {
  idea: 'Soon',
  'in-progress': 'New',
  shipped: 'Fresh',
  live: 'Hot!',
  archived: 'Classic',
};

// per-format labels for the three story prompts on the back
const STORY_LABELS = {
  bag: ['Why we made this', 'Trickiest step', 'What we learned'],
  carton: ['Our promise', 'The hard bit', 'What we learned'],
  cereal: ['Did you know?', 'Also worth knowing', 'And another thing'],
  jar: ['Why we jarred it', 'The tricky part', 'What we learned'],
  can: ['Why we bottled it', 'The fizz went flat when', 'What we learned'],
  box: ['Why we shipped it', 'Known issues', 'Patch notes'],
};

const NP_TITLE = {
  bag: 'Nutrition facts',
  carton: "What's inside",
  cereal: 'The good stuff',
  jar: 'From our kitchen',
  can: 'Per serving',
  box: 'System requirements',
};

const PACKAGING = ['bag', 'carton', 'cereal', 'jar', 'can', 'box'];

function teamValue(card) {
  if (card.teamType !== 'team') return 'Solo';
  return card.teamSize ? `Team · ${card.teamSize}` : 'Team';
}

function repoHref(card) {
  if (card.repoUrl) return card.repoUrl;
  if (card.repoName && /^[\w.-]+\/[\w.-]+$/.test(card.repoName)) {
    return `https://github.com/${card.repoName}`;
  }
  return null;
}

const codeFor = (card) => (card.appCode || '').trim() || deriveAppCode(card.projectName);
const techList = (card) => (Array.isArray(card.techStack) ? card.techStack.filter(Boolean) : []);

// deterministic name size (as a cqw value) so short names read big and a
// max-length name still fits without truncation. Also backs off for one very
// long unbreakable word.
function nameSize(name = '') {
  const n = name.trim().length;
  const longest = name.split(/[\s/_-]+/).reduce((m, w) => Math.max(m, w.length), 0);
  if (n > 32 || longest > 16) return '6.4cqw';
  if (n > 24 || longest > 13) return '7.6cqw';
  if (n > 16) return '9cqw';
  if (n > 10) return '11cqw';
  return '13cqw';
}

const nameStyle = (card) => ({ '--name-size': nameSize(card.projectName) });

function ownerHandle(card) {
  return (card.repoName || '').split('/')[0] || card.ownerUsername || '';
}

/* ---------- shared front pieces ---------- */

function Burst({ card }) {
  return (
    <span className="p-burst">
      <b>{BURST_WORD[card.status] || 'New'}</b>
    </span>
  );
}

function AppBadge({ card, className = '' }) {
  return (
    <div className={`p-mascot ${className}`.trim()}>
      <span>{codeFor(card)}</span>
    </div>
  );
}

function TechChips({ card, max = 6 }) {
  const t = techList(card);
  if (!t.length) return null;
  const shown = t.slice(0, max);
  const extra = t.length - shown.length;
  return (
    <div className="p-chips">
      {shown.map((x) => (
        <span key={x} className="p-chip">
          {x}
        </span>
      ))}
      {extra > 0 ? <span className="p-chip p-chip--more">+{extra}</span> : null}
    </div>
  );
}

function LikeControl({ card, like }) {
  const count = like ? like.count : card.likeCount || 0;
  const show = Boolean(like?.enabled) || count > 0;
  if (!show) return null;

  const interactive = Boolean(like?.enabled && !like.isOwner);
  if (!interactive) {
    return (
      <span className="p-like" title={`${count} likes`}>
        <Icon name="star" size={12} strokeWidth={2.4} filled={Boolean(like?.liked)} />
        {formatNumber(count)}
      </span>
    );
  }
  return (
    <button
      type="button"
      className={`p-like p-like--btn ${like.liked ? 'is-on' : ''}`}
      disabled={like.busy}
      aria-pressed={like.liked}
      aria-label={like.liked ? 'Unlike this card' : 'Like this card'}
      title={like.liked ? 'Liked' : 'Like this card'}
      onClick={(e) => {
        e.stopPropagation();
        like.toggle();
      }}
    >
      <Icon name="star" size={12} strokeWidth={2.4} filled={like.liked} />
      {formatNumber(count)}
    </button>
  );
}

function NetWeight({ card, like }) {
  const who = card.repoName || card.ownerUsername || '';
  return (
    <div className="p-wt">
      <span className="p-wt__txt">
        <b className="p-wt__price">{priceFor(card)}</b> · ★{' '}
        {formatNumber(card.githubStars || 0)}
        {who ? ` · ${who}` : ''}
      </span>
      <LikeControl card={card} like={like} />
    </div>
  );
}

function Flavour({ text, className }) {
  return text ? (
    <p className={className}>{text}</p>
  ) : (
    <p className={`${className} is-empty`}>No description yet</p>
  );
}

/* ---------- fronts ---------- */

function BagFront({ card, like }) {
  return (
    <div className="flip-card__face flip-card__face--front bag-front">
      <div className="bag-top">
        <span className="bag-brand">
          Deckr<small>batch {formatNumber(card.githubStars || 0)}</small>
        </span>
        <Burst card={card} />
      </div>
      <div className="bag-hero">
        <h3 className="bag-name" style={nameStyle(card)}>
          {card.projectName || 'Untitled project'}
        </h3>
        <Flavour text={card.description} className="bag-flav" />
      </div>
      <div className="bag-foot">
        <AppBadge card={card} />
        <div className="bag-foot__info">
          <TechChips card={card} />
          <NetWeight card={card} like={like} />
        </div>
      </div>
    </div>
  );
}

function CartonFront({ card, like }) {
  const pressed = [
    card.buildTime ? `Pressed ${card.buildTime}` : null,
    teamValue(card),
    card.primaryLanguage || null,
  ].filter(Boolean);
  return (
    <div className="flip-card__face flip-card__face--front carton-front">
      <div className="jc-cap" />
      <div className="jc-body">
        <div className="jc-hundred">100% {card.projectName || 'project'}</div>
        <h3 className="jc-name" style={nameStyle(card)}>
          {card.projectName || 'Untitled project'}
        </h3>
        <Flavour text={card.description} className="jc-promise" />
        <div className="jc-pressed">
          {pressed.map((p) => (
            <span key={p}>{p}</span>
          ))}
        </div>
        <div className="jc-spacer" />
        <div className="jc-foot">
          <AppBadge card={card} className="p-mascot--sm" />
          <NetWeight card={card} like={like} />
        </div>
      </div>
    </div>
  );
}

function CerealFront({ card, like }) {
  return (
    <div className="flip-card__face flip-card__face--front cereal-front">
      <div className="cb-top">
        <span className="cb-brand">Deckr</span>
        <span className="cb-free">Free: source inside!</span>
      </div>
      <AppBadge card={card} className="p-mascot--lg" />
      <h3 className="cb-name" style={nameStyle(card)}>
        {card.projectName || 'Untitled project'}
      </h3>
      <Flavour text={card.description} className="cb-tag" />
      <div className="cb-spacer" />
      <TechChips card={card} max={5} />
      <NetWeight card={card} like={like} />
    </div>
  );
}

function JarFront({ card, like }) {
  const owner = ownerHandle(card);
  const batch = `Made ${teamValue(card).toLowerCase()} · ${card.buildTime || 'small'} batch`;
  return (
    <div className="flip-card__face flip-card__face--front jar-front">
      <span className="jj-lid" />
      <div className="jj-oval">
        <div className="jj-maker">{owner ? `${owner}'s small-batch` : 'Small-batch'}</div>
        <h3 className="jj-name" style={nameStyle(card)}>
          {card.projectName || 'Untitled project'}
        </h3>
        <div className="jj-est">EST. {new Date().getFullYear()}</div>
        <Flavour text={card.description} className="jj-sub" />
        <div className="jj-batch">{batch}</div>
      </div>
      <div className="jj-foot">
        <AppBadge card={card} className="p-mascot--sm" />
        <NetWeight card={card} like={like} />
      </div>
    </div>
  );
}

function CanFront({ card, like }) {
  return (
    <div className="flip-card__face flip-card__face--front can-front">
      <span className="can-tab" />
      <div className="can-wrap">
        <span className="can-brand">Deckr Soda Co.</span>
        <h3 className="can-name" style={nameStyle(card)}>
          {card.projectName || 'Untitled project'}
        </h3>
        <Flavour text={card.description} className="can-fizz" />
        <span className="can-ml">
          {card.primaryLanguage ? `${card.primaryLanguage} blend` : 'Original recipe'} · 330 ml
        </span>
      </div>
      <div className="can-foot">
        <AppBadge card={card} className="p-mascot--sm" />
        <div className="can-foot__info">
          <TechChips card={card} max={5} />
          <NetWeight card={card} like={like} />
        </div>
      </div>
    </div>
  );
}

function BoxFront({ card, like }) {
  const rating = STATUS_LABEL[card.status] || 'In progress';
  return (
    <div className="flip-card__face flip-card__face--front box-front">
      <div className="box-inner">
        <span className="box-rating">Rated: {rating}</span>
        <h3 className="box-name" style={nameStyle(card)}>
          {card.projectName || 'Untitled project'}
        </h3>
        <Flavour text={card.description} className="box-blurb" />
        <TechChips card={card} max={5} />
        <div className="box-spacer" />
        <div className="box-foot">
          <AppBadge card={card} className="p-mascot--sm" />
          <div className="box-foot__info">
            <NetWeight card={card} like={like} />
          </div>
        </div>
      </div>
    </div>
  );
}

const FRONTS = {
  bag: BagFront,
  carton: CartonFront,
  cereal: CerealFront,
  jar: JarFront,
  can: CanFront,
  box: BoxFront,
};

/* ---------- shared back ---------- */

function NpRow({ label, value }) {
  const empty = value === '' || value == null;
  return (
    <div className="np-row">
      <b>{label}</b>
      <span className={empty ? 'is-muted' : undefined}>{empty ? 'n/a' : value}</span>
    </div>
  );
}

function PacketBack({ card, variant }) {
  const npTitle = NP_TITLE[variant] || NP_TITLE.bag;
  const labels = STORY_LABELS[variant] || STORY_LABELS.bag;
  const qrInk = card.theme === 'charcoal' ? '#f4efff' : '#211a2b';
  const tech = techList(card);
  const story = [card.whyBuilt, card.hardestPart, card.whatLearned];
  const hasStory = story.some(Boolean);

  const links = [];
  const href = repoHref(card);
  if (href) links.push(['Repo', href]);
  if (card.portfolioUrl) links.push(['Portfolio', card.portfolioUrl]);

  // the QR scans to the repo (or the next best link)
  const scanUrl = href || card.portfolioUrl || card.ownerWebsite || '';

  return (
    <div className="flip-card__face flip-card__face--back packet-back">
      <div className="np">
        <h4>{npTitle}</h4>
        <div className="np-serv">Serving size: 1 project · makes 1 portfolio piece</div>
        <NpRow label="Build time" value={card.buildTime || ''} />
        <NpRow label="Kitchen" value={teamValue(card)} />
        <NpRow label="Freshness" value={STATUS_LABEL[card.status] || card.status || ''} />
        <NpRow label="Base" value={card.primaryLanguage || ''} />
        <NpRow label="Stars" value={formatNumber(card.githubStars || 0)} />
      </div>

      {tech.length ? (
        <div className="bk-ingr">
          <p>
            <b>Ingredients:</b> {tech.join(', ')}.
          </p>
          <p className="bk-trace">{tracesLine(card)}</p>
        </div>
      ) : null}

      <div className="bk-story">
        {hasStory ? (
          story.map((text, i) =>
            text ? (
              <div key={i}>
                <span className="bk-lbl">{labels[i]}</span>
                <p>{text}</p>
              </div>
            ) : null
          )
        ) : (
          <p className="bk-empty">
            Add the three story prompts and they land here as the maker&apos;s note.
          </p>
        )}
      </div>

      <p className="bk-store">
        {storageLine(card)} {servingSuggestion(card)}
      </p>

      <div className="bk-find">
        {scanUrl ? (
          <a
            className="bk-qr"
            href={scanUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            aria-label="Scan or tap to open the repo"
          >
            <QRCodeSVG value={scanUrl} size={132} level="L" bgColor="transparent" fgColor={qrInk} />
          </a>
        ) : (
          <span className="bk-qr bk-qr--empty" aria-hidden="true" />
        )}
        <span className="bk-links">
          {links.length ? (
            links.map(([label, url]) => (
              <a
                key={label}
                href={url}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                {label} <Icon name="external" size={12} strokeWidth={2.6} />
              </a>
            ))
          ) : (
            <span className="is-muted">Links coming soon</span>
          )}
          <span className="bk-lot">{lotNumber(card)}</span>
        </span>
      </div>
    </div>
  );
}

/* ---------- shell ---------- */

export default function FlipCard({ card, flipped, onToggle, like }) {
  const [internal, setInternal] = useState(false);
  const isControlled = typeof flipped === 'boolean';
  const isFlipped = isControlled ? flipped : internal;

  const toggle = () => {
    if (onToggle) onToggle(!isFlipped);
    if (!isControlled) setInternal((v) => !v);
  };

  const pkg = PACKAGING.includes(card.packaging) ? card.packaging : 'bag';
  const Front = FRONTS[pkg];

  return (
    <div
      className={`card-theme flip-card ${isFlipped ? 'is-flipped' : ''}`}
      data-theme={card.theme || 'butter'}
      data-pkg={pkg}
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
        <PacketBack card={card} variant={pkg} />
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
