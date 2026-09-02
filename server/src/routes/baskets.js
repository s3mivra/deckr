import { Router } from 'express';
import { z } from 'zod';
import { Basket, BASKET_MAX_CARDS } from '../models/Basket.js';
import { Card } from '../models/Card.js';
import { Like } from '../models/Like.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler, HttpError } from '../utils/asyncHandler.js';
import { cardJSON, CARD_OWNER_FIELDS, attachDesigns } from '../utils/cardJson.js';
import { evaluateAchievements } from '../services/achievements.js';

const router = Router();

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Not a card id');

const basketSchema = z.object({
  title: z.string().trim().min(1).max(60),
  note: z.string().trim().max(200).optional(),
  cards: z.array(objectId).max(BASKET_MAX_CARDS).optional(),
  isPublic: z.boolean().optional(),
});

const basketUpdateSchema = basketSchema.partial();

async function ownedBasket(req) {
  const basket = await Basket.findById(req.params.id);
  if (!basket) throw new HttpError(404, 'Basket not found');
  if (!basket.owner.equals(req.user._id)) throw new HttpError(403, 'Not your basket');
  return basket;
}

/** Keep only ids that point at a public card owned by a public profile. */
async function keepVisibleCards(ids = []) {
  if (!ids.length) return [];
  const found = await Card.find({ _id: { $in: ids }, isPublic: true })
    .select('_id owner')
    .populate('owner', 'isPublic');
  const ok = new Set(
    found.filter((c) => c.owner && c.owner.isPublic !== false).map((c) => String(c._id))
  );
  // preserve the order the curator chose
  return ids.filter((id) => ok.has(String(id)));
}

// my baskets
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const baskets = await Basket.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.json({ baskets: baskets.map((b) => ({ ...b.toJSONSafe(), cardCount: b.cards.length })) });
  })
);

// cards this user has starred, the shelf they build baskets from
router.get(
  '/pickable',
  requireAuth,
  asyncHandler(async (req, res) => {
    const likes = await Like.find({ user: req.user._id }).sort({ createdAt: -1 }).select('card');
    const ids = likes.map((l) => l.card);
    if (!ids.length) return res.json({ cards: [] });
    const cards = await Card.find({ _id: { $in: ids }, isPublic: true }).populate(
      'owner',
      CARD_OWNER_FIELDS
    );
    const likedSet = new Set(ids.map(String));
    const visible = cards.filter((c) => c.owner && c.owner.isPublic !== false);
    res.json({ cards: await attachDesigns(visible.map((c) => cardJSON(c, likedSet))) });
  })
);

router.post(
  '/',
  requireAuth,
  validate(basketSchema),
  asyncHandler(async (req, res) => {
    const cards = await keepVisibleCards(req.body.cards || []);
    const basket = await Basket.create({ ...req.body, cards, owner: req.user._id });
    const { newlyUnlocked } = await evaluateAchievements(req.user);
    res.status(201).json({ basket: basket.toJSONSafe(), newlyUnlocked });
  })
);

// public basket
router.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const basket = await Basket.findById(req.params.id).populate(
      'owner',
      'username displayName avatarUrl isPublic'
    );
    if (!basket) throw new HttpError(404, 'Basket not found');
    const isOwner = req.user && basket.owner._id.equals(req.user._id);
    if (!basket.isPublic && !isOwner) throw new HttpError(403, 'This basket is private');

    const cards = await Card.find({ _id: { $in: basket.cards }, isPublic: true }).populate(
      'owner',
      CARD_OWNER_FIELDS
    );
    const byId = new Map(cards.map((c) => [String(c._id), c]));
    const ordered = basket.cards.map((id) => byId.get(String(id))).filter(Boolean);

    let likedSet = new Set();
    if (req.user && ordered.length) {
      const likes = await Like.find({
        user: req.user._id,
        card: { $in: ordered.map((c) => c._id) },
      }).select('card');
      likedSet = new Set(likes.map((l) => String(l.card)));
    }

    res.set('Cache-Control', isOwner ? 'private, no-cache' : 'public, max-age=30');
    res.json({
      basket: {
        ...basket.toJSONSafe(),
        owner: {
          username: basket.owner.username,
          displayName: basket.owner.displayName,
          avatarUrl: basket.owner.avatarUrl,
        },
      },
      isOwner: Boolean(isOwner),
      cards: await attachDesigns(ordered.map((c) => cardJSON(c, likedSet))),
    });
  })
);

router.patch(
  '/:id',
  requireAuth,
  validate(basketUpdateSchema),
  asyncHandler(async (req, res) => {
    const basket = await ownedBasket(req);
    const patch = { ...req.body };
    if (patch.cards) patch.cards = await keepVisibleCards(patch.cards);
    Object.assign(basket, patch);
    await basket.save();
    const { newlyUnlocked } = await evaluateAchievements(req.user);
    res.json({ basket: basket.toJSONSafe(), newlyUnlocked });
  })
);

router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const basket = await ownedBasket(req);
    await basket.deleteOne();
    res.json({ ok: true });
  })
);

export default router;
