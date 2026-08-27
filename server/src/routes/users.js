import { Router } from 'express';
import { z } from 'zod';
import { User } from '../models/User.js';
import { Card } from '../models/Card.js';
import { Like } from '../models/Like.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler, HttpError } from '../utils/asyncHandler.js';
import { evaluateAchievements } from '../services/achievements.js';
import { ACHIEVEMENT_MAP, publicAchievement } from '../data/achievements.js';

const router = Router();

const profileSchema = z.object({
  displayName: z.string().trim().max(60).optional(),
  bio: z.string().trim().max(280).optional(),
  location: z.string().trim().max(80).optional(),
  websiteUrl: z.string().trim().max(200).optional(),
  isPublic: z.boolean().optional(),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_-]+$/, 'Letters, numbers, dash and underscore only')
    .optional(),
});

const showcaseSchema = z.object({
  keys: z.array(z.string()).max(4),
});

const onboardingSchema = z.object({
  displayName: z.string().trim().max(60).optional(),
  bio: z.string().trim().max(280).optional(),
  acceptedTerms: z.literal(true),
});

// current user profile edit
router.patch(
  '/me',
  requireAuth,
  validate(profileSchema),
  asyncHandler(async (req, res) => {
    const data = req.body;
    if (data.username && data.username !== req.user.username) {
      const taken = await User.exists({ username: data.username });
      if (taken) throw new HttpError(409, 'That username is taken');
      req.user.username = data.username;
    }
    for (const field of ['displayName', 'bio', 'location', 'websiteUrl', 'isPublic']) {
      if (data[field] !== undefined) req.user[field] = data[field];
    }
    await req.user.save();
    const { unlocked } = await evaluateAchievements(req.user);
    res.json({ user: req.user.toPrivateJSON(), unlocked });
  })
);

router.post(
  '/me/onboarding',
  requireAuth,
  validate(onboardingSchema),
  asyncHandler(async (req, res) => {
    const { displayName, bio } = req.body;
    if (displayName !== undefined) req.user.displayName = displayName;
    if (bio !== undefined) req.user.bio = bio;
    req.user.acceptedTermsAt = new Date();
    req.user.onboardingComplete = true;
    await req.user.save();
    const { unlocked } = await evaluateAchievements(req.user);
    res.json({ user: req.user.toPrivateJSON(), unlocked });
  })
);

router.put(
  '/me/showcase',
  requireAuth,
  validate(showcaseSchema),
  asyncHandler(async (req, res) => {
    const unlockedKeys = new Set((req.user.unlockedAchievements || []).map((a) => a.key));
    const keys = [...new Set(req.body.keys)];
    for (const key of keys) {
      if (!ACHIEVEMENT_MAP[key]) throw new HttpError(422, `Unknown achievement: ${key}`);
      if (!unlockedKeys.has(key)) throw new HttpError(422, `Not unlocked yet: ${key}`);
    }
    req.user.showcasedAchievements = keys;
    await req.user.save();
    const { unlocked } = await evaluateAchievements(req.user);
    res.json({ user: req.user.toPrivateJSON(), unlocked });
  })
);

// public profile by username
router.get(
  '/:username',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ username: req.params.username.toLowerCase() });
    if (!user) throw new HttpError(404, 'No such profile');

    const isOwner = req.user && req.user._id.equals(user._id);
    if (!user.isPublic && !isOwner) throw new HttpError(403, 'This profile is private');

    const cardFilter = { owner: user._id };
    if (!isOwner) cardFilter.isPublic = true;
    const cards = await Card.find(cardFilter).sort({ createdAt: -1 });

    let likedSet = new Set();
    if (req.user && cards.length) {
      const likes = await Like.find({
        user: req.user._id,
        card: { $in: cards.map((c) => c._id) },
      }).select('card');
      likedSet = new Set(likes.map((l) => String(l.card)));
    }

    const unlockedKeys = (user.unlockedAchievements || []).map((a) => a.key);
    res.set('Cache-Control', isOwner ? 'private, no-cache' : 'public, max-age=10');
    res.json({
      profile: user.toPublicJSON(),
      isOwner: Boolean(isOwner),
      cards: cards.map((c) => ({
        ...c.toJSONSafe(),
        ownerUsername: user.username,
        ownerWebsite: user.websiteUrl || '',
        likedByMe: likedSet.has(String(c._id)),
      })),
      achievements: {
        unlocked: unlockedKeys,
        showcased: user.showcasedAchievements
          .map((k) => ACHIEVEMENT_MAP[k])
          .filter(Boolean)
          .map(publicAchievement),
        total: Object.keys(ACHIEVEMENT_MAP).length,
      },
    });
  })
);

export default router;
