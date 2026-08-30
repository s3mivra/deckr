/**
 * Shape a populated Card document for the client. Shared by the community feed
 * and baskets so a card looks identical wherever it is listed.
 * Pass a Set of liked card ids to fill in `likedByMe`.
 */
export const CARD_OWNER_FIELDS = 'username displayName avatarUrl websiteUrl isPublic';

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
