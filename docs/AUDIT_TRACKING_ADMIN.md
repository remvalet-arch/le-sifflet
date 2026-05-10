# AUDIT VAR TIME — Tracking & Admin

> Document produit en lecture seule du codebase. Aucun fichier de code modifié.
> Date d'audit : 2026-05-10. Branche : `stage`.

---

## 0. Résumé exécutif

**VAR TIME** est une PWA mobile-first de paris VAR communautaires en temps réel sur le football, ciblant la Coupe du Monde 2026. Stack : Next.js 16 / React 19 / Supabase / TypeScript. Volume : ~160 fichiers TypeScript source, 104 migrations Supabase, ~80 composants client. La surface fonctionnelle est très mûre : auth Google (PKCE), pronostics avant-match (score exact + buteurs), marchés VAR live (9 types), économie complète (Sifflets, XP, rang, saisons, shop cosmétique, boosters, streak freeze), ligues sociales avec chat Realtime, messagerie directe, système de badges, notifications push granulaires, et une quinzaine de crons d'engagement. **Zero analytics tiers installé** (pas de PostHog, Mixpanel, Segment, ni Vercel Analytics). La notion d'admin repose sur un `trust_score ≥ 150` (pas de table de rôles dédiée). Zero table de ban ou de shadow-ban. Le rate limiting est implémenté en DB (table `rate_limit_log`) pour 4 routes, et ad-hoc via comptage de table pour les autres. Les logs applicatifs sont structurés JSON en prod mais envoyés uniquement en console (`logger.ts`) — pas de Sentry ni d'APM. Risque principal identifié : le guard admin via `trust_score` est manipulable par abus du système Waze ; l'absence totale d'analytics rend toute décision produit aveugle.

---

## 1. Inventaire des actions utilisateur trackables

### 1.1 Auth

| Action utilisateur                          | Trigger UI                             | Endpoint / handler               | Méthode             | Side effects DB                                                                           | Fichier source                                                                     | Rate limit                           | Transaction atomique                | Logué                    |
| ------------------------------------------- | -------------------------------------- | -------------------------------- | ------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------ | ----------------------------------- | ------------------------ |
| Connexion Google OAuth                      | `SignInWithGoogleButton.tsx`           | Supabase Auth → `/auth/callback` | OAuth PKCE          | INSERT `profiles` via trigger `handle_new_user`, INSERT `match_subscriptions` auto        | `src/app/auth/callback/route.ts`, `src/components/auth/SignInWithGoogleButton.tsx` | Non (côté Supabase Auth)             | Oui (trigger DB SECURITY DEFINER)   | Supabase Auth logs       |
| Déconnexion                                 | Menu / TopBar                          | Server Action `signOut()`        | POST                | Supabase session cleared                                                                  | `src/app/actions/auth.ts`                                                          | Non                                  | Non                                 | Non                      |
| Webhook nouveau profil → email de bienvenue | Supabase Webhook                       | `POST /api/webhooks/new-profile` | POST                | Aucun (lecture only)                                                                      | `src/app/api/webhooks/new-profile/route.ts`                                        | Non                                  | Non                                 | `log.info` / `log.error` |
| Login streak (J+1)                          | Chaque navigation dans `/(app)` layout | AppLayout server component       | Render côté serveur | UPDATE `profiles` (`last_login_date`, `login_streak`) ; consomme streak_freeze si rupture | `src/app/(app)/layout.tsx` → `trackLoginStreak()`                                  | Non                                  | Non (UPDATE direct)                 | Non                      |
| Réclamation bonus streak quotidien          | `RefillButton` / `claim-daily-streak`  | `POST /api/claim-daily-streak`   | POST                | UPDATE `profiles` (solde + lifetime_points_earned)                                        | `src/app/api/claim-daily-streak/route.ts`                                          | Oui : 5 req/60s via `rate_limit_log` | Non (UPDATE direct via adminClient) | Non                      |

### 1.2 Navigation / Engagement

| Action utilisateur                     | Trigger UI                               | Endpoint / handler             | Méthode    | Side effects DB                                                                                            | Fichier source                                               | Rate limit                                                               | Transaction atomique    | Logué                 |
| -------------------------------------- | ---------------------------------------- | ------------------------------ | ---------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------ | ----------------------- | --------------------- |
| Entrée dans une LiveRoom (match live)  | Tap sur MatchCard                        | Route `/match/[id]`            | Navigation | UPSERT `match_presence` (ping toutes les 60s) ; lecture `market_events` ouverts                            | `src/components/match/LiveRoom.tsx` (useEffect pingPresence) | Non                                                                      | Non                     | Non                   |
| Souscription / mute notifs d'un match  | `MatchNotificationBell.tsx`              | `POST /api/match-subscription` | POST       | UPSERT `match_subscriptions`                                                                               | `src/app/api/match-subscription/route.ts`                    | Non                                                                      | Non                     | `log.error` sur échec |
| Signalement d'alerte VAR communautaire | `ActionDrawer.tsx` → `handleAlert()`     | `POST /api/alert`              | POST       | INSERT `alert_signals` ; si seuil atteint : INSERT `market_events` + UPDATE `matches.alert_cooldown_until` | `src/app/api/alert/route.ts`                                 | Oui : 5 alertes/60s (comptage sur `alert_signals`) ; trust_score minimum | Non (INSERT séquentiel) | `log.info/error`      |
| Sirène VAR (panic button ligue)        | Bouton "Sirène" dans LiveRoom            | `POST /api/squads/var-alert`   | POST       | Aucun (push fire-and-forget)                                                                               | `src/app/api/squads/var-alert/route.ts`                      | Non (cooldown UI 15 min, non DB)                                         | Non                     | Non                   |
| Switch d'onglet dans LiveRoom          | Tabs kop/vestiaire/compo/stats           | Client-side state              | Aucun      | Aucun                                                                                                      | `src/components/match/LiveRoom.tsx`                          | Non                                                                      | N/A                     | Non                   |
| Ouverture du shop                      | Navigation `/shop`                       | Page route                     | GET        | Aucun                                                                                                      | `src/app/(app)/shop/page.tsx`                                | Non                                                                      | N/A                     | Non                   |
| Ouverture du profil                    | Navigation `/profile` ou `/profile/[id]` | Page route                     | GET        | Aucun                                                                                                      | `src/app/(app)/profile/`                                     | Non                                                                      | N/A                     | Non                   |
| Ouverture du classement                | Navigation `/leaderboard`                | Page route                     | GET        | Aucun                                                                                                      | `src/app/(app)/leaderboard/page.tsx`                         | Non                                                                      | N/A                     | Non                   |
| Ouverture des ligues                   | Navigation `/ligues`                     | Page route                     | GET        | Aucun                                                                                                      | `src/app/(app)/ligues/`                                      | Non                                                                      | N/A                     | Non                   |

### 1.3 Pronostics avant-match

| Action utilisateur                    | Trigger UI                                 | Endpoint / handler                                                   | Méthode | Side effects DB                                                                  | Fichier source                                                             | Rate limit                           | Transaction atomique       | Logué                 |
| ------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------ | -------------------------- | --------------------- |
| Soumettre score exact + buteurs       | `MatchPronoCard.tsx` → `place_match_prono` | RPC Supabase `place_match_prono(match_id, home, away, scorers_json)` | RPC     | UPSERT `pronos` (exact_score + scorer_allocation) ; UPSERT `match_subscriptions` | `src/components/pronos/MatchPronoCard.tsx`, migration `0050_prono_hub.sql` | Non (UNIQUE index bloque le doublon) | Oui (RPC SECURITY DEFINER) | Non                   |
| Refill Sifflets si solde < 500        | `RefillButton.tsx`                         | `POST /api/refill`                                                   | POST    | UPDATE `profiles.sifflets_balance` via adminClient                               | `src/app/api/refill/route.ts`                                              | Non (cooldown 24h métier)            | Non                        | Non                   |
| RSA — recrédit d'urgence (solde < 10) | LiveRoom auto-trigger                      | `POST /api/claim-rsa`                                                | POST    | UPDATE `profiles.sifflets_balance` via adminClient                               | `src/app/api/claim-rsa/route.ts`                                           | Oui : 5 req/60s via `rate_limit_log` | Non                        | `log.error` sur échec |

### 1.4 Marchés VAR live (paris courts termes)

| Action utilisateur                 | Trigger UI                                  | Endpoint / handler              | Méthode    | Side effects DB                                                                            | Fichier source                             | Rate limit                            | Transaction atomique                              | Logué                      |
| ---------------------------------- | ------------------------------------------- | ------------------------------- | ---------- | ------------------------------------------------------------------------------------------ | ------------------------------------------ | ------------------------------------- | ------------------------------------------------- | -------------------------- |
| Placer un pari VAR (VotingModal)   | `VotingModal.tsx` → clic OUI/NON            | `POST /api/bet`                 | POST       | RPC `place_bet` : débit `sifflets_balance` + INSERT `bets`                                 | `src/app/api/bet/route.ts`                 | Oui : 10 paris/60s (comptage `bets`)  | Oui (RPC SECURITY DEFINER avec SELECT FOR UPDATE) | Non                        |
| Quick-bet depuis notification push | Action button notification SW               | `POST /api/var-bets/quick-bet`  | POST       | RPC `place_bet` (même que ci-dessus)                                                       | `src/app/api/var-bets/quick-bet/route.ts`  | Oui : 15 req/60s (comptage `bets`)    | Oui (RPC)                                         | `log.info/error`           |
| Résolution événement (modérateur)  | `AdminEventCard.tsx` → FORCER OUI/NON       | `POST /api/admin/resolve-event` | POST       | RPC `resolve_event_parimutuel` + push résultat betteurs + badges                           | `src/app/api/admin/resolve-event/route.ts` | Oui : 20 req/60s via `rate_limit_log` | Oui (RPC SECURITY DEFINER)                        | Non                        |
| Résolution auto stoppage time      | Cron `match-monitor`                        | Interne cron                    | GET (cron) | RPC `resolve_event_parimutuel`                                                             | `src/app/api/cron/match-monitor/route.ts`  | CRON_SECRET bearer                    | Oui (RPC)                                         | `log.error/info`           |
| Terminer un match (modérateur)     | `ForceResolvePastMatchesButton.tsx` / admin | `POST /api/admin/finish-match`  | POST       | UPDATE `matches.status='finished'` ; RPC `resolve_long_term_bets` + `resolve_match_pronos` | `src/app/api/admin/finish-match/route.ts`  | Oui : 10 req/60s via `rate_limit_log` | Oui (RPCs)                                        | `log.warn` sur échec prono |

### 1.5 Économie (boutique & boosters)

| Action utilisateur                                   | Trigger UI                  | Endpoint / handler                                    | Méthode | Side effects DB                                                                                      | Fichier source                              | Rate limit                                               | Transaction atomique                              | Logué                |
| ---------------------------------------------------- | --------------------------- | ----------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------- | -------------------- |
| Achat item cosmétique (avatar, bordure, effet)       | `ShopClient.tsx`            | `POST /api/shop/purchase`                             | POST    | RPC `purchase_shop_item` : débit `sifflets_balance` + INSERT `user_shop_inventory`                   | `src/app/api/shop/purchase/route.ts`        | Oui : 10 achats/60s (comptage `user_shop_inventory`)     | Oui (RPC SECURITY DEFINER avec SELECT FOR UPDATE) | Non                  |
| Équiper un item cosmétique                           | `ShopClient.tsx`            | `POST /api/shop/equip`                                | POST    | RPC `equip_shop_item` : UPDATE `profiles.equipped_*_id`                                              | `src/app/api/shop/equip/route.ts`           | Non                                                      | Oui (RPC)                                         | Non                  |
| Achat booster (Double XP, Cote+, Safety Net, Vision) | `ShopClient.tsx`            | `POST /api/boosters/purchase`                         | POST    | RPC `purchase_booster` : débit `sifflets_balance` + INSERT `user_boosters_inventory` (N lignes)      | `src/app/api/boosters/purchase/route.ts`    | Oui : 10 achats/60s (comptage `user_boosters_inventory`) | Oui (RPC SECURITY DEFINER)                        | Non                  |
| Achat Streak Freeze                                  | `SettingsClient.tsx`        | RPC Supabase `purchase_streak_freeze` (client direct) | RPC     | Débit 500 pts + UPDATE `profiles.streak_freezes_owned`                                               | `src/app/(app)/settings/SettingsClient.tsx` | Non                                                      | Oui (RPC SECURITY DEFINER avec SELECT FOR UPDATE) | Non                  |
| Gain de points (prono gagné)                         | Cron finish-match / resolve | RPC `resolve_match_pronos`                            | Interne | UPDATE `profiles` (solde + XP + rank + lifetime_points + monthly_points + season_points via trigger) | Migrations `0045`, `0067`, `0074`, `0081`   | N/A                                                      | Oui (RPC triggers)                                | `log.warn` sur échec |
| Pari VAR gagné → crédit                              | Résolution event            | RPC `resolve_event_parimutuel`                        | Interne | UPDATE `profiles.sifflets_balance` + XP + `bets.status='won'`                                        | Migration `0041`                            | N/A                                                      | Oui (RPC)                                         | Non                  |

### 1.6 Social (ligues & messages)

| Action utilisateur                    | Trigger UI                             | Endpoint / handler                        | Méthode | Side effects DB                                                                           | Fichier source                                       | Rate limit          | Transaction atomique     | Logué       |
| ------------------------------------- | -------------------------------------- | ----------------------------------------- | ------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------- | ------------------------ | ----------- |
| Créer une ligue                       | `CreateLeagueWizard.tsx`               | `POST /api/squads`                        | POST    | INSERT `squads` + INSERT `squad_members` + INSERT `squad_messages` (message de bienvenue) | `src/app/api/squads/route.ts`                        | Non                 | Non (INSERT séquentiels) | `log.error` |
| Rejoindre une ligue (code invite)     | `LiguesPageClient.tsx` / `join/[code]` | `POST /api/squads/join`                   | POST    | INSERT `squad_members` + push au créateur                                                 | `src/app/api/squads/join/route.ts`                   | Non                 | Non                      | `log.error` |
| Quitter une ligue                     | `SquadDetailClient.tsx`                | `POST /api/squads/leave`                  | POST    | DELETE `squad_members`                                                                    | `src/app/api/squads/leave/route.ts`                  | Non                 | Non                      | `log.error` |
| Envoyer un message dans le chat ligue | `SquadChat.tsx`                        | `POST /api/squads/[squadId]/messages`     | POST    | INSERT `squad_messages` + push si cooldown 30min                                          | `src/app/api/squads/[squadId]/messages/route.ts`     | Non (max 200 chars) | Non                      | Non         |
| Envoyer un message direct (DM)        | `MessagesConversation.tsx`             | `POST /api/messages/[otherId]`            | POST    | INSERT `direct_messages` + UPDATE `direct_message_threads`                                | `src/app/api/messages/[otherId]/route.ts`            | Non                 | Non                      | Non         |
| Envoyer une demande d'amis            | `FriendButton.tsx`                     | Supabase client direct INSERT             | Client  | INSERT `friend_requests`                                                                  | `src/components/profile/FriendButton.tsx`            | Non                 | Non                      | Non         |
| Accepter/refuser une demande d'amis   | `FriendButton.tsx`                     | Supabase client direct UPDATE             | Client  | UPDATE `friend_requests.status`                                                           | `src/components/profile/FriendButton.tsx`            | Non                 | Non                      | Non         |
| Nudge (relance) dans une ligue        | `SquadDetailClient.tsx`                | `POST /api/squads/nudge`                  | POST    | INSERT `squad_nudges` + push                                                              | `src/app/api/squads/nudge/route.ts`                  | Non                 | Non                      | Non         |
| Démarrer une saison de championnat    | Admin squad                            | `POST /api/squads/[squadId]/start-season` | POST    | RPC `start_squad_season`                                                                  | `src/app/api/squads/[squadId]/start-season/route.ts` | Non                 | Oui (RPC)                | Non         |

### 1.7 Notifications

| Action utilisateur                                                    | Trigger UI                                  | Endpoint / handler                       | Méthode      | Side effects DB                          | Fichier source                                                 | Rate limit | Transaction atomique | Logué                 |
| --------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------- | ------------ | ---------------------------------------- | -------------------------------------------------------------- | ---------- | -------------------- | --------------------- |
| Opt-in push (activation)                                              | `NotificationsClient.tsx` / `PushOptIn.tsx` | `POST /api/push/subscribe`               | POST         | UPSERT `push_subscriptions`              | `src/app/api/push/subscribe/route.ts`                          | Non        | Non                  | `log.error` sur échec |
| Opt-out push (désinstallation SW)                                     | OS / navigateur                             | SW `pushsubscriptionchange`              | Événement SW | Aucun (delete subscription TODO?)        | `public/sw.js` (à confirmer)                                   | N/A        | N/A                  | Non                   |
| Toggle type de notif (VAR, pronos, pré-match, digest, squad chat, DM) | `NotificationsClient.tsx`                   | Supabase client direct UPDATE `profiles` | Client       | UPDATE `profiles.notif_*`                | `src/app/(app)/settings/notifications/NotificationsClient.tsx` | Non        | Non                  | Non                   |
| Changement montant quick-bet                                          | `SettingsClient.tsx`                        | Supabase client direct UPDATE            | Client       | UPDATE `profiles.default_var_bet_amount` | `src/app/(app)/settings/SettingsClient.tsx`                    | Non        | Non                  | Non                   |

### 1.8 Settings / Profil

| Action utilisateur                                                  | Trigger UI               | Endpoint / handler                                     | Méthode | Side effects DB                                            | Fichier source                                 | Rate limit | Transaction atomique | Logué              |
| ------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------ | ------- | ---------------------------------------------------------- | ---------------------------------------------- | ---------- | -------------------- | ------------------ |
| Modifier pseudo / avatar / équipe favorite / compétitions préférées | `ProfileEditModal.tsx`   | `PATCH /api/profile`                                   | PATCH   | UPDATE `profiles` via adminClient (vérif unicité username) | `src/app/api/profile/route.ts`                 | Non        | Non                  | `log.error` sur DB |
| Consulter son historique de paris                                   | `ProfileHistorique.tsx`  | Supabase client SELECT                                 | Client  | Aucun                                                      | `src/components/profile/ProfileHistorique.tsx` | Non        | N/A                  | Non                |
| Consulter ses stats filtrées                                        | `StatsSection.tsx`       | RPC `get_my_stats(competition_id, team_id, season_id)` | RPC     | Aucun                                                      | `src/components/profile/StatsSection.tsx`      | Non        | N/A                  | Non                |
| Réclamation daily recap (dismiss)                                   | `MatchdayRecapModal.tsx` | Supabase client UPDATE                                 | Client  | UPDATE `user_daily_recaps.dismissed_at`                    | `src/components/layout/MatchdayRecapModal.tsx` | Non        | Non                  | Non                |
| Bilan quotidien affiché                                             | `DailyRecapChecker.tsx`  | Supabase SELECT `user_daily_recaps`                    | Client  | Aucun                                                      | `src/components/layout/DailyRecapChecker.tsx`  | Non        | N/A                  | Non                |

---

## 2. Inventaire des features pronostics

### Type : Score exact avant-match

- **Description** : Le user prédit le score final (ex : "2-1"). Gratuit, aucun débit de Sifflets.
- **Quand est-ce ouvert** : Match en statut `upcoming` uniquement (vérification côté RPC `place_match_prono`).
- **Quand est-ce fermé** : Dès que `matches.status` passe à `first_half` (synchronisé par le cron `match-monitor` via API-Football).
- **Comment c'est résolu** : RPC `resolve_match_pronos(p_match_id)` appelée dans `POST /api/admin/finish-match` et dans le cron `match-monitor` sur status FT. Compare `prono_value` (ex `"2-1"`) au score final (`home_score-away_score`). Gagnant → `points_earned = 2000`, XP, rank mis à jour.
- **Tables Supabase impliquées** : `pronos`, `matches`, `profiles`
- **Endpoints API** : RPC `place_match_prono` (client Supabase direct depuis `MatchPronoCard.tsx`), `POST /api/admin/finish-match` (résolution), `GET /api/cron/match-monitor` (résolution auto FT)
- **Composants UI** : `src/components/pronos/MatchPronoCard.tsx`, `src/components/pronos/PronosticsHubClient.tsx`, `src/app/(app)/pronos/page.tsx`
- **Cycle de vie** : `pending` → (après FT) `won` | `lost`
- **Cote / multiplicateur** : Fixe — 2000 points si score exact. Pas de multiplicateur parimutuel.

### Type : Allocation de buteurs avant-match

- **Description** : Le user prédit qui va marquer les buts (ex : Mbappé 2 buts, Griezmann 1 but) en JSON. Lié au score exact prédit.
- **Quand est-ce ouvert** : Match en statut `upcoming`, soumis en même temps que le score exact (`scorer_allocation` dans le même appel RPC).
- **Quand est-ce fermé** : Coup d'envoi (même logique que score exact).
- **Comment c'est résolu** : Dans `resolve_match_pronos` — compare les buteurs prédits (JSON) aux événements `match_timeline_events` (goals). La logique exacte de scoring des buteurs est dans `src/lib/__tests__/scorer.test.ts` (calcul par allocation/total_goals). `points_earned` variable selon le nb de buteurs corrects.
- **Tables Supabase impliquées** : `pronos` (prono_type = `scorer_allocation`), `match_timeline_events`, `profiles`
- **Endpoints API** : RPC `place_match_prono` (même appel que score exact)
- **Composants UI** : `src/components/pronos/ScorerAllocationEditor.tsx`, `src/components/pronos/PlayerPickerSheet.tsx`, `src/components/pronos/CustomPlayerSelect.tsx`
- **Cycle de vie** : `pending` → `won` | `lost`
- **Cote / multiplicateur** : Variable — `reward_amount = 500` pts fix si le prono est 100% correct (à confirmer avec founder).

### Type : Paris VAR communautaires live (marchés courts termes)

- **Description** : Le user parie des Sifflets sur OUI ou NON (ou une option multi-choix) quand un market event s'ouvre. Cotes parimutuel dynamiques calculées sur la masse des mises.
- **Quand est-ce ouvert** : Automatiquement, quand un seuil de signalements communautaires (`alert_signals`) est atteint (seuil dynamique basé sur l'audience via `count_active_users_on_match`) OU par le cron `match-monitor` (stoppage_ht/stoppage_ft, VAR goal, penalty_check via API-Football). Fenêtre de vote : 90s (constante `LIVE_BETTING_WINDOW_SECONDS`).
- **Quand est-ce fermé** : RPC `close_expired_market_events` (appelée à chaque tick du cron `match-monitor`) ferme automatiquement les events ouverts depuis > 90s.
- **Comment c'est résolu** : RPC `resolve_event_parimutuel(event_id, result)`. Résolution via : modérateur (trust_score ≥ 150) via `POST /api/admin/resolve-event`, ou auto via cron `match-monitor` (stoppage time) ou via `resolve_event_parimutuel` interne. Les initiateurs de l'alerte reçoivent ±karma sur `trust_score`.
- **Tables Supabase impliquées** : `market_events`, `bets`, `alert_signals`, `profiles`, `match_presence`
- **Endpoints API** : `POST /api/alert` (signal), `POST /api/bet` (mise), `POST /api/var-bets/quick-bet` (mise rapide), `POST /api/admin/resolve-event`, `GET /api/cron/match-monitor`
- **Composants UI** : `src/components/match/ActionDrawer.tsx`, `src/components/match/VotingModal.tsx`, `src/components/match/LiveRoom.tsx`, `src/components/voting/VotingButtons.tsx`
- **Cycle de vie** : `open` (90s) → `closed` (attente résolution) → `resolved`
- **Types d'events disponibles** : `penalty_check`, `penalty_outcome`, `var_goal`, `red_card`, `free_kick`, `corner`, `stoppage_ht`, `stoppage_ft` (+ `injury_sub` dans le check mais supprimé en migration `0100`)
- **Cote / multiplicateur** : Dynamique parimutuel — RPC `get_event_odds(event_id)` retourne `implied_multiplier` = `total_pool / option_pool`. Bonus "Braquage" : si le user gagne dans une ligue où des co-membres ont perdu, il reçoit en prime leur mise proportionnellement.

### Type : Paris longs termes sur résultat de match (PolyMarket tab)

- **Description** : Le user parie des Sifflets sur le buteur ou le score exact AVANT le match, avec un multiplicateur fixe et un débit immédiat. Différent des pronos gratuits.
- **Quand est-ce ouvert** : Match en statut `upcoming`.
- **Quand est-ce fermé** : Coup d'envoi (vérification implicite via `place_long_term_bet`).
- **Comment c'est résolu** : RPC `resolve_long_term_bets(p_match_id)` — appelée dans `POST /api/admin/finish-match`.
- **Tables Supabase impliquées** : `long_term_bets`, `matches`, `profiles`
- **Endpoints API** : RPC `place_long_term_bet` (appelée depuis `PolymarketTab.tsx`), `POST /api/admin/finish-match` (résolution)
- **Composants UI** : `src/components/match/PolymarketTab.tsx`
- **Cycle de vie** : `pending` → `won` | `lost`
- **Cote / multiplicateur** : Fixe (passé en paramètre `p_potential_reward` par le client — aucune validation serveur sur le multiplicateur). **Risque : pas de validation du multiplicateur côté serveur.**

### Type : Paris arrêts de jeu (stoppage_ht / stoppage_ft)

- **Description** : Le user parie sur le nombre de minutes d'arrêts de jeu (options : "1", "2", "3", "4", "5", "6+"). Market multi-options, pas binaire OUI/NON.
- **Quand est-ce ouvert** : Automatiquement par le cron `match-monitor` : `stoppage_ht` à la 41e minute, `stoppage_ft` à la 86e minute (statuts API-Football "1H"/"2H").
- **Quand est-ce fermé** : Même mécanique 90s que les autres markets.
- **Comment c'est résolu** : Cron `match-monitor` via `resolveStoppageMarket()` — détermine la durée réelle depuis l'API-Football (`extra` ou `elapsed - base`). Appelle `resolveEvent`.
- **Tables Supabase impliquées** : `market_events`, `bets`, `profiles`
- **Endpoints API** : `GET /api/cron/match-monitor`
- **Composants UI** : `src/components/match/VotingModal.tsx` (même composant, multi-options)
- **Cycle de vie** : `open` → `closed` → `resolved`
- **Cote / multiplicateur** : Parimutuel dynamique (même que marchés VAR).

### Type : Pronos "Friend hints" (social)

- **Description** : Pas un prono indépendant — affiche au user les choix de ses amis sur le même match. Lecture seule des pronos existants des amis.
- **Quand est-ce ouvert** : Pendant que le match est en statut `upcoming` ou `live`.
- **Tables impliquées** : `pronos`, `friend_requests`, `profiles`
- **Endpoints API** : `GET /api/pronos/friend-hints?matchId=` → RPC `get_friend_pronos`
- **Composants UI** : `src/components/match/FriendPronoHints.tsx`
- **Cote** : N/A (affichage seul).

### Types de pronostics ABSENTS du code

Les catégories suivantes **n'existent pas dans le code** :

- **Avant-match 1N2 (vainqueur)** : Absent. Il y a des cotes 1N2 importées d'API-Football sur `matches.odds_home/draw/away` mais pas de prono utilisateur sur ce marché.
- **Méta / longue durée** : Absent (pas de "vainqueur compétition", "top scorer saison", etc.).
- **Défis entre amis ou défis de ligue** : Absent (les ligues ont un classement mais pas de défi point-à-point).
- **Pronostics communautaires custom** : Absent.
- **Cartons / corners avant-match** : Absent.

---

## 3. Schéma DB simplifié (tables clés)

### Table : `profiles`

**Rôle** : Profil joueur — un row par `auth.users`. Source de vérité pour le solde (Sifflets), XP, rang, gamification et préférences.

**Colonnes clés** :

- `id` (uuid, PK, FK `auth.users`)
- `username` (text, UNIQUE lower-case index)
- `sifflets_balance` (integer, CHECK ≥ 0) — monnaie dépensable
- `xp` (integer) — points cumulés à vie (utilisé pour le rang)
- `rank` (text) — `'Arbitre de District' | 'Sifflet de Bronze' | 'Sifflet d'Argent' | 'Boss de la VAR'`
- `trust_score` (integer, 0–1000, défaut 100) — karma Waze + accès modérateur si ≥ 150
- `winrate` (numeric 6,3)
- `login_streak` (integer), `last_login_date` (date), `streak_freezes_owned` (int 0-3)
- `lifetime_points_earned` (integer) — cumul vie entière, déclenche trigger season_points
- `monthly_points_earned` (integer) — remis à zéro 1er/mois
- `season_points` (integer) — saison courante (synced via trigger depuis lifetime_points)
- `current_season_id` (uuid FK `seasons`)
- `default_var_bet_amount` (integer, défaut 50)
- `equipped_avatar_id`, `equipped_border_id`, `equipped_effect_id` (uuid FK `shop_items`)
- `notif_var_results`, `notif_prono_results`, `notif_pre_match_5min`, `notif_pre_match_2h`, `notif_daily_digest`, `notif_squad_chat`, `notif_dm` (boolean) — toggles notification
- `preferred_competitions` (uuid[]) — filtres compétitions
- `favorite_team_id` (uuid FK `teams`)
- `has_onboarded` (boolean)
- `avatar_url` (text, emoji ou null)
- `last_refill_date` (timestamptz)

**Indexes** : PK sur `id`, UNIQUE lower(`username`), `idx_profiles_season_points DESC`

**Relations** : Référencée par presque toutes les tables.

**Volume estimé** : Inconnu (pas de requête COUNT en prod). Probable < 10k au stade actuel.

**Realtime activé** : Oui (migration `0013_profiles_realtime.sql` — REPLICA IDENTITY FULL + publication).

**RLS activé** : Oui. SELECT : all authenticated. UPDATE : propre row uniquement, avec GRANT UPDATE(username) uniquement (pas solde). Service_role bypass total.

---

### Table : `pronos`

**Rôle** : Pronostics avant-match gratuits (score exact, allocation buteurs). Un row par (match, user, prono_type) avec UNIQUE index partiel.

**Colonnes clés** :

- `id` (uuid, PK)
- `match_id` (uuid, FK `matches`)
- `user_id` (uuid, FK `auth.users`)
- `prono_type` (text : `exact_score | scorer | scorer_allocation`)
- `prono_value` (text — score ex "2-1", ou JSON stringify des buteurs)
- `reward_amount` (integer) — récompense potentielle (2000 pour exact_score, 500 pour scorer_allocation)
- `points_earned` (integer) — renseigné au moment de la résolution
- `placed_at` (timestamptz)
- `status` (text : `pending | won | lost`)
- `applied_booster_id` (uuid FK `boosters_catalog`, nullable) — booster utilisé sur ce prono

**Indexes** : `idx_pronos_user_match (user_id, match_id)`, `idx_pronos_match_status (match_id, status)`, UNIQUE partiel `pronos_exact_score_unique (match_id, user_id) WHERE prono_type = 'exact_score'`, UNIQUE partiel `pronos_scorer_alloc_unique (match_id, user_id) WHERE prono_type = 'scorer_allocation'`

**Relations** : `matches`, `auth.users`, `boosters_catalog`

**Volume estimé** : Inconnu.

**Realtime** : Non.

**RLS** : SELECT own uniquement. Service_role write.

---

### Table : `bets`

**Rôle** : Paris courts termes sur les marchés VAR live. Un pari par (user, event) max via UNIQUE constraint.

**Colonnes clés** :

- `id` (uuid, PK)
- `user_id` (uuid, FK `profiles`)
- `event_id` (uuid, FK `market_events`)
- `chosen_option` (text — `oui`, `non`, ou option multi-choix pour stoppage)
- `amount_staked` (integer, min 10)
- `potential_reward` (numeric 14,4)
- `placed_at` (timestamptz)
- `status` (text : `pending | won | lost`)
- `squad_id` (uuid FK `squads`, nullable) — pour le bonus Braquage
- `applied_booster_id` (uuid FK `boosters_catalog`, nullable)

**Indexes** : `bets_user_id_idx`, `bets_event_id_idx`, `idx_bets_squad_id (WHERE squad_id IS NOT NULL)`, `idx_bets_user_placed (user_id, placed_at DESC)`, UNIQUE `(user_id, event_id)`

**Relations** : `profiles`, `market_events`, `squads`, `boosters_catalog`

**Volume estimé** : Inconnu.

**Realtime** : Oui (REPLICA IDENTITY FULL, publication active — `0005_fix_realtime.sql`).

**RLS** : SELECT/INSERT own uniquement.

---

### Table : `market_events`

**Rôle** : Marchés de paris VAR — un event par incident de jeu signalé ou détecté automatiquement.

**Colonnes clés** :

- `id` (uuid, PK)
- `match_id` (uuid, FK `matches`)
- `type` (text : `penalty_check | penalty_outcome | var_goal | red_card | free_kick | corner | stoppage_ht | stoppage_ft`)
- `status` (text : `open | closed | resolved`)
- `result` (text nullable — la valeur gagnante)
- `initiators` (uuid[] — user_ids des déclencheurs d'alerte)
- `resolved_at` (timestamptz, nullable)
- `created_at` (timestamptz)

**Indexes** : `market_events_match_created_idx (match_id, created_at DESC)`, `market_events_match_status_idx (match_id, status)`

**Relations** : `matches` ; bets.event_id FK

**Volume estimé** : Inconnu. Fonction du nombre de matchs live.

**Realtime** : Oui (REPLICA IDENTITY FULL, migration `0005`).

**RLS** : SELECT all authenticated. INSERT/UPDATE service_role uniquement.

---

### Table : `matches`

**Rôle** : Catalogue des matchs de football.

**Colonnes clés** :

- `id` (uuid, PK)
- `team_home`, `team_away` (text)
- `home_team_id`, `away_team_id` (uuid FK `teams`)
- `status` (text : `upcoming | first_half | half_time | second_half | paused | finished`)
- `start_time` (timestamptz)
- `home_score`, `away_score` (integer)
- `competition_id` (uuid FK `competitions`)
- `api_football_id` (integer — clé externe API-Football)
- `alert_cooldown_until` (timestamptz)
- `odds_home`, `odds_draw`, `odds_away` (numeric 5,2 — cotes 1N2 externes)
- `has_lineups` (boolean)
- `last_stats_sync_at` (timestamptz)
- `match_minute` (integer)

**Indexes** : `matches_status_start_idx (status, start_time DESC)`

**Realtime** : Oui (REPLICA IDENTITY FULL, migration `0004`).

**RLS** : SELECT all authenticated. INSERT/UPDATE service_role via admin.

---

### Table : `squads`

**Rôle** : Ligues privées persistantes entre amis.

**Colonnes clés** :

- `id` (uuid, PK)
- `name` (text, max 30 chars)
- `invite_code` (text, UNIQUE, 6 chars)
- `owner_id` (uuid FK `profiles`)
- `game_mode` (text : `classic | braquage`)
- `chat_last_push_at` (timestamptz — cooldown notifications chat)
- `is_private` (boolean)

**Indexes** : UNIQUE `invite_code (WHERE NOT NULL)`, `squads_owner_id_idx`

**RLS** : SELECT si public ou owner ou membre. INSERT si owner = soi. RPC `squad_by_invite_code` SECURITY DEFINER pour bypass RLS sur code d'invitation.

---

### Table : `squad_members`

**Rôle** : Membres d'une ligue.

**Colonnes clés** :

- `user_id` (uuid, FK `profiles`)
- `squad_id` (uuid, FK `squads`)
- `joined_at` (timestamptz)
- PK (user_id, squad_id)

**RLS** : SELECT own rows uniquement (anti-récursion). RPC `squad_members_for_my_squads` SECURITY DEFINER pour voir les co-membres.

---

### Table : `squad_messages`

**Rôle** : Messages du chat ligue.

**Colonnes clés** :

- `id` (uuid, PK)
- `squad_id` (uuid, FK `squads`)
- `user_id` (uuid FK `profiles`, nullable pour messages système)
- `content` (text, 1-200 chars)
- `is_system_message` (boolean)
- `created_at` (timestamptz)

**Indexes** : `(squad_id, created_at DESC)`

**Realtime** : Oui (REPLICA IDENTITY FULL).

**RLS** : SELECT si membre. INSERT si membre et user_id = soi.

---

### Table : `push_subscriptions`

**Rôle** : Endpoints VAPID Web Push par user/device.

**Colonnes clés** :

- `id` (uuid, PK)
- `user_id` (uuid FK `auth.users`)
- `endpoint` (text)
- `keys` (jsonb : `{p256dh, auth}`)
- `created_at` (timestamptz)
- UNIQUE (user_id, endpoint)

**RLS** : SELECT/INSERT/DELETE own. Service_role all.

---

### Table : `push_logs`

**Rôle** : Dédup des notifications push + budget quotidien.

**Colonnes clés** :

- `id` (uuid, PK)
- `user_id` (uuid FK `auth.users`)
- `match_id` (uuid FK `matches`, nullable)
- `type` (text : `var_alert | pre_match | pre_match_2h | resolution | digest | nudge`)
- `sent_at` (timestamptz)

**Indexes** : `push_logs_user_date_idx (user_id, sent_at DESC)`, UNIQUE `push_logs_prematch_uniq (user_id, match_id) WHERE type='pre_match'`, UNIQUE `push_logs_prematch2h_uniq (user_id, match_id) WHERE type='pre_match_2h'`, `idx_push_logs_user_id`

**RLS** : Service_role write uniquement.

---

### Table : `shop_items`

**Rôle** : Catalogue des items cosmétiques (avatars, bordures, effets).

**Colonnes clés** :

- `id` (uuid, PK)
- `slug` (text, UNIQUE)
- `category` (text : `avatar | border | effect`)
- `name`, `description` (text)
- `price_pts` (integer)
- `unlock_rank` (text nullable — rang requis pour déverrouillage gratuit)
- `asset_url` (text — emoji ou CSS key)
- `is_active` (boolean)

**Volume** : Seed initial de 15 items (8 avatars, 4 bordures, 3 effets). Extensible.

**RLS** : SELECT tous (pas d'auth requis).

---

### Table : `user_shop_inventory`

**Rôle** : Items possédés par les users.

**Colonnes clés** :

- `user_id` (uuid FK `profiles`)
- `shop_item_id` (uuid FK `shop_items`)
- `purchased_at` (timestamptz)
- `is_equipped` (boolean)
- PK (user_id, shop_item_id)

**RLS** : SELECT/INSERT/UPDATE own.

---

### Table : `boosters_catalog`

**Rôle** : Catalogue des boosters consommables.

**Colonnes clés** :

- `id` (uuid, PK), `slug` (UNIQUE)
- `effect_type` (text : `double_xp | cote_plus | safety_net | vision`)
- `effect_value` (jsonb)
- `price_pts` (integer)

**Volume** : Seed de 4 boosters (Double XP 300pts, Cote+ 200pts, Safety Net 500pts, Vision 100pts).

---

### Table : `user_boosters_inventory`

**Rôle** : Stock de boosters par user.

**Colonnes clés** :

- `id` (uuid, PK)
- `user_id` (uuid FK `profiles`)
- `booster_id` (uuid FK `boosters_catalog`)
- `acquired_at` (timestamptz)
- `consumed_at` (timestamptz, nullable)
- `consumed_on_event_id` (uuid FK `market_events`, nullable)
- `consumed_on_prono_id` (uuid FK `pronos`, nullable)

**Indexes** : `user_boosters_user_idx (user_id)`

---

### Table : `seasons`

**Rôle** : Saisons mensuelles pour le classement compétitif.

**Colonnes clés** :

- `id` (uuid, PK)
- `slug` (text, UNIQUE — ex `'2026-05'`)
- `label` (text)
- `starts_at`, `ends_at` (timestamptz)
- `is_current` (boolean)

**Volume** : 1 row par mois. Actuellement : saison Mai 2026.

---

### Table : `season_archives`

**Rôle** : Historique des classements de fin de saison.

**Colonnes clés** :

- `user_id` (uuid FK `profiles`), `season_id` (uuid FK `seasons`)
- `final_rank` (integer), `final_points` (integer), `final_rank_label` (text)
- PK (user_id, season_id)

---

### Table : `badges` / `user_badges`

**Rôle** : Système de trophées débloquables.

**`badges`** : `slug (UNIQUE)`, `label`, `criteria_type` (text). Seed de 6 badges : oeil_de_faucon, nostradamus, collina, chat_noir, fidele, goleador.

**`user_badges`** : PK (user_id, badge_id), `unlocked_at`. **Realtime activé** (REPLICA IDENTITY FULL).

---

### Table : `alert_signals`

**Rôle** : Signalements communautaires d'incidents VAR.

**Colonnes clés** :

- `id` (uuid, PK), `match_id` (uuid FK `matches`), `user_id` (uuid FK `profiles`)
- `action_type` (text — même enum que market_events types)
- `created_at` (timestamptz)

**Indexes** : `(match_id, action_type, created_at DESC)`

**Realtime** : Oui (migration `0047`).

---

### Table : `match_subscriptions`

**Rôle** : Abonnements aux notifications d'un match.

**Colonnes clés** :

- `user_id`, `match_id` (PK composite)
- `smart_mute` (boolean — abonné mais silence)

---

### Table : `match_presence`

**Rôle** : Compteur d'audience temps réel par match.

**Colonnes clés** :

- `match_id`, `user_id` (PK composite)
- `last_seen_at` (timestamptz — ping toutes les 60s)

**Indexes** : `(match_id, last_seen_at DESC)`

---

### Table : `friend_requests`

**Rôle** : Système d'amis entre utilisateurs.

**Colonnes clés** :

- `id` (uuid, PK), `sender_id`, `receiver_id` (FK `profiles`)
- `status` (text : `pending | accepted | rejected`)
- UNIQUE (sender_id, receiver_id)

**Indexes** : `idx_friend_requests_receiver_id (receiver_id)`

---

### Table : `user_daily_recaps`

**Rôle** : Bilan quotidien J-1 par user (généré par cron `daily-digest`).

**Colonnes clés** :

- `user_id`, `recap_date` (PK composite)
- `pronos_total`, `pronos_correct`, `pronos_exact` (integer)
- `var_bets_total`, `var_bets_won` (integer)
- `points_earned` (integer)
- `rank_general`, `rank_squad_primary` (integer nullable)
- `dismissed_at` (timestamptz nullable)

**Indexes** : `idx_user_daily_recaps_user_id (user_id)`

---

### Table : `rate_limit_log`

**Rôle** : Rate limiting DB pour routes sans table métier naturelle.

**Colonnes clés** :

- `id` (uuid, PK), `user_id` (uuid FK `auth.users`), `route` (text), `created_at` (timestamptz)

**Indexes** : Composite `(user_id, route, created_at DESC)`

---

### Table : `long_term_bets`

**Rôle** : Paris avant-match payants (PolyMarket tab).

**Colonnes clés** :

- `id` (uuid, PK), `match_id`, `user_id`, `bet_type` (`scorer | exact_score`), `bet_value`, `amount_staked` (min 10), `potential_reward`, `status` (`pending | won | lost`)
- UNIQUE (match_id, user_id, bet_type, bet_value)

---

### Table : `tweet_log` / `twitter_tokens`

**Rôle** : `tweet_log` — dédup des tweets par market_event. `twitter_tokens` — singleton OAuth 2.0 Twitter.

**tweet_log colonnes clés** : `market_event_id`, `match_id`, `tweet_id`, `tweet_type` (`event_open | event_resolved | post_match`)

**RLS** : Aucun accès public — service_role uniquement.

---

### Tables signalées absentes / non-identifiées

- **Table de ban** : **ABSENTE**. Pas de `bans`, pas de `banned_at` sur profiles.
- **Table de reports/signalements** : **ABSENTE**.
- **Table d'audit log** : **ABSENTE** (pas de table `audit_log` ou `admin_actions`).
- **Table de notifications in-app** : **ABSENTE** (seulement push web + email, pas de notification in-app persistante).

---

### Tables existantes non couvertes en détail (moins pertinentes pour tracking/admin)

- `competitions`, `teams`, `players`, `lineups`, `match_timeline_events`, `match_statistics`, `match_odds`, `match_subscriptions`, `squad_fixtures`, `squad_seasons`, `squad_championship_rounds`, `squad_messages_last_read`, `squad_nudges`, `match_community_stats`, `direct_message_threads`, `direct_messages`, `player_odds`, `preferred_competitions`, `booster_highlights`

---

## 4. Inventaire des comportements de modération existants

| Comportement                           | Implémentation actuelle                                                                                                                                                         | Fichier(s)                                                                                                                                                                                          | Manque évident                                                                                                                                                |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ban utilisateur**                    | **ABSENT**                                                                                                                                                                      | —                                                                                                                                                                                                   | Table `bans`, middleware check, UI admin                                                                                                                      |
| **Shadow-ban**                         | **ABSENT**                                                                                                                                                                      | —                                                                                                                                                                                                   | Flag `is_shadow_banned` sur `profiles`, filtrage côté lecture                                                                                                 |
| **Accès modérateur**                   | `trust_score ≥ 150` sur `profiles.trust_score`. Check applicatif dans chaque route admin (pas de middleware global).                                                            | `src/lib/constants/permissions.ts` (`MODERATOR_THRESHOLD = 150`), dans `resolve-event`, `finish-match`, `sync-matches`, `match-state`, `import-assets`, `resolve-league-round`, `generate-outreach` | Pas de table de rôles. Le trust_score peut être manipulé (initiateurs d'alertes correctes + 10 pts × répétition). Pas de vraie séparation founder/modérateur. |
| **Rate limiting — alertes VAR**        | Max 5 alertes/60s via comptage `alert_signals` (in-route, pas middleware) + trust_score minimum `MIN_TRUST_ALERT_SCORE` (à confirmer valeur, dans `src/lib/constants/alert.ts`) | `src/app/api/alert/route.ts`                                                                                                                                                                        | Contournement possible si user a plusieurs devices. Silencieux (succès HTTP sans erreur).                                                                     |
| **Rate limiting — paris (bets)**       | Max 10 paris/60s via comptage `bets` dans `/api/bet` ; max 15/60s via comptage `bets` dans `/api/var-bets/quick-bet`                                                            | `src/app/api/bet/route.ts`, `src/app/api/var-bets/quick-bet/route.ts`                                                                                                                               | Rate limit sur la table source (pas Redis) — SELECT extra à chaque requête.                                                                                   |
| **Rate limiting — shop**               | Max 10 achats/60s via comptage `user_shop_inventory` ou `user_boosters_inventory`                                                                                               | `src/app/api/shop/purchase/route.ts`, `src/app/api/boosters/purchase/route.ts`                                                                                                                      | Idem — SELECT extra.                                                                                                                                          |
| **Rate limiting — routes admin**       | Via table `rate_limit_log` : 10 req/60s (`admin-finish-match`), 20 req/60s (`admin-resolve-event`), 5 req/60s (`claim-daily-streak`, `claim-rsa`)                               | `src/lib/db-rate-limiter.ts`, `src/lib/constants/rate-limits.ts`                                                                                                                                    | Pas de rate limit sur `/api/alert`, `/api/squads/*`, `/api/profile`, `/api/push/subscribe`.                                                                   |
| **Anti-doublon paris**                 | UNIQUE constraint `(user_id, event_id)` sur `bets` — erreur 409 retournée proprement                                                                                            | Migration `0006`, check dans `place_bet` RPC                                                                                                                                                        | OK — bien géré.                                                                                                                                               |
| **Anti-doublon pronos**                | UNIQUE indexes partiels sur `pronos` (un par type par match par user) — upsert                                                                                                  | Migration `0050`                                                                                                                                                                                    | OK.                                                                                                                                                           |
| **Spam detection chat**                | Aucune — juste MAX 200 chars sur `squad_messages`                                                                                                                               | Migration `0072`                                                                                                                                                                                    | Pas de limite de fréquence sur les messages de chat. Abus possible.                                                                                           |
| **Spam detection alertes**             | Trust_score minimum + 5 alertes/60s (silencieux)                                                                                                                                | `src/app/api/alert/route.ts`                                                                                                                                                                        | Pas de cooldown individuel persistant entre les alertes du même type.                                                                                         |
| **Multi-comptes detection**            | **ABSENT**                                                                                                                                                                      | —                                                                                                                                                                                                   | Pas de vérif IP, device fingerprint, captcha. Google OAuth ne garantit qu'un compte par email Google.                                                         |
| **Anti-abus paris (mise quotidienne)** | **ABSENT**                                                                                                                                                                      | —                                                                                                                                                                                                   | Pas de cap sur la mise totale quotidienne. Possible d'épuiser son solde indéfiniment.                                                                         |
| **Audit log actions admin**            | **ABSENT**                                                                                                                                                                      | —                                                                                                                                                                                                   | Aucun log structuré des résolutions manuelles (qui a résolu quoi, quand).                                                                                     |
| **Reports / signalements users**       | **ABSENT**                                                                                                                                                                      | —                                                                                                                                                                                                   | Pas d'endpoint, pas de table.                                                                                                                                 |
| **Cooldown match VAR**                 | `matches.alert_cooldown_until` — empêche l'ouverture de marchés trop fréquente                                                                                                  | `src/app/api/alert/route.ts`                                                                                                                                                                        | Bien implémenté. Durée = `COOLDOWN_MINUTES` depuis `src/lib/constants/alert.ts`.                                                                              |
| **Crons sécurisés**                    | `Authorization: Bearer <CRON_SECRET>` avec timing-safe comparison dans tous les crons                                                                                           | Tous les `src/app/api/cron/*/route.ts`                                                                                                                                                              | OK — bonne pratique respectée.                                                                                                                                |
| **Webhooks sécurisés**                 | `x-webhook-secret` header avec timing-safe comparison                                                                                                                           | `src/app/api/webhooks/new-profile/route.ts`                                                                                                                                                         | OK.                                                                                                                                                           |

---

## 5. Stack analytics existante

### Analytics tiers

| Outil                                                | Présence   | Détail                                                                                                                |
| ---------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------- |
| **PostHog**                                          | **ABSENT** | Pas dans `package.json`, pas dans `layout.tsx`, pas dans le code                                                      |
| **Mixpanel**                                         | **ABSENT** | —                                                                                                                     |
| **Amplitude**                                        | **ABSENT** | —                                                                                                                     |
| **Plausible**                                        | **ABSENT** | —                                                                                                                     |
| **Umami**                                            | **ABSENT** | —                                                                                                                     |
| **Segment**                                          | **ABSENT** | —                                                                                                                     |
| **Google Analytics / GTM**                           | **ABSENT** | —                                                                                                                     |
| **Vercel Analytics** (`@vercel/analytics`)           | **ABSENT** | Pas dans `package.json`                                                                                               |
| **Vercel Speed Insights** (`@vercel/speed-insights`) | **ABSENT** | Pas dans `package.json`                                                                                               |
| **Sentry**                                           | **ABSENT** | Commentaire `// TODO: when Sentry is integrated, route log.error to Sentry.captureException` dans `src/lib/logger.ts` |
| **DataDog / New Relic / autre APM**                  | **ABSENT** | —                                                                                                                     |

### Logging applicatif maison

| Mécanisme                             | Description                                                                                                                                                                 | Fichier                            |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `log.info / log.warn / log.error`     | Logger JSON structuré custom. En prod : `console.log(JSON.stringify({level, service, msg, ts, ...data}))`. En dev : format lisible. **N'envoie rien à un service externe.** | `src/lib/logger.ts`                |
| `console.error` direct dans PushOptIn | `console.error("[Push] ...")` dans le composant push client. Non structuré.                                                                                                 | `src/components/pwa/PushOptIn.tsx` |
| `console.log` dans logger dev         | Format humain uniquement en dev.                                                                                                                                            | `src/lib/logger.ts`                |

**Conclusion** : L'app part de zéro en analytics. Le seul observability est le logger JSON vers stdout (logs Vercel), sans agrégation ni alertes. Il n'y a pas de moyen de connaître le nombre d'actions réalisées, le taux de conversion des pronos, ni même le nombre d'utilisateurs actifs — sauf en requêtant Supabase directement.

### Scripts analytics dans le HTML

Aucun `<Script>` analytics dans `src/app/layout.tsx` ou `next.config.ts`. Aucun header de tracking.

---

## 6. Auth admin existante

| Mécanisme                                                 | Présence                                     | Détail                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Colonne `role` ou `is_admin` sur `profiles`               | **ABSENT**                                   | Il n'y a pas de colonne de rôle structuré                                                                                                                                                                                                                                                              |
| Table `roles` séparée                                     | **ABSENT**                                   | —                                                                                                                                                                                                                                                                                                      |
| `trust_score ≥ 150` comme proxy modérateur                | **PRÉSENT**                                  | Constante `MODERATOR_THRESHOLD = 150` dans `src/lib/constants/permissions.ts`. Vérifié en dur dans 7 routes admin.                                                                                                                                                                                     |
| Middleware Next.js qui check un rôle pour routes `/admin` | **ABSENT**                                   | Le middleware (`src/middleware.ts`) protège `/lobby`, `/match`, `/squads`, `/ligues`, `/profile`, `/leaderboard` mais **PAS `/admin`**. Les routes `/admin/*` sont accessibles sans authentification au niveau middleware — le check est dans la page elle-même (redirect si trust_score insuffisant). |
| Composant `<AdminOnly>` ou wrapper                        | **ABSENT**                                   | —                                                                                                                                                                                                                                                                                                      |
| Variables d'env type `ADMIN_USER_IDS`                     | **ABSENT**                                   | Seul `ADMIN_EMAIL` existe dans les crons (`personal-branding`, `community-listener`) pour envoyer les emails internes. Valeur hardcodée : `rem.valet@gmail.com`.                                                                                                                                       |
| RLS Supabase basé sur un rôle JWT                         | **ABSENT**                                   | RLS standard basé sur `auth.uid()`. Pas de `auth.jwt() ->> 'role'`.                                                                                                                                                                                                                                    |
| Routes `/admin/*` existantes                              | **PRÉSENTES**                                | `/admin/resolve` (résolution events), `/admin/push-test` (test push), `/admin/cron-test` (test crons), `/admin/press-outreach` (génération outreach presse)                                                                                                                                            |
| Auth sur routes `/api/admin/*`                            | Trust_score check en dur dans chaque handler | —                                                                                                                                                                                                                                                                                                      |

**Résumé auth admin** : L'accès admin est contrôlé uniquement via `profiles.trust_score ≥ 150` — un score qui s'incrémente automatiquement via le système communautaire Waze (+10 pts quand une alerte initiée s'avère correcte). Pas de séparation founder/modérateur. Pas de vrai système de rôles. Les pages `/admin/*` ne sont pas protégées par le middleware Next.js — seule la page elle-même redirect si le score est insuffisant (redirect côté serveur dans le Page Server Component, donc OK en pratique mais pas de protection middleware).

---

## 7. Realtime existant

### Tables avec Realtime (publications supabase_realtime)

| Table             | Migration                                                        | REPLICA IDENTITY FULL | Notes                                           |
| ----------------- | ---------------------------------------------------------------- | --------------------- | ----------------------------------------------- |
| `market_events`   | `0001_init.sql` + `0005_fix_realtime.sql`                        | Oui (0005)            | INSERT (ouverture marché) + UPDATE (résolution) |
| `bets`            | `0001_init.sql` + `0005_fix_realtime.sql`                        | Oui (0005)            | UPDATE filtré `user_id=eq.{userId}` (win/loss)  |
| `alert_signals`   | `0002_alert_signals.sql` + `0047_alert_signals_replica_full.sql` | Oui (0047)            | INSERT (feedback Waze)                          |
| `matches`         | `0004_realtime_matches.sql`                                      | Oui (0004)            | UPDATE (score, statut, cooldown)                |
| `profiles`        | `0013_profiles_realtime.sql`                                     | À confirmer           | UPDATE (balance, XP)                            |
| `user_badges`     | `0022_badges.sql`                                                | Oui (dans migration)  | INSERT (déblocage badge → toast)                |
| `squad_messages`  | `0072_squad_messages.sql`                                        | Oui                   | INSERT (chat ligue temps réel)                  |
| `direct_messages` | `0098_direct_messages.sql`                                       | Oui                   | INSERT (messagerie privée temps réel)           |

### Hooks / services Realtime

#### `src/components/match/LiveRoom.tsx`

- Canal : `match-room-${match.id}` (un canal par match)
- Abonnements :
  - UPDATE `matches` WHERE `id=eq.${match.id}` → sync score/statut/cooldown
  - INSERT `market_events` WHERE `match_id=eq.${match.id}` → ouvre VotingModal
  - UPDATE `market_events` WHERE `match_id=eq.${match.id}` → ferme VotingModal
  - UPDATE `bets` WHERE `user_id=eq.${userId}` → win/loss toast + update solde + VerdictOverlay
- Gestion déconnexion : `subscribe(status => setRealtimeConnected(status === 'SUBSCRIBED'))` — banner "reconnexion" affiché si non connecté
- Cleanup : `supabase.removeChannel(channel)` au unmount

#### `src/components/ligues/SquadChat.tsx`

- Canal : `squad-chat-${squadId}` (un canal par ligue)
- Abonnements : INSERT `squad_messages` WHERE `squad_id=eq.${squadId}`
- Pas de gestion explicite reconnexion

#### `src/components/profile/BadgeUnlockListener.tsx`

- Canal : `badges-${userId}` (un canal par user)
- Abonnements : INSERT `user_badges` WHERE `user_id=eq.${userId}` → toast badge débloqué

#### `src/components/messages/MessagesConversation.tsx`

- Canal : `dm-${threadId}` (un canal par thread)
- Abonnements : INSERT `direct_messages` WHERE `thread_id=eq.${threadId}`

### Patterns identifiés

- **Pattern dominant** : Postgres Changes (pas de Broadcast/Presence Supabase natif). Chaque composant ouvre son propre canal.
- **Filtres WHERE** : Tous les canaux filtrent par `match_id`, `user_id`, `squad_id` ou `thread_id` — pas de canal global "all-bets".
- **Throttle/debounce** : Aucun throttle côté UI sur les updates Realtime. Les updates du score dans le Scoreboard sont passées directement en state.
- **Audience count** : Polling toutes les 30s via RPC `count_active_users_on_match` (pas Realtime Presence).
- **Ping présence** : Polling toutes les 60s via UPSERT `match_presence` (pas Realtime Presence Supabase).
- **Reconnexion** : Le SDK Supabase gère la reconnexion automatique. L'UI affiche un banner "⚡ Reconnexion..." si `status !== 'SUBSCRIBED'`.

---

## 8. Observations transverses

### Risques identifiés

**R1 — Système modérateur manipulable**
Le seul mécanisme d'accès admin est `trust_score ≥ 150`. Ce score augmente de +10 pts par alerte correcte (résultat OUI), et diminue de −5 pts par fausse alerte. Un user qui joue beaucoup et a de la chance peut atteindre ce seuil sans intention malveillante — et inversement un fondateur peut avoir un trust_score bas s'il a signalé des fausses alertes. Il n'existe aucun moyen de donner le rang de modérateur sans jouer (à confirmer founder).

- Fichier : `src/lib/constants/permissions.ts` + `src/lib/constants/alert.ts`

**R2 — Place_long_term_bet : multiplicateur non validé côté serveur**
La RPC `place_long_term_bet` accepte `p_potential_reward` en paramètre envoyé par le client sans validation de cohérence. Un client malveillant pourrait envoyer `potential_reward = 999999`. La protection actuelle est le débit de `amount_staked` mais pas de cap sur le reward.

- Fichier : `supabase/migrations/0017_long_term_bets.sql`

**R3 — Routes `/admin/*` non protégées par le middleware**
Le middleware Next.js (`src/middleware.ts`) ne liste pas `/admin` dans les routes protégées. La protection est uniquement dans le Page Server Component (redirect). Si une route API admin oublie le check trust_score, elle est exposée.

- Fichier : `src/middleware.ts`

**R4 — Logger vers stdout seulement — zéro alerting en prod**
`log.error` dans `src/lib/logger.ts` appelle `console.error(JSON.stringify(...))`. Sur Vercel, ça s'écrit dans les logs runtime mais aucun outil n'agrège ces logs, n'alerte en cas d'erreur répétée, ni ne mesure la fréquence des erreurs. Le TODO Sentry est présent mais pas implémenté.

- Fichier : `src/lib/logger.ts`

**R5 — Chat ligue sans rate limit**
`POST /api/squads/[squadId]/messages` n'a aucun rate limit. Un user peut envoyer des milliers de messages par minute (seule limite : 200 chars par message). Le push a un cooldown 30 min mais la DB n'est pas protégée.

- Fichier : `src/app/api/squads/[squadId]/messages/route.ts`

**R6 — Agrégation de squad_members en O(n) côté application**
`GET /api/squads` charge tous les pronos et bets des membres pour calculer `pot_commun` côté JavaScript (double boucle). Sur des ligues importantes ou quand un user est dans de nombreuses ligues, cette requête peut être lente et charger beaucoup de données.

- Fichier : `src/app/api/squads/route.ts`

**R7 — Trust_score check via SELECT séparé avant chaque action admin**
Chaque route admin fait un SELECT sur `profiles.trust_score`. Si le trust_score est modifié entre deux requêtes (race), l'action passe. Mineur mais signalé.

**R8 — Résolution manuelle sans log d'audit**
Quand un modérateur résout un event via `/api/admin/resolve-event`, il n'y a aucune trace dans une table d'audit (qui a résolu, quel résultat, à quelle heure au-delà de `market_events.resolved_at`). Le modérateur ayant résolu est inconnu.

### Quick-wins repérés

**QW1 — PostHog peut être branché en 30 min**
Zéro analytics tiers. Un `posthog-js` + `PostHogProvider` dans `layout.tsx` suffit pour avoir des sessions et les premiers funnel events. Les actions trackables sont toutes bien identifiées (section 1).

**QW2 — Sentry en 15 min**
Le TODO est déjà dans `logger.ts`. Il suffit de `npm install @sentry/nextjs`, `sentry.server.config.ts`, et router `log.error` vers `Sentry.captureException`.

**QW3 — Middleware admin avec liste d'emails fondateurs**
Une variable d'env `ADMIN_EMAILS=rem.valet@gmail.com,autre@...` + check dans le middleware suffit à créer une vraie séparation fondateur/modérateur sans toucher la DB.

**QW4 — Rate limit sur le chat ligue**
Ajouter 1 SELECT COUNT sur `squad_messages` par user dans les 60 dernières secondes avant INSERT. Copier le pattern de `/api/bet`.

**QW5 — Index manquant sur `match_presence (user_id)`**
`match_presence` n'a d'index que sur `(match_id, last_seen_at DESC)`. Les pings des crons de cleanup (DELETE WHERE last_seen_at < 1h) et les requêtes de présence ne filtrent pas toujours par match_id en premier.

**QW6 — ADMIN_EMAIL hardcodé**
`const adminEmail = process.env.ADMIN_EMAIL ?? "rem.valet@gmail.com"` dans deux crons. Cette adresse devrait toujours venir de l'env, sans fallback hardcodé.

- Fichiers : `src/app/api/cron/personal-branding/route.ts`, `src/app/api/cron/community-listener/route.ts`

### Incohérences / dette technique

**DT1 — Deux systèmes de logs coexistent**
`src/lib/logger.ts` (structured JSON) est utilisé dans les routes API. Des `console.error` directs sont dans `src/components/pwa/PushOptIn.tsx` et ailleurs dans les composants client. Pas d'unification.

**DT2 — `injury_sub` dans le type check mais supprimé**
Migration `0100_remove_injury_sub.sql` supprime `injury_sub` du CHECK mais le laisse probablement dans l'enum TypeScript (à vérifier dans `src/types/database.ts`). Double migration `0104_remove_injury_sub.sql` suggère une confusion.

**DT3 — `rooms` / `room_members` supprimées mais références résiduelles**
Les tables `rooms` et `room_members` ont été dropées en migration `0041`. Des références au concept de "room" persistent dans des commentaires et anciens noms de colonnes.

**DT4 — `bets.room_id` colonne legacy**
La colonne `room_id` a été remplacée par `squad_id` en migration `0041` mais le champ `applied_booster_id` n'apparaît pas dans toutes les versions de la RPC `place_bet` (voir version dans `0097_fix_place_bet_option_check.sql` vs code actuel `src/app/api/bet/route.ts`). À vérifier que la version DB en prod et le code côté Next.js sont synchronisés.

**DT5 — `pronos.prono_type = 'scorer'` vs `scorer_allocation`**
Le type `scorer` (singular) existe encore dans le CHECK mais le Hub utilise `scorer_allocation`. Le type `scorer` semble être un vestige de la migration `0037` jamais supprimé.

**DT6 — `place_prono` RPC legacy vs `place_match_prono`**
`place_prono` (ancienne RPC, migration `0037`) et `place_match_prono` (nouvelle, migration `0050`) coexistent. Le client utilise `place_match_prono`. `place_prono` est probablement devenu dead code mais reste en DB.

### Surprises positives

**SP1 — Rate limiting DB simple et fonctionnel**
Pas de Redis/Upstash. La table `rate_limit_log` avec un index composite est une solution minimaliste mais fonctionnelle qui évite une dépendance externe. Pour le volume actuel, c'est adapté.

**SP2 — Parimutuel avec Braquage (pool ligue) en une seule RPC**
La RPC `resolve_event_parimutuel` gère en une seule transaction le pool global + le bonus Braquage par ligue. La logique est propre et atomique.

**SP3 — Crons bien organisés et sécurisés**
15 crons distincts, tous sécurisés avec `Bearer CRON_SECRET`, tous avec `export const dynamic = "force-dynamic"`. La structure est claire et maintenable.

**SP4 — Système de saisons mensuel avec archivage**
La RPC `transition_season` archive les classements, reporte 10% des points, crée la nouvelle saison — tout en une transaction. Propre et sans migration manuelle.

---

## 9. Questions ouvertes pour le founder

1. **[CRITICAL] Comment un fondateur peut-il aujourd'hui accéder à `/admin/resolve` sans avoir accumulé 150 de trust_score ?** — Si le compte fondateur a un trust_score bas (peu d'alertes initiées ou plusieurs fausses alertes), l'accès est bloqué. Faut-il créer une variable d'env `ADMIN_EMAILS` ou une colonne `is_founder` sur `profiles` ?

2. **[CRITICAL] La RPC `place_long_term_bet` n'a aucune validation du `potential_reward` côté serveur.** Un client malveillant peut passer `potential_reward = 9999999`. La résolution via `resolve_long_term_bets` paie ce reward sans vérification. Est-ce que la feature PolyMarket est encore utilisée en prod ? Si oui, il faut ajouter un cap (ex : `amount_staked × 10` max) dans la RPC.

3. **[BLOCKING pour PostHog] Quel est l'identifiant analytics à utiliser pour le user ?** L'UUID Supabase (`auth.uid()`) est la valeur disponible côté client. Mais pour la vie privée (RGPD), il faudrait peut-être hasher ou utiliser un ID analytics distinct. Y a-t-il déjà une réflexion sur l'anonymisation pour les marchés FR/EU ?

4. **[BLOCKING pour back-office] Quelle est la définition opérationnelle d'un "événement VAR à valider" ?** Aujourd'hui un modérateur résout manuellement. Avec la résolution automatique via API-Football (cron match-monitor), quels types d'events restent en résolution manuelle ? La distinction est importante pour concevoir la file d'attente admin.

5. **[DB] Deux tables `long_term_bets` et `pronos` (type scorer) semblent avoir des objectifs qui se chevauchent.** Les `long_term_bets` ont un débit de Sifflets (payant) et les `pronos scorer` sont gratuits. Est-ce intentionnel à long terme ou y a-t-il une consolidation prévue ? Les specs analytics doivent savoir quelle table représente "le" prono buteur.

6. **[MODÉRATION] Il n'y a aucun système de report d'utilisateur ou de message.** Si un user est offensant dans le chat ligue ou les DM, il n'y a aucune façon de le signaler ni de le sanctionner. Est-ce prévu avant ou après la Coupe du Monde 2026 ?

7. **[ANALYTICS] Les `user_daily_recaps` sont générées par le cron `daily-digest`.** Ce cron tourne à quelle fréquence ? (absente du codebase — définie sur Vercel Cron directement ou dans `vercel.json` ?). Si le cron ne tourne pas, les recaps ne sont pas générées et le bilan quotidien n'apparaît jamais — comment savoir si ça fonctionne en prod sans monitoring ?

8. **[CRON VERCEL.JSON]** La configuration des crons (fréquence, horaires) n'est pas dans le repo. Elle est probablement dans `vercel.json` ou l'interface Vercel. Cet audit ne peut pas confirmer les horaires réels des 15 crons. Peuvent-ils être mis dans le repo pour un audit complet ?

9. **[SHOP] Les `boosters` ont des `effect_type` (`double_xp`, `cote_plus`, `safety_net`, `vision`) mais l'application réelle de ces effets n'est pas visible dans le code des routes `/api/bet` ou de la résolution de pronos.** Le champ `applied_booster_id` existe sur `bets` et `pronos` mais la logique de bonus n'est pas appliquée dans `place_bet` (RPC DB côté migration `0097`). Est-ce que les boosters sont réellement fonctionnels end-to-end ou sont-ils achetables mais pas encore appliqués ?

10. **[LEGACY] `place_prono` (RPC migration `0037`) et `place_match_prono` (migration `0050`) coexistent.** Le client utilise `place_match_prono`. `place_prono` est-il encore appelé quelque part en prod (scripts, webhooks) ou peut-il être supprimé pour simplifier le schéma ?

---

_Fin du document — généré en lecture seule par audit du codebase. Volume : voir ci-dessous._
