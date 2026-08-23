import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_TTL = "7d";

export async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, 10);
}

export async function verifyPassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}

export function signToken(payload) {
  if (!JWT_SECRET) throw new Error("Missing JWT_SECRET environment variable");
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function verifyToken(token) {
  if (!JWT_SECRET) throw new Error("Missing JWT_SECRET environment variable");
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function generateResetToken() {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = hashResetToken(rawToken);
  return { rawToken, hashedToken };
}

export function hashResetToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}
