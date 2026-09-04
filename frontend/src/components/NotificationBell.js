"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { timeAgo } from "@/lib/format";

const POLL_MS = 30000;

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export default function NotificationBell() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch("/notifications");
      setItems(data.notifications);
      setUnread(data.unreadCount);
    } catch {
      /* offline / not logged in — leave state as is */
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  async function markAll() {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
    await apiFetch("/notifications/read-all", { method: "POST" }).catch(() => {});
  }

  async function handleClick(n) {
    if (!n.isRead) {
      setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
      setUnread((u) => Math.max(u - 1, 0));
      await apiFetch(`/notifications/${n._id}/read`, { method: "PATCH" }).catch(() => {});
    }
    if (n.link) window.open(n.link, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex text-slate-600 hover:text-slate-900"
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
      >
        <BellIcon />
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-medium text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-[calc(100vw-2rem)] max-w-80 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
              <span className="text-sm font-semibold text-slate-900">Notifications</span>
              {unread > 0 && (
                <button type="button" onClick={markAll} className="text-xs text-slate-500 underline hover:text-slate-700">
                  Mark all read
                </button>
              )}
            </div>
            <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
              {items.length === 0 && (
                <li className="px-3 py-8 text-center text-sm text-slate-500">You&apos;re all caught up.</li>
              )}
              {items.map((n) => (
                <li key={n._id}>
                  <button
                    type="button"
                    onClick={() => handleClick(n)}
                    className={`flex w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-slate-50 ${
                      n.isRead ? "" : "bg-slate-50"
                    }`}
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.isRead ? "bg-transparent" : "bg-red-500"}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-slate-700">{n.message}</span>
                      <span className="mt-0.5 block text-xs text-slate-400">
                        {timeAgo(n.createdAt)}
                        {n.link ? " · opens link" : ""}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
