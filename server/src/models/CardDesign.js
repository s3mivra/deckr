import mongoose from 'mongoose';

export const CARD_DESIGN_STATUS = ['draft', 'published', 'archived'];
export const CARD_DESIGN_AVAILABILITY = ['always', 'window'];

// Element types the visual editor can place on a card front.
export const CARD_DESIGN_ELEMENTS = [
  'text', // static text
  'field', // text bound to a card value (name, description, stars, price, ...)
  'stars', // GitHub stars as a row of icons
  'chips', // techStack as pills
  'rect', // rectangle
  'band', // full-bleed horizontal band
  'line', // divider
  'star', // decorative 5-point star
];

const availabilitySchema = new mongoose.Schema(
  {
    mode: { type: String, enum: CARD_DESIGN_AVAILABILITY, default: 'always' },
    start: { type: Date, default: null },
    end: { type: Date, default: null },
  },
  { _id: false }
);

const cardDesignSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 2,
      maxlength: 60,
      match: /^[a-z0-9-]+$/,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    status: { type: String, enum: CARD_DESIGN_STATUS, default: 'draft', index: true },

    // canvas-level settings; positions inside elements are px on the 320x480 reference
    canvas: {
      background: { type: String, trim: true, maxlength: 40, default: 'token:card-body' },
      grid: { type: Number, min: 1, max: 40, default: 8 },
    },

    // free-form; validated by zod in the route so the shape can evolve without a migration
    elements: { type: [mongoose.Schema.Types.Mixed], default: [] },

    availability: { type: availabilitySchema, default: () => ({}) },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
);

cardDesignSchema.methods.toJSONSafe = function toJSONSafe() {
  const obj = this.toObject({ versionKey: false });
  obj.id = obj._id;
  delete obj._id;
  return obj;
};

cardDesignSchema.methods.toAdminJSON = function toAdminJSON() {
  return this.toJSONSafe();
};

cardDesignSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    slug: this.slug,
    name: this.name,
    canvas: this.canvas,
    elements: this.elements,
    availability: this.availability,
  };
};

// published designs whose availability window is open right now
cardDesignSchema.statics.available = function available(now = new Date()) {
  return this.find({
    status: 'published',
    $or: [
      { 'availability.mode': 'always' },
      {
        'availability.mode': 'window',
        'availability.start': { $lte: now },
        'availability.end': { $gte: now },
      },
    ],
  }).sort({ updatedAt: -1 });
};

export const CardDesign = mongoose.model('CardDesign', cardDesignSchema);
