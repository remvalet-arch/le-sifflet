"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";

/**
 * Manages preferred competition IDs with optimistic API sync.
 * @param initial - UUIDs from profile.preferred_competitions (server-rendered)
 */
export function usePreferredCompetitions(initial: string[]) {
  const [preferences, setPreferencesState] = useState<string[]>(initial);
  const currentRef = useRef<string[]>(initial);

  const setPreferences = useCallback(async (ids: string[]) => {
    const prev = currentRef.current;
    currentRef.current = ids;
    setPreferencesState(ids); // optimistic
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferred_competitions: ids }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) {
        currentRef.current = prev;
        setPreferencesState(prev); // rollback
        toast.error(json.error ?? "Impossible de sauvegarder les préférences");
      }
    } catch {
      currentRef.current = prev;
      setPreferencesState(prev); // rollback
      toast.error("Connexion perdue");
    }
  }, []);

  return { preferences, setPreferences };
}
