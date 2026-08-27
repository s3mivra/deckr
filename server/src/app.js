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

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);

  app.use(
    cors({
      origin: env.clientUrl,
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

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/cards', cardRoutes);
  app.use('/api/achievements', achievementRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
