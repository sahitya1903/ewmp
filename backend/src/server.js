import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB } from "./lib/db.js";
import authRoutes from "./routes/auth.js";
import employeeRoutes from "./routes/employees.js";
import leaveRequestRoutes from "./routes/leaveRequests.js";
import attendanceRoutes from "./routes/attendance.js";
import holidayRoutes from "./routes/holidays.js";
import salaryRoutes from "./routes/salaries.js";
import dailyWorkUpdateRoutes from "./routes/dailyWorkUpdates.js";
import roleRoutes from "./routes/roles.js";
import rolePermissionRoutes from "./routes/rolePermissions.js";
import managementCapabilityRoutes from "./routes/managementCapabilities.js";
import noticeRoutes from "./routes/notices.js";
import notificationRoutes from "./routes/notifications.js";

const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

const app = express();

app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/leave-requests", leaveRequestRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/holidays", holidayRoutes);
app.use("/api/salaries", salaryRoutes);
app.use("/api/daily-work-updates", dailyWorkUpdateRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/role-permissions", rolePermissionRoutes);
app.use("/api/management-capabilities", managementCapabilityRoutes);
app.use("/api/notices", noticeRoutes);
app.use("/api/notifications", notificationRoutes);

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Bad input that slipped past a controller's own checks (invalid date, failed
  // schema validation, malformed id) is the client's fault, not a server error.
  if (err?.name === "ValidationError" || err?.name === "CastError") {
    return res.status(400).json({ error: err.message });
  }
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON body" });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`Backend listening on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  });
