import { Router } from 'express';
import { User } from '../models/User.js';
import { Card } from '../models/Card.js';
import { env } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// Where the public site lives. Falls back to the first configured client URL.
const SITE = (process.env.PUBLIC_SITE_URL || env.clientUrl || '').replace(/\/+$/, '');

function xmlEscape(s) {
  return String(s).replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);
}

function urlEntry(path, lastmod, changefreq, priority) {
  return [
    '  <url>',
    `    <loc>${xmlEscape(SITE + path)}</loc>`,
    lastmod ? `    <lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : '',
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : '',
    priority ? `    <priority>${priority}</priority>` : '',
    '  </url>',
  ]
    .filter(Boolean)
    .join('\n');
}

router.get(
  '/sitemap.xml',
  asyncHandler(async (req, res) => {
    const [users, cards] = await Promise.all([
      User.find({ isPublic: true }).select('username updatedAt').sort({ updatedAt: -1 }).limit(5000).lean(),
      Card.find({ isPublic: true })
        .select('updatedAt owner')
        .populate('owner', 'isPublic')
        .sort({ updatedAt: -1 })
        .limit(5000)
        .lean(),
    ]);

    const staticPages = [
      urlEntry('/', null, 'weekly', '1.0'),
      urlEntry('/community', null, 'daily', '0.8'),
      urlEntry('/achievements', null, 'monthly', '0.5'),
    ];

    const profilePages = users.map((u) =>
      urlEntry(`/u/${u.username}`, u.updatedAt, 'weekly', '0.7')
    );

    const cardPages = cards
      .filter((c) => c.owner && c.owner.isPublic !== false)
      .map((c) => urlEntry(`/c/${c._id}`, c.updatedAt, 'weekly', '0.6'));

    const body = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...staticPages,
      ...profilePages,
      ...cardPages,
      '</urlset>',
    ].join('\n');

    res.set('Content-Type', 'application/xml');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(body);
  })
);

export default router;
