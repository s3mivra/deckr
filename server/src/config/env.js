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
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
};
