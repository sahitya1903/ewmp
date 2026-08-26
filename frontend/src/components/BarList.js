"use client";

// Horizontal bar list: value always labeled outside the bar (never clipped),
// square baseline / rounded tip per mark spec, legend always present since
// each row is its own categorical series.
export default function BarList({ data, formatValue = (v) => v.toLocaleString(), emptyLabel = "No data yet." }) {
  if (!data.length) {
    return <p className="text-sm text-slate-500">{emptyLabel}</p>;
  }

  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div>
      <div className="space-y-3">
        {data.map((d) => (
          <div key={d.label} className="flex items-center gap-3">
            <div className="w-44 shrink-0 truncate text-xs text-slate-600" title={d.label}>
              {d.label}
            </div>
            <div className="h-4 flex-1 overflow-hidden rounded bg-slate-100">
              <div
                className="h-4 rounded-r"
                style={{ width: `${(d.value / max) * 100}%`, backgroundColor: d.color }}
                title={`${d.label}: ${formatValue(d.value)}`}
              />
            </div>
            <div className="w-16 shrink-0 text-right text-xs font-medium text-slate-700">
              {formatValue(d.value)}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
        {data.map((d) => (
          <span key={d.label} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
