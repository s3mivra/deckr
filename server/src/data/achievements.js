// Achievement catalog. Each achievement has a pure `check(ctx)` predicate.
// ctx = { user, cards, basketCount }; cards is an array of plain card objects.

const distinct = (values) => [...new Set(values.filter(Boolean).map((v) => v.toLowerCase()))];

const totalStars = (cards) => cards.reduce((sum, c) => sum + (c.githubStars || 0), 0);

const daysBetween = (a, b) => Math.floor((new Date(a) - new Date(b)) / 86400000);

export const ACHIEVEMENTS = [
  {
    key: 'first-card',
    name: 'First Draw',
    description: 'Build your first card.',
    tier: 'bronze',
    check: ({ cards }) => cards.length >= 1,
  },
  {
    key: 'deck-of-five',
    name: 'Small Deck',
    description: 'Have 5 cards in your deck.',
    tier: 'bronze',
    check: ({ cards }) => cards.length >= 5,
  },
  {
    key: 'deck-of-ten',
    name: 'Full Deck',
    description: 'Have 10 cards in your deck.',
    tier: 'silver',
    check: ({ cards }) => cards.length >= 10,
  },
  {
    key: 'full-house',
    name: 'Full House',
    description: 'Have 15 cards in your deck.',
    tier: 'gold',
    check: ({ cards }) => cards.length >= 15,
  },
  {
    key: 'profile-complete',
    name: 'Introduced',
    description: 'Fill in your bio and finish onboarding.',
    tier: 'bronze',
    check: ({ user }) => Boolean(user.bio && user.bio.trim().length >= 20 && user.onboardingComplete),
  },
  {
    key: 'curator',
    name: 'Curator',
    description: 'Showcase 4 achievements on your profile.',
    tier: 'silver',
    check: ({ user }) => (user.showcasedAchievements || []).length >= 4,
  },
  {
    key: 'stargazer',
    name: 'Stargazer',
    description: 'Have a card for a project with 10 or more GitHub stars.',
    tier: 'bronze',
    check: ({ cards }) => cards.some((c) => (c.githubStars || 0) >= 10),
  },
  {
    key: 'supernova',
    name: 'Supernova',
    description: 'Have a card for a project with 100 or more GitHub stars.',
    tier: 'gold',
    check: ({ cards }) => cards.some((c) => (c.githubStars || 0) >= 100),
  },
  {
    key: 'constellation',
    name: 'Constellation',
    description: 'Reach 500 total stars across all your cards.',
    tier: 'gold',
    check: ({ cards }) => totalStars(cards) >= 500,
  },
  {
    key: 'polyglot',
    name: 'Polyglot',
    description: 'Ship cards spanning 5 or more primary languages.',
    tier: 'silver',
    check: ({ cards }) => distinct(cards.map((c) => c.primaryLanguage)).length >= 5,
  },
  {
    key: 'tech-stack-master',
    name: 'Stack Master',
    description: 'Use 15 or more distinct technologies across your cards.',
    tier: 'silver',
    check: ({ cards }) => distinct(cards.flatMap((c) => c.techStack || [])).length >= 15,
  },
  {
    key: 'solo-artist',
    name: 'Solo Artist',
    description: 'Have 3 or more solo projects.',
    tier: 'bronze',
    check: ({ cards }) => cards.filter((c) => c.teamType === 'solo').length >= 3,
  },
  {
    key: 'team-player',
    name: 'Team Player',
    description: 'Have 3 or more team projects.',
    tier: 'bronze',
    check: ({ cards }) => cards.filter((c) => c.teamType === 'team').length >= 3,
  },
  {
    key: 'shipped-it',
    name: 'Shipped It',
    description: 'Have 3 or more cards marked shipped or live.',
    tier: 'silver',
    check: ({ cards }) =>
      cards.filter((c) => c.status === 'shipped' || c.status === 'live').length >= 3,
  },
  {
    key: 'work-in-progress',
    name: 'In The Lab',
    description: 'Have a card marked in progress.',
    tier: 'bronze',
    check: ({ cards }) => cards.some((c) => c.status === 'in-progress'),
  },
  {
    key: 'storyteller',
    name: 'Storyteller',
    description: 'Fill every story field on a single card.',
    tier: 'silver',
    check: ({ cards }) =>
      cards.some((c) => c.whyBuilt && c.hardestPart && c.whatLearned),
  },
  {
    key: 'perfectionist',
    name: 'Perfectionist',
    description: 'Complete every field on a single card, front and back.',
    tier: 'gold',
    check: ({ cards }) =>
      cards.some(
        (c) =>
          c.projectName &&
          c.repoName &&
          c.description &&
          (c.techStack || []).length > 0 &&
          c.buildTime &&
          c.primaryLanguage &&
          c.whyBuilt &&
          c.hardestPart &&
          c.whatLearned &&
          c.repoUrl &&
          c.portfolioUrl
      ),
  },
  {
    key: 'open-source-hero',
    name: 'Open Source Hero',
    description: 'Have 5 or more cards linking a public repo.',
    tier: 'silver',
    check: ({ cards }) => cards.filter((c) => c.repoUrl).length >= 5,
  },
  {
    key: 'themer',
    name: 'Themer',
    description: 'Use at least 3 different card themes.',
    tier: 'bronze',
    check: ({ cards }) => distinct(cards.map((c) => c.theme)).length >= 3,
  },
  {
    key: 'comeback',
    name: 'The Comeback',
    description: 'Update a card 7 or more days after creating it.',
    tier: 'bronze',
    check: ({ cards }) =>
      cards.some((c) => c.updatedAt && c.createdAt && daysBetween(c.updatedAt, c.createdAt) >= 7),
  },
  {
    key: 'veteran',
    name: 'Veteran',
    description: 'Keep a Deckr account for 30 days.',
    tier: 'silver',
    check: ({ user }) => user.createdAt && daysBetween(Date.now(), user.createdAt) >= 30,
  },
  {
    key: 'crowd-pleaser',
    name: 'Crowd Pleaser',
    description: 'Have a card with 10 or more likes.',
    tier: 'silver',
    check: ({ cards }) => cards.some((c) => (c.likeCount || 0) >= 10),
  },
  {
    key: 'beloved',
    name: 'Beloved',
    description: 'Reach 50 total likes across all your cards.',
    tier: 'gold',
    check: ({ cards }) => cards.reduce((s, c) => s + (c.likeCount || 0), 0) >= 50,
  },
  {
    key: 'shelf-stacker',
    name: 'Shelf Stacker',
    description: 'Curate a basket of other makers cards.',
    tier: 'bronze',
    check: ({ basketCount }) => (basketCount || 0) >= 1,
  },
  {
    key: 'head-buyer',
    name: 'Head Buyer',
    description: 'Publish 3 baskets.',
    tier: 'silver',
    check: ({ basketCount }) => (basketCount || 0) >= 3,
  },
  {
    key: 'meta',
    name: 'Very Meta',
    description: 'Build a card for Deckr itself.',
    tier: 'gold',
    check: ({ cards }) =>
      cards.some((c) => `${c.projectName} ${c.repoName}`.toLowerCase().includes('deckr')),
  },
];

export const ACHIEVEMENT_MAP = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.key, a]));

export function publicAchievement(a) {
  return { key: a.key, name: a.name, description: a.description, tier: a.tier };
}
