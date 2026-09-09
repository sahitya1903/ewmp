"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

// Roles = the built-in set plus any custom roles a management role with the
// "manageRoles" capability has added. Each entry is { name, category }.
export function useRoles() {
  const [roles, setRoles] = useState([]);
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
      .then(() => apiFetch("/roles"))
      .then((data) => setRoles(data.roles))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  return { roles, loading, error, reload: load };
}
