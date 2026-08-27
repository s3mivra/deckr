import { ACHIEVEMENTS } from '../data/achievements.js';
import { Card } from '../models/Card.js';

/**
 * Evaluate every achievement for a user and persist newly unlocked ones.
 * Returns { unlocked: [...all keys], newlyUnlocked: [...keys unlocked this run] }.
 */
export async function evaluateAchievements(user) {
  const cards = (await Card.find({ owner: user._id }).lean()).map((c) => ({
    ...c,
    id: c._id,
  }));

  const ctx = { user, cards };
  const already = new Set((user.unlockedAchievements || []).map((a) => a.key));
  const newlyUnlocked = [];

  for (const achievement of ACHIEVEMENTS) {
    let passed = false;
    try {
      passed = Boolean(achievement.check(ctx));
    } catch {
      passed = false;
    }
    if (passed && !already.has(achievement.key)) {
      user.unlockedAchievements.push({ key: achievement.key, unlockedAt: new Date() });
      already.add(achievement.key);
      newlyUnlocked.push(achievement.key);
    }
  }

  if (newlyUnlocked.length > 0) {
    await user.save();
  }

  return {
    unlocked: [...already],
    newlyUnlocked,
  };
}
