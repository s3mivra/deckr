import { env } from '../config/env.js';

const GH_API = 'https://api.github.com';

async function ghFetch(url, token) {
  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'deckr-app',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

export async function exchangeCodeForToken(code) {
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: env.github.clientId,
      client_secret: env.github.clientSecret,
      code,
      redirect_uri: env.github.callbackUrl,
    }),
  });
  const data = await res.json();
  if (data.error || !data.access_token) {
    throw new Error(data.error_description || 'Failed to exchange GitHub code');
  }
  return data.access_token;
}

export async function fetchGithubUser(token) {
  const [profile, emails] = await Promise.all([
    ghFetch(`${GH_API}/user`, token),
    ghFetch(`${GH_API}/user/emails`, token).catch(() => []),
  ]);
  const primaryEmail =
    Array.isArray(emails) && emails.find((e) => e.primary && e.verified)?.email;
  return {
    githubId: String(profile.id),
    githubUsername: profile.login,
    displayName: profile.name || profile.login,
    avatarUrl: profile.avatar_url || '',
    githubProfileUrl: profile.html_url || `https://github.com/${profile.login}`,
    bio: profile.bio || '',
    location: profile.location || '',
    websiteUrl: profile.blog || '',
    email: primaryEmail || '',
  };
}

/**
 * Look up a public repo by "owner/name" or a full github URL.
 * Returns fields Deckr can prefill on a card. No token needed for public repos
 * but the unauthenticated rate limit is low, so pass one when available.
 */
export async function fetchRepoSummary(input, token) {
  const slug = parseRepoSlug(input);
  if (!slug) throw new Error('Could not parse a repo from that input');
  const [repo, languages] = await Promise.all([
    ghFetch(`${GH_API}/repos/${slug}`, token),
    ghFetch(`${GH_API}/repos/${slug}/languages`, token).catch(() => ({})),
  ]);
  return {
    repoName: repo.full_name,
    description: repo.description || '',
    githubStars: repo.stargazers_count || 0,
    primaryLanguage: repo.language || '',
    techStack: Object.keys(languages || {}).slice(0, 12),
    repoUrl: repo.html_url,
    portfolioUrl: repo.homepage || '',
  };
}

export function parseRepoSlug(input) {
  if (!input) return null;
  const trimmed = input.trim();
  const urlMatch = trimmed.match(/github\.com\/([^/]+)\/([^/#?]+)/i);
  if (urlMatch) return `${urlMatch[1]}/${urlMatch[2].replace(/\.git$/, '')}`;
  const slugMatch = trimmed.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (slugMatch) return `${slugMatch[1]}/${slugMatch[2].replace(/\.git$/, '')}`;
  return null;
}
