import { ACHIEVEMENTS } from '../data/achievements.js';

console.log(`Deckr has ${ACHIEVEMENTS.length} achievements:\n`);
for (const a of ACHIEVEMENTS) {
  console.log(`  [${a.tier.padEnd(6)}] ${a.name}: ${a.description}`);
}
