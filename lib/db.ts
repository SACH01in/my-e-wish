import { Db, MongoClient } from "mongodb";

declare global {
  // Reuse a single connection during development hot reloads.
  var momeniqueMongoClient: Promise<MongoClient> | undefined;
}

/**
 * Returns a cached Atlas connection and fails clearly when the application
 * has not been configured with its database URL.
 */
export async function getDb(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MongoDB is not configured. Set MONGODB_URI in .env.local.");
  if (!/^mongodb(?:\+srv)?:\/\//i.test(uri.trim())) {
    throw new Error("MONGODB_URI must start with mongodb:// or mongodb+srv://. Check for a typo in .env.local.");
  }

  if (!global.momeniqueMongoClient) {
    const client = new MongoClient(uri.trim(), {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
    });
    global.momeniqueMongoClient = client.connect();
  }

  return (await global.momeniqueMongoClient).db(process.env.MONGODB_DB || "momenique");
}

/**
 * Creates the indexes used for unique accounts, public URLs, and rate limits.
 * Safe to call at application startup because MongoDB index creation is
 * idempotent.
 */
export async function ensureIndexes(db: Db): Promise<void> {
  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("experiences").createIndex({ slug: 1 }, { unique: true }),
    db.collection("experiences").createIndex({ ownerId: 1, updatedAt: -1 }),
    db.collection("experienceVisitors").createIndex({ experienceId: 1, visitorHash: 1 }, { unique: true }),
    db.collection("experienceVisitors").createIndex({ experienceId: 1, visitedAt: -1 }),
    db.collection("experienceReviews").createIndex({ experienceId: 1, visitorHash: 1 }, { unique: true }),
    db.collection("experienceReviews").createIndex({ experienceId: 1, createdAt: -1 }),
    db.collection("rateLimits").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection("verificationTokens").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection("verificationTokens").createIndex({ tokenHash: 1 }, { unique: true }),
    db.collection("passwordResetTokens").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection("passwordResetTokens").createIndex({ tokenHash: 1 }, { unique: true }),
    db.collection("mediaAssets").createIndex({ publicId: 1 }, { unique: true }),
    db.collection("mediaAssets").createIndex({ ownerId: 1, createdAt: -1 }),
    db.collection("mfaUsedCodes").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]);
}
