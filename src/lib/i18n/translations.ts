export type Locale = "fr" | "en" | "es" | "de" | "it";

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
  lobby: {
    title: "Les Matchs",
    noMatches: "Aucun match disponible",
    today: "Aujourd'hui",
  },
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
  lobby: {
    title: "Matches",
    noMatches: "No matches available",
    today: "Today",
  },
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

const es: Translations = {
  nav: { stadium: "Estadio", kop: "Kop", profile: "Perfil" },
  topbar: {
    connected: "Conectado",
    rules: "Reglas del juego",
    laws: "Leyes del Juego",
    settings: "Ajustes",
    language: "Idioma",
    logout: "Cerrar sesión",
  },
  match: {
    live: "En Directo",
    upcoming: "Próximo",
    finished: "Finalizado",
    firstHalf: "1er Tiempo",
    halfTime: "Descanso",
    secondHalf: "2º Tiempo",
    paused: "Parado",
  },
  lobby: {
    title: "Los Partidos",
    noMatches: "Sin partidos disponibles",
    today: "Hoy",
  },
  voting: {
    decision: "Decisión en curso",
    timeLeft: "Tiempo restante",
    closed: "Votos cerrados",
    yes: "SÍ",
    no: "NO",
    stake: "Apuesta",
    min: "MÍN",
    half: "MITAD",
    allIn: "ALL IN",
  },
  common: { pts: "Pts", loading: "Cargando…" },
};

const de: Translations = {
  nav: { stadium: "Stadion", kop: "Kop", profile: "Profil" },
  topbar: {
    connected: "Angemeldet",
    rules: "Spielregeln",
    laws: "Fußballgesetze",
    settings: "Einstellungen",
    language: "Sprache",
    logout: "Abmelden",
  },
  match: {
    live: "Live",
    upcoming: "Demnächst",
    finished: "Beendet",
    firstHalf: "1. Halbzeit",
    halfTime: "Halbzeit",
    secondHalf: "2. Halbzeit",
    paused: "Unterbrochen",
  },
  lobby: {
    title: "Spiele",
    noMatches: "Keine Spiele verfügbar",
    today: "Heute",
  },
  voting: {
    decision: "Entscheidung läuft",
    timeLeft: "Verbleibende Zeit",
    closed: "Abstimmung geschlossen",
    yes: "JA",
    no: "NEIN",
    stake: "Einsatz",
    min: "MIN",
    half: "HALB",
    allIn: "ALL IN",
  },
  common: { pts: "Pkt", loading: "Laden…" },
};

const it: Translations = {
  nav: { stadium: "Stadio", kop: "Kop", profile: "Profilo" },
  topbar: {
    connected: "Connesso",
    rules: "Regole del gioco",
    laws: "Regolamento IFAB",
    settings: "Impostazioni",
    language: "Lingua",
    logout: "Disconnetti",
  },
  match: {
    live: "In Diretta",
    upcoming: "In Arrivo",
    finished: "Terminato",
    firstHalf: "1° Tempo",
    halfTime: "Intervallo",
    secondHalf: "2° Tempo",
    paused: "Sospeso",
  },
  lobby: {
    title: "Le Partite",
    noMatches: "Nessuna partita disponibile",
    today: "Oggi",
  },
  voting: {
    decision: "Decisione in corso",
    timeLeft: "Tempo rimanente",
    closed: "Voti chiusi",
    yes: "SÌ",
    no: "NO",
    stake: "Puntata",
    min: "MIN",
    half: "METÀ",
    allIn: "ALL IN",
  },
  common: { pts: "Pti", loading: "Caricamento…" },
};

export const translations: Record<Locale, Translations> = {
  fr,
  en,
  es,
  de,
  it,
};
