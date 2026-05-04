"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  ACTIVE_SQUAD_STORAGE_KEY,
  parseActiveSquad,
  writeActiveSquadToStorage,
  type ActiveSquadPayload,
} from "@/lib/squads/active-squad-storage";

function subscribe(onStoreChange: () => void) {
  const onCustom = () => onStoreChange();
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === ACTIVE_SQUAD_STORAGE_KEY) onStoreChange();
  };
  window.addEventListener("sifflet:active-squad-changed", onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener("sifflet:active-squad-changed", onCustom);
    window.removeEventListener("storage", onStorage);
  };
}

/** Valeur primitive stable pour useSyncExternalStore (évite boucle si on renvoyait un nouvel objet à chaque getSnapshot). */
function getSnapshot(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(ACTIVE_SQUAD_STORAGE_KEY) ?? "";
}

function getServerSnapshot(): string {
  return "";
}

export function useActiveSquad() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const squad = useMemo(
    () => (raw === "" ? null : parseActiveSquad(raw)),
    [raw],
  );

  const setActiveSquad = useCallback((payload: ActiveSquadPayload | null) => {
    writeActiveSquadToStorage(payload);
  }, []);

  return {
    squadId: squad?.id ?? null,
    squadName: squad?.name ?? null,
    setActiveSquad,
  };
}
