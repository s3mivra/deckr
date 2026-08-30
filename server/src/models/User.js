import mongoose from 'mongoose';

const unlockedAchievementSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    unlockedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    githubId: { type: String, required: true, unique: true, index: true },
    githubUsername: { type: String, required: true },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: /^[a-z0-9_-]+$/,
      index: true,
    },
    displayName: { type: String, trim: true, maxlength: 60, default: '' },
    avatarUrl: { type: String, default: '' },
    email: { type: String, default: '' },
    bio: { type: String, maxlength: 280, default: '' },
    location: { type: String, maxlength: 80, default: '' },
    websiteUrl: { type: String, maxlength: 200, default: '' },
    githubProfileUrl: { type: String, default: '' },

    // up to 4 achievement keys the user chooses to showcase on the profile
    showcasedAchievements: {
      type: [String],
      default: [],
      validate: [(arr) => arr.length <= 4, 'You can showcase at most 4 achievements'],
    },
    unlockedAchievements: { type: [unlockedAchievementSchema], default: [] },

    // when this user last opened the activity strip, drives the "new" flags
    lastSeenActivityAt: { type: Date, default: null },

    onboardingComplete: { type: Boolean, default: false },
    acceptedTermsAt: { type: Date, default: null },

    isPublic: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id,
    username: this.username,
    displayName: this.displayName,
    githubUsername: this.githubUsername,
    githubProfileUrl: this.githubProfileUrl,
    avatarUrl: this.avatarUrl,
    bio: this.bio,
    location: this.location,
    websiteUrl: this.websiteUrl,
    showcasedAchievements: this.showcasedAchievements,
    unlockedAchievements: this.unlockedAchievements,
    createdAt: this.createdAt,
  };
};

userSchema.methods.toPrivateJSON = function toPrivateJSON() {
  return {
    ...this.toPublicJSON(),
    email: this.email,
    isPublic: this.isPublic,
    onboardingComplete: this.onboardingComplete,
    acceptedTermsAt: this.acceptedTermsAt,
  };
};

export const User = mongoose.model('User', userSchema);
