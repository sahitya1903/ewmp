"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

// Pass allowedRoles (only these exact roles get in), deniedRoles (everyone
// except these roles gets in), deniedCategories (blocks a whole category —
// "management" or "employee" — including any custom role in it, without
// needing to know every role name ahead of time), or neither (any
// authenticated user gets in).
export default function RoleGuard({ allowedRoles, deniedRoles, deniedCategories, children }) {
  const router = useRouter();
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let cancelled = false;

    apiFetch("/auth/me")
      .then(({ user }) => {
        if (cancelled) return;
        const allowed = deniedCategories
          ? !deniedCategories.includes(user.category)
          : deniedRoles
          ? !deniedRoles.includes(user.role)
          : allowedRoles
          ? allowedRoles.includes(user.role)
          : true;
        if (!allowed) {
          router.replace("/login");
          return;
        }
        setStatus("ok");
      })
      .catch(() => {
        if (!cancelled) router.replace("/login");
      });

    return () => {
      cancelled = true;
    };
  }, [allowedRoles, deniedRoles, deniedCategories, router]);

  if (status !== "ok") return null;
  return children;
}
