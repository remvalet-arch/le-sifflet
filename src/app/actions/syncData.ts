"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEventDetails, getTeamRoster } from "@/lib/services/thesportsdb";
import type { MatchStatus } from "@/types/database";
import { MODERATOR_THRESHOLD } from "@/lib/constants/permissions";

// ── Ligues autorisées MVP ─────────────────────────────────────────────────────
// Ligue 1 : 4334 | Champions League : 4480
// TODO CDM 2026 : 4362
const MVP_LEAGUES = new Set(["4334", "4480"]);

// ── Mappings ──────────────────────────────────────────────────────────────────

function mapStatus(strStatus: string): MatchStatus {
  switch (strStatus) {
    case "Match Finished": return "finished";
    case "1H":             return "first_half";
    case "HT":             return "half_time";
    case "2H":             return "second_half";
    case "Extra Time":
    case "ET":             return "second_half";
    default:               return "upcoming";
  }
}

function mapPosition(strPosition: string): "G" | "D" | "M" | "A" {
  switch (strPosition) {
    case "Goalkeeper": return "G";
    case "Defender":   return "D";
    case "Midfielder": return "M";
    case "Forward":    return "A";
    default:           return "M";
  }
}

// ── Guard auth ────────────────────────────────────────────────────────────────

async function assertModerator() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { data: profile } = await supabase
    .from("profiles")
    .select("trust_score")
    .eq("id", user.id)
    .single();

  if (!profile || profile.trust_score < MODERATOR_THRESHOLD) {
    throw new Error("Accès réservé aux modérateurs (score ≥ 150)");
  }
}

// ── Server Actions ────────────────────────────────────────────────────────────

/**
 * Synchronise un match depuis TheSportsDB et upsert dans la table matches.
 * Guard MVP : Ligue 1 (4334) et Champions League (4480) uniquement.
 */
export async function syncMatchData(eventId: string) {
  await assertModerator();

  const event = await getEventDetails(eventId.trim());
  if (!event) throw new Error("Événement introuvable — vérifie l'ID TheSportsDB");

  if (!MVP_LEAGUES.has(event.idLeague)) {
    throw new Error("Compétition non supportée pour le MVP (Ligue 1 ou Champions League uniquement)");
  }

  // Formater le kick-off en ISO 8601 UTC
  const kickoffRaw = event.strTime
    ? `${event.dateEvent}T${event.strTime}Z`
    : `${event.dateEvent}T00:00:00Z`;
  const startTime = new Date(kickoffRaw).toISOString();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("matches")
    .upsert(
      {
        thesportsdb_event_id: event.idEvent,
        team_home:   event.strHomeTeam,
        team_away:   event.strAwayTeam,
        start_time:  startTime,
        status:      mapStatus(event.strStatus),
        home_score:  parseInt(event.intHomeScore ?? "0") || 0,
        away_score:  parseInt(event.intAwayScore ?? "0") || 0,
        home_team_logo: event.strHomeTeamBadge ?? null,
        away_team_logo: event.strAwayTeamBadge ?? null,
      },
      { onConflict: "thesportsdb_event_id" },
    )
    .select("id, team_home, team_away, start_time, status")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Synchronise l'effectif complet d'une équipe depuis TheSportsDB.
 * Upsert dans la table players (conflit sur thesportsdb_id).
 */
export async function syncTeamRoster(teamId: string, teamName: string) {
  await assertModerator();

  const roster = await getTeamRoster(teamId.trim());
  if (roster.length === 0) throw new Error("Aucun joueur retourné par l'API pour cette équipe");

  const rows = roster.map((p) => ({
    thesportsdb_id:       p.idPlayer,
    team_thesportsdb_id:  p.idTeam,
    team_name:            teamName,
    player_name:          p.strPlayer,
    position:             mapPosition(p.strPosition),
    synced_at:            new Date().toISOString(),
  }));

  const admin = createAdminClient();
  const { error } = await admin
    .from("players")
    .upsert(rows, { onConflict: "thesportsdb_id" });

  if (error) throw new Error(error.message);
  return { synced: rows.length, team: teamName };
}
