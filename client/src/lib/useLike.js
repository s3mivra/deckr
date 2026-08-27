import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Deckr } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { patchCardInCaches } from './cache.js';

/**
 * Like state for one card.
 *
 * The count and liked flag track the `card` prop (which the parent keeps fresh
 * via cache revalidation / polling), so a like by someone else shows up without
 * a refresh. While a toggle is in flight, an optimistic override takes over; it
 * clears itself once the prop values catch up.
 */
export function useLike(card) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isOwner = Boolean(user && card.ownerUsername && card.ownerUsername === user.username);

  const propLiked = Boolean(card.likedByMe);
  const propCount = card.likeCount || 0;

  const [override, setOverride] = useState(null);
  const [busy, setBusy] = useState(false);

  // once the prop values match the optimistic override, resume tracking props
  useEffect(() => {
    if (override && propCount === override.count && propLiked === override.liked) {
      setOverride(null);
    }
  }, [propCount, propLiked, override]);

  const liked = override ? override.liked : propLiked;
  const count = override ? override.count : propCount;

  const toggle = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (busy || isOwner) return;

    setBusy(true);
    const nextLiked = !liked;
    const nextCount = Math.max(0, count + (nextLiked ? 1 : -1));
    setOverride({ liked: nextLiked, count: nextCount });

    try {
      const res = await Deckr.toggleLike(card.id);
      setOverride({ liked: res.liked, count: res.likeCount });
      patchCardInCaches(card.id, { likeCount: res.likeCount, likedByMe: res.liked });
    } catch {
      setOverride(null);
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
