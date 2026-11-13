import "server-only";
import { type Db, MongoClient } from "mongodb";

/**
 * One MongoDB connection reused across hot reloads in dev and across invocations in serverless.
 * Only the AI prompt store lives here; everything else is in PostgreSQL.
 */

const globalForMongo = globalThis as unknown as { mongoDb?: Promise<Db> };

async function connect(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("The prompt store is not configured: set MONGODB_URI.");
  const client = new MongoClient(uri, { maxPoolSize: 5, serverSelectionTimeoutMS: 5_000 });
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "learnenglish");
  await Promise.all([
    db.collection("prompt_categories").createIndex({ key: 1 }, { unique: true }),
    db.collection("prompts").createIndex({ key: 1, version: 1 }, { unique: true }),
    db.collection("prompt_runs").createIndex({ key: 1, createdAt: -1 }),
    // Traces are for debugging recent calls; they remove themselves after 90 days.
    db.collection("prompt_runs").createIndex({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }),
  ]);
  return db;
}

export function mongo(): Promise<Db> {
  if (!globalForMongo.mongoDb) {
    // A failed connection is not cached, so the next request tries again.
    globalForMongo.mongoDb = connect().catch((error) => {
      globalForMongo.mongoDb = undefined;
      throw error;
    });
  }
  return globalForMongo.mongoDb;
}
