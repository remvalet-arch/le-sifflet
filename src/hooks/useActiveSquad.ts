"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  ACTIVE_SQUAD_STORAGE_KEY,
  readActiveSquadFromStorage,
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

function getSnapshot(): ActiveSquadPayload | null {
  return readActiveSquadFromStorage();
}

function getServerSnapshot(): ActiveSquadPayload | null {
  return null;
}

export function useActiveSquad() {
  const squad = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setActiveSquad = useCallback((payload: ActiveSquadPayload | null) => {
    writeActiveSquadToStorage(payload);
  }, []);

  return {
    squadId: squad?.id ?? null,
    squadName: squad?.name ?? null,
    setActiveSquad,
  };
}
