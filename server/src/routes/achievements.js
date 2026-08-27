import { Router } from 'express';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ACHIEVEMENTS, publicAchievement } from '../data/achievements.js';
import { evaluateAchievements } from '../services/achievements.js';

const router = Router();

// full catalog, with unlocked flags when signed in
router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req, res) => {
    let unlockedMap = {};
    if (req.user) {
      await evaluateAchievements(req.user);
      unlockedMap = Object.fromEntries(
        (req.user.unlockedAchievements || []).map((a) => [a.key, a.unlockedAt])
      );
    }
    res.set('Cache-Control', req.user ? 'private, max-age=15' : 'public, max-age=300');
    res.json({
      achievements: ACHIEVEMENTS.map((a) => ({
        ...publicAchievement(a),
        unlocked: Boolean(unlockedMap[a.key]),
        unlockedAt: unlockedMap[a.key] || null,
      })),
      total: ACHIEVEMENTS.length,
    });
  })
);

// force a re-check (used after big edits)
router.post(
  '/evaluate',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await evaluateAchievements(req.user);
    res.json(result);
  })
);

export default router;
