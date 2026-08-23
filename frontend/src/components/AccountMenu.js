"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function AccountMenu() {
  const router = useRouter();

  async function handleLogout() {
    await apiFetch("/auth/logout", { method: "POST" }).catch(() => {});
    router.push("/login");
  }

  return (
    <div className="flex items-center justify-end gap-4 border-b border-slate-200 bg-white px-10 py-3 text-sm">
      <Link href="/change-password" className="text-slate-600 underline">
        Change password
      </Link>
      <button onClick={handleLogout} className="text-slate-600 underline">
        Log out
      </button>
    </div>
  );
}
