import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { notFound, errorHandler } from './middleware/error.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import cardRoutes from './routes/cards.js';
import achievementRoutes from './routes/achievements.js';
import communityRoutes from './routes/community.js';
import basketRoutes from './routes/baskets.js';
import activityRoutes from './routes/activity.js';
import adminRoutes from './routes/admin.js';
import designRoutes from './routes/designs.js';
import sitemapRoutes from './routes/sitemap.js';
import embedRoutes from './routes/embed.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);

  const allowedOrigins = new Set(env.clientUrls);
  app.use(
    cors({
      origin(origin, cb) {
        // requests with no Origin (curl, server to server, same origin) are fine
        if (!origin) return cb(null, true);
        const clean = origin.replace(/\/+$/, '');
        if (allowedOrigins.has(clean)) return cb(null, true);
        if (env.allowVercelPreviews) {
          try {
            if (new URL(origin).hostname.endsWith('.vercel.app')) return cb(null, true);
          } catch {
            /* fall through */
          }
        }
        console.warn(`[cors] blocked origin: ${origin}`);
        return cb(null, false);
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(morgan(env.isProd ? 'tiny' : 'dev'));

  app.use(
    '/api',
    rateLimit({
      windowMs: 60 * 1000,
      max: 120,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'deckr', ts: Date.now() }));

  // SEO: served at the API domain, proxied onto the site domain via vercel.json
  app.use('/', sitemapRoutes);
  // README badges, served as SVG from the API domain
  app.use('/', embedRoutes);

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/cards', cardRoutes);
  app.use('/api/achievements', achievementRoutes);
  app.use('/api/community', communityRoutes);
  app.use('/api/baskets', basketRoutes);
  app.use('/api/activity', activityRoutes);
  app.use('/api/designs', designRoutes);
  app.use('/api/admin', adminRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
