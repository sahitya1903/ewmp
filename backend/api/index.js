// Vercel serverless entry point. connectDB() caches the connection on
// global._mongoose (see src/lib/db.js), so warm invocations reuse it instead
// of reconnecting to MongoDB on every request.
import { connectDB } from "../src/lib/db.js";
import app from "../src/app.js";

export default async function handler(req, res) {
  try {
    await connectDB();
  } catch (err) {
    // Without this, a DB failure surfaces only as Vercel's opaque
    // FUNCTION_INVOCATION_FAILED page. Report the error type (never the
    // message, which can contain the connection string's host) so the cause
    // is visible from /api/health; full details stay in the runtime logs.
    console.error("MongoDB connection failed", err);
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        error: "Database unavailable",
        cause: err?.name ?? "Error",
        ...(err?.codeName ? { codeName: err.codeName } : {}),
      })
    );
    return;
  }
  app(req, res);
}
