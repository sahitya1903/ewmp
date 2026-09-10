"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

// Categories = the two built-ins ("management" / "employee") plus any custom
// ones a management role with the "manageRoles" capability has added. Each
// entry is { name, baseType, isBuiltIn }.
export function useCategories() {
  const [categories, setCategories] = useState([]);
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
      .then(() => apiFetch("/categories"))
      .then((data) => setCategories(data.categories))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  return { categories, loading, error, reload: load };
}
