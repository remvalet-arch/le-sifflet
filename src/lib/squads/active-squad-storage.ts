/** Persistance client : squad utilisée pour le braquage sur les paris match. */
export const ACTIVE_SQUAD_STORAGE_KEY = "var-time-active-squad";

export type ActiveSquadPayload = { id: string; name: string };

export function parseActiveSquad(raw: string | null): ActiveSquadPayload | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    if (
      v &&
      typeof v === "object" &&
      "id" in v &&
      "name" in v &&
      typeof (v as ActiveSquadPayload).id === "string" &&
      typeof (v as ActiveSquadPayload).name === "string"
    ) {
      return { id: (v as ActiveSquadPayload).id, name: (v as ActiveSquadPayload).name };
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function readActiveSquadFromStorage(): ActiveSquadPayload | null {
  if (typeof window === "undefined") return null;
  return parseActiveSquad(localStorage.getItem(ACTIVE_SQUAD_STORAGE_KEY));
}

export function writeActiveSquadToStorage(payload: ActiveSquadPayload | null): void {
  if (typeof window === "undefined") return;
  if (payload) localStorage.setItem(ACTIVE_SQUAD_STORAGE_KEY, JSON.stringify(payload));
  else localStorage.removeItem(ACTIVE_SQUAD_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("sifflet:active-squad-changed"));
}
