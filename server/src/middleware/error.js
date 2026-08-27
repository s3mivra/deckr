import { env } from '../config/env.js';

export function notFound(_req, res) {
  res.status(404).json({ error: 'Not found' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  if (status >= 500) {
    console.error('[error]', err);
  }
  const body = { error: err.message || 'Something went wrong' };
  if (err.details) body.details = err.details;
  if (!env.isProd && status >= 500) body.stack = err.stack;
  res.status(status).json(body);
}
