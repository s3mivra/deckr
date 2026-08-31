import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import FlipCard from './FlipCard.jsx';

/**
 * Full-screen, one-card-at-a-time view of a deck. Built for screen-sharing in
 * an interview or a client call. Arrow keys move, space flips, Esc closes.
 */
export default function DeckPresenter({ cards, startIndex = 0, onClose }) {
  const list = (cards || []).filter((c) => c && c.isPublic !== false);
  const [i, setI] = useState(() => Math.min(Math.max(0, startIndex), Math.max(0, list.length - 1)));
  const [flipped, setFlipped] = useState(false);

  const go = useCallback(
    (delta) => {
      setFlipped(false);
      setI((cur) => (cur + delta + list.length) % list.length);
    },
    [list.length]
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setFlipped((f) => !f);
      }
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [go, onClose]);

  if (!list.length) return null;
  const card = list[i];

  return createPortal(
    <div className="presenter" onClick={onClose}>
      <button className="btn btn--ghost presenter__close" onClick={onClose}>
        Close (Esc)
      </button>

      <button
        type="button"
        className="presenter__nav presenter__nav--prev"
        aria-label="Previous card"
        onClick={(e) => {
          e.stopPropagation();
          go(-1);
        }}
      >
        &lsaquo;
      </button>

      <div className="presenter__stage" onClick={(e) => e.stopPropagation()}>
        <FlipCard card={card} flipped={flipped} onToggle={setFlipped} />
        <p className="presenter__count">
          {i + 1} / {list.length} &middot; {card.projectName || 'Untitled project'}
        </p>
      </div>

      <button
        type="button"
        className="presenter__nav presenter__nav--next"
        aria-label="Next card"
        onClick={(e) => {
          e.stopPropagation();
          go(1);
        }}
      >
        &rsaquo;
      </button>
    </div>,
    document.body
  );
}
