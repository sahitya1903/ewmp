// Local/traditional-host entry point: connects to MongoDB, then listens on a
// port. Vercel's serverless entry point (api/index.js) imports app.js
// directly instead — it never calls listen().
import { connectDB } from "./lib/db.js";
import app from "./app.js";

const PORT = process.env.PORT || 4000;

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Backend listening on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  });
