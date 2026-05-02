import type { MatchStatus } from "./database";

/** Compétition / ligue — ex. idLeague → id, strLeague → name, strBadge → badgeUrl */
export interface Competition {
  id: string;
  name: string;
  badgeUrl: string | null;
  /** Optionnel : garde-fou sync */
  thesportsdbLeagueId: string;
}

/**
 * Équipe — mapping indicatif :
 * strTeam / strTeamShort → name / shortName
 * strTeamBadge → logoUrl
 * strColour1 / strColour2 / strColour3 → primaryColor / secondaryColor (tertiaire optionnelle)
 */
export interface Team {
  id: string;
  competitionId: string;
  name: string;
  shortName: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  thesportsdbTeamId: string;
}

/**
 * Joueur — mapping indicatif :
 * strPlayer → name
 * strPosition → position (normaliser vers G/D/M/A si besoin métier)
 * strCutout → cutoutUrl
 * strThumb / strRender (Premium) → thumbUrl / renderUrl optionnels
 */
export interface Player {
  id: string;
  teamId: string;
  name: string;
  position: string | null;
  cutoutUrl: string | null;
  thesportsdbPlayerId: string;
}

/**
 * Match — mapping indicatif :
 * idEvent → thesportsdbEventId (souvent conservé en texte côté tampon)
 * dateEvent + strTime → date (timestamptz)
 * strStatus + intTime (live) → status + minute côté app
 * intHomeScore / intAwayScore → scoreHome / scoreAway
 * idHomeTeam / idAwayTeam (si disponibles) ou résolution par noms → homeTeamId / awayTeamId
 */
export interface Match {
  id: string;
  competitionId: string;
  homeTeamId: string;
  awayTeamId: string;
  date: string; // ISO
  status: MatchStatus;
  scoreHome: number;
  scoreAway: number;
  matchMinute: number | null;
  thesportsdbEventId: string | null;
}
