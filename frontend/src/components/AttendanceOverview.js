"use client";

import { useEffect, useState } from "react";
import MonthCalendar, { toDateKey } from "@/components/MonthCalendar";
import HolidayManager from "@/components/HolidayManager";
import NoticeBoard from "@/components/NoticeBoard";
import StatTile from "@/components/StatTile";
import { apiFetch } from "@/lib/api";
import { thisMonth, addMonths, today } from "@/lib/month";

// Today's headcount snapshot plus the holiday calendar — shared by Admin and
// HR so both see and manage the same working-day calendar the same way.
export default function AttendanceOverview() {
  const [employeeCount, setEmployeeCount] = useState(0);
  const [presentToday, setPresentToday] = useState(0);
  const [noUpdateToday, setNoUpdateToday] = useState(0);
  const [leaveToday, setLeaveToday] = useState(0);
  const [absentToday, setAbsentToday] = useState(0);
  const [error, setError] = useState("");

  const [cursor, setCursor] = useState(thisMonth());
  const [entriesByDate, setEntriesByDate] = useState({});

  useEffect(() => {
    const { year, month } = thisMonth();
    const todayKey = toDateKey(today());

    Promise.all([apiFetch("/employees"), apiFetch(`/attendance?month=${month}&year=${year}`)])
      .then(([employeesData, attendanceData]) => {
        const total = employeesData.employees.length;
        const todaysRecords = attendanceData.attendance.filter((a) => toDateKey(a.date) === todayKey);
        const present = todaysRecords.filter((a) => a.status === "Present").length;
        const absent = todaysRecords.filter((a) => a.status === "Absent").length;
        const onLeave = todaysRecords.filter((a) => a.status === "Leave").length;

        setEmployeeCount(total);
        setPresentToday(present);
        setAbsentToday(absent);
        setLeaveToday(onLeave);
        // Present is only counted from an actual record — marked by an admin, or
        // created automatically when the employee submits today's work update.
        // Anyone with no record yet today falls in here, not silently into Present.
        setNoUpdateToday(Math.max(total - present - absent - onLeave, 0));
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    Promise.all([apiFetch(`/holidays?year=${cursor.year}`), apiFetch(`/notices?year=${cursor.year}`)])
      .then(([holidayData, noticeData]) => {
        const map = {};
        for (const h of holidayData.holidays) {
          if (new Date(h.date).getUTCMonth() + 1 === cursor.month) {
            map[toDateKey(h.date)] = { type: "holiday", label: h.name };
          }
        }
        for (const n of noticeData.notices) {
          const key = toDateKey(n.date);
          if (new Date(n.date).getUTCMonth() + 1 === cursor.month && !map[key]) {
            map[key] = { type: "notice", label: n.title };
          }
        }
        setEntriesByDate(map);
      })
      .catch(() => setEntriesByDate({}));
  }, [cursor]);

  function prevMonth() {
    setCursor((c) => addMonths(c, -1));
  }
  function nextMonth() {
    setCursor((c) => addMonths(c, 1));
  }

  return (
    <div>
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatTile label="Employees" value={employeeCount} />
        <StatTile label="Present today" value={presentToday} />
        <StatTile label="No update yet" value={noUpdateToday} />
        <StatTile label="On leave today" value={leaveToday} />
        <StatTile label="Absent today" value={absentToday} />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Holidays</h2>
          <HolidayManager />
        </section>
        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Calendar</h2>
          <MonthCalendar
            year={cursor.year}
            month={cursor.month}
            onPrev={prevMonth}
            onNext={nextMonth}
            entriesByDate={entriesByDate}
            legend={[
              { type: "holiday", label: "Holiday" },
              { type: "notice", label: "Notice / Meeting" },
            ]}
          />
        </section>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Notices &amp; Meetings</h2>
        <NoticeBoard />
      </section>
    </div>
  );
}
