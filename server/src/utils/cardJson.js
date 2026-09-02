import { CardDesign } from '../models/CardDesign.js';

/**
 * Shape a populated Card document for the client. Shared by the community feed
 * and baskets so a card looks identical wherever it is listed.
 * Pass a Set of liked card ids to fill in `likedByMe`.
 */
export const CARD_OWNER_FIELDS = 'username displayName avatarUrl websiteUrl isPublic';

/**
 * Given an array of shaped card objects, look up the published CardDesign for
 * every distinct `designSlug` present and attach it as `card.design`. Cards that
 * reference a design that is no longer published simply get no `design` and fall
 * back to their packaging format. Mutates and returns the same array.
 */
export async function attachDesigns(cards) {
  const slugs = [...new Set(cards.map((c) => c && c.designSlug).filter(Boolean))];
  if (!slugs.length) return cards;
  const docs = await CardDesign.find({ slug: { $in: slugs }, status: 'published' });
  const map = new Map(docs.map((d) => [d.slug, d.toPublicJSON()]));
  for (const c of cards) {
    if (c && c.designSlug && map.has(c.designSlug)) c.design = map.get(c.designSlug);
  }
  return cards;
}

export function cardJSON(card, likedSet = new Set()) {
  const j = card.toJSONSafe();
  delete j.owner;
  return {
    ...j,
    ownerUsername: card.owner?.username || '',
    ownerWebsite: card.owner?.websiteUrl || '',
    likedByMe: likedSet.has(String(card._id)),
    owner: card.owner
      ? {
          username: card.owner.username,
          displayName: card.owner.displayName,
          avatarUrl: card.owner.avatarUrl,
        }
      : null,
  };
}
