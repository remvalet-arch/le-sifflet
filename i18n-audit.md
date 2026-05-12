# Audit i18n — Chaînes hardcodées

**Date** : 12/05/2026  
**Scope** : `src/components/**/*.tsx`, `src/app/**/*.tsx`

## Priorité haute — Strings UI visibles

| Fichier                                        | Ligne   | Chaîne actuelle                                              | Clé i18n suggérée                                |
| ---------------------------------------------- | ------- | ------------------------------------------------------------ | ------------------------------------------------ |
| `components/match/ActionDrawer.tsx`            | 78–85   | Status labels (À venir, 1ère mi-temps, etc.)                 | `Common.statusUpcoming`, `statusFirstHalf`, etc. |
| `components/match/FriendPronoHints.tsx`        | 18      | `"victoire extérieur"`                                       | `Pronos.outcomeAway`                             |
| `components/match/MatchStats.tsx`              | 275     | `"Les statistiques seront disponibles dès le coup d'envoi."` | `Match.statsNotAvailableYet`                     |
| `components/match/LiveRoom.tsx`                | 658     | `"Sois le premier à alerter ⚡"`                             | `Match.beFirstToAlert`                           |
| `components/match/LiveRoom.tsx`                | 732     | `"GAGNÉ 🎉"`                                                 | `Match.wonLabel`                                 |
| `components/lobby/LeagueHub.tsx`               | 283     | `"Aucun match pour cette journée."`                          | `Lobby.noMatchesForDay`                          |
| `components/onboarding/UsernameSetupModal.tsx` | 59      | `"Déjà pris"`                                                | `Edit.usernameAlreadyTaken`                      |
| `components/ligues/SquadLeaderboard.tsx`       | 113–118 | `"Tu es seul dans ta ligue"` + body                          | `Ligues.soloInLeague`, `Ligues.soloInLeagueDesc` |

## Priorité moyenne — Strings semi-visibles

| Fichier                               | Ligne | Chaîne actuelle                                            | Clé i18n suggérée        |
| ------------------------------------- | ----- | ---------------------------------------------------------- | ------------------------ |
| `components/match/VerdictOverlay.tsx` | 17–23 | Types d'événements VAR (`PÉNALTY TIRÉ`, `ARRÊTS MT`, etc.) | `Match.verdictType.*`    |
| `components/match/AlertDrawer.tsx`    | 18    | `"Y'A PÉNO LÀ !!"`                                         | `Match.alertPenalty`     |
| `components/match/AlertDrawer.tsx`    | 163   | `"Signal envoyé…"`                                         | `Match.alertSignalSent`  |
| `components/lobby/MatchLobby.tsx`     | 67    | `"Compétition"` (alt fallback)                             | `Lobby.competitionAlt`   |
| `components/lobby/LeagueHub.tsx`      | 16    | `"Journées"` (tab label)                                   | `LeagueHub.tabMatchdays` |

## Priorité basse — Strings internes / admin

| Fichier                                    | Ligne             | Chaîne actuelle                         | Note                                      |
| ------------------------------------------ | ----------------- | --------------------------------------- | ----------------------------------------- |
| `components/ligues/CreateLeagueWizard.tsx` | 84, 105           | Messages d'erreur JS                    | Peut rester en français (erreurs console) |
| `components/match/ModeratorDrawer.tsx`     | 90, 235, 255, 279 | `"Sélectionner…"`, `"Aucun remplaçant"` | Interface admin — traduction optionnelle  |
| `components/match/LiveRoomTutorial.tsx`    | 12                | Corps du tutoriel                       | `Match.tutorialBody`                      |
| `components/layout/NewSeasonOverlay.tsx`   | 8–18              | Noms de mois                            | Utiliser `Intl.DateTimeFormat` à la place |
| `components/pwa/PushOptIn.tsx`             | 51                | Log d'erreur                            | Interne, pas besoin d'i18n                |

## Fichiers à 100% i18n (aucune chaîne hardcodée détectée)

- `components/profile/**` ✅
- `components/layout/BottomNav.tsx` ✅
- `components/layout/Header.tsx` ✅
- `components/onboarding/OnboardingTour.tsx` ✅

## Actions recommandées

1. **Sprint immédiat** : couvrir les 8 entrées de priorité haute (impact UX direct, notamment si i18n EN/ES/DE/IT est activé)
2. **Sprint suivant** : VerdictOverlay, AlertDrawer (liés aux actions live = fort impact)
3. **Refactor mois de `NewSeasonOverlay`** : remplacer l'array de strings par `Intl.DateTimeFormat("fr-FR", { month: "long" })` — résout automatiquement pour toutes les langues
