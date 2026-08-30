import mongoose from 'mongoose';

export const BASKET_MAX_CARDS = 12;

/**
 * A curated list of other people's cards. The supermarket framing is a basket
 * you fill off the shelves: "Six tiny tools I actually use".
 */
const basketSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 60 },
    note: { type: String, trim: true, maxlength: 200, default: '' },
    cards: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Card' }],
      default: [],
      validate: [
        (arr) => arr.length <= BASKET_MAX_CARDS,
        `A basket holds up to ${BASKET_MAX_CARDS} cards`,
      ],
    },
    isPublic: { type: Boolean, default: true },
  },
  { timestamps: true }
);

basketSchema.index({ owner: 1, createdAt: -1 });

basketSchema.methods.toJSONSafe = function toJSONSafe() {
  const obj = this.toObject({ versionKey: false });
  obj.id = obj._id;
  delete obj._id;
  return obj;
};

export const Basket = mongoose.model('Basket', basketSchema);
