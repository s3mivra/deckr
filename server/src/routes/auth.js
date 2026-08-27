import { Router } from 'express';
import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { asyncHandler, HttpError } from '../utils/asyncHandler.js';
import { signToken } from '../utils/token.js';
import { requireAuth } from '../middleware/auth.js';
import { exchangeCodeForToken, fetchGithubUser } from '../services/github.js';
import { evaluateAchievements } from '../services/achievements.js';

const router = Router();

const STATE_COOKIE = 'deckr_oauth_state';

function sanitizeUsername(raw) {
  return (raw || 'player')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24) || 'player';
}

async function uniqueUsername(base) {
  let candidate = sanitizeUsername(base);
  if (candidate.length < 3) candidate = `${candidate}-dev`;
  let suffix = 0;
  // eslint-disable-next-line no-await-in-loop
  while (await User.exists({ username: suffix ? `${candidate}-${suffix}` : candidate })) {
    suffix += 1;
  }
  return suffix ? `${candidate}-${suffix}` : candidate;
}

// Step 1: kick off GitHub OAuth
router.get('/github', (req, res) => {
  const state = crypto.randomBytes(16).toString('hex');
  res.cookie(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProd,
    maxAge: 10 * 60 * 1000,
  });
  const params = new URLSearchParams({
    client_id: env.github.clientId || '',
    redirect_uri: env.github.callbackUrl,
    scope: 'read:user user:email',
    state,
    allow_signup: 'true',
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
});

// Step 2: GitHub redirects back here
router.get(
  '/github/callback',
  asyncHandler(async (req, res) => {
    const { code, state } = req.query;
    const savedState = req.cookies?.[STATE_COOKIE];
    res.clearCookie(STATE_COOKIE);

    const fail = (reason) =>
      res.redirect(`${env.clientUrl}/login?error=${encodeURIComponent(reason)}`);

    if (!code) return fail('missing_code');
    if (!state || !savedState || state !== savedState) return fail('bad_state');

    let profile;
    try {
      const accessToken = await exchangeCodeForToken(String(code));
      profile = await fetchGithubUser(accessToken);
    } catch (err) {
      console.error('[auth] github exchange failed', err.message);
      return fail('github_error');
    }

    let user = await User.findOne({ githubId: profile.githubId });
    let isNew = false;
    if (!user) {
      isNew = true;
      user = await User.create({
        githubId: profile.githubId,
        githubUsername: profile.githubUsername,
        username: await uniqueUsername(profile.githubUsername),
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        githubProfileUrl: profile.githubProfileUrl,
        email: profile.email,
        bio: profile.bio,
        location: profile.location,
        websiteUrl: profile.websiteUrl,
      });
    } else {
      // keep GitHub-sourced fields fresh, do not clobber user edits to bio
      user.githubUsername = profile.githubUsername;
      user.avatarUrl = profile.avatarUrl;
      user.githubProfileUrl = profile.githubProfileUrl;
      if (profile.email && !user.email) user.email = profile.email;
      await user.save();
    }

    await evaluateAchievements(user);

    const token = signToken({ sub: user._id.toString() });
    res.cookie('deckr_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.isProd,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    const dest = new URL(`${env.clientUrl}/auth/callback`);
    dest.searchParams.set('token', token);
    dest.searchParams.set('new', String(isNew));
    res.redirect(dest.toString());
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { unlocked } = await evaluateAchievements(req.user);
    res.json({ user: req.user.toPrivateJSON(), unlocked });
  })
);

router.post('/logout', (_req, res) => {
  res.clearCookie('deckr_token');
  res.json({ ok: true });
});

router.get(
  '/username-available',
  asyncHandler(async (req, res) => {
    const wanted = sanitizeUsername(String(req.query.username || ''));
    if (wanted.length < 3) throw new HttpError(422, 'Username too short');
    const taken = await User.exists({ username: wanted });
    res.json({ username: wanted, available: !taken });
  })
);

export default router;
