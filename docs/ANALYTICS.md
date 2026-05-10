# Analytics — VAR TIME (PostHog Cloud EU)

## Setup

- **Provider**: PostHog Cloud EU (`https://eu.i.posthog.com`)
- **Mode**: opt-out by default (`opt_out_capturing_by_default: true`)
- **PII**: UUID Supabase only — jamais email, pseudo, ou données personnelles
- **autocapture**: désactivé — contrôle total sur les events envoyés
- **person_profiles**: `identified_only` — économise le quota sur les visiteurs anonymes

## Consentement RGPD

- `ConsentBanner` affiché dans l'app authentifiée (`src/components/consent/ConsentBanner.tsx`)
- Persistance : `localStorage` clé `vartime_analytics_consent` (`'granted' | 'denied' | 'pending'`)
- Restauration au boot via `restoreConsent()` dans `src/lib/analytics-consent.ts`
- Guard dans `track()` : `if (!posthog.has_opted_in_capturing()) return`

## Identification user

Après auth réussie (dans `PostHogIdentify` rendu dans `(app)/layout.tsx`) :

```ts
posthog.identify(userId, { signup_date: user.created_at });
```

Aucune PII identifiante — UUID Supabase uniquement.

---

## Events instrumentés (22)

### Auth & Onboarding (3)

| Event                  | Properties                                          | Fichier                       |
| ---------------------- | --------------------------------------------------- | ----------------------------- |
| `landing_viewed`       | `locale`, `referrer?`                               | `LandingTracker.tsx`          |
| `signup_completed`     | `signup_method`, `locale`                           | — (à instrumenter post-OAuth) |
| `onboarding_completed` | `preferred_competitions_count`, `favorite_team_id?` | —                             |

### Engagement & Sessions (4)

| Event                  | Properties                                                                            | Fichier                  |
| ---------------------- | ------------------------------------------------------------------------------------- | ------------------------ |
| `app_opened`           | `is_match_day`, `days_since_signup`, `login_streak`                                   | —                        |
| `match_joined`         | `match_id`, `match_tier`, `minute_at_join`, `league`, `competition_id`                | `LiveRoom.tsx`           |
| `match_left`           | `match_id`, `duration_seconds`, `bets_placed_in_session`, `pronos_changes_in_session` | `LiveRoom.tsx` (cleanup) |
| `daily_streak_claimed` | `current_streak`, `streak_freezes_owned`, `points_earned`                             | `ProfileHeader.tsx`      |

### Pronos avant-match (2)

| Event            | Properties                                                                             | Fichier              |
| ---------------- | -------------------------------------------------------------------------------------- | -------------------- |
| `prono_placed`   | `match_id`, `match_tier`, `prono_type`, `booster_applied`, `is_first_prono_of_session` | `MatchPronoCard.tsx` |
| `prono_resolved` | `match_id`, `prono_type`, `status`, `points_earned`, `booster_applied`                 | — (Realtime pronos)  |

### Paris VAR live (5)

| Event                      | Properties                                                                                                                                                     | Fichier                               |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `alert_signal_submitted`   | `match_id`, `match_tier`, `event_type`, `minute`, `user_trust_score`                                                                                           | `LiveRoom.tsx`                        |
| `market_opened`            | `match_id`, `market_id`, `market_type`, `opening_source`, `minute`, `initiators_count`                                                                         | `LiveRoom.tsx` (Realtime INSERT)      |
| `bet_placed`               | `match_id`, `market_id`, `market_type`, `chosen_option`, `amount_staked`, `booster_applied`, `is_first_bet_of_session`, `bet_rank_in_session`, `via_quick_bet` | `useVotingMarket.ts`                  |
| `bet_resolved`             | `match_id`, `market_id`, `status`, `reward_received`, `braquage_bonus`, `booster_applied`                                                                      | `LiveRoom.tsx` (Realtime bets UPDATE) |
| `vision_booster_activated` | `match_id`, `market_id`, `friend_choices_count`                                                                                                                | `VisionBoosterButton.tsx`             |

### Boutique (2)

| Event            | Properties                                                          | Fichier            |
| ---------------- | ------------------------------------------------------------------- | ------------------ |
| `shop_purchase`  | `item_category`, `item_slug`, `sifflets_spent`, `purchase_quantity` | `ShopClient.tsx`   |
| `refill_claimed` | `sifflets_received`, `balance_before`                               | `RefillButton.tsx` |

### Social (5)

| Event                 | Properties                                | Fichier                    |
| --------------------- | ----------------------------------------- | -------------------------- |
| `squad_created`       | `squad_id`, `game_mode`, `is_private`     | `CreateLeagueWizard.tsx`   |
| `squad_joined`        | `squad_id`, `via`                         | `LiguesPageClient.tsx`     |
| `squad_message_sent`  | `squad_id`, `is_first_message_of_session` | `SquadChat.tsx`            |
| `dm_sent`             | `is_first_message_in_thread`              | `MessagesConversation.tsx` |
| `friend_request_sent` | `is_first_friend_request`                 | `FriendButton.tsx`         |

### Notifications (2)

| Event           | Properties                | Fichier            |
| --------------- | ------------------------- | ------------------ |
| `push_opted_in` | `permission_status`       | `PushOptIn.tsx`    |
| `notif_clicked` | `notif_type`, `match_id?` | — (service worker) |

### Admin (1)

| Event                    | Properties                                                                  | Fichier                   |
| ------------------------ | --------------------------------------------------------------------------- | ------------------------- |
| `admin_action_performed` | `action_type`, `target_resource_type?`, `target_resource_id?`, `actor_role` | — (post `logAdminAction`) |

---

## matchTier (`src/lib/matchTier.ts`)

Classifie un match en `'top' | 'mid' | 'low'` selon les équipes et le contexte :

- `top` : derby, finale de coupe, deux équipes du top
- `mid` : une équipe du top
- `low` : aucune équipe du top

---

## 4 Dashboards PostHog (à créer manuellement)

### 1. Pilotage Markets

- `markets_per_match` P50 segmenté par `match_tier`
- `bets_per_market` distribution
- % de markets sans aucun pari
- Distribution `opening_source` (community vs auto)

### 2. Engagement

- DAU match-day vs no-match-day
- Durée moyenne LiveRoom (`match_left.duration_seconds`)
- Distribution paris/session (`match_left.bets_placed_in_session`)

### 3. Acquisition (funnel)

- `landing_viewed` → `signup_completed` → `match_joined` → `bet_placed`

### 4. Rétention

- Cohortes weekly et monthly par tier de premier match joué

---

## Notes RGPD

- Pas d'email ni de pseudo envoyés à PostHog
- UUID Supabase uniquement en `identify`
- Opt-out par défaut — données transmises uniquement après consentement explicite
- Données hébergées en Europe (Cloud EU)

---

## TODO

- Instrumenter `signup_completed` côté client (post-redirect OAuth)
- Instrumenter `notif_clicked` dans le service worker
- Instrumenter `admin_action_performed` post `logAdminAction`
- Instrumenter `prono_resolved` via listener Realtime sur pronos
- Envisager Sentry pour les erreurs runtime (Sprint séparé)
