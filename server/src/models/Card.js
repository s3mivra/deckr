import mongoose from 'mongoose';

export const CARD_THEMES = ['lilac', 'mint', 'butter', 'peach', 'sky'];
export const CARD_STATUS = ['idea', 'in-progress', 'shipped', 'live', 'archived'];
export const TEAM_TYPE = ['solo', 'team'];
export const CARD_PACKAGING = ['bag', 'carton', 'cereal', 'jar'];

const cardSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // front
    projectName: { type: String, required: true, trim: true, maxlength: 40 },
    appCode: { type: String, trim: true, uppercase: true, maxlength: 5, default: '' },
    packaging: { type: String, enum: CARD_PACKAGING, default: 'bag' },
    repoName: { type: String, trim: true, maxlength: 60, default: '' },
    description: { type: String, trim: true, maxlength: 125, default: '' },
    techStack: {
      type: [String],
      default: [],
      validate: [(arr) => arr.length <= 10, 'Up to 10 technologies per card'],
    },
    theme: { type: String, enum: CARD_THEMES, default: 'butter' },

    // back
    buildTime: { type: String, trim: true, maxlength: 32, default: '' },
    teamType: { type: String, enum: TEAM_TYPE, default: 'solo' },
    teamSize: { type: Number, min: 1, max: 200, default: null },
    status: { type: String, enum: CARD_STATUS, default: 'in-progress' },
    githubStars: { type: Number, min: 0, max: 10000000, default: 0 },
    primaryLanguage: { type: String, trim: true, maxlength: 24, default: '' },
    whyBuilt: { type: String, trim: true, maxlength: 140, default: '' },
    hardestPart: { type: String, trim: true, maxlength: 140, default: '' },
    whatLearned: { type: String, trim: true, maxlength: 140, default: '' },
    repoUrl: { type: String, trim: true, maxlength: 200, default: '' },
    portfolioUrl: { type: String, trim: true, maxlength: 200, default: '' },

    // engagement
    likeCount: { type: Number, min: 0, default: 0 },

    // meta
    githubSynced: { type: Boolean, default: false },
    githubSyncedAt: { type: Date, default: null },
    isPublic: { type: Boolean, default: true },
  },
  { timestamps: true }
);

cardSchema.index({ owner: 1, createdAt: -1 });

cardSchema.methods.toJSONSafe = function toJSONSafe() {
  const obj = this.toObject({ versionKey: false });
  obj.id = obj._id;
  delete obj._id;
  return obj;
};

export const Card = mongoose.model('Card', cardSchema);
