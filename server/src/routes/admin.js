import { Router } from 'express';
import { z } from 'zod';
import {
  CardDesign,
  CARD_DESIGN_STATUS,
  CARD_DESIGN_AVAILABILITY,
  CARD_DESIGN_ELEMENTS,
} from '../models/CardDesign.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler, HttpError } from '../utils/asyncHandler.js';

const router = Router();

router.use(requireAuth, requireAdmin);

function slugify(name) {
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

async function uniqueSlug(base) {
  const root = slugify(base) || 'design';
  let slug = root;
  let n = 2;
  // eslint-disable-next-line no-await-in-loop
  while (await CardDesign.exists({ slug })) {
    slug = `${root}-${n}`;
    n += 1;
  }
  return slug;
}

async function findDesign(req) {
  const design = await CardDesign.findOne({ slug: req.params.slug });
  if (!design) throw new HttpError(404, 'Design not found');
  return design;
}

const color = z.string().trim().max(40);

// one placed element. Permissive: unknown keys pass through, the renderer ignores them.
const elementSchema = z
  .object({
    id: z.string().min(1).max(40),
    type: z.enum(CARD_DESIGN_ELEMENTS),
    x: z.number(),
    y: z.number(),
    w: z.number(),
    h: z.number(),
    z: z.number().optional(),
    rotation: z.number().optional(),
    // text / field
    text: z.string().max(200).optional(),
    bind: z.string().max(40).optional(),
    prefix: z.string().max(40).optional(),
    suffix: z.string().max(40).optional(),
    emptyText: z.string().max(60).optional(),
    font: z.enum(['display', 'body', 'mono', 'hand', 'label']).optional(),
    size: z.number().min(1).max(120).optional(),
    weight: z.number().optional(),
    color: color.optional(),
    align: z.enum(['left', 'center', 'right']).optional(),
    uppercase: z.boolean().optional(),
    letterSpacing: z.number().optional(),
    lineHeight: z.number().optional(),
    // stars
    max: z.number().min(1).max(10).optional(),
    starMode: z.enum(['exact', 'scaled']).optional(),
    filled: color.optional(),
    empty: color.optional(),
    gap: z.number().optional(),
    // chips
    bg: color.optional(),
    textColor: color.optional(),
    borderColor: color.optional(),
    radius: z.number().optional(),
    // shapes
    fill: color.optional(),
    stroke: color.optional(),
    strokeWidth: z.number().optional(),
    orientation: z.enum(['h', 'v']).optional(),
  })
  .passthrough();

const availabilitySchema = z.object({
  mode: z.enum(CARD_DESIGN_AVAILABILITY).optional(),
  start: z.string().datetime().nullable().optional(),
  end: z.string().datetime().nullable().optional(),
});

const newDesignSchema = z.object({ name: z.string().trim().min(1).max(60) });

const updateDesignSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  status: z.enum(CARD_DESIGN_STATUS).optional(),
  canvas: z
    .object({
      background: color.optional(),
      grid: z.number().int().min(1).max(40).optional(),
    })
    .optional(),
  elements: z.array(elementSchema).max(120).optional(),
  availability: availabilitySchema.optional(),
});

router.get(
  '/designs',
  asyncHandler(async (_req, res) => {
    const designs = await CardDesign.find().sort({ updatedAt: -1 });
    res.json({ designs: designs.map((d) => d.toAdminJSON()) });
  })
);

router.post(
  '/designs',
  validate(newDesignSchema),
  asyncHandler(async (req, res) => {
    const slug = await uniqueSlug(req.body.name);
    const design = await CardDesign.create({
      slug,
      name: req.body.name,
      createdBy: req.user._id,
    });
    res.status(201).json({ design: design.toAdminJSON() });
  })
);

router.get(
  '/designs/:slug',
  asyncHandler(async (req, res) => {
    const design = await findDesign(req);
    res.json({ design: design.toAdminJSON() });
  })
);

router.patch(
  '/designs/:slug',
  validate(updateDesignSchema),
  asyncHandler(async (req, res) => {
    const design = await findDesign(req);
    const { name, status, canvas, elements, availability } = req.body;
    if (name !== undefined) design.name = name;
    if (status !== undefined) design.status = status;
    if (canvas !== undefined) design.canvas = { ...design.canvas.toObject(), ...canvas };
    if (elements !== undefined) design.elements = elements;
    if (availability !== undefined) {
      design.availability = {
        mode: availability.mode || 'always',
        start: availability.start ? new Date(availability.start) : null,
        end: availability.end ? new Date(availability.end) : null,
      };
    }
    await design.save();
    res.json({ design: design.toAdminJSON() });
  })
);

router.post(
  '/designs/:slug/duplicate',
  asyncHandler(async (req, res) => {
    const src = await findDesign(req);
    const slug = await uniqueSlug(`${src.name} copy`);
    const copy = await CardDesign.create({
      slug,
      name: `${src.name} copy`,
      status: 'draft',
      canvas: src.canvas.toObject(),
      elements: src.elements,
      availability: src.availability.toObject(),
      createdBy: req.user._id,
    });
    res.status(201).json({ design: copy.toAdminJSON() });
  })
);

router.delete(
  '/designs/:slug',
  asyncHandler(async (req, res) => {
    const design = await findDesign(req);
    await design.deleteOne();
    res.json({ ok: true });
  })
);

export default router;
