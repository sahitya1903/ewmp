"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatDateLong } from "@/lib/format";

function toDateInput(value) {
  return new Date(value).toISOString().slice(0, 10);
}

const EMPTY = { title: "", date: "", link: "", body: "" };

// Admin-only: post, edit, or remove a meeting link or notice that every
// employee sees on their account and on the calendar.
export default function NoticeManager() {
  const [notices, setNotices] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const data = await apiFetch("/notices");
      setNotices(data.notices);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(n) {
    setEditingId(n._id);
    setForm({ title: n.title, date: toDateInput(n.date), link: n.link ?? "", body: n.body ?? "" });
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY);
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (editingId) {
        await apiFetch(`/notices/${editingId}`, { method: "PATCH", body: JSON.stringify(form) });
      } else {
        await apiFetch("/notices", { method: "POST", body: JSON.stringify(form) });
      }
      cancelEdit();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    setError("");
    try {
      await apiFetch(`/notices/${id}`, { method: "DELETE" });
      if (editingId === id) cancelEdit();
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Title</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. All-hands meeting"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Date</label>
            <input
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </div>
        </div>

        <label className="mt-3 mb-1 block text-xs font-medium text-slate-700">
          Meeting link <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <input
          type="url"
          value={form.link}
          onChange={(e) => setForm({ ...form, link: e.target.value })}
          placeholder="https://meet.google.com/..."
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
        />

        <label className="mt-3 mb-1 block text-xs font-medium text-slate-700">
          Details <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <textarea
          rows={2}
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
        />

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-3 flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : editingId ? "Update notice" : "Post notice"}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit} className="text-sm text-slate-600">
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <ul className="mt-4 space-y-3">
        {notices.map((n) => (
          <li
            key={n._id}
            className={`rounded-lg border bg-white p-4 ${
              editingId === n._id ? "border-slate-900" : "border-slate-200"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="min-w-0 text-sm font-semibold text-slate-900">{n.title}</h3>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-xs text-slate-500">{formatDateLong(n.date)}</span>
                <button onClick={() => startEdit(n)} className="text-xs text-slate-600 underline">
                  Edit
                </button>
                <button onClick={() => handleDelete(n._id)} className="text-xs text-red-600 underline">
                  Delete
                </button>
              </div>
            </div>
            {n.body && <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{n.body}</p>}
            {n.link && (
              <a
                href={n.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block break-all text-sm font-medium text-violet-700 underline"
              >
                {n.link}
              </a>
            )}
          </li>
        ))}
        {notices.length === 0 && <li className="text-sm text-slate-500">No notices posted yet.</li>}
      </ul>
    </div>
  );
}
