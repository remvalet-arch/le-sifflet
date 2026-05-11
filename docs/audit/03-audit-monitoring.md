# 03 — Audit Monitoring (Observabilité, KPIs, Crons)

> Branche : `stage` — 2026-05-11

---

## 3.1 Observabilité

### Logs

✅ **Observé** : Logger maison structuré dans `src/lib/logger.ts`.

- **Format prod** : JSON structuré (`{level, service, msg, ts, ...data}`) vers `console.log/warn/error`
- **Format dev** : texte humain `[service] LEVEL — msg`
- **Niveaux** : `info`, `warn`, `error`
- **Usage** : présent dans tous les services critiques (crons, API-Football sync, push, résolution)
- **Destination** : stdout Vercel → Vercel Log Drains (si configuré, non visible dans le code)

**Gap** : Les logs vont vers `console.*` uniquement. Aucun log drain configuré dans le code (Datadog, Logtail, etc. seraient dans `vercel.json` ou une intégration dashboard).

### Erreurs

🔴 **Observé** : Le fichier `src/lib/logger.ts:28` contient explicitement :

```
// TODO: when Sentry is integrated, route log.error to Sentry.captureException
```

**Il n'y a pas de Sentry, Rollbar, ou autre error monitoring.** Les erreurs sont loggées en console JSON mais ne déclenchent aucune alerte.

### Traces / APM

❌ **Absent** : Aucun OpenTelemetry, Datadog APM, ou New Relic détecté dans le code.

### Dashboards

❓ **Non vérifiable** : Potentiellement configurés dans le dashboard Vercel (métriques Edge) et Supabase (query performance), mais aucune référence dans le code.

**Exception** : `GET /api/admin/health` fournit un mini-dashboard opérationnel manuel :

- Compte de matchs live
- Compte d'événements ouverts
- Compte de pronos pending
- Liste des matchs à venir (<1h)

---

## 3.2 Métriques & KPIs

### Analytics produit — PostHog (Cloud EU)

✅ **Observé** : PostHog correctement configuré avec :

- `opt_out_capturing_by_default: true` — consentement explicite requis
- `autocapture: false` — pas de capture automatique imprévue
- `person_profiles: "identified_only"` — pas de profils anonymes
- EU hosting (`eu.i.posthog.com`) — conformité RGPD

### Inventaire complet des events trackés

| Event                      | Propriétés principales                                               | Déclenché dans                |
| -------------------------- | -------------------------------------------------------------------- | ----------------------------- |
| `landing_viewed`           | locale, referrer                                                     | `LandingTracker.tsx`          |
| `signup_completed`         | signup_method, login_streak                                          | ❓ non localisé dans ce scope |
| `match_joined`             | match_id, tier, has_prono                                            | `LiveRoom.tsx`                |
| `match_left`               | match_id, time_spent_seconds, bets_count                             | `LiveRoom.tsx`                |
| `market_opened`            | match_id, event_type, source, tier                                   | `LiveRoom.tsx`                |
| `bet_placed`               | event_id, option, amount, multiplier, speed_bracket, booster_applied | ❓ non localisé dans ce scope |
| `bet_resolved`             | event_id, result, won, payout, contre_pied_bonus, rarity             | `LiveRoom.tsx`                |
| `alert_signal_submitted`   | match_id, action_type, trust_score                                   | `LiveRoom.tsx`                |
| `alert_threshold_reached`  | match_id, action_type, signals_count                                 | `LiveRoom.tsx`                |
| `prono_placed`             | prono_type, booster_applied                                          | ❓ non localisé               |
| `prono_resolved`           | prono_type, won, points_earned, booster_applied                      | `PronoResolutionListener.tsx` |
| `daily_streak_claimed`     | streak_count                                                         | `ProfileHeader.tsx`           |
| `refill_claimed`           | new_balance                                                          | `RefillButton.tsx`            |
| `shop_purchase`            | item_id, item_category, price_pts                                    | `ShopClient.tsx` (×2)         |
| `vision_booster_activated` | —                                                                    | `VisionBoosterButton.tsx`     |
| `squad_created`            | squad_id                                                             | `CreateLeagueWizard.tsx`      |
| `squad_joined`             | squad_id                                                             | `LiguesPageClient.tsx`        |
| `squad_message_sent`       | squad_id                                                             | `SquadChat.tsx`               |
| `friend_request_sent`      | is_first_friend_request                                              | `FriendButton.tsx`            |
| `push_opted_in`            | permission_status                                                    | `PushOptIn.tsx`               |
| `dm_sent`                  | is_first_message_in_thread                                           | `MessagesConversation.tsx`    |

**22 appels `track()` dans les composants** — couverture des flux principaux.

**Gap** : `bet_placed`, `signup_completed`, `prono_placed` ne sont pas localisés côté composants dans ce scope — ils existent comme types dans `src/lib/analytics.ts` mais leur implémentation effective est à vérifier.

---

## 3.3 Tâches planifiées (Crons)

> Les fréquences ne sont **pas dans `vercel.json`** — elles sont configurées dans le dashboard Vercel uniquement. Les estimations ci-dessous sont inférées des commentaires et noms de routes.

| Nom                    | Fréquence estimée           | Rôle                                                                    | Auth          | Idempotent                        | Gestion d'erreur             |
| ---------------------- | --------------------------- | ----------------------------------------------------------------------- | ------------- | --------------------------------- | ---------------------------- |
| `match-monitor`        | Toutes les ~1 min (live)    | Sync scores/events API-Football, résolution auto VAR, stop/start matchs | `CRON_SECRET` | 🟡 Partiel (throttle inter-match) | `log.error` + retour partiel |
| `sync-odds`            | Périodique                  | Sync cotes bookmakers API-Football → `match_odds`                       | `CRON_SECRET` | 🟡                                | `log.error`                  |
| `sync-player-odds`     | Périodique                  | Sync cotes buteurs → `player_odds`                                      | `CRON_SECRET` | 🟡                                | `log.error`                  |
| `match-imminent`       | Toutes les 5 min (inféré)   | Push pré-match 5 min avant KO                                           | `CRON_SECRET` | ✅ (`getAlreadyNotifiedUsers`)    | `log.error`                  |
| `match-reminder-2h`    | Toutes les ~30 min          | Push rappel 2h avant match                                              | `CRON_SECRET` | ✅                                | `log.error`                  |
| `prono-reminders`      | Quotidien (inféré)          | Rappel pronostics non soumis                                            | `CRON_SECRET` | 🟡                                | `log.error`                  |
| `daily-digest`         | Quotidien                   | Récap push + email des résultats du jour                                | `CRON_SECRET` | ✅                                | `log.error`                  |
| `weekly-recap`         | Hebdomadaire                | Email recap hebdo                                                       | `CRON_SECRET` | 🟡                                | `log.error`                  |
| `reset-monthly-points` | 1er du mois                 | Reset `monthly_points_earned`                                           | `CRON_SECRET` | ✅                                | `log.error`                  |
| `community-listener`   | Fréquent (inféré)           | Logique communautaire / nudges squad                                    | `CRON_SECRET` | 🟡                                | `log.error`                  |
| `j1-inactive`          | Quotidien                   | Email J+1 inactivité                                                    | `CRON_SECRET` | 🟡                                | `log.error`                  |
| `j3-inactive`          | Quotidien                   | Email J+3 inactivité                                                    | `CRON_SECRET` | 🟡                                | `log.error`                  |
| `j7-churn`             | Quotidien                   | Email J+7 churn                                                         | `CRON_SECRET` | 🟡                                | `log.error`                  |
| `solo-activation`      | Quotidien                   | Activation utilisateurs solo (nudge)                                    | `CRON_SECRET` | 🟡                                | `log.error`                  |
| `personal-branding`    | Hebdomadaire (inféré)       | Posts automation marketing (Twitter)                                    | `CRON_SECRET` | ❓                                | `log.error`                  |
| `twitter-live`         | Pendant les matchs (inféré) | Tweets en live pendant les matchs                                       | `CRON_SECRET` | ❓                                | `log.error`                  |
| `transition-season`    | Mensuel                     | Clôture saison, reset season_points                                     | `CRON_SECRET` | ✅                                | `log.error`                  |

**P1** : Les 17 crons n'ont **aucune déclaration dans `vercel.json`** — leur planification effective est invisible depuis le code. En cas de reconfiguration de l'environnement Vercel, les crons seraient silencieusement perdus.

---

## 3.4 Intégrations tierces

| Service                             | Usage                                              | Sens | Auth                           | Retry/fallback                                | Criticité                                  |
| ----------------------------------- | -------------------------------------------------- | ---- | ------------------------------ | --------------------------------------------- | ------------------------------------------ |
| **API-Football** (api-sports.io v3) | Scores live, lineups, events, odds                 | Out  | `API_FOOTBALL_KEY` header      | Throttle inter-appels, pas de retry explicite | **Critique** — résolution VAR dépend de ça |
| **TheSportsDB** (v1)                | Logos, assets cosmétiques, import historique       | Out  | `SPORTSDB_API_KEY` (free)      | ❌ Pas de retry                               | Cosmétique                                 |
| **Supabase** (BaaS)                 | DB + Auth + Realtime + RLS                         | Both | JWT (anon) / service_role      | Reconnexion Realtime auto                     | **Critique**                               |
| **PostHog** (Cloud EU)              | Analytics produit                                  | Out  | `NEXT_PUBLIC_POSTHOG_KEY`      | Silencieux si opt-out                         | Monitoring                                 |
| **Resend**                          | Emails transactionnels (bienvenue, recap, relance) | Out  | `RESEND_API_KEY`               | `throw` si erreur, pas de retry               | Important                                  |
| **Web Push (VAPID)**                | Notifications push navigateur/PWA                  | Out  | `VAPID_PRIVATE_KEY`            | Budget 3/jour/user                            | Important                                  |
| **Twitter/X API v2**                | Tweets auto live                                   | Out  | `TWITTER_CLIENT_ID/SECRET`     | ❓ (feature beta)                             | Faible                                     |
| **Google OAuth**                    | Authentification                                   | Both | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Supabase gère le retry                        | **Critique**                               |

---

## 3.5 Webhooks

### Entrants

✅ **Observé** : `POST /api/webhooks/new-profile` — déclenché par Supabase (probablement trigger DB ou webhook Supabase auth) lors de la création d'un profil. Gère l'envoi de l'email de bienvenue (`emailWelcome`).

⚠️ **P1** : La validation de signature du webhook Supabase (`src/app/api/webhooks/new-profile/route.ts`) n'a pas été vérifiée dans ce scope — à auditer.

### Sortants

❌ Aucun webhook sortant détecté (pas de Zapier, Slack, n8n).

---

## 3.6 Alerting

❌ **Observé** : **Aucun système d'alerte opérationnel configuré dans le code.**

- Pas de Sentry (voir TODO dans `logger.ts`)
- Pas d'alerte Vercel/PagerDuty/Slack sur erreurs
- Les crons loggent via `log.error` → JSON stdout → Vercel Logs (surveillance manuelle uniquement)
- `GET /api/admin/health` est un endpoint de vérification manuelle sans alerte automatique

---

## 3.7 Trous dans la raquette

| Aveugles                                                                                       | Impact                                           |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Pas de Sentry → les erreurs prod sont invisibles sauf consultation manuelle des logs Vercel    | **P0** — bugs critiques peuvent passer inaperçus |
| Crons non déclarés dans `vercel.json` → impossible de vérifier que les 17 crons tournent       | **P1**                                           |
| Pas d'alerte si `match-monitor` échoue → résolution VAR silencieusement bloquée                | **P1**                                           |
| `table rate_limit_log` : pas de monitoring du volume → peut croître indéfiniment               | **P1**                                           |
| Pas de monitoring de la latence des RPCs Supabase (`place_bet`, `resolve_event`)               | **P2**                                           |
| Pas de tracking des emails Resend (taux d'ouverture, rebonds) visible dans le code             | **P2**                                           |
| Events PostHog `bet_placed` / `signup_completed` / `prono_placed` : implémentation à confirmer | **P2**                                           |

---

## Ce que je n'ai pas pu auditer

- Les cron schedules réels dans le dashboard Vercel
- Les logs Vercel en production (pas d'accès)
- Les métriques Supabase (Dashboard → Reports)
- Le taux de livraison des push notifications en prod
- La configuration Vercel Log Drains (si présente)

## Questions ouvertes pour le mainteneur

1. Quels sont les schedules exacts des 17 crons dans le dashboard Vercel ? Sont-ils tous actifs ?
2. Y a-t-il une intégration Vercel Log Drains vers un outil externe (Datadog, Logtail) ?
3. La webhook `new-profile` vérifie-t-elle la signature Supabase ? Elle est potentiellement ouverte.
4. Quand est-ce que Sentry sera intégré ? Le TODO dans `logger.ts` est bloquant pour la prod-readiness.
5. Y a-t-il un monitoring en place si le cron `match-monitor` cesse de tourner (silence radio = panne) ?
