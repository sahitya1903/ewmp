"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RoleGuard from "@/components/RoleGuard";
import { apiFetch } from "@/lib/api";

function ChangePasswordForm() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await apiFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setMessage("Password updated. Redirecting to login...");
      await apiFetch("/auth/logout", { method: "POST" }).catch(() => {});
      setTimeout(() => router.push("/login"), 1500);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm"
      >
        <h1 className="mb-6 text-xl font-semibold text-slate-900">Change password</h1>

        <label className="mb-1 block text-sm font-medium text-slate-700">Current password</label>
        <input
          type="password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="mb-4 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
        />

        <label className="mb-1 block text-sm font-medium text-slate-700">New password</label>
        <input
          type="password"
          required
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="mb-4 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
        />

        <label className="mb-1 block text-sm font-medium text-slate-700">Confirm new password</label>
        <input
          type="password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="mb-4 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
        />

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
        {message && <p className="mb-4 text-sm text-emerald-700">{message}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-slate-900 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Updating..." : "Update password"}
        </button>
      </form>
    </main>
  );
}

export default function ChangePasswordPage() {
  return (
    <RoleGuard>
      <ChangePasswordForm />
    </RoleGuard>
  );
}
