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

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 4000 });
  } catch (err) {
    if (env.isProd || !looksLocal) throw err;
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
