/**
 * Import cosmétique TheSportsDB (logos, couleurs maillot, stades, portraits joueurs) par ligue.
 * Clé : `SPORTSDB_API_KEY` / `THESPORTSDB_API_KEY` — v1 `search_all_teams.php` + `lookupteam` + `lookup_all_players`.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";
import {
  delay,
  ensureCompetitionByLeagueId,
  lookupTeamById,
  mapPosition,
  mapTeamUpsert,
  pickCutout,
  type TsdbPlayerRow,
  type TsdbTeam,
} from "@/services/sportsdb-sync";

function getApiKey(): string {
  const raw = process.env.SPORTSDB_API_KEY ?? process.env.THESPORTSDB_API_KEY;
  if (raw === undefined || raw === null) {
    throw new Error("Clé API manquante");
  }
  const k = raw.trim();
  if (k === "" || k === "undefined") {
    throw new Error("Clé API manquante");
  }
  return k;
}

function buildSportsdbUrl(endpointPath: string): string {
  const key = getApiKey();
  const path = endpointPath.replace(/^\//, "");
  return `https://www.thesportsdb.com/api/v1/json/${encodeURIComponent(key)}/${path}`;
}

async function v1Fetch<T>(path: string): Promise<T> {
  const url = buildSportsdbUrl(path);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`TheSportsDB HTTP ${res.status} sur ${path}`);
  }
  return res.json() as Promise<T>;
}

export type ImportLeagueAssetsResult = {
  success: true;
  leagueName: string;
  teamsImported: number;
  playersImported: number;
};

/**
 * `search_all_teams.php?l={leagueName}` puis, par équipe soccer : `lookupteam`, upsert `teams`,
 * `lookup_all_players`, upsert `players` (dont `image_url`). Délai 300 ms au début de chaque équipe.
 */
export async function importLeagueAssets(leagueName: string): Promise<ImportLeagueAssetsResult> {
  const trimmed = leagueName.trim();
  if (trimmed === "") {
    throw new Error("leagueName vide");
  }

  const admin = createAdminClient();
  const data = await v1Fetch<{ teams: (TsdbTeam & { strSport?: string })[] | null }>(
    `search_all_teams.php?l=${encodeURIComponent(trimmed)}`,
  );
  await delay(300);
  const teams = (data.teams ?? []).filter((t) => !t.strSport || t.strSport === "Soccer");

  let teamsImported = 0;
  let playersImported = 0;

  for (const t of teams) {
    await delay(300);

    const competitionId = await ensureCompetitionByLeagueId(admin, t.idLeague);
    const fullTeam = await lookupTeamById(t.idTeam);
    const row = mapTeamUpsert(fullTeam, competitionId);
    const { error: upsertTeamErr } = await admin.from("teams").upsert(row, {
      onConflict: "thesportsdb_team_id",
      ignoreDuplicates: false,
    });
    if (upsertTeamErr) {
      throw new Error(`teams upsert ${fullTeam.idTeam}: ${upsertTeamErr.message}`);
    }
    teamsImported += 1;

    const { data: teamRow, error: trErr } = await admin
      .from("teams")
      .select("id, name")
      .eq("thesportsdb_team_id", fullTeam.idTeam)
      .maybeSingle();
    if (trErr) {
      throw new Error(trErr.message);
    }
    if (!teamRow) {
      throw new Error(`Équipe TheSportsDB ${fullTeam.idTeam} introuvable après upsert`);
    }

    const rosterData = await v1Fetch<{ player: TsdbPlayerRow[] | null }>(
      `lookup_all_players.php?id=${encodeURIComponent(fullTeam.idTeam)}`,
    );
    const roster = rosterData.player ?? [];

    const playerRows: Database["public"]["Tables"]["players"]["Insert"][] = roster.map((p) => {
      const img = pickCutout(p);
      return {
        thesportsdb_id: p.idPlayer,
        team_id: teamRow.id,
        team_thesportsdb_id: p.idTeam,
        team_name: teamRow.name,
        player_name: p.strPlayer,
        position: mapPosition(p.strPosition ?? ""),
        cutout_url: img,
        image_url: img,
        synced_at: new Date().toISOString(),
      };
    });

    if (playerRows.length === 0) {
      continue;
    }

    const chunkSize = 80;
    for (let i = 0; i < playerRows.length; i += chunkSize) {
      const chunk = playerRows.slice(i, i + chunkSize);
      const { error: pErr } = await admin.from("players").upsert(chunk, { onConflict: "thesportsdb_id" });
      if (pErr) {
        throw new Error(`players upsert ${fullTeam.idTeam}: ${pErr.message}`);
      }
      playersImported += chunk.length;
    }
  }

  return {
    success: true,
    leagueName: trimmed,
    teamsImported,
    playersImported,
  };
}
