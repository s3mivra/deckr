import { Router } from 'express';
import { Card } from '../models/Card.js';
import { Like } from '../models/Like.js';
import { Basket } from '../models/Basket.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

const MAX_ITEMS = 14;
const WINDOW_DAYS = 45;

const publicUser = (u) =>
  u && u.isPublic !== false
    ? { username: u.username, displayName: u.displayName, avatarUrl: u.avatarUrl }
    : null;

/**
 * Everything that happened around this user recently: stars on their cards,
 * baskets that picked their cards up, and new cards from makers they have
 * starred before. All derived from existing collections, nothing is written
 * except the "seen" timestamp.
 */
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const me = req.user;
    const since = me.lastSeenActivityAt ? new Date(me.lastSeenActivityAt) : null;
    const window = new Date(Date.now() - WINDOW_DAYS * 86400000);

    const myCards = await Card.find({ owner: me._id }).select('_id projectName theme isPublic');
    const myCardIds = myCards.map((c) => c._id);
    const cardById = new Map(myCards.map((c) => [String(c._id), c]));

    const [likes, baskets, myLikes] = await Promise.all([
      myCardIds.length
        ? Like.find({ card: { $in: myCardIds }, createdAt: { $gte: window } })
            .sort({ createdAt: -1 })
            .limit(30)
            .populate('user', 'username displayName avatarUrl isPublic')
        : [],
      myCardIds.length
        ? Basket.find({ cards: { $in: myCardIds }, isPublic: true, createdAt: { $gte: window } })
            .sort({ createdAt: -1 })
            .limit(12)
            .populate('owner', 'username displayName avatarUrl isPublic')
        : [],
      Like.find({ user: me._id }).select('card'),
    ]);

    // makers whose work this user has starred, the closest thing to a follow
    const likedCards = myLikes.length
      ? await Card.find({ _id: { $in: myLikes.map((l) => l.card) } }).select('owner')
      : [];
    const followed = [
      ...new Set(likedCards.map((c) => String(c.owner))),
    ].filter((id) => id !== String(me._id));

    const fresh = followed.length
      ? await Card.find({
          owner: { $in: followed },
          isPublic: true,
          createdAt: { $gte: window },
        })
          .sort({ createdAt: -1 })
          .limit(12)
          .populate('owner', 'username displayName avatarUrl isPublic')
      : [];

    const items = [];

    for (const l of likes) {
      const who = publicUser(l.user);
      const card = cardById.get(String(l.card));
      if (!who || !card) continue;
      items.push({
        id: `like-${l._id}`,
        type: 'star',
        at: l.createdAt,
        who,
        cardId: String(card._id),
        cardName: card.projectName,
      });
    }

    for (const b of baskets) {
      const who = publicUser(b.owner);
      if (!who || String(b.owner._id) === String(me._id)) continue;
      const mine = b.cards.map(String).filter((id) => cardById.has(id));
      if (!mine.length) continue;
      items.push({
        id: `basket-${b._id}`,
        type: 'basket',
        at: b.createdAt,
        who,
        basketId: String(b._id),
        basketTitle: b.title,
        cardName: cardById.get(mine[0]).projectName,
        alsoCount: mine.length - 1,
      });
    }

    for (const c of fresh) {
      const who = publicUser(c.owner);
      if (!who) continue;
      items.push({
        id: `card-${c._id}`,
        type: 'newCard',
        at: c.createdAt,
        who,
        cardId: String(c._id),
        cardName: c.projectName,
      });
    }

    items.sort((a, b) => new Date(b.at) - new Date(a.at));
    const trimmed = items.slice(0, MAX_ITEMS);
    for (const it of trimmed) it.isNew = since ? new Date(it.at) > since : true;

    res.set('Cache-Control', 'private, no-cache');
    res.json({
      items: trimmed,
      unseen: trimmed.filter((i) => i.isNew).length,
      since: since || null,
    });
  })
);

/** Mark the strip as read. */
router.post(
  '/seen',
  requireAuth,
  asyncHandler(async (req, res) => {
    req.user.lastSeenActivityAt = new Date();
    await req.user.save();
    res.json({ ok: true, at: req.user.lastSeenActivityAt });
  })
);

export default router;
