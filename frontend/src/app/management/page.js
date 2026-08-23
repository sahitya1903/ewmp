"use client";

import { useEffect, useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import AccountMenu from "@/components/AccountMenu";
import { apiFetch } from "@/lib/api";
import { ROLE_NAMES, ROLE_LABELS } from "@/lib/roles";

const EMPTY_FORM = {
  employeeId: "",
  name: "",
  email: "",
  password: "",
  role: ROLE_NAMES[0],
  phone: "",
  monthlySalary: "",
  joiningDate: "",
};

function ManagementConsole() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadEmployees() {
    setLoading(true);
    setListError("");
    try {
      const data = await apiFetch("/employees");
      setEmployees(data.employees);
    } catch (err) {
      setListError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  function openCreateForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setFormOpen(true);
  }

  function openEditForm(emp) {
    setEditingId(emp.id);
    setForm({
      employeeId: emp.employeeId,
      name: emp.name,
      email: emp.email,
      password: "",
      role: emp.role,
      phone: emp.phone ?? "",
      monthlySalary: emp.monthlySalary != null ? String(emp.monthlySalary) : "",
      joiningDate: emp.joiningDate ? emp.joiningDate.slice(0, 10) : "",
    });
    setFormError("");
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
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
      if (editingId) {
        await apiFetch(`/employees/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/employees", {
          method: "POST",
          body: JSON.stringify({ ...payload, employeeId: form.employeeId }),
        });
      }
      closeForm();
      await loadEmployees();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(emp) {
    if (!confirm(`Delete ${emp.name}? This cannot be undone.`)) return;
    setListError("");
    try {
      await apiFetch(`/employees/${emp.id}`, { method: "DELETE" });
      await loadEmployees();
    } catch (err) {
      setListError(err.message);
    }
  }

  return (
    <>
      <AccountMenu />
      <main className="mx-auto max-w-5xl p-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Employees</h1>
        <button
          onClick={openCreateForm}
          className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Add employee
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
                <th className="px-4 py-2 font-medium">Role</th>
                <th className="px-4 py-2 font-medium">Phone</th>
                <th className="px-4 py-2 font-medium">Monthly salary</th>
                <th className="px-4 py-2 font-medium">Joining date</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{emp.employeeId}</td>
                  <td className="px-4 py-2">{emp.name}</td>
                  <td className="px-4 py-2">{emp.email}</td>
                  <td className="px-4 py-2">{ROLE_LABELS[emp.role] ?? emp.role}</td>
                  <td className="px-4 py-2">{emp.phone}</td>
                  <td className="px-4 py-2">{emp.monthlySalary}</td>
                  <td className="px-4 py-2">
                    {emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-2">{emp.isActive ? "Active" : "Inactive"}</td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button onClick={() => openEditForm(emp)} className="mr-3 text-slate-600 underline">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(emp)} className="text-red-600 underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-slate-500">
                    No employees yet.
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
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              {editingId ? "Edit employee" : "Add employee"}
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Employee ID</label>
                <input
                  required
                  disabled={Boolean(editingId)}
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900 disabled:bg-slate-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">Role</label>
                <select
                  required
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-900"
                >
                  {ROLE_NAMES.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              </div>

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
                  {editingId ? "Reset password (optional)" : "Password"}
                </label>
                <input
                  type="password"
                  required={!editingId}
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
      </main>
    </>
  );
}

export default function ManagementPage() {
  return (
    <RoleGuard allowedRoles={["Management"]}>
      <ManagementConsole />
    </RoleGuard>
  );
}
