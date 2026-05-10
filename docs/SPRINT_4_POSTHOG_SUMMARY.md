# Sprint 4 — PostHog v2 — Résumé

## Phase 1 : Setup

- `posthog-js` installé (v1.372.10)
- `PostHogProvider` avec tracking manuel des pageviews
- Config : opt-out par défaut, `identified_only`, no autocapture, Cloud EU
- `ConsentBanner` RGPD-aware (opt-in/opt-out persisté en localStorage)
- `PostHogIdentify` : identification post-auth (UUID Supabase uniquement, pas de PII)
- `.env.example` à jour avec les placeholders PostHog

## Phase 2 : Instrumentation

- 22 events typés via `src/lib/analytics.ts`
- Classification `matchTier` via `src/lib/matchTier.ts`
- Guard RGPD sur chaque `track()` call : `posthog.has_opted_in_capturing()`

## Events instrumentés (17/22 en code, 5 à faire manuellement)

### Instrumentés

| Event                      | Fichier                                   |
| -------------------------- | ----------------------------------------- |
| `landing_viewed`           | `LandingTracker.tsx`                      |
| `match_joined`             | `LiveRoom.tsx`                            |
| `match_left`               | `LiveRoom.tsx`                            |
| `daily_streak_claimed`     | `ProfileHeader.tsx`                       |
| `prono_placed`             | `MatchPronoCard.tsx`                      |
| `alert_signal_submitted`   | `LiveRoom.tsx`                            |
| `market_opened`            | `LiveRoom.tsx`                            |
| `bet_placed`               | `useVotingMarket.ts`                      |
| `bet_resolved`             | `LiveRoom.tsx`                            |
| `vision_booster_activated` | `VisionBoosterButton.tsx`                 |
| `shop_purchase`            | `ShopClient.tsx` (cosmétiques + boosters) |
| `refill_claimed`           | `RefillButton.tsx`                        |
| `squad_created`            | `CreateLeagueWizard.tsx`                  |
| `squad_joined`             | `LiguesPageClient.tsx`                    |
| `squad_message_sent`       | `SquadChat.tsx`                           |
| `dm_sent`                  | `MessagesConversation.tsx`                |
| `friend_request_sent`      | `FriendButton.tsx`                        |
| `push_opted_in`            | `PushOptIn.tsx`                           |

### À implémenter (hors-scope ou complexité)

- `signup_completed` — post-redirect OAuth (route handler serveur, pas de client disponible)
- `onboarding_completed` — à localiser selon feature onboarding
- `app_opened` — dédup par session à implémenter
- `notif_clicked` — service worker (public/sw.js)
- `admin_action_performed` — post `logAdminAction` dans routes admin
- `prono_resolved` — listener Realtime pronos

## Stats

- Fichiers créés : 7
- Fichiers modifiés : 14
- Composants : `PostHogProvider`, `ConsentBanner`, `PostHogIdentify`, `LandingTracker`
- Libs : `analytics.ts`, `analytics-consent.ts`, `matchTier.ts`

## Tâches founder post-deploy

1. Créer compte PostHog Cloud EU et projet "VAR TIME"
2. Ajouter `NEXT_PUBLIC_POSTHOG_KEY=phc_...` dans `.env.local` et Vercel
3. Opt-in via `ConsentBanner` pour voir les events dans l'activity feed PostHog
4. Créer les 4 dashboards définis dans `docs/ANALYTICS.md`
