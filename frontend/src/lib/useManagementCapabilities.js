"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

// Admin's view: HR and Accounts (they have similar permission shapes, so
// they're configured together) and their currently granted capabilities.
export function useManagementCapabilities() {
  const [roleCapabilities, setRoleCapabilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    return Promise.resolve()
      .then(() => {
        setLoading(true);
        setError("");
      })
      .then(() => apiFetch("/management-capabilities"))
      .then((data) => setRoleCapabilities(data.roleCapabilities))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  return { roleCapabilities, loading, error, reload: load };
}
