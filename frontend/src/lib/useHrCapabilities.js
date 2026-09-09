"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

// Admin's view: which console capabilities HR currently has.
export function useHrCapabilities() {
  const [enabledCapabilities, setEnabledCapabilities] = useState([]);
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
      .then(() => apiFetch("/hr-capabilities"))
      .then((data) => setEnabledCapabilities(data.enabledCapabilities))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  return { enabledCapabilities, loading, error, reload: load };
}
