"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

function currentYear() {
  return new Date().getFullYear();
}

// Shared by Admin and HR so both can keep the holiday list up to date.
export default function HolidayManager() {
  const [holidays, setHolidays] = useState([]);
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const year = currentYear();

  async function load() {
    try {
      const data = await apiFetch(`/holidays?year=${year}`);
      setHolidays(data.holidays);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiFetch("/holidays", { method: "POST", body: JSON.stringify({ date, name }) });
      setDate("");
      setName("");
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
      await apiFetch(`/holidays/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <form onSubmit={handleAdd} className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Date</label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Name</label>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Add holiday
        </button>
      </form>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <ul className="divide-y divide-slate-100 text-sm">
        {holidays.map((h) => (
          <li key={h._id} className="flex items-center justify-between py-2">
            <span>
              {new Date(h.date).toLocaleDateString()} — {h.name}
            </span>
            <button onClick={() => handleDelete(h._id)} className="text-red-600 underline">
              Remove
            </button>
          </li>
        ))}
        {holidays.length === 0 && <li className="py-2 text-slate-500">No holidays added for {year} yet.</li>}
      </ul>
    </div>
  );
}
