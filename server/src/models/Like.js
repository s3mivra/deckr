import mongoose from 'mongoose';

const likeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    card: { type: mongoose.Schema.Types.ObjectId, ref: 'Card', required: true },
  },
  { timestamps: true }
);

likeSchema.index({ user: 1, card: 1 }, { unique: true });
likeSchema.index({ card: 1 });

export const Like = mongoose.model('Like', likeSchema);
