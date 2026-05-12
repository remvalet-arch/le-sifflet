/**
 * Abréviations officielles à 3-4 lettres pour les équipes les plus connues.
 * Utilisé sur mobile (< 375 px) quand deux noms similaires coexistent.
 */
export const TEAM_SHORT_NAMES: Record<string, string> = {
  // Premier League
  "Manchester City": "MCI",
  "Manchester United": "MUN",
  "Crystal Palace": "CRY",
  "Nottingham Forest": "NFO",
  "Tottenham Hotspur": "TOT",
  "West Ham United": "WHU",
  "Newcastle United": "NEW",
  "Aston Villa": "AVL",
  "Leicester City": "LEI",
  Bournemouth: "BOU",
  Brentford: "BRE",
  Brighton: "BHA",
  Fulham: "FUL",
  Everton: "EVE",
  Chelsea: "CHE",
  Arsenal: "ARS",
  Liverpool: "LIV",
  "Wolverhampton Wanderers": "WOL",
  Wolves: "WOL",
  Southampton: "SOU",
  Ipswich: "IPS",

  // Ligue 1
  "Paris Saint-Germain": "PSG",
  "Olympique de Marseille": "OM",
  "Olympique Lyonnais": "OL",
  "AS Monaco": "MON",
  "Stade Rennais": "REN",
  "Stade de Reims": "REI",
  "RC Lens": "LNS",
  "LOSC Lille": "LIL",
  "OGC Nice": "NIC",
  "Montpellier HSC": "MTP",
  "Toulouse FC": "TOU",
  "FC Nantes": "NAN",
  "Girondins de Bordeaux": "BDX",
  "AS Saint-Étienne": "ASSE",
  "Angers SCO": "ANG",
  "Le Havre": "HAV",
  "RC Strasbourg": "STR",
  "Clermont Foot": "CLF",

  // La Liga
  "Real Madrid": "RMA",
  "FC Barcelona": "BAR",
  "Atlético de Madrid": "ATM",
  "Athletic Bilbao": "ATH",
  "Athletic Club": "ATH",
  "Real Sociedad": "RSO",
  "Real Betis": "BET",
  "Villarreal CF": "VIL",
  "Sevilla FC": "SEV",
  Valencia: "VAL",
  "Getafe CF": "GET",
  "Deportivo Alavés": "ALA",
  "Celta de Vigo": "CEL",
  "Rayo Vallecano": "RAY",
  "UD Las Palmas": "LPA",
  Osasuna: "OSA",
  Leganés: "LEG",
  Espanyol: "ESP",
  Valladolid: "VLD",
  Girona: "GIR",

  // Bundesliga
  "Bayern München": "BAY",
  "Bayern Munich": "BAY",
  "Borussia Dortmund": "BVB",
  "RB Leipzig": "RBL",
  "Bayer Leverkusen": "B04",
  "Eintracht Frankfurt": "SGE",
  "SC Freiburg": "SCF",
  "VfL Wolfsburg": "WOB",
  "Union Berlin": "FCU",
  "Werder Bremen": "SVW",
  "VfB Stuttgart": "VFB",
  "Borussia Mönchengladbach": "BMG",
  "1. FC Köln": "KOE",
  "TSG Hoffenheim": "TSG",
  "FC Augsburg": "FCA",
  "Heidenheim 1846": "HDH",
  "SV Darmstadt 98": "D98",
  "VfL Bochum": "BOC",

  // Serie A
  "Inter Milan": "INT",
  "AC Milan": "MIL",
  "AS Roma": "ROM",
  Juventus: "JUV",
  "SSC Napoli": "NAP",
  "SS Lazio": "LAZ",
  "Atalanta BC": "ATA",
  Atalanta: "ATA",
  Fiorentina: "FIO",
  "Torino FC": "TOR",
  Bologna: "BOL",
  "Udinese Calcio": "UDI",
  Udinese: "UDI",
  Cagliari: "CAG",
  "Genoa CFC": "GEN",
  Genoa: "GEN",
  Empoli: "EMP",
  Lecce: "LEC",
  Monza: "MON",
  Venezia: "VEN",
  Como: "COM",

  // UEFA Champions League / Europa League extra
  "FC Porto": "POR",
  "SL Benfica": "BEN",
  "Sporting CP": "SCP",
  "Ajax Amsterdam": "AJA",
  Ajax: "AJA",
  PSV: "PSV",
  "Feyenoord Rotterdam": "FEY",
  Feyenoord: "FEY",
  "Celtic FC": "CEL",
  Rangers: "RAN",
  "Shakhtar Donetsk": "SHA",
  "Dynamo Kyiv": "DYK",
  "Red Star Belgrade": "RSB",
  "Fenerbahçe SK": "FEN",
  "Galatasaray SK": "GAL",
  "Besiktas JK": "BJK",
  "Club Brugge": "CLB",
  Anderlecht: "AND",
  "FK Salzburg": "SAL",
  "Red Bull Salzburg": "SAL",
  "Sturm Graz": "STU",
  "Young Boys": "YBO",
  "Basel 1893": "BSL",
};

/**
 * Retourne l'abréviation du nom d'équipe.
 * Fallback : 3 premières lettres majuscules du nom.
 */
export function getTeamShortName(fullName: string): string {
  const exact = TEAM_SHORT_NAMES[fullName];
  if (exact) return exact;
  // Fallback : première lettre de chaque mot (max 3 mots)
  const words = fullName.trim().split(/\s+/);
  if (words.length === 1) return fullName.slice(0, 3).toUpperCase();
  return words
    .slice(0, 3)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
