"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import NotificationBell from "@/components/NotificationBell";

export default function AccountMenu() {
  const router = useRouter();
  const [name, setName] = useState("");

  useEffect(() => {
    let cancelled = false;
    apiFetch("/auth/me")
      .then((data) => {
        if (!cancelled) setName(data.user.name);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogout() {
    await apiFetch("/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/login");
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-slate-200 bg-white px-4 py-3 text-sm sm:px-10">
      <span className="min-w-0 truncate text-slate-700">{name ? `Welcome, ${name}` : ""}</span>
      <div className="flex items-center gap-3 sm:gap-4">
        <NotificationBell />
        <Link href="/change-password" className="whitespace-nowrap text-slate-600 underline">
          Change password
        </Link>
        <button onClick={handleLogout} className="whitespace-nowrap text-slate-600 underline">
          Log out
        </button>
      </div>
    </div>
  );
}
