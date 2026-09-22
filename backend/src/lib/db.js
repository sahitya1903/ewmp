import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Missing MONGODB_URI environment variable");
}

let cached = global._mongoose;

if (!cached) {
  cached = global._mongoose = { conn: null, promise: null };
}

export async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI).then((mongoose) => mongoose);
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    // Don't leave a rejected promise cached — on a serverless platform, a warm
    // instance would otherwise keep re-throwing this same failure forever,
    // even after the underlying issue (e.g. an IP allowlist change) is fixed.
    cached.promise = null;
    throw err;
  }
  return cached.conn;
}
