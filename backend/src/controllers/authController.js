import User from "../models/User.js";
import { verifyPassword, signToken } from "../lib/auth.js";

const ROLE_HOME = {
  Developer_E: "/dashboard",
  "Cyber Security_E": "/dashboard",
  "Social Media & Performance Marketing_E": "/dashboard",
  Accounts_E: "/accounts",
  Admin: "/admin",
  Management: "/management",
};

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 1000 * 60 * 60 * 24 * 7,
};

export async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = await User.findOne({ email: email.toLowerCase(), isActive: true });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = signToken({ sub: user._id.toString(), role: user.role, name: user.name });

  res.cookie("token", token, COOKIE_OPTIONS);
  res.json({ redirectTo: ROLE_HOME[user.role] ?? "/dashboard" });
}

export async function me(req, res) {
  const user = await User.findById(req.user.sub).select("employeeId name email role");
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user });
}

export function logout(req, res) {
  res.clearCookie("token", { ...COOKIE_OPTIONS, maxAge: undefined });
  res.json({ ok: true });
}
