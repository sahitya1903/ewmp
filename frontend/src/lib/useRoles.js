"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

// Roles = the built-in set plus any custom roles Admin/Management have added.
export function useRoles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/roles");
      setRoles(data.roles);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return { roles, loading, error, reload: load };
}
