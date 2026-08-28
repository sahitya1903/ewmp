"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { ROLE_LABELS } from "@/lib/roles";

function emptyForm(defaultRole) {
  return {
    name: "",
    email: "",
    password: "",
    role: defaultRole,
    phone: "",
    monthlySalary: "",
    joiningDate: "",
  };
}

export default function PeopleManager({ heading, addButtonLabel, roleOptions, filterPredicate }) {
  const [people, setPeople] = useState([]);
  const [balancesByUserId, setBalancesByUserId] = useState({});
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm(roleOptions[0]));
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setListError("");
    try {
      const [employeesData, balancesData] = await Promise.all([
        apiFetch("/employees"),
        apiFetch("/leave-requests/balances"),
      ]);
      setPeople(employeesData.employees.filter(filterPredicate));
      const map = {};
      for (const b of balancesData.balances) {
        map[b.user.id] = b;
      }
      setBalancesByUserId(map);
    } catch (err) {
      setListError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreateForm() {
    setEditing(null);
    setForm(emptyForm(roleOptions[0]));
    setFormError("");
    setFormOpen(true);
  }

  function openEditForm(person) {
    setEditing(person);
    setForm({
      name: person.name,
      email: person.email,
      password: "",
      role: person.role,
      phone: person.phone ?? "",
      monthlySalary: person.monthlySalary != null ? String(person.monthlySalary) : "",
      joiningDate: person.joiningDate ? person.joiningDate.slice(0, 10) : "",
    });
    setFormError("");
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError("");

    const payload = {
      name: form.name,
      email: form.email,
      role: form.role,
      phone: form.phone,
      monthlySalary: Number(form.monthlySalary),
      joiningDate: form.joiningDate,
    };
    if (form.password) payload.password = form.password;

    try {
      if (editing) {
        await apiFetch(`/employees/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/employees", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      closeForm();
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(person) {
    if (!confirm(`Delete ${person.name}? This cannot be undone.`)) return;
    setListError("");
    try {
      await apiFetch(`/employees/${person.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setListError(err.message);
    }
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">{heading}</h2>
        <button onClick={openCreateForm} className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white">
          {addButtonLabel}
        </button>
      </div>

      {listError && <p className="mb-4 text-sm text-red-600">{listError}</p>}

      {loading ? (
        <p className="text-sm text-slate-600">Loading...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-2 font-medium">Employee ID</th>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Email</th>
                {roleOptions.length > 1 && <th className="px-4 py-2 font-medium">Role</th>}
                <th className="px-4 py-2 font-medium">Phone</th>
                <th className="px-4 py-2 font-medium">Monthly salary</th>
                <th className="px-4 py-2 font-medium">Joining date</th>
                <th className="px-4 py-2 font-medium">Paid leave left</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {people.map((person) => (
                <tr key={person.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{person.employeeId}</td>
                  <td className="px-4 py-2">{person.name}</td>
                  <td className="px-4 py-2">{person.email}</td>
                  {roleOptions.length > 1 && (
                    <td className="px-4 py-2">{ROLE_LABELS[person.role] ?? person.role}</td>
                  )}
                  <td className="px-4 py-2">{person.phone}</td>
                  <td className="px-4 py-2">{person.monthlySalary}</td>
                  <td className="px-4 py-2">
                    {person.joiningDate ? new Date(person.joiningDate).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-2">
                    {balancesByUserId[person.id]
                      ? `${balancesByUserId[person.id].remaining} / ${balancesByUserId[person.id].quota}`
                      : "—"}
                  </td>
                  <td className="px-4 py-2">{person.isActive ? "Active" : "Inactive"}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button onClick={() => openEditForm(person)} className="mr-3 text-slate-600 underline">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(person)} className="text-red-600 underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {people.length === 0 && (
                <tr>
                  <td colSpan={roleOptions.length > 1 ? 10 : 9} className="px-4 py-6 text-center text-slate-500">
                    None yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/30 p-4">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="mb-1 text-lg font-semibold text-slate-900">
              {editing ? `Edit ${heading.toLowerCase().replace(/s$/, "")}` : addButtonLabel}
            </h2>
            {editing && <p className="mb-4 text-xs text-slate-500">Employee ID: {editing.employeeId}</p>}
            {!editing && <div className="mb-4" />}

            <div className="grid grid-cols-2 gap-3">
              {roleOptions.length > 1 && (
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-medium text-slate-700">Role</label>
                  <select
                    required
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role] ?? role}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-700">Name</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </div>

              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </div>

              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  {editing ? "Reset password (optional)" : "Password"}
                </label>
                <input
                  type="password"
                  required={!editing}
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Phone</label>
                <input
                  required
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Monthly salary</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={form.monthlySalary}
                  onChange={(e) => setForm({ ...form, monthlySalary: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </div>

              <div className="col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-700">Joining date</label>
                <input
                  type="date"
                  required
                  value={form.joiningDate}
                  onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
                />
              </div>
            </div>

            {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}

            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={closeForm} className="rounded px-4 py-2 text-sm text-slate-600">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
