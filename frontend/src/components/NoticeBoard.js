"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatDateDMY } from "@/lib/format";

// Read-only list of Admin-posted notices and meeting links, newest first.
// Shown on every employee's account.
export default function NoticeBoard() {
  const [notices, setNotices] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/notices")
      .then((data) => setNotices(data.notices))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-slate-600">Loading...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  if (notices.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">
        No notices posted yet.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {notices.map((n) => (
        <li key={n._id} className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-900">{n.title}</h3>
            <span className="shrink-0 text-xs text-slate-500">{formatDateDMY(n.date)}</span>
          </div>
          {n.body && <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{n.body}</p>}
          {n.link && (
            <a
              href={n.link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm font-medium text-violet-700 underline"
            >
              Join meeting link
            </a>
          )}
          {n.createdBy && <p className="mt-2 text-xs text-slate-400">Posted by {n.createdBy.name}</p>}
        </li>
      ))}
    </ul>
  );
}
