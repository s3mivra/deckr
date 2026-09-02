import { User } from '../models/User.js';
import { verifyToken } from '../utils/token.js';
import { HttpError } from '../utils/asyncHandler.js';
import { isAdminLogin } from '../lib/admin.js';

function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  if (req.cookies?.deckr_token) return req.cookies.deckr_token;
  return null;
}

export async function requireAuth(req, _res, next) {
  try {
    const token = extractToken(req);
    if (!token) throw new HttpError(401, 'Authentication required');
    const payload = verifyToken(token);
    const user = await User.findById(payload.sub);
    if (!user) throw new HttpError(401, 'Account no longer exists');
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(new HttpError(401, 'Invalid or expired session'));
    }
    next(err);
  }
}

export function requireAdmin(req, _res, next) {
  if (!req.user) return next(new HttpError(401, 'Authentication required'));
  if (!isAdminLogin(req.user.githubUsername)) return next(new HttpError(403, 'Admins only'));
  next();
}

export async function optionalAuth(req, _res, next) {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = verifyToken(token);
    req.user = await User.findById(payload.sub);
  } catch {
    // ignore, treat as anonymous
  }
  next();
}
