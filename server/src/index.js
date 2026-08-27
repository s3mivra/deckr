import { env } from './config/env.js';
import { connectDb } from './config/db.js';
import { createApp } from './app.js';

async function main() {
  await connectDb();
  const app = createApp();
  app.listen(env.port, () => {
    console.log(`[deckr] api listening on http://localhost:${env.port} (${env.nodeEnv})`);
  });
}

main().catch((err) => {
  console.error('[deckr] failed to start', err);
  process.exit(1);
});
