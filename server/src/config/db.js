import mongoose from 'mongoose';
import { env } from './env.js';

// In dev, if there is no reachable MongoDB we spin up an in-memory one so the
// app runs with zero setup. Production always uses the real MONGODB_URI.
async function startMemoryServer() {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  const mem = await MongoMemoryServer.create();
  console.warn('[db] no MongoDB reachable, started an in-memory server for this session');
  console.warn('[db] data is wiped on restart. Set MONGODB_URI to persist.');
  return mem.getUri();
}

export async function connectDb() {
  mongoose.set('strictQuery', true);

  let uri = env.mongoUri;
  const looksLocal = !uri || /127\.0\.0\.1|localhost/.test(uri);
  // Atlas from a cold container can take a while; local should fail fast so the
  // in-memory fallback kicks in quickly.
  const timeout = looksLocal ? 4000 : 30000;

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: timeout });
  } catch (err) {
    if (env.isProd || !looksLocal) {
      console.error(
        '[db] could not reach MongoDB. If this is Atlas, check that Network Access\n' +
          '     allows 0.0.0.0/0, the cluster is not paused, and the user/password in\n' +
          '     MONGODB_URI are correct and URL-encoded.'
      );
      throw err;
    }
    uri = await startMemoryServer();
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  }
  console.log('[db] connected');

  mongoose.connection.on('error', (err) => {
    console.error('[db] connection error', err.message);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('[db] disconnected');
  });
}
