import { Router } from 'express';
import { CardDesign } from '../models/CardDesign.js';
import { optionalAuth } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../utils/asyncHandler.js';

const router = Router();

// published designs whose availability window is open right now - the card builder picker
router.get(
  '/',
  optionalAuth,
  asyncHandler(async (_req, res) => {
    const designs = await CardDesign.available();
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ designs: designs.map((d) => d.toPublicJSON()) });
  })
);

// one published design by slug, regardless of window, so a card that already uses
// a now-closed design keeps rendering
router.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    const design = await CardDesign.findOne({ slug: req.params.slug, status: 'published' });
    if (!design) throw new HttpError(404, 'Design not found');
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ design: design.toPublicJSON() });
  })
);

export default router;
