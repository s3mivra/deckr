import dotenv from 'dotenv';

dotenv.config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    console.warn(`[env] missing ${name}, some features will not work`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProd: (process.env.NODE_ENV || 'development') === 'production',
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret: required('JWT_SECRET', 'dev_only_insecure_secret'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
  github: {
    clientId: required('GITHUB_CLIENT_ID'),
    clientSecret: required('GITHUB_CLIENT_SECRET'),
    callbackUrl: required('GITHUB_CALLBACK_URL', 'http://localhost:4000/api/auth/github/callback'),
  },
  // CLIENT_URL may be a comma separated list. Trailing slashes are stripped so
  // the values match a browser Origin header exactly.
  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean),
  // allow Vercel preview deployments (project-git-branch-team.vercel.app)
  allowVercelPreviews: process.env.ALLOW_VERCEL_PREVIEWS === 'true',
};

// first configured client url, used when building redirect targets
env.clientUrl = env.clientUrls[0] || 'http://localhost:5173';
