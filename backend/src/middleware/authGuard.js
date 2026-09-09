import { verifyToken } from "../lib/auth.js";
import { getEnabledModules } from "../lib/rolePermissions.js";
import { managementCanUse } from "../lib/managementAccess.js";
import { isManagementRole } from "../lib/roleCategory.js";

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
// Access Control panel. Management roles are never restricted.
export function moduleGuard(moduleKey) {
  return async (req, res, next) => {
    const enabled = await getEnabledModules(req.user?.role);
    if (!enabled.includes(moduleKey)) {
      return res.status(403).json({ error: "This feature isn't enabled for your role" });
    }
    next();
  };
}

// Allows any management-category role through (Admin, HR, Accounts_E, or a
// custom management role) — the category-aware equivalent of listing roles
// by hand, so a newly created custom management role isn't permanently
// locked out of the actions Admin grants it via capabilities.
export function managementRoleGuard() {
  return async (req, res, next) => {
    if (await isManagementRole(req.user?.role)) return next();
    return res.status(403).json({ error: "Not authorized for this resource" });
  };
}

// Blocks a non-Admin management role (HR, Accounts, or a custom management
// role) from a console capability Admin hasn't granted it. A no-op for
// Admin (always full access) and for anyone who isn't a management role at
// all — those are rejected earlier by managementRoleGuard/roleGuard instead.
export function managementCapabilityGuard(capabilityKey) {
  return async (req, res, next) => {
    if (req.user?.role === "Admin") return next();
    if (!(await isManagementRole(req.user?.role))) return next();
    if (!(await managementCanUse(req.user.role, capabilityKey))) {
      return res.status(403).json({ error: "This feature isn't enabled for your role" });
    }
    next();
  };
}
