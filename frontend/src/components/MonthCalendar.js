"use client";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function dateKey(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function toDateKey(value) {
  const d = new Date(value);
  return dateKey(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

function buildMonthGrid(year, month) {
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const startWeekday = firstDay.getUTCDay();

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

const ENTRY_STYLES = {
  holiday: "border-amber-300 bg-amber-50 text-amber-800",
  leave: "border-blue-300 bg-blue-50 text-blue-800",
  present: "border-emerald-300 bg-emerald-50 text-emerald-800",
  absent: "border-red-300 bg-red-50 text-red-800",
  notice: "border-violet-300 bg-violet-50 text-violet-800",
  weeklyOff: "border-slate-300 bg-slate-100 text-slate-600",
};

const WEEKLY_OFF_ENTRY = { type: "weeklyOff", label: "Weekly Off" };
const WEEKLY_OFF_DAY = 1; // Monday — matches backend/src/lib/workingDays.js's isWeeklyOff

export default function MonthCalendar({ year, month, onPrev, onNext, entriesByDate = {}, legend }) {
  const weeks = buildMonthGrid(year, month);
  const fullLegend = legend ? [...legend, WEEKLY_OFF_ENTRY] : legend;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrev}
          className="rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
        >
          ← Prev
        </button>
        <h3 className="text-sm font-semibold text-slate-900">
          {MONTH_NAMES[month - 1]} {year}
        </h3>
        <button
          type="button"
          onClick={onNext}
          className="rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
        >
          Next →
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weeks.flatMap((week, wi) =>
          week.map((day, di) => {
            if (day === null) return <div key={`${wi}-${di}`} />;
            const key = dateKey(year, month, day);
            const isWeeklyOff = new Date(Date.UTC(year, month - 1, day)).getUTCDay() === WEEKLY_OFF_DAY;
            const entry = entriesByDate[key] ?? (isWeeklyOff ? WEEKLY_OFF_ENTRY : undefined);
            return (
              <div
                key={key}
                title={entry?.label}
                className={`flex h-16 min-w-0 flex-col items-start overflow-hidden rounded border p-1 text-left text-xs ${
                  entry ? ENTRY_STYLES[entry.type] : "border-slate-100"
                }`}
              >
                <span className="font-medium text-slate-700">{day}</span>
                {entry && (
                  <span className="mt-auto block w-full truncate text-[10px] leading-tight">{entry.label}</span>
                )}
              </div>
            );
          })
        )}
      </div>

      {fullLegend && (
        <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-500">
          {fullLegend.map((item) => (
            <span key={item.type} className="flex items-center gap-1">
              <span className={`h-2 w-2 rounded-full border ${ENTRY_STYLES[item.type]}`} />
              {item.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
