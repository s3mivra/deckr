import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLike } from '../lib/useLike.js';
import Tooltip, { IconButton } from './Tooltip.jsx';
import Icon from './Icon.jsx';
import FlipCard, { CardZoom } from './FlipCard.jsx';

/**
 * A card in a deck grid: flip card plus zoom and open actions, with its own
 * like state. Handles its own zoom overlay.
 */
export default function DeckCard({ card, showOwner = false, showOpen = true }) {
  const like = useLike(card);
  const [zoom, setZoom] = useState(false);

  return (
    <div className="deck-card">
      <FlipCard card={card} like={like} />
      <div className="deck-card__actions">
        <IconButton label="Zoom in" onClick={() => setZoom(true)}>
          <Icon name="zoom" />
        </IconButton>
        {showOpen ? (
          <Tooltip label="Open card page">
            <Link to={`/c/${card.id}`} className="icon-btn" aria-label="Open card page">
              <Icon name="external" />
            </Link>
          </Tooltip>
        ) : null}
      </div>
      {showOwner && card.owner ? (
        <Link className="deck-card__owner" to={`/u/${card.owner.username}`}>
          <img src={card.owner.avatarUrl} alt="" />
          {card.owner.displayName || card.owner.username}
        </Link>
      ) : null}
      {zoom ? <CardZoom card={card} like={like} onClose={() => setZoom(false)} /> : null}
    </div>
  );
}
