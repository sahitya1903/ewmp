"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

// Per-role feature access, as configured by Admin on the Access Control panel.
export function useRolePermissions() {
  const [permissions, setPermissions] = useState([]);
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
      .then(() => apiFetch("/role-permissions"))
      .then((data) => setPermissions(data.permissions))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  return { permissions, loading, error, reload: load };
}
