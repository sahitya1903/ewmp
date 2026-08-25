"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

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
    <div className="flex items-center justify-between border-b border-slate-200 bg-white px-10 py-3 text-sm">
      <span className="text-slate-700">{name ? `Welcome, ${name}` : ""}</span>
      <div className="flex items-center gap-4">
        <Link href="/change-password" className="text-slate-600 underline">
          Change password
        </Link>
        <button onClick={handleLogout} className="text-slate-600 underline">
          Log out
        </button>
      </div>
    </div>
  );
}
