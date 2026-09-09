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

  // The loading/error reset lives inside the promise chain (not synchronously
  // before it) so this is safe to call directly from an effect.
  function load() {
    return Promise.resolve()
      .then(() => {
        setLoading(true);
        setError("");
      })
      .then(() => apiFetch(`/salaries?month=${month}&year=${year}`))
      .then((data) => setSalaries(data.salaries))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  return { salaries, loading, error, reload: load };
}
