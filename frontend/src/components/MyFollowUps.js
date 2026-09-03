"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";
import FollowUpThread from "@/components/FollowUpThread";

// Employee-facing: every one of your work updates that a reviewer has left a
// follow-up on, with a reply box while a request is still unanswered.
export default function MyFollowUps() {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [replyFor, setReplyFor] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await apiFetch("/daily-work-updates/follow-ups");
      setUpdates(data.updates);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function sendReply(id) {
    setSending(true);
    setError("");
    try {
      await apiFetch(`/daily-work-updates/${id}/follow-up-response`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      setReplyFor(null);
      setText("");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  // Nothing to show until there's at least one follow-up — keep the dashboard clean.
  if (loading || updates.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="mb-3 text-sm font-semibold text-slate-900">Follow-up requests</h2>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <ul className="space-y-3">
        {updates.map((u) => (
          <li
            key={u.id}
            className={`rounded-lg border bg-white p-4 ${
              u.awaitingResponse ? "border-amber-300 ring-1 ring-amber-200" : "border-slate-200"
            }`}
          >
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-slate-900">{u.currentProject}</span>
              <span className="text-xs text-slate-500">{formatDate(u.date)} update</span>
            </div>

            <FollowUpThread entries={u.followUps} />

            {u.awaitingResponse &&
              (replyFor === u.id ? (
                <div className="mt-2 flex flex-col gap-2">
                  <textarea
                    rows={2}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Your reply…"
                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs text-slate-900"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => sendReply(u.id)}
                      disabled={sending || !text.trim()}
                      className="rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                    >
                      {sending ? "Sending…" : "Send reply"}
                    </button>
                    <button onClick={() => setReplyFor(null)} className="px-2 py-1 text-xs text-slate-600">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setReplyFor(u.id);
                    setText("");
                  }}
                  className="mt-2 rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
                >
                  Reply
                </button>
              ))}
          </li>
        ))}
      </ul>
    </div>
  );
}
