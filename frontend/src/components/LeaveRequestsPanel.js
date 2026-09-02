"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";

const STATUS_STYLES = {
  Pending: "bg-amber-50 text-amber-800 border-amber-300",
  Approved: "bg-emerald-50 text-emerald-800 border-emerald-300",
  Rejected: "bg-red-50 text-red-800 border-red-300",
};

export default function LeaveRequestsPanel() {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [actingId, setActingId] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const query = statusFilter ? `?status=${statusFilter}` : "";
      const data = await apiFetch(`/leave-requests${query}`);
      setLeaveRequests(data.leaveRequests);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function review(id, status) {
    setActingId(id);
    setError("");
    try {
      await apiFetch(`/leave-requests/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActingId(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        {["Pending", "Approved", "Rejected", ""].map((s) => (
          <button
            key={s || "all"}
            onClick={() => setStatusFilter(s)}
            className={`rounded px-3 py-1.5 text-sm ${
              statusFilter === s ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-600">Loading...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-2 font-medium">Employee</th>
                <th className="px-4 py-2 font-medium">From</th>
                <th className="px-4 py-2 font-medium">To</th>
                <th className="px-4 py-2 font-medium">Reason</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {leaveRequests.map((lr) => (
                <tr key={lr._id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{lr.user?.name ?? "—"}</td>
                  <td className="px-4 py-2">{formatDate(lr.fromDate)}</td>
                  <td className="px-4 py-2">{formatDate(lr.toDate)}</td>
                  <td className="px-4 py-2">{lr.reason}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded border px-2 py-0.5 text-xs ${STATUS_STYLES[lr.status]}`}>
                      {lr.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    {lr.status === "Pending" && (
                      <>
                        <button
                          disabled={actingId === lr._id}
                          onClick={() => review(lr._id, "Approved")}
                          className="mr-3 text-emerald-700 underline disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          disabled={actingId === lr._id}
                          onClick={() => review(lr._id, "Rejected")}
                          className="text-red-600 underline disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {leaveRequests.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    No leave requests here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
