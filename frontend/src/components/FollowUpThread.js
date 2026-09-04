"use client";

import { formatDateDMY } from "@/lib/format";

// Renders a work-update follow-up thread: reviewer "request" lines and employee
// "response" lines, in order.
export default function FollowUpThread({ entries }) {
  if (!entries?.length) return null;
  return (
    <ul className="space-y-1.5">
      {entries.map((f, i) => (
        <li
          key={i}
          className={`rounded px-2 py-1 text-xs ${
            f.kind === "request" ? "bg-amber-50" : "bg-emerald-50"
          }`}
        >
          <span className={`font-medium ${f.kind === "request" ? "text-amber-800" : "text-emerald-800"}`}>
            {f.kind === "request" ? "Follow-up requested" : "Employee replied"}
            {f.by ? ` · ${f.by}` : ""}
          </span>
          <span className="ml-1 text-slate-400">{formatDateDMY(f.at)}</span>
          <p className="mt-0.5 whitespace-pre-line text-slate-700">{f.text}</p>
        </li>
      ))}
    </ul>
  );
}
