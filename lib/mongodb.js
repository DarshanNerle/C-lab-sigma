import mongoose from 'mongoose';

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null, lastFailureAt: 0 };
}

const isSrvClusterUri = (uri = '') => uri.startsWith('mongodb+srv://');

const getConnectionErrorHint = (uri, message) => {
  const msg = String(message || '').toLowerCase();
  if (!uri) return 'Missing MONGODB_URI in environment.';
  if (uri.includes('cluster.mongodb.net') && (uri.includes('@cluster.mongodb.net') || !uri.includes('@'))) {
    return 'MONGODB_URI looks like a placeholder. Set full Atlas URI with username/password and your actual cluster ID.';
  }
  if (msg.includes('querysrv econnrefused') || msg.includes('enotfound') || msg.includes('eai_again')) {
    return 'DNS/network issue while resolving MongoDB SRV record. Check internet/VPN/firewall and Atlas host allowlist.';
  }
  if (msg.includes('authentication failed')) {
    return 'MongoDB authentication failed. Verify username/password in MONGODB_URI.';
  }
  if (msg.includes('server selection timed out')) {
    return 'MongoDB server selection timeout. Verify URI, cluster status, and network access.';
  }
  return 'Unable to connect to MongoDB. Using fallback storage mode where available.';
};

async function connectDB() {
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    console.error("MONGODB_URI is missing from environment variables.");
    throw new Error('Please define the MONGODB_URI environment variable inside .env');
  }

  // Handle common placeholder URI issue
  if (MONGODB_URI.includes('yourdbname') || MONGODB_URI.includes('cluster.mongodb.net') && !MONGODB_URI.includes('cluster0')) {
     console.warn("MONGODB_URI appears to be a placeholder or incomplete.");
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 8000, // Slightly longer for serverless cold starts
      connectTimeoutMS: 10000,
      socketTimeoutMS: 30000,
      maxPoolSize: 1, // Recommended for Vercel Serverless to prevent too many connections
      autoIndex: false, // Performance boost for production
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('=> MongoDB Connection Established');
      return mongoose;
    }).catch(err => {
      const hint = getConnectionErrorHint(MONGODB_URI, err?.message);
      console.error('=> MongoDB Connection Error:', err.message);
      console.error('=> MongoDB Hint:', hint);
      cached.promise = null;
      throw new Error(`Connection Failed: ${err.message}. ${hint}`);
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;
