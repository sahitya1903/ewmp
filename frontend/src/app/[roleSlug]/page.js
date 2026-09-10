"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import ManagementConsole from "@/components/ManagementConsole";
import { ROLE_LABELS } from "@/lib/roles";
import { slugifyRole } from "@/lib/roleSlug";

// Admin, HR, and Accounts each have their own dedicated page; a custom role
// with a management base type (added via the "Add role" form) has no bespoke
// route, so it lands here instead, at a URL slugged from its name (see
// backend/src/lib/roleSlug.js, which computes the same slug for the login
// redirect). Next.js resolves static routes like /admin ahead of this
// dynamic one, so there's no collision with the pages above.
export default function CustomRoleConsolePage() {
  const params = useParams();
  const router = useRouter();
  const [status, setStatus] = useState("checking");
  const [role, setRole] = useState(null);

  useEffect(() => {
    let cancelled = false;

    apiFetch("/auth/me")
      .then(({ user }) => {
        if (cancelled) return;
        if (user.baseType !== "management" || slugifyRole(user.role) !== params.roleSlug) {
          router.replace("/login");
          return;
        }
        setRole(user.role);
        setStatus("ok");
      })
      .catch(() => {
        if (!cancelled) router.replace("/login");
      });

    return () => {
      cancelled = true;
    };
  }, [params.roleSlug, router]);

  if (status !== "ok") return null;
  return <ManagementConsole title={`${ROLE_LABELS[role] ?? role} Dashboard`} />;
}
