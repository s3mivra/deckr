import { Router } from 'express';
import { Card } from '../models/Card.js';
import { User } from '../models/User.js';
import { Like } from '../models/Like.js';
import { optionalAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { cardJSON, CARD_OWNER_FIELDS, attachDesigns } from '../utils/cardJson.js';

const router = Router();

const CARD_LIMIT = 9;
const USER_LIMIT = 8;

router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const visible = { isPublic: true };
    const ownerSelect = CARD_OWNER_FIELDS;

    const [topCardsRaw, recentCardsRaw, byCards, byLikes] = await Promise.all([
      Card.find(visible).sort({ likeCount: -1, createdAt: -1 }).limit(CARD_LIMIT * 2).populate('owner', ownerSelect),
      Card.find(visible).sort({ createdAt: -1 }).limit(CARD_LIMIT * 2).populate('owner', ownerSelect),
      Card.aggregate([
        { $match: { isPublic: true } },
        { $group: { _id: '$owner', cards: { $sum: 1 }, likes: { $sum: '$likeCount' } } },
        { $sort: { cards: -1, likes: -1 } },
        { $limit: USER_LIMIT * 2 },
      ]),
      Card.aggregate([
        { $match: { isPublic: true } },
        { $group: { _id: '$owner', cards: { $sum: 1 }, likes: { $sum: '$likeCount' } } },
        { $match: { likes: { $gt: 0 } } },
        { $sort: { likes: -1, cards: -1 } },
        { $limit: USER_LIMIT * 2 },
      ]),
    ]);

    // keep only cards whose owner exists and has a public profile
    const keepCard = (c) => c.owner && c.owner.isPublic !== false;
    const topCards = topCardsRaw.filter(keepCard).slice(0, CARD_LIMIT);
    const recentCards = recentCardsRaw.filter(keepCard).slice(0, CARD_LIMIT);

    // likedByMe for the shown cards
    let likedSet = new Set();
    if (req.user) {
      const ids = [...new Set([...topCards, ...recentCards].map((c) => c._id))];
      const likes = await Like.find({ user: req.user._id, card: { $in: ids } }).select('card');
      likedSet = new Set(likes.map((l) => String(l.card)));
    }

    // hydrate leaderboard rows with public users
    const rowIds = [...new Set([...byCards, ...byLikes].map((r) => String(r._id)))];
    const users = await User.find({ _id: { $in: rowIds }, isPublic: true }).select(
      'username displayName avatarUrl'
    );
    const uMap = Object.fromEntries(users.map((u) => [String(u._id), u]));
    const hydrate = (rows, limit) =>
      rows
        .filter((r) => uMap[String(r._id)])
        .slice(0, limit)
        .map((r) => {
          const u = uMap[String(r._id)];
          return {
            user: { username: u.username, displayName: u.displayName, avatarUrl: u.avatarUrl },
            cards: r.cards,
            likes: r.likes,
          };
        });

    const [topShaped, recentShaped] = await Promise.all([
      attachDesigns(topCards.map((c) => cardJSON(c, likedSet))),
      attachDesigns(recentCards.map((c) => cardJSON(c, likedSet))),
    ]);
    res.set('Cache-Control', 'public, max-age=10');
    res.json({
      topCards: topShaped,
      recentCards: recentShaped,
      topByLikes: hydrate(byLikes, USER_LIMIT),
      topByCards: hydrate(byCards, USER_LIMIT),
    });
  })
);

export default router;
