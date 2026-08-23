import { verifyToken } from "../lib/auth.js";

export function authGuard(req, res, next) {
  const token = req.cookies?.token;
  const session = token && verifyToken(token);

  if (!session) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  req.user = session;
  next();
}

export function roleGuard(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user?.role)) {
      return res.status(403).json({ error: "Not authorized for this resource" });
    }
    next();
  };
}
