/**
 * Déclenchement / résolution des market_events live à partir des lignes brutes
 * `GET /fixtures/events` (API-Football v3). Appelé après chaque sync timeline.
 *
 * Heuristiques alignées sur les libellés courants type / detail (api-sports.io).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, MarketEventType } from "@/types/database";
import { resolveEvent } from "@/lib/resolve-event";

type Admin = SupabaseClient<Database>;

type ResolveableType =
  | "var_goal"
  | "penalty_check"
  | "red_card"
  | "corner"
  | "free_kick"
  | "penalty_outcome";

function norm(ev: unknown): {
  typeStr: string;
  detailLower: string;
  elapsed: number;
} {
  const raw = ev as Record<string, unknown>;
  const typeStr = String(raw.type ?? "")
    .toLowerCase()
    .trim();
  const detailLower = String(raw.detail ?? "")
    .toLowerCase()
    .trim();
  const timeObj = raw.time as Record<string, unknown> | null | undefined;
  const elapsed = typeof timeObj?.elapsed === "number" ? timeObj.elapsed : 0;
  return { typeStr, detailLower, elapsed };
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
  type: ResolveableType,
): Promise<boolean> {
  const { data } = await admin
    .from("market_events")
    .select("id")
    .eq("match_id", matchId)
    .eq("type", type as MarketEventType)
    .in("status", ["open", "closed"])
    .maybeSingle();
  return Boolean(data?.id);
}

async function openEvent(admin: Admin, matchId: string, type: ResolveableType) {
  if (await hasOpenEvent(admin, matchId, type)) return false;
  const { error } = await admin.from("market_events").insert({
    match_id: matchId,
    type: type as MarketEventType,
    status: "open",
    initiators: [],
  });
  return !error;
}

async function resolveOpen(
  admin: Admin,
  matchId: string,
  type: ResolveableType,
  result: "oui" | "non",
): Promise<boolean> {
  const { data: row } = await admin
    .from("market_events")
    .select("id")
    .eq("match_id", matchId)
    .eq("type", type as MarketEventType)
    .in("status", ["open", "closed"])
    .maybeSingle();
  if (!row?.id) return false;
  try {
    await resolveEvent(row.id, result);
    return true;
  } catch {
    return false;
  }
}

/**
 * Récupère les marchés ouverts d'un type donné pour un match
 * et retourne leur created_at et match_minute.
 */
async function getOpenMarketsForType(
  admin: Admin,
  matchId: string,
  type: ResolveableType,
): Promise<Array<{ id: string; created_at: string }>> {
  const { data } = await admin
    .from("market_events")
    .select("id, created_at")
    .eq("match_id", matchId)
    .eq("type", type as MarketEventType)
    .in("status", ["open", "closed"]);
  return data ?? [];
}

/** Convertit un ISO created_at en minute de match approximative.
 *  On suppose que la minute du marché = minute actuelle - âge du marché (crude).
 *  C'est approximatif mais suffisant pour la fenêtre de 3 min.
 */
function createdAtToMatchMinute(
  createdAt: string,
  currentMatchMinute: number | null,
): number | null {
  if (currentMatchMinute === null) return null;
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const ageMin = ageMs / 60000;
  return Math.max(0, Math.round(currentMatchMinute - ageMin));
}

export type ApiFootballMarketSyncSummary = {
  var_goal_opened: boolean;
  var_goal_resolved: boolean;
  penalty_check_opened: boolean;
  penalty_check_resolved: boolean;
  red_card_resolved: boolean;
  penalty_outcome_resolved: boolean;
  corner_resolved: boolean;
  free_kick_resolved: boolean;
  errors: string[];
};

/**
 * Parcourt les événements fixture dans l'ordre chronologique (début → fin).
 */
export async function applyApiFootballSignalsToMarkets(
  admin: Admin,
  matchId: string,
  rawEvents: unknown[],
  currentMatchMinute?: number | null,
): Promise<ApiFootballMarketSyncSummary> {
  const summary: ApiFootballMarketSyncSummary = {
    var_goal_opened: false,
    var_goal_resolved: false,
    penalty_check_opened: false,
    penalty_check_resolved: false,
    red_card_resolved: false,
    penalty_outcome_resolved: false,
    corner_resolved: false,
    free_kick_resolved: false,
    errors: [],
  };

  const list = Array.isArray(rawEvents) ? rawEvents : [];

  for (const ev of list) {
    const { typeStr, detailLower, elapsed } = norm(ev);

    // --- var_goal explicit verdict ---
    const vg = varGoalResultFromApiDetail(detailLower);
    if (typeStr === "var" && vg) {
      const ok = await resolveOpen(admin, matchId, "var_goal", vg);
      if (ok) summary.var_goal_resolved = true;
    }

    // --- penalty_check explicit verdict ---
    const pc = penaltyCheckResultFromApi(typeStr, detailLower);
    if (pc) {
      const ok = await resolveOpen(admin, matchId, "penalty_check", pc);
      if (ok) summary.penalty_check_resolved = true;
    }

    // --- var_goal open ---
    if (varGoalShouldOpen(typeStr, detailLower)) {
      const ok = await openEvent(admin, matchId, "var_goal");
      if (ok) summary.var_goal_opened = true;
    }

    // --- penalty_check open ---
    if (
      penaltyCheckShouldOpen(typeStr, detailLower) ||
      isPenaltyIncidentType(typeStr)
    ) {
      const ok = await openEvent(admin, matchId, "penalty_check");
      if (ok) summary.penalty_check_opened = true;
    }

    // --- T4: red_card auto-resolution ---
    if (typeStr === "card" && detailLower.includes("red card")) {
      // Cherche un marché red_card ouvert plus récent que cet event
      const openMarkets = await getOpenMarketsForType(
        admin,
        matchId,
        "red_card",
      );
      for (const market of openMarkets) {
        const marketCreatedMs = new Date(market.created_at).getTime();
        const eventApproxMs = elapsed * 60 * 1000; // crude — elapsed is match minute
        // Résoudre si l'event est postérieur à la création du marché
        if (marketCreatedMs < Date.now()) {
          const ok = await resolveOpen(admin, matchId, "red_card", "oui");
          if (ok) summary.red_card_resolved = true;
          break;
        }
        void marketCreatedMs;
        void eventApproxMs;
      }
    }

    // --- T6: penalty_outcome auto-resolution ---
    if (typeStr === "goal" && detailLower.includes("penalty")) {
      const ok = await resolveOpen(admin, matchId, "penalty_outcome", "oui");
      if (ok) summary.penalty_outcome_resolved = true;
    }
    if (
      detailLower.includes("missed penalty") ||
      detailLower.includes("saved penalty")
    ) {
      const ok = await resolveOpen(admin, matchId, "penalty_outcome", "non");
      if (ok) summary.penalty_outcome_resolved = true;
    }

    // --- T5: corner / free_kick via goal dans 3 min ---
    const isNonPenaltyGoal =
      typeStr === "goal" &&
      !detailLower.includes("penalty") &&
      !detailLower.includes("missed penalty") &&
      !detailLower.includes("saved penalty");

    if (isNonPenaltyGoal) {
      for (const mType of ["corner", "free_kick"] as const) {
        const openMarkets = await getOpenMarketsForType(admin, matchId, mType);
        for (const market of openMarkets) {
          const ageMs = Date.now() - new Date(market.created_at).getTime();
          const ageMin = ageMs / 60000;
          if (ageMin <= 3) {
            const ok = await resolveOpen(admin, matchId, mType, "oui");
            if (ok) {
              if (mType === "corner") summary.corner_resolved = true;
              if (mType === "free_kick") summary.free_kick_resolved = true;
            }
          }
        }
      }
    }
  }

  // --- T3 + T4: fallback temporel 3 min pour marchés var_goal / penalty_check / red_card sans verdict explicite ---
  const fallbackTypes: Array<"var_goal" | "penalty_check" | "red_card"> = [
    "var_goal",
    "penalty_check",
    "red_card",
  ];
  for (const mType of fallbackTypes) {
    const alreadyResolved =
      (mType === "var_goal" && summary.var_goal_resolved) ||
      (mType === "penalty_check" && summary.penalty_check_resolved) ||
      (mType === "red_card" && summary.red_card_resolved);
    if (alreadyResolved) continue;

    const openMarkets = await getOpenMarketsForType(admin, matchId, mType);
    for (const market of openMarkets) {
      const ageMs = Date.now() - new Date(market.created_at).getTime();
      const ageMin = ageMs / 60000;
      if (ageMin < 3) continue; // Fenêtre pas encore écoulée — on attend

      // Fenêtre écoulée sans verdict VAR → fallback
      const marketMinute = createdAtToMatchMinute(
        market.created_at,
        currentMatchMinute ?? null,
      );

      // Cherche un goal dans les 3 min après creation du marché
      let fallbackVerdict: "oui" | "non" | null = null;
      for (const ev of list) {
        const { typeStr: et, detailLower: ed, elapsed: ee } = norm(ev);

        if (mType === "var_goal") {
          const isGoal = et === "goal" && !ed.includes("missed");
          if (
            isGoal &&
            marketMinute !== null &&
            ee >= marketMinute &&
            ee <= marketMinute + 3
          ) {
            fallbackVerdict = "oui";
            break;
          }
        }

        if (mType === "penalty_check") {
          const isPenaltyGoal = et === "goal" && ed.includes("penalty");
          const isPenaltyMiss =
            ed.includes("missed penalty") || ed.includes("saved penalty");
          if (
            (isPenaltyGoal || isPenaltyMiss) &&
            marketMinute !== null &&
            ee >= marketMinute &&
            ee <= marketMinute + 3
          ) {
            fallbackVerdict = "oui";
            break;
          }
        }

        if (mType === "red_card") {
          const isRedCard = et === "card" && ed.includes("red card");
          if (
            isRedCard &&
            marketMinute !== null &&
            ee >= marketMinute &&
            ee <= marketMinute + 3
          ) {
            fallbackVerdict = "oui";
            break;
          }
        }
      }

      // Si aucun event positif trouvé et fenêtre > 3 min → "non"
      if (fallbackVerdict === null && ageMin > 3) {
        fallbackVerdict = "non";
      }

      if (fallbackVerdict) {
        const ok = await resolveOpen(admin, matchId, mType, fallbackVerdict);
        if (ok) {
          if (mType === "var_goal") summary.var_goal_resolved = true;
          if (mType === "penalty_check") summary.penalty_check_resolved = true;
          if (mType === "red_card") summary.red_card_resolved = true;
        }
      }
    }
  }

  return summary;
}

/**
 * Scan **du plus récent au plus ancien** pour savoir si l'API a déjà tranché
 * (utilisé par `/api/verify-event`).
 *
 * @param marketType     Type du marché à vérifier
 * @param rawEvents      Événements bruts API-Football
 * @param marketCreatedAt  ISO string du created_at du marché (optionnel — active le fallback 3 min)
 * @param windowMinutes  Fenêtre de fallback temporel (défaut 3 min)
 */
export function latestMarketVerdictFromFixtureEvents(
  marketType: MarketEventType,
  rawEvents: unknown[],
  marketCreatedAt?: string,
  windowMinutes = 3,
): "oui" | "non" | "WAIT" {
  const list = Array.isArray(rawEvents) ? [...rawEvents] : [];

  // --- Scan explicite VAR (du plus récent au plus ancien) ---
  for (let i = list.length - 1; i >= 0; i--) {
    const { typeStr, detailLower } = norm(list[i]);

    if (marketType === "var_goal") {
      const r =
        typeStr === "var" ? varGoalResultFromApiDetail(detailLower) : null;
      if (r) return r;
    }

    if (marketType === "penalty_check") {
      const r = penaltyCheckResultFromApi(typeStr, detailLower);
      if (r) return r;
    }

    if (marketType === "red_card") {
      if (typeStr === "card" && detailLower.includes("red card")) return "oui";
    }

    if (marketType === "penalty_outcome") {
      if (typeStr === "goal" && detailLower.includes("penalty")) return "oui";
      if (
        detailLower.includes("missed penalty") ||
        detailLower.includes("saved penalty")
      )
        return "non";
    }

    if (marketType === "corner" || marketType === "free_kick") {
      const isNonPenaltyGoal =
        typeStr === "goal" &&
        !detailLower.includes("penalty") &&
        !detailLower.includes("missed");
      if (isNonPenaltyGoal && marketCreatedAt) {
        const { elapsed } = norm(list[i]);
        const ageMs = Date.now() - new Date(marketCreatedAt).getTime();
        const marketMinuteApprox = Math.max(
          0,
          Math.round(elapsed - ageMs / 60000),
        );
        if (
          elapsed >= marketMinuteApprox &&
          elapsed <= marketMinuteApprox + windowMinutes
        ) {
          return "oui";
        }
      }
    }
  }

  // --- Fallback temporel (si marketCreatedAt fourni) ---
  if (marketCreatedAt) {
    const ageMs = Date.now() - new Date(marketCreatedAt).getTime();
    const ageMin = ageMs / 60000;

    if (ageMin <= windowMinutes) {
      // Fenêtre pas encore écoulée — on attend
      return "WAIT";
    }

    // Fenêtre écoulée → cherche un event positif dans la fenêtre
    if (
      marketType === "var_goal" ||
      marketType === "penalty_check" ||
      marketType === "red_card" ||
      marketType === "corner" ||
      marketType === "free_kick"
    ) {
      // On a déjà parcouru tous les events sans verdict → "non" (fenêtre dépassée)
      return "non";
    }
  }

  return "WAIT";
}
