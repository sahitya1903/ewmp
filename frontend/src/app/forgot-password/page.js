"use client";

import { useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [devUrl, setDevUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setDevUrl("");
    setLoading(true);

    try {
      const data = await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setMessage(data.message);
      if (data.devResetUrl) setDevUrl(data.devResetUrl);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-xl font-semibold text-slate-900">Forgot password</h1>
        <p className="mb-6 text-sm text-slate-600">
          Enter your work email and we&apos;ll send you a link to reset your password.
        </p>

        <form onSubmit={handleSubmit}>
          <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-4 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />

          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
          {message && <p className="mb-4 text-sm text-emerald-700">{message}</p>}
          {devUrl && (
            <p className="mb-4 break-all text-xs text-slate-500">
              Dev only (no email provider configured) — reset link:{" "}
              <a href={devUrl} className="underline">
                {devUrl}
              </a>
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-slate-900 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-600">
          <Link href="/login" className="underline">
            Back to login
          </Link>
        </p>
      </div>
    </main>
  );
}
