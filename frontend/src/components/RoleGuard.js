"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function RoleGuard({ allowedRoles, children }) {
  const router = useRouter();
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    let cancelled = false;

    apiFetch("/auth/me")
      .then(({ user }) => {
        if (cancelled) return;
        if (!allowedRoles.includes(user.role)) {
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
  }, [allowedRoles, router]);

  if (status !== "ok") return null;
  return children;
}
