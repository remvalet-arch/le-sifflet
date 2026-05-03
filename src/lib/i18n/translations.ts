export type Locale = "fr" | "en";

export interface Translations {
  nav: { stadium: string; kop: string; profile: string };
  topbar: {
    connected: string;
    rules: string;
    laws: string;
    settings: string;
    language: string;
    logout: string;
  };
  match: {
    live: string;
    upcoming: string;
    finished: string;
    firstHalf: string;
    halfTime: string;
    secondHalf: string;
    paused: string;
  };
  lobby: { title: string; noMatches: string; today: string };
  voting: {
    decision: string;
    timeLeft: string;
    closed: string;
    yes: string;
    no: string;
    stake: string;
    min: string;
    half: string;
    allIn: string;
  };
  common: { pts: string; loading: string };
}

const fr: Translations = {
  nav: { stadium: "Stade", kop: "Kop", profile: "Profil" },
  topbar: {
    connected: "Connecté",
    rules: "Règles du jeu",
    laws: "Lois du Jeu",
    settings: "Paramètres",
    language: "Langue",
    logout: "Déconnexion",
  },
  match: {
    live: "En Direct",
    upcoming: "À Venir",
    finished: "Terminé",
    firstHalf: "1ère Mi-Temps",
    halfTime: "Mi-Temps",
    secondHalf: "2ème Mi-Temps",
    paused: "Arrêt",
  },
  lobby: { title: "Les Matchs", noMatches: "Aucun match disponible", today: "Aujourd'hui" },
  voting: {
    decision: "Décision en cours",
    timeLeft: "Temps restant",
    closed: "Votes clos",
    yes: "OUI",
    no: "NON",
    stake: "Engagement",
    min: "MIN",
    half: "MOITIÉ",
    allIn: "ALL IN",
  },
  common: { pts: "Pts", loading: "Chargement…" },
};

const en: Translations = {
  nav: { stadium: "Stadium", kop: "Kop", profile: "Profile" },
  topbar: {
    connected: "Signed In",
    rules: "Game Rules",
    laws: "Laws of the Game",
    settings: "Settings",
    language: "Language",
    logout: "Sign Out",
  },
  match: {
    live: "Live",
    upcoming: "Upcoming",
    finished: "Final",
    firstHalf: "1st Half",
    halfTime: "Half Time",
    secondHalf: "2nd Half",
    paused: "Stopped",
  },
  lobby: { title: "Matches", noMatches: "No matches available", today: "Today" },
  voting: {
    decision: "Decision in progress",
    timeLeft: "Time left",
    closed: "Voting closed",
    yes: "YES",
    no: "NO",
    stake: "Stake",
    min: "MIN",
    half: "HALF",
    allIn: "ALL IN",
  },
  common: { pts: "Pts", loading: "Loading…" },
};

export const translations: Record<Locale, Translations> = { fr, en };
