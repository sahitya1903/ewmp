"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { thisMonth } from "@/lib/month";

export function useMonthYear() {
  const now = thisMonth();
  const [month, setMonth] = useState(now.month);
  const [year, setYear] = useState(now.year);
  return { month, setMonth, year, setYear };
}

export function useSalaries(month, year) {
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch(`/salaries?month=${month}&year=${year}`);
      setSalaries(data.salaries);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  return { salaries, loading, error, reload: load };
}
