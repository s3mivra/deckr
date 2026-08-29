import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { priceFor, lotNumber, hashOf } from '../lib/format.js';

const STATUS_LABEL = {
  idea: 'Idea',
  'in-progress': 'In progress',
  shipped: 'Shipped',
  live: 'Live',
  archived: 'Archived',
};

const PKG_LABEL = {
  bag: 'Bag',
  carton: 'Carton',
  cereal: 'Cereal box',
  jar: 'Jar',
  can: 'Can',
  box: 'Software box',
};

function line(label, value) {
  return value ? [label, value] : null;
}

/**
 * A till receipt for a card that was just saved. Deliberately plain: mono type,
 * dotted rules, torn edges. It is the one surface in the app that is not a
 * chunky pastel panel, which is what makes it read as a receipt.
 */
export default function Receipt({ card, mode = 'create', onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const stack = (Array.isArray(card.techStack) ? card.techStack : []).filter(Boolean);
  const rows = [
    line('BUILD TIME', card.buildTime),
    line('KITCHEN', card.teamType === 'team' ? `Team${card.teamSize ? ` of ${card.teamSize}` : ''}` : 'Solo'),
    line('FRESHNESS', STATUS_LABEL[card.status] || card.status),
    line('BASE', card.primaryLanguage),
    line('PACKAGING', PKG_LABEL[card.packaging] || 'Bag'),
  ].filter(Boolean);

  // bar widths derived from the card so the code is stable but looks irregular
  const seed = hashOf(card.id || card.projectName || 'deckr');
  const bars = Array.from({ length: 38 }, (_, i) => (((seed >> i % 24) + i * 5) % 4) + 1);

  const when = new Date();
  const stamp = `${when.toLocaleDateString()} ${when.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;

  return createPortal(
    <div className="receipt-overlay" onClick={onClose} role="dialog" aria-label="Card receipt">
      <div className="receipt" onClick={(e) => e.stopPropagation()}>
        <div className="receipt__head">
          <strong>DECKR</strong>
          <span>Est. 2026 · Open all hours</span>
        </div>

        <div className="receipt__rule" />

        <div className="receipt__item">
          <span>{card.projectName || 'Untitled project'}</span>
          <span>{priceFor(card)}</span>
        </div>
        {card.repoName ? <div className="receipt__sub">{card.repoName}</div> : null}

        <div className="receipt__rule" />

        {rows.map(([label, value]) => (
          <div className="receipt__row" key={label}>
            <span>{label}</span>
            <span>{value}</span>
          </div>
        ))}

        {stack.length ? (
          <>
            <div className="receipt__rule" />
            <div className="receipt__row receipt__row--wrap">
              <span>INGREDIENTS</span>
              <span>{stack.join(', ')}</span>
            </div>
          </>
        ) : null}

        <div className="receipt__rule" />

        <div className="receipt__row receipt__row--total">
          <span>SUBTOTAL</span>
          <span>1 card</span>
        </div>
        <div className="receipt__row receipt__row--total">
          <span>DECK SIZE</span>
          <span>{mode === 'create' ? '+1' : 'unchanged'}</span>
        </div>

        <div className="receipt__rule" />

        <p className="receipt__thanks">
          {mode === 'create' ? 'Thank you for shipping with Deckr' : 'Card updated. Thank you'}
        </p>
        <p className="receipt__meta">
          {lotNumber(card)}
          <br />
          {stamp}
          <br />
          No refunds on side projects
        </p>

        <div className="receipt__barcode" aria-hidden="true">
          {bars.map((w, i) => (
            <i key={i} style={{ width: `${w}px` }} />
          ))}
        </div>

        <div className="receipt__actions">
          <button className="btn" onClick={onClose}>
            Done
          </button>
          {card.id ? (
            <Link className="btn btn--ghost" to={`/c/${card.id}`}>
              View card
            </Link>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
