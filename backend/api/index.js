// Vercel serverless entry point. connectDB() caches the connection on
// global._mongoose (see src/lib/db.js), so warm invocations reuse it instead
// of reconnecting to MongoDB on every request.
import { connectDB } from "../src/lib/db.js";
import app from "../src/app.js";

export default async function handler(req, res) {
  await connectDB();
  app(req, res);
}
