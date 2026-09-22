"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatDateDMY } from "@/lib/format";
import FollowUpThread from "@/components/FollowUpThread";

// Employee-facing: active follow-up requests on any of your work updates, with a
// reply box while a request is unanswered. Closed threads are hidden behind a
// toggle.
export default function MyFollowUps() {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showClosed, setShowClosed] = useState(false);
  const [replyFor, setReplyFor] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  function load() {
    return Promise.resolve()
      .then(() => setLoading(true))
      .then(() => apiFetch("/daily-work-updates/follow-ups?includeClosed=1"))
      .then((data) => setUpdates(data.updates))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
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

  const open = updates.filter((u) => !u.followUpClosed);
  const closed = updates.filter((u) => u.followUpClosed);

  // Nothing to show until there's at least one follow-up — keep the dashboard clean.
  if (loading || updates.length === 0) return null;

  const shown = showClosed ? [...open, ...closed] : open;

  return (
    <div className="mb-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 className="text-sm font-semibold text-slate-900">
          Follow-up requests{open.length > 0 ? ` (${open.length} active)` : ""}
        </h2>
        {closed.length > 0 && (
          <button onClick={() => setShowClosed((v) => !v)} className="text-xs text-slate-500 underline">
            {showClosed ? "Hide past follow-ups" : `Show past follow-ups (${closed.length})`}
          </button>
        )}
      </div>

      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      {shown.length === 0 ? (
        <p className="text-sm text-slate-500">No active follow-up requests.</p>
      ) : (
        <ul className="space-y-3">
          {shown.map((u) => (
            <li
              key={u.id}
              className={`rounded-lg border bg-white p-4 ${
                u.followUpClosed
                  ? "border-slate-200 opacity-70"
                  : u.awaitingResponse
                    ? "border-amber-300 ring-1 ring-amber-200"
                    : "border-slate-200"
              }`}
            >
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                <span className="min-w-0 wrap-break-word text-sm font-medium text-slate-900">{u.todaysTask}</span>
                <span className="shrink-0 text-xs text-slate-500">
                  {formatDateDMY(u.date)} {u.slot === "start" ? "start-of-day" : "end-of-day"} update
                  {u.followUpClosed && " · closed"}
                </span>
              </div>

              <FollowUpThread entries={u.followUps} />

              {!u.followUpClosed &&
                u.awaitingResponse &&
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
      )}
    </div>
  );
}
