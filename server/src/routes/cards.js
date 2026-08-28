import { Router } from 'express';
import { z } from 'zod';
import { Card, CARD_THEMES, CARD_STATUS, TEAM_TYPE, CARD_PACKAGING } from '../models/Card.js';
import { User } from '../models/User.js';
import { Like } from '../models/Like.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler, HttpError } from '../utils/asyncHandler.js';
import { evaluateAchievements } from '../services/achievements.js';
import { fetchRepoSummary } from '../services/github.js';

const router = Router();

const stringList = z
  .array(z.string().trim().min(1).max(24))
  .max(10)
  .optional();

const optionalUrl = z
  .string()
  .trim()
  .max(200)
  .refine((v) => v === '' || /^https?:\/\/\S+$/i.test(v), 'Must be a http or https URL')
  .optional();

const cardSchema = z.object({
  projectName: z.string().trim().min(1).max(40),
  appCode: z
    .string()
    .trim()
    .max(5)
    .regex(/^[A-Za-z0-9]*$/, 'Letters and numbers only')
    .optional(),
  packaging: z.enum(CARD_PACKAGING).optional(),
  repoName: z.string().trim().max(60).optional(),
  description: z.string().trim().max(140).optional(),
  techStack: stringList,
  theme: z.enum(CARD_THEMES).optional(),
  buildTime: z.string().trim().max(32).optional(),
  teamType: z.enum(TEAM_TYPE).optional(),
  teamSize: z.number().int().min(1).max(200).nullable().optional(),
  status: z.enum(CARD_STATUS).optional(),
  githubStars: z.number().int().min(0).max(10_000_000).optional(),
  primaryLanguage: z.string().trim().max(24).optional(),
  whyBuilt: z.string().trim().max(160).optional(),
  hardestPart: z.string().trim().max(160).optional(),
  whatLearned: z.string().trim().max(160).optional(),
  repoUrl: optionalUrl,
  portfolioUrl: optionalUrl,
  isPublic: z.boolean().optional(),
});

const cardUpdateSchema = cardSchema.partial();

async function ownedCard(req) {
  const card = await Card.findById(req.params.id);
  if (!card) throw new HttpError(404, 'Card not found');
  if (!card.owner.equals(req.user._id)) throw new HttpError(403, 'Not your card');
  return card;
}

// list my cards
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const cards = await Card.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.json({
      cards: cards.map((c) => ({
        ...c.toJSONSafe(),
        ownerUsername: req.user.username,
        ownerWebsite: req.user.websiteUrl || '',
      })),
    });
  })
);

// prefill from a public GitHub repo
router.get(
  '/prefill',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { repo } = req.query;
    if (!repo) throw new HttpError(422, 'Pass a repo slug or GitHub URL');
    try {
      const summary = await fetchRepoSummary(String(repo));
      res.json({ prefill: summary });
    } catch (err) {
      throw new HttpError(400, err.message);
    }
  })
);

router.post(
  '/',
  requireAuth,
  validate(cardSchema),
  asyncHandler(async (req, res) => {
    const card = await Card.create({ ...req.body, owner: req.user._id });
    const { newlyUnlocked } = await evaluateAchievements(req.user);
    res.status(201).json({ card: card.toJSONSafe(), newlyUnlocked });
  })
);

router.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const card = await Card.findById(req.params.id).populate(
      'owner',
      'username displayName avatarUrl githubUsername websiteUrl'
    );
    if (!card) throw new HttpError(404, 'Card not found');
    const isOwner = req.user && card.owner._id.equals(req.user._id);
    if (!card.isPublic && !isOwner) throw new HttpError(403, 'This card is private');
    const json = card.toJSONSafe();
    json.owner = {
      username: card.owner.username,
      displayName: card.owner.displayName,
      avatarUrl: card.owner.avatarUrl,
      githubUsername: card.owner.githubUsername,
    };
    json.ownerUsername = card.owner.username;
    json.ownerWebsite = card.owner.websiteUrl || '';
    json.likedByMe = req.user
      ? Boolean(await Like.exists({ user: req.user._id, card: card._id }))
      : false;
    res.set('Cache-Control', isOwner ? 'private, no-cache' : 'public, max-age=60');
    res.json({ card: json, isOwner: Boolean(isOwner) });
  })
);

router.patch(
  '/:id',
  requireAuth,
  validate(cardUpdateSchema),
  asyncHandler(async (req, res) => {
    const card = await ownedCard(req);
    Object.assign(card, req.body);
    await card.save();
    const { newlyUnlocked } = await evaluateAchievements(req.user);
    res.json({ card: card.toJSONSafe(), newlyUnlocked });
  })
);

router.post(
  '/:id/sync',
  requireAuth,
  asyncHandler(async (req, res) => {
    const card = await ownedCard(req);
    const source = card.repoUrl || card.repoName;
    if (!source) throw new HttpError(422, 'Add a repo URL or owner/name first');
    const summary = await fetchRepoSummary(source);
    card.githubStars = summary.githubStars;
    card.primaryLanguage = summary.primaryLanguage || card.primaryLanguage;
    if (!card.description) card.description = summary.description;
    if ((card.techStack || []).length === 0) card.techStack = summary.techStack;
    card.repoUrl = summary.repoUrl;
    card.githubSynced = true;
    card.githubSyncedAt = new Date();
    await card.save();
    const { newlyUnlocked } = await evaluateAchievements(req.user);
    res.json({ card: card.toJSONSafe(), newlyUnlocked });
  })
);

// like or unlike a card (toggle)
router.post(
  '/:id/like',
  requireAuth,
  asyncHandler(async (req, res) => {
    const card = await Card.findById(req.params.id);
    if (!card) throw new HttpError(404, 'Card not found');
    if (card.owner.equals(req.user._id)) throw new HttpError(400, 'You cannot like your own card');
    if (!card.isPublic) throw new HttpError(403, 'This card is private');

    const existing = await Like.findOne({ user: req.user._id, card: card._id });
    let liked;
    if (existing) {
      await existing.deleteOne();
      liked = false;
    } else {
      await Like.create({ user: req.user._id, card: card._id });
      liked = true;
    }

    const likeCount = await Like.countDocuments({ card: card._id });
    card.likeCount = likeCount;
    await card.save();

    const owner = await User.findById(card.owner);
    if (owner) await evaluateAchievements(owner);

    res.json({ liked, likeCount });
  })
);

router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const card = await ownedCard(req);
    await Like.deleteMany({ card: card._id });
    await card.deleteOne();
    // achievements already unlocked are never revoked
    res.json({ ok: true });
  })
);

export default router;
