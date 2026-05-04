/**
 * Déclenchement / résolution des market_events live à partir des lignes brutes
 * `GET /fixtures/events` (API-Football v3). Appelé après chaque sync timeline.
 *
 * Heuristiques alignées sur les libellés courants type / detail (api-sports.io).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { resolveEvent } from "@/lib/resolve-event";

type Admin = SupabaseClient<Database>;

function norm(ev: unknown): { typeStr: string; detailLower: string } {
  const raw = ev as Record<string, unknown>;
  const typeStr = String(raw.type ?? "")
    .toLowerCase()
    .trim();
  const detailLower = String(raw.detail ?? "")
    .toLowerCase()
    .trim();
  return { typeStr, detailLower };
}

/** Verdict but / VAR pour le marché `var_goal` (But confirmé par la VAR ?). */
function varGoalResultFromApiDetail(detailLower: string): "oui" | "non" | null {
  if (
    detailLower.includes("goal cancelled") ||
    detailLower.includes("goal disallowed") ||
    detailLower.includes("goal not awarded") ||
    detailLower.includes("no goal")
  ) {
    return "non";
  }
  if (
    detailLower.includes("goal confirmed") ||
    detailLower.includes("goal awarded") ||
    detailLower.includes("goal stands") ||
    detailLower.includes("goal allowed")
  ) {
    return "oui";
  }
  return null;
}

function varGoalShouldOpen(typeStr: string, detailLower: string): boolean {
  if (typeStr !== "var") return false;
  if (varGoalResultFromApiDetail(detailLower)) return false;
  if (detailLower.includes("penalty")) return false;
  return (
    detailLower.includes("possible") ||
    detailLower.includes("review") ||
    detailLower.includes("check") ||
    detailLower.includes("offside") ||
    detailLower.includes("await") ||
    detailLower.includes("pending")
  );
}

/** Verdict pour `penalty_check` (Y'a pénalty là ?). */
export function penaltyCheckResultFromApi(
  typeStr: string,
  detailLower: string,
): "oui" | "non" | null {
  if (typeStr !== "var") return null;
  if (
    detailLower.includes("penalty confirmed") ||
    detailLower.includes("penalty awarded")
  ) {
    return "oui";
  }
  if (
    detailLower.includes("penalty cancelled") ||
    detailLower.includes("penalty not awarded") ||
    detailLower.includes("no penalty")
  ) {
    return "non";
  }
  return null;
}

function penaltyCheckShouldOpen(typeStr: string, detailLower: string): boolean {
  if (typeStr !== "var") return false;
  if (penaltyCheckResultFromApi(typeStr, detailLower)) return false;
  return (
    detailLower.includes("possible penalty") ||
    detailLower.includes("penalty check") ||
    (detailLower.includes("penalty") &&
      (detailLower.includes("review") ||
        detailLower.includes("possible") ||
        detailLower.includes("check")))
  );
}

/** Type API `Penalty` (ex. tir au but / séance) — ouvre un doute « pénalty ». */
function isPenaltyIncidentType(typeStr: string): boolean {
  return typeStr === "penalty";
}

async function hasOpenEvent(
  admin: Admin,
  matchId: string,
  type: "var_goal" | "penalty_check",
): Promise<boolean> {
  const { data } = await admin
    .from("market_events")
    .select("id")
    .eq("match_id", matchId)
    .eq("type", type)
    .eq("status", "open")
    .maybeSingle();
  return Boolean(data?.id);
}

async function openEvent(
  admin: Admin,
  matchId: string,
  type: "var_goal" | "penalty_check",
) {
  if (await hasOpenEvent(admin, matchId, type)) return false;
  const { error } = await admin.from("market_events").insert({
    match_id: matchId,
    type,
    status: "open",
    initiators: [],
  });
  return !error;
}

async function resolveOpen(
  admin: Admin,
  matchId: string,
  type: "var_goal" | "penalty_check",
  result: "oui" | "non",
): Promise<boolean> {
  const { data: row } = await admin
    .from("market_events")
    .select("id")
    .eq("match_id", matchId)
    .eq("type", type)
    .eq("status", "open")
    .maybeSingle();
  if (!row?.id) return false;
  try {
    await resolveEvent(row.id, result);
    return true;
  } catch {
    return false;
  }
}

export type ApiFootballMarketSyncSummary = {
  var_goal_opened: boolean;
  var_goal_resolved: boolean;
  penalty_check_opened: boolean;
  penalty_check_resolved: boolean;
  errors: string[];
};

/**
 * Parcourt les événements fixture dans l'ordre chronologique (début → fin).
 */
export async function applyApiFootballSignalsToMarkets(
  admin: Admin,
  matchId: string,
  rawEvents: unknown[],
): Promise<ApiFootballMarketSyncSummary> {
  const summary: ApiFootballMarketSyncSummary = {
    var_goal_opened: false,
    var_goal_resolved: false,
    penalty_check_opened: false,
    penalty_check_resolved: false,
    errors: [],
  };

  const list = Array.isArray(rawEvents) ? rawEvents : [];

  for (const ev of list) {
    const { typeStr, detailLower } = norm(ev);

    const vg = varGoalResultFromApiDetail(detailLower);
    if (typeStr === "var" && vg) {
      const ok = await resolveOpen(admin, matchId, "var_goal", vg);
      if (ok) summary.var_goal_resolved = true;
    }

    const pc = penaltyCheckResultFromApi(typeStr, detailLower);
    if (pc) {
      const ok = await resolveOpen(admin, matchId, "penalty_check", pc);
      if (ok) summary.penalty_check_resolved = true;
    }

    if (varGoalShouldOpen(typeStr, detailLower)) {
      const ok = await openEvent(admin, matchId, "var_goal");
      if (ok) summary.var_goal_opened = true;
    }

    if (
      penaltyCheckShouldOpen(typeStr, detailLower) ||
      isPenaltyIncidentType(typeStr)
    ) {
      const ok = await openEvent(admin, matchId, "penalty_check");
      if (ok) summary.penalty_check_opened = true;
    }
  }

  return summary;
}

/**
 * Scan **du plus récent au plus ancien** pour savoir si l'API a déjà tranché
 * (utilisé par `/api/verify-event`).
 */
export function latestMarketVerdictFromFixtureEvents(
  marketType: "var_goal" | "penalty_check",
  rawEvents: unknown[],
): "oui" | "non" | "WAIT" {
  const list = Array.isArray(rawEvents) ? [...rawEvents] : [];
  for (let i = list.length - 1; i >= 0; i--) {
    const { typeStr, detailLower } = norm(list[i]);
    if (marketType === "var_goal") {
      const r =
        typeStr === "var" ? varGoalResultFromApiDetail(detailLower) : null;
      if (r) return r;
    } else {
      const r = penaltyCheckResultFromApi(typeStr, detailLower);
      if (r) return r;
    }
  }
  return "WAIT";
}
