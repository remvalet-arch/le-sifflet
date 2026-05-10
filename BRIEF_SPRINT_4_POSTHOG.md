# BRIEF CLAUDE CODE — Sprint 4 : PostHog v2 (Instrumentation Analytics)

> **Date** : 2026-05-10
> **Branche cible** : `sprint-4-posthog` depuis `stage` (après merge Sprints 2 et 3)
> **Estimation** : 1-1.5 jour
> **Pré-requis** : Sprints cleanup-rbac, 2 et 3 mergés sur `stage`

---

## Contexte

VAR TIME — PWA mobile-first de paris VAR communautaires. Stack Next.js 16 / React 19 / Supabase / TypeScript.

**État actuel** :

- Zéro analytics tiers installé (cf. `docs/AUDIT_TRACKING_ADMIN.md` section 5)
- RBAC + audit_log en place (Sprint 1)
- Routes sociales rate-limitées + atomicité ligue (Sprint 2)
- Boosters tous fonctionnels (Sprint 3)
- Aucun user en production (fenêtre dorée)

**Décisions founder** :

- PostHog Cloud EU (RGPD)
- Free tier exclusif (pas d'engagement payant)
- Setup pour observer les premiers users bêta

---

## Objectifs

1. **Setup PostHog Cloud EU** avec RGPD-aware (`opt_out_capturing_by_default`)
2. **Instrumentation de ~22 events** calibrés sur les vraies features (vs 10 dans la v1 hypothétique)
3. **Identification user post-auth Supabase**, sans propagation de PII inutile
4. **4 dashboards core** à créer manuellement dans l'UI PostHog
5. **Documentation complète** dans `docs/ANALYTICS.md`

**Hors scope** :

- ❌ Session Replay (coûte du quota)
- ❌ Backend SDK Node (events serveur)
- ❌ Auto-capture (on contrôle finement ce qui part)
- ❌ Création UI back-office (Sprint 5)
- ❌ Branchement Sentry (sprint séparé éventuel)

---

## Règles de conduite

1. **Branche dédiée** : `sprint-4-posthog` depuis `stage` à jour
2. **2 phases, 2 commits**
3. **Stop & ask** au founder si :
   - Une route critique a évolué et le point d'instrumentation est ambigu
   - Un type d'event nécessite des données non disponibles dans le contexte client
   - Le founder n'a pas encore créé son projet PostHog (clé API manquante)
4. **Tests** : `npm run build` et `npm test` doivent passer
5. **Pas de PR**. Commits sur la branche.
6. **Variables d'env** : ne jamais commit la clé PostHog réelle. Utiliser un `.env.example` avec placeholder.

---

# PHASE 0 — Pré-requis founder (action manuelle)

⚠️ **Avant de démarrer, demander au founder de** :

1. Créer un compte sur **PostHog Cloud EU** : https://eu.posthog.com
2. Créer un projet "VAR TIME"
3. Récupérer le **Project API Key** (commence par `phc_...`)
4. Fournir cette clé pour l'ajout dans `.env.local`

L'URL host est fixe : `https://eu.i.posthog.com`.

**Documenter dans le brief le retour founder** : "Clé reçue le [date], ajoutée dans `.env.local`".

---

# PHASE 1 — Setup PostHog + provider + identification

## 1.1 Installation

```bash
npm install posthog-js@^1.150.0
```

## 1.2 Variables d'environnement

Ajouter à `.env.example` :

```env
# PostHog (Cloud EU)
NEXT_PUBLIC_POSTHOG_KEY=phc_your_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

Ajouter à `.env.local` (par le founder, hors version control) :

```env
NEXT_PUBLIC_POSTHOG_KEY=phc_VRAIE_CLE_FOURNIE_PAR_FOUNDER
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

S'assurer que ces variables sont bien dans la production Vercel ou autre hébergeur (preview ET production environments).

## 1.3 Provider PostHog

Créer `src/app/providers/PostHogProvider.tsx` :

```tsx
"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

if (typeof window !== "undefined") {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host =
    process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

  if (key && key !== "phc_your_key_here") {
    posthog.init(key, {
      api_host: host,
      capture_pageview: false, // on gère manuellement
      capture_pageleave: true,
      person_profiles: "identified_only", // économise quota sur visiteurs anonymes
      autocapture: false, // contrôle total
      opt_out_capturing_by_default: true, // RGPD : attend consentement explicite
      loaded: (ph) => {
        if (process.env.NODE_ENV === "development") ph.debug();
      },
    });
  }
}

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname && posthog.has_opted_in_capturing()) {
      let url = window.origin + pathname;
      if (searchParams?.toString()) url += `?${searchParams.toString()}`;
      posthog.capture("$pageview", { $current_url: url });
    }
  }, [pathname, searchParams]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  );
}
```

## 1.4 Branchement dans le root layout

Modifier `src/app/layout.tsx` pour wrapper avec `PostHogProvider`. Préserver tout autre provider existant.

## 1.5 Helper opt-in/opt-out RGPD

Créer `src/lib/analytics-consent.ts` :

```ts
import posthog from "posthog-js";

const CONSENT_KEY = "vartime_analytics_consent";
type ConsentStatus = "granted" | "denied" | "pending";

export function getConsentStatus(): ConsentStatus {
  if (typeof window === "undefined") return "pending";
  const v = localStorage.getItem(CONSENT_KEY);
  if (v === "granted" || v === "denied") return v;
  return "pending";
}

export function grantConsent() {
  localStorage.setItem(CONSENT_KEY, "granted");
  posthog.opt_in_capturing();
}

export function denyConsent() {
  localStorage.setItem(CONSENT_KEY, "denied");
  posthog.opt_out_capturing();
}

// Au boot de l'app, restaurer l'état consenti
export function restoreConsent() {
  const status = getConsentStatus();
  if (status === "granted") posthog.opt_in_capturing();
  // si 'denied' ou 'pending' : opt_out reste actif (default)
}
```

## 1.6 Bandeau de consentement minimal

Créer `src/components/consent/ConsentBanner.tsx` :

```tsx
"use client";

import { useEffect, useState } from "react";
import {
  getConsentStatus,
  grantConsent,
  denyConsent,
  restoreConsent,
} from "@/lib/analytics-consent";

export function ConsentBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    restoreConsent();
    setShow(getConsentStatus() === "pending");
  }, []);

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="Consentement analytics"
      className="consent-banner"
    >
      <p>
        On utilise PostHog pour comprendre comment l'app est utilisée. Aucune
        donnée perso ni vente à des tiers. Tu peux refuser sans rien perdre.
      </p>
      <div className="consent-actions">
        <button
          onClick={() => {
            grantConsent();
            setShow(false);
          }}
        >
          OK pour moi
        </button>
        <button
          onClick={() => {
            denyConsent();
            setShow(false);
          }}
        >
          Non merci
        </button>
      </div>
    </div>
  );
}
```

Brancher le `<ConsentBanner />` dans le layout authenticated (probablement `src/app/(app)/layout.tsx`). Pas dans la landing publique pour l'instant.

**Note** : ce bandeau est minimal. Si une politique de confidentialité plus complète existe, ajouter un lien "En savoir plus". Sinon, créer ticket backlog pour rédiger une privacy policy.

## 1.7 Identification user post-auth

Dans le hook ou flow d'auth Supabase (probablement `src/hooks/useAuth.ts` ou middleware équivalent), ajouter :

```ts
import posthog from "posthog-js";

// Après auth réussie
if (session?.user && posthog.has_opted_in_capturing()) {
  posthog.identify(session.user.id, {
    // PII minimale ici. user.id suffit pour cross-référence.
    locale: session.user.user_metadata?.locale ?? "fr",
    signup_date: session.user.created_at,
    // PAS d'email ni de username (vie privée)
  });
}

// Au logout
posthog.reset();
```

**Important** : ne jamais envoyer email, pseudo, ou autres PII identifiantes en `identify`. L'UUID Supabase est suffisant.

## 1.8 Commit Phase 1

```
feat(analytics): add PostHog Cloud EU setup with consent flow

- Install posthog-js
- Add PostHogProvider with manual pageview tracking
- Configure: opt-out by default, identified_only profiles, no autocapture
- Add ConsentBanner for RGPD-aware opt-in
- Add identification helper post-auth (UUID only, no PII)
- Document env vars in .env.example

Refs: docs/AUDIT_TRACKING_ADMIN.md (zero analytics installed)
```

**Stop. Vérifier que le bandeau s'affiche bien et que `posthog.capture('$pageview')` part après opt-in.**

---

# PHASE 2 — Helper analytics + instrumentation des events

## 2.1 Helper centralisé `src/lib/analytics.ts`

```ts
import posthog from "posthog-js";

// =====================================================
// Types globaux
// =====================================================

export type MatchTier = "top" | "mid" | "low";
// top = derbys, finales, top clubs
// mid = milieu de tableau
// low = bas de tableau / matchs sans enjeu

export type SignupMethod = "google" | "apple" | "email";
export type ItemCategory = "cosmetic" | "booster";
export type BoosterSlug = "double_xp" | "cote_plus" | "safety_net" | "vision";
export type PronoType = "exact_score" | "scorer_allocation";
export type MarketEventType =
  | "penalty_check"
  | "penalty_outcome"
  | "var_goal"
  | "red_card"
  | "free_kick"
  | "corner"
  | "stoppage_ht"
  | "stoppage_ft";
export type OpeningSource = "community" | "auto";
export type NotifType =
  | "match_starting"
  | "pre_match"
  | "pre_match_2h"
  | "var_alert"
  | "resolution"
  | "digest"
  | "nudge"
  | "squad_chat"
  | "dm";
export type AdminActionType =
  | "resolve_event"
  | "force_finish_match"
  | "sync_matches"
  | "admin_match_state_update"
  | "ban_user"
  | "unban_user"; // étendre selon RBAC.md

// =====================================================
// Définition de tous les events
// =====================================================

type AnalyticsEvents = {
  // ----- Auth & Onboarding -----
  landing_viewed: {
    locale: string;
    referrer?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
  };
  signup_completed: {
    signup_method: SignupMethod;
    locale: string;
  };
  onboarding_completed: {
    favorite_team_id?: string;
    preferred_competitions_count: number;
  };

  // ----- Engagement & Sessions -----
  app_opened: {
    is_match_day: boolean;
    days_since_signup: number;
    login_streak: number;
  };
  match_joined: {
    match_id: string;
    match_tier: MatchTier;
    minute_at_join: number;
    league: string;
    competition_id: string;
  };
  match_left: {
    match_id: string;
    duration_seconds: number;
    bets_placed_in_session: number;
    pronos_changes_in_session: number;
  };
  daily_streak_claimed: {
    current_streak: number;
    streak_freezes_owned: number;
    points_earned: number;
  };

  // ----- Pronos avant-match -----
  prono_placed: {
    match_id: string;
    match_tier: MatchTier;
    prono_type: PronoType;
    booster_applied: BoosterSlug | null;
    is_first_prono_of_session: boolean;
  };
  prono_resolved: {
    match_id: string;
    prono_type: PronoType;
    status: "won" | "lost";
    points_earned: number;
    booster_applied: BoosterSlug | null;
  };

  // ----- Paris VAR live -----
  alert_signal_submitted: {
    match_id: string;
    match_tier: MatchTier;
    event_type: MarketEventType;
    minute: number;
    user_trust_score: number;
  };
  market_opened: {
    match_id: string;
    market_id: string;
    market_type: MarketEventType;
    opening_source: OpeningSource;
    minute: number;
    initiators_count: number;
  };
  bet_placed: {
    match_id: string;
    market_id: string;
    market_type: MarketEventType;
    chosen_option: string;
    amount_staked: number;
    booster_applied: BoosterSlug | null;
    is_first_bet_of_session: boolean;
    bet_rank_in_session: number;
    via_quick_bet: boolean; // true si depuis notif push
  };
  bet_resolved: {
    match_id: string;
    market_id: string;
    status: "won" | "lost";
    reward_received: number;
    braquage_bonus: number; // 0 si pas de bonus
    booster_applied: BoosterSlug | null;
  };
  vision_booster_activated: {
    match_id: string;
    market_id: string;
    friend_choices_count: number; // nombre total d'amis ayant voté
  };

  // ----- Boutique -----
  shop_purchase: {
    item_category: ItemCategory;
    item_slug: string;
    sifflets_spent: number;
    purchase_quantity: number;
  };
  refill_claimed: {
    sifflets_received: number;
    balance_before: number;
  };

  // ----- Social -----
  squad_created: {
    squad_id: string;
    game_mode: "classic" | "braquage";
    is_private: boolean;
  };
  squad_joined: {
    squad_id: string;
    via: "invite_code" | "public_browse";
  };
  squad_message_sent: {
    squad_id: string;
    is_first_message_of_session: boolean;
  };
  dm_sent: {
    is_first_message_in_thread: boolean;
  };
  friend_request_sent: {
    is_first_friend_request: boolean;
  };

  // ----- Notifications -----
  push_opted_in: {
    permission_status: "granted" | "denied" | "default";
  };
  notif_clicked: {
    notif_type: NotifType;
    match_id?: string;
  };

  // ----- Admin (corrélation avec audit_log) -----
  admin_action_performed: {
    action_type: AdminActionType;
    target_resource_type?: string;
    target_resource_id?: string;
    actor_role: "moderator" | "founder";
  };
};

// =====================================================
// Fonction de tracking type-safe
// =====================================================

export function track<K extends keyof AnalyticsEvents>(
  event: K,
  properties: AnalyticsEvents[K],
): void {
  if (typeof window === "undefined") return;
  if (!posthog.has_opted_in_capturing()) return;
  posthog.capture(event, properties as Record<string, unknown>);
}

// =====================================================
// Helpers spécifiques (sucre syntaxique)
// =====================================================

export function trackBetPlaced(p: AnalyticsEvents["bet_placed"]) {
  track("bet_placed", p);
}

export function trackPronoPlaced(p: AnalyticsEvents["prono_placed"]) {
  track("prono_placed", p);
}

export function trackMarketOpened(p: AnalyticsEvents["market_opened"]) {
  track("market_opened", p);
}
```

## 2.2 Logique `match_tier`

Créer `src/lib/matchTier.ts` :

```ts
import type { MatchTier } from "./analytics";

// Liste des équipes considérées comme "top" pour la segmentation analytics
// À enrichir au fil du temps avec les vraies préférences founder
const TOP_TEAMS = new Set<string>([
  // Ligue 1
  "Paris SG",
  "Marseille",
  "Lyon",
  "Monaco",
  "Lille",
  "Rennes",
  // Premier League
  "Manchester City",
  "Liverpool",
  "Arsenal",
  "Manchester United",
  "Chelsea",
  "Tottenham",
  // La Liga
  "Real Madrid",
  "Barcelona",
  "Atletico Madrid",
  // Serie A
  "Inter",
  "Juventus",
  "AC Milan",
  "Napoli",
  // Bundesliga
  "Bayern Munich",
  "Dortmund",
  // International
  "France",
  "Brazil",
  "Argentina",
  "Germany",
  "Spain",
  "England",
  "Portugal",
]);

interface MatchForTier {
  team_home: string;
  team_away: string;
  competition_id: string;
  is_derby?: boolean;
  is_cup_final?: boolean;
}

export function classifyMatchTier(match: MatchForTier): MatchTier {
  if (match.is_cup_final) return "top";
  if (match.is_derby) return "top";

  const homeTop = TOP_TEAMS.has(match.team_home);
  const awayTop = TOP_TEAMS.has(match.team_away);

  if (homeTop && awayTop) return "top";
  if (homeTop || awayTop) return "mid";
  return "low";
}
```

## 2.3 Points d'instrumentation — vraies routes/composants

Tableau de référence pour Claude Code, basé sur l'audit. **Reproduire le pattern de chaque event aux endroits indiqués** :

| Event                      | Fichier source attendu                                                           | Trigger                                                            |
| -------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `landing_viewed`           | `src/app/page.tsx` (et `[locale]/page.tsx`)                                      | useEffect au mount                                                 |
| `signup_completed`         | `src/app/auth/callback/route.ts` ou hook auth                                    | callback succès                                                    |
| `onboarding_completed`     | composant onboarding (à localiser via grep `has_onboarded`)                      | submit final                                                       |
| `app_opened`               | `src/app/(app)/layout.tsx` ou provider                                           | mount, dedup par session                                           |
| `match_joined`             | `src/components/match/LiveRoom.tsx`                                              | useEffect mount                                                    |
| `match_left`               | `src/components/match/LiveRoom.tsx`                                              | cleanup useEffect                                                  |
| `daily_streak_claimed`     | `src/app/api/claim-daily-streak/route.ts` (côté client après réponse OK)         | post-fetch                                                         |
| `prono_placed`             | `src/components/pronos/MatchPronoCard.tsx`                                       | post-RPC succès                                                    |
| `prono_resolved`           | écouteur Realtime sur `pronos` filtré par user_id                                | UPDATE row du user avec `status='won'\|'lost'`                     |
| `alert_signal_submitted`   | `src/components/match/ActionDrawer.tsx` (handleAlert)                            | post-fetch succès `/api/alert`                                     |
| `market_opened`            | `src/components/match/LiveRoom.tsx` listener Realtime sur INSERT `market_events` | INSERT detected                                                    |
| `bet_placed`               | `src/components/match/VotingModal.tsx`                                           | post-fetch succès `/api/bet`                                       |
| `bet_resolved`             | `src/components/match/LiveRoom.tsx` listener Realtime UPDATE `bets` filtré user  | UPDATE detected                                                    |
| `vision_booster_activated` | `src/components/voting/VisionBoosterButton.tsx` (Sprint 3)                       | post-fetch succès                                                  |
| `shop_purchase`            | `src/components/shop/ShopClient.tsx`                                             | post-fetch succès `/api/shop/purchase` ou `/api/boosters/purchase` |
| `refill_claimed`           | `src/components/RefillButton.tsx`                                                | post-fetch succès                                                  |
| `squad_created`            | `src/components/squads/CreateLeagueWizard.tsx`                                   | post-fetch succès `/api/squads`                                    |
| `squad_joined`             | `src/components/ligues/LiguesPageClient.tsx` ou `join/[code]` page               | post-fetch succès                                                  |
| `squad_message_sent`       | `src/components/ligues/SquadChat.tsx`                                            | post-fetch succès                                                  |
| `dm_sent`                  | `src/components/messages/MessagesConversation.tsx`                               | post-fetch succès                                                  |
| `friend_request_sent`      | `src/components/profile/FriendButton.tsx`                                        | post-fetch succès `/api/friend-requests` (Sprint 2)                |
| `push_opted_in`            | `src/components/pwa/PushOptIn.tsx`                                               | post-subscription succès                                           |
| `notif_clicked`            | `public/sw.js` ou listener service worker                                        | navigate handler                                                   |
| `admin_action_performed`   | dans chacune des 7 routes admin, juste après `logAdminAction`                    | post-RPC succès                                                    |

## 2.4 Patterns d'implémentation par event

### Pattern A — Event simple post-fetch (la majorité)

```tsx
const res = await fetch("/api/squads", {
  /* ... */
});
const data = await res.json();
if (data.ok) {
  track("squad_created", {
    squad_id: data.squad.id,
    game_mode: data.squad.game_mode,
    is_private: data.squad.is_private,
  });
}
```

### Pattern B — Event avec context de session (LiveRoom)

```tsx
// Dans LiveRoom.tsx
const sessionRef = useRef({
  joinedAt: Date.now(),
  betsCount: 0,
  pronosChangesCount: 0,
});

useEffect(() => {
  track("match_joined", {
    match_id: match.id,
    match_tier: classifyMatchTier(match),
    minute_at_join: currentMinute,
    league: match.league_name,
    competition_id: match.competition_id,
  });

  return () => {
    track("match_left", {
      match_id: match.id,
      duration_seconds: Math.round(
        (Date.now() - sessionRef.current.joinedAt) / 1000,
      ),
      bets_placed_in_session: sessionRef.current.betsCount,
      pronos_changes_in_session: sessionRef.current.pronosChangesCount,
    });
  };
}, []);

// Sur chaque bet réussi : sessionRef.current.betsCount++
```

### Pattern C — Event sur Realtime listener (résolution)

```tsx
// Dans LiveRoom.tsx, dans le channel Realtime
.on(
  'postgres_changes',
  { event: 'UPDATE', schema: 'public', table: 'bets', filter: `user_id=eq.${userId}` },
  (payload) => {
    const oldRow = payload.old as { status: string };
    const newRow = payload.new as { status: 'won' | 'lost'; potential_reward: number; applied_booster_id: string | null };
    if (oldRow.status === 'pending' && (newRow.status === 'won' || newRow.status === 'lost')) {
      track('bet_resolved', {
        match_id: match.id,
        market_id: payload.new.event_id,
        status: newRow.status,
        reward_received: newRow.status === 'won' ? newRow.potential_reward : 0,
        braquage_bonus: 0, // à enrichir si l'info est dispo dans payload, sinon 0
        booster_applied: /* slug du booster via lookup ou null */,
      });
    }
  }
)
```

### Pattern D — Event admin (corrélation audit_log)

Dans chaque route admin (après l'appel à `logAdminAction()` du Sprint cleanup-rbac), ajouter :

```tsx
// Après logAdminAction() existant
// (PostHog côté client uniquement → on track via le retour de la route au client)
// → modifier la route pour qu'elle retourne le action_type, et tracker côté client
```

**Alternative recommandée** : créer un wrapper côté client `useAdminAction(actionType)` qui appelle la route + track l'event si succès.

## 2.5 Tests manuels

```markdown
## Tests Phase 2 — Events PostHog

### Setup

- [ ] Founder a opt-in via le bandeau de consentement
- [ ] PostHog UI EU ouvert → activity feed

### Tests par event critique

- [ ] Visiter `/` → event `landing_viewed` apparaît dans PostHog (<30s)
- [ ] Signup → event `signup_completed`
- [ ] Rejoindre un match → event `match_joined` avec `match_tier` correct
- [ ] Quitter le match → event `match_left` avec `duration_seconds` cohérent
- [ ] Faire un prono → event `prono_placed` avec booster ou null
- [ ] Placer un pari live → event `bet_placed` avec `bet_rank_in_session`
- [ ] Match résolu → events `prono_resolved` ET/OU `bet_resolved`
- [ ] Activer vision → event `vision_booster_activated`
- [ ] Acheter un cosmétique → event `shop_purchase` avec `item_category='cosmetic'`
- [ ] Créer une ligue → event `squad_created`
- [ ] Action admin (résoudre un event) → event `admin_action_performed`
```

## 2.6 Documentation `docs/ANALYTICS.md`

Créer ce document avec :

1. Liste exhaustive des 22 events avec leurs properties
2. Diagramme de flow user → events (text-based suffit)
3. Liste des 4 dashboards à créer manuellement dans PostHog UI :
   - **Pilotage Markets** : markets_per_match P50 par tier, bets_per_market, % markets → 0 mise, distribution opening_source
   - **Engagement** : DAU match-day vs no-match-day, durée moyenne LiveRoom, distribution paris/session
   - **Acquisition** : funnel landing → signup → match_joined → bet_placed
   - **Rétention** : cohortes weekly et monthly par tier de premier match
4. Notes sur la PII et le RGPD
5. TODO future : intégration Sentry, dashboards admin

## 2.7 Commit Phase 2

```
feat(analytics): instrument 22 events across the app

Events covered:
- Auth & Onboarding (3): landing_viewed, signup_completed, onboarding_completed
- Engagement (4): app_opened, match_joined, match_left, daily_streak_claimed
- Pronos (2): prono_placed, prono_resolved
- VAR live (5): alert_signal_submitted, market_opened, bet_placed, bet_resolved, vision_booster_activated
- Shop (2): shop_purchase, refill_claimed
- Social (5): squad_created, squad_joined, squad_message_sent, dm_sent, friend_request_sent
- Notifs (2): push_opted_in, notif_clicked
- Admin (1): admin_action_performed

All events type-safe via src/lib/analytics.ts.
matchTier classification in src/lib/matchTier.ts.
RGPD-aware: events only sent after explicit opt-in.

Refs: docs/ANALYTICS.md (new)
```

---

# Synthèse & Documentation

À la fin du sprint :

## Mettre à jour `docs/CLEANUP_BACKLOG.md`

Retirer :

- ~~Aucun analytics installé~~ → résolu Sprint 4

## Créer `docs/SPRINT_4_POSTHOG_SUMMARY.md`

```markdown
# Sprint 4 — PostHog v2 — Résumé

## Phase 1 : Setup

- posthog-js installé
- PostHogProvider avec opt-out par défaut
- ConsentBanner RGPD
- Identification user post-auth (UUID only)

## Phase 2 : Instrumentation

- 22 events typés via analytics.ts
- matchTier classification
- 4 dashboards documentés (à créer manuellement)

## Stats

- Lignes ajoutées : ~XXX
- Lignes supprimées : ~XXX (console.log analytics → track)
- Composants créés : 2 (PostHogProvider, ConsentBanner)
- Fichiers modifiés : ~XX
```

---

# Critères d'acceptation

- [x] Branche `sprint-4-posthog` mergeable sans conflit
- [x] `npm run build` passe
- [x] `npm test` passe
- [x] 2 commits séparés conformes
- [x] `npm install posthog-js` ajouté au package.json
- [x] `.env.example` à jour avec placeholders
- [x] Tests manuels Phase 1 (setup + bandeau) validés
- [x] Tests manuels Phase 2 (events critiques) validés
- [x] Documentation : `docs/ANALYTICS.md` complet, `docs/SPRINT_4_POSTHOG_SUMMARY.md`, `docs/CLEANUP_BACKLOG.md` mis à jour

---

# Tâche manuelle founder post-merge

Une fois le sprint mergé sur `stage` et déployé :

1. Créer les 4 dashboards dans l'UI PostHog Cloud EU manuellement (estimation : 30-45 min)
2. Mettre les 3 KPI core en favoris : `markets_per_match` P50 segmenté par `match_tier`, funnel acquisition, DAU match-day vs no-match-day
3. Configurer une alerte PostHog si `bet_placed` tombe à 0 sur 24h glissantes (early warning death spiral)

---

# Ne PAS faire

- ❌ Activer Session Replay (coûte du quota)
- ❌ Installer le SDK Node serveur (events serveur — hors scope)
- ❌ Activer autocapture (on contrôle finement)
- ❌ Envoyer email/pseudo en `identify`
- ❌ Tracker des events sans la garde `posthog.has_opted_in_capturing()`
- ❌ Hardcoder la clé PostHog dans le code
- ❌ Créer le back-office `/admin` (Sprint 5)
- ❌ Refactor `console.log` non-analytics
