import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Deckr } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * Like state for one card. Optimistic toggle with rollback.
 * Returns everything <FlipCard like={...} /> needs.
 */
export function useLike(card) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isOwner = Boolean(user && card.ownerUsername && card.ownerUsername === user.username);

  const [liked, setLiked] = useState(Boolean(card.likedByMe));
  const [count, setCount] = useState(card.likeCount || 0);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (busy || isOwner) return;

    setBusy(true);
    const next = !liked;
    setLiked(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));

    try {
      const res = await Deckr.toggleLike(card.id);
      setLiked(res.liked);
      setCount(res.likeCount);
    } catch {
      setLiked(!next);
      setCount((c) => Math.max(0, c + (next ? -1 : 1)));
    } finally {
      setBusy(false);
    }
  };

  return {
    enabled: true,
    liked,
    count,
    busy,
    toggle,
    isOwner,
    canLike: Boolean(user) && !isOwner,
  };
}
