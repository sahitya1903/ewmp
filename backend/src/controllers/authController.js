import User from "../models/User.js";
import {
  verifyPassword,
  signToken,
  hashPassword,
  generateResetToken,
  hashResetToken,
} from "../lib/auth.js";

const RESET_TOKEN_TTL_MS = 1000 * 60 * 30;

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

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current and new password are required" });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters" });
  }

  const user = await User.findById(req.user.sub);
  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }

  user.passwordHash = await hashPassword(newPassword);
  await user.save();
  res.json({ ok: true });
}

export async function forgotPassword(req, res) {
  const { email } = req.body;
  const genericResponse = {
    ok: true,
    message: "If that email is registered, a password reset link has been sent.",
  };

  if (!email) return res.status(400).json({ error: "Email is required" });

  const user = await User.findOne({ email: email.toLowerCase(), isActive: true });
  if (!user) return res.json(genericResponse);

  const { rawToken, hashedToken } = generateResetToken();
  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  await user.save();

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

  // No transactional email provider is wired up yet — log the link so it's usable in dev.
  console.log(`\n[Password reset] ${user.email} -> ${resetUrl}\n`);

  const response = { ...genericResponse };
  if (process.env.NODE_ENV !== "production") {
    response.devResetUrl = resetUrl;
  }
  res.json(response);
}

export async function resetPassword(req, res) {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: "Token and new password are required" });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters" });
  }

  const user = await User.findOne({
    resetPasswordToken: hashResetToken(token),
    resetPasswordExpires: { $gt: new Date() },
  });

  if (!user) {
    return res.status(400).json({ error: "Invalid or expired reset token" });
  }

  user.passwordHash = await hashPassword(newPassword);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({ ok: true });
}
