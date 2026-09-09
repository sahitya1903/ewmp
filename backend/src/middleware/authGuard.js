import { verifyToken } from "../lib/auth.js";
import { getEnabledModules } from "../lib/rolePermissions.js";

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

// Blocks a role from a feature area Admin has switched off for it, via the
// Access Control panel. Reviewer roles and Accounts_E are never restricted.
export function moduleGuard(moduleKey) {
  return async (req, res, next) => {
    const enabled = await getEnabledModules(req.user?.role);
    if (!enabled.includes(moduleKey)) {
      return res.status(403).json({ error: "This feature isn't enabled for your role" });
    }
    next();
  };
}
