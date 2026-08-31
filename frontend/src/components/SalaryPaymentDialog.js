"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { currency, MONTH_NAMES } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/roles";

export default function SalaryPaymentDialog({ salary, onClose, onCredited }) {
  const editing = salary.credited;
  const [me, setMe] = useState(null);
  const [amount, setAmount] = useState(
    String(editing && salary.amountCredited != null ? salary.amountCredited : salary.salaryPayable)
  );
  const [remark, setRemark] = useState(salary.remark ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch("/auth/me")
      .then((data) => setMe(data.user))
      .catch(() => setMe(null));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiFetch(`/salaries/${salary.id}/credit`, {
        method: "PATCH",
        body: JSON.stringify({ credited: true, amountCredited: Number(amount), remark: remark.trim() }),
      });
      onCredited();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/30 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 className="mb-1 text-lg font-semibold text-slate-900">
          {editing ? "Edit salary payment" : "Record salary payment"}
        </h2>
        <p className="mb-4 text-xs text-slate-500">
          {salary.user.name} ({salary.user.employeeId}) — {MONTH_NAMES[salary.month - 1]} {salary.year}
        </p>

        <label className="mb-1 block text-xs font-medium text-slate-700">Credited by</label>
        <div className="mb-3 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          {me ? `${me.name} (${ROLE_LABELS[me.role] ?? me.role})` : "Loading..."}
        </div>

        <label className="mb-1 block text-xs font-medium text-slate-700">Amount credited</label>
        <input
          type="number"
          required
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mb-1 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
        />
        <p className="mb-3 text-xs text-slate-500">Computed salary payable: {currency(salary.salaryPayable)}</p>

        <label className="mb-1 block text-xs font-medium text-slate-700">
          Remark <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <textarea
          rows={2}
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          placeholder="e.g. paid via bank transfer, advance adjusted"
          className="mb-3 w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
        />

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded px-4 py-2 text-sm text-slate-600">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : editing ? "Save changes" : "Confirm credit"}
          </button>
        </div>
      </form>
    </div>
  );
}
