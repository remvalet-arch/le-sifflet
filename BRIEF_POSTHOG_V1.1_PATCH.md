# BRIEF CLAUDE CODE — Patch PostHog v1.1 (additif)

> **Mission** : ajouter des events et properties manquants à l'instrumentation PostHog v1 déjà en prod.
>
> **Branche cible** : `posthog-v1.1-patch` depuis `stage`
> **Date** : 2026-05-10
> **Estimation** : 2-3h
> **Pré-requis** :
>
> - PostHog v1 mergé en prod, events arrivent en réel
> - Sprint résolution match (unifier cron/admin) mergé **avant** ce patch (pour ne pas instrumenter deux fois)

---

## Contexte

VAR TIME — PWA mobile-first. PostHog v1 (22 events) est opérationnel en prod.

**Après lecture du document `docs/GAME_MECHANICS.md`**, trois trous d'instrumentation ont été identifiés. Ce patch les comble.

**Approche** :

- 100% additif — on ne modifie aucun event existant qui fonctionne déjà
- On étend les properties de 2 events existants
- On ajoute 2 events nouveaux
- Aucun risque de casser le tracking actuel

---

## Objectifs

1. **Étendre `bet_placed`** avec `speed_bracket` et `delay_seconds` (mécanisme Speed Bonus VAR)
2. **Étendre `prono_resolved`** avec `rarity_label` (mécanisme bonus rareté score exact)
3. **Ajouter `alert_threshold_reached`** (mécanique seuil dynamique anti-spam des alertes VAR)
4. **Ajouter `notif_suppressed_by_smart_mute`** (pour distinguer push échoué vs push intentionnellement supprimé)
5. **Documenter les 3 nouveaux dashboards/insights** qui exploiteront ces données

**Hors scope** :

- ❌ Modifier les events existants qui fonctionnent
- ❌ Toucher au consentement / opt-in / opt-out
- ❌ Modifier `match_tier` ou la logique de classification
- ❌ Ajouter de nouveaux dashboards en code (à créer dans l'UI PostHog manuellement)

---

## Règles de conduite

1. **Branche dédiée** : `posthog-v1.1-patch` depuis `stage` à jour
2. **2 commits séparés** : un pour les types/helper, un pour l'instrumentation
3. **Stop & ask** au founder si :
   - La structure actuelle de `analytics.ts` ne correspond pas à ce qui est attendu
   - Le calcul `speed_bracket` nécessite une donnée non disponible côté client
   - Le `rarity_label` est calculé côté serveur (RPC) et non renvoyé au client
4. **Tests manuels obligatoires** : vérifier dans PostHog UI que les nouvelles properties remontent bien
5. **Documentation** : mettre à jour `docs/ANALYTICS.md`

---

# PHASE 1 — Extension des types et helper

## 1.1 Modifier `src/lib/analytics.ts`

### Ajouter les nouveaux types

```ts
// =====================================================
// Nouveaux types (PostHog v1.1)
// =====================================================

export type SpeedBracket = "flash" | "normal" | "late";
// flash = 0-15s après ouverture market (×1.25)
// normal = 16-45s (×1.00)
// late = 46s+ (×0.90)

export type RarityLabel =
  | "evident" // > 30% des bons-1N2 ont aussi l'exact score
  | "rare" // 20-30%
  | "tres_rare" // 5-20%
  | "mega_rare" // 0.5-5%
  | "ultra_rare" // < 0.5%
  | "default" // moins de 5 joueurs avec le bon 1N2 (bonus +20pts par défaut)
  | null; // 1N2 incorrect (pas de bonus rareté applicable)

export type SmartMuteReason =
  | "app_visible" // app au premier plan
  | "user_in_match_room" // user dans le LiveRoom du match concerné
  | "opt_out_preference" // user a désactivé ce type de notif
  | "budget_exhausted_ios"; // quota iOS épuisé (cas particulier)
```

### Étendre les types d'events existants

Localiser le bloc `type AnalyticsEvents = {` et modifier comme suit :

**Étendre `bet_placed`** :

```ts
bet_placed: {
  match_id: string;
  market_id: string;
  market_type: MarketEventType;
  chosen_option: string;
  amount_staked: number;
  booster_applied: BoosterSlug | null;
  is_first_bet_of_session: boolean;
  bet_rank_in_session: number;
  via_quick_bet: boolean;
  // ----- NOUVEAU (v1.1) -----
  speed_bracket: SpeedBracket;
  delay_seconds: number; // secondes écoulées depuis l'ouverture du market
}
```

**Étendre `prono_resolved`** :

```ts
prono_resolved: {
  match_id: string;
  prono_type: PronoType;
  status: "won" | "lost";
  points_earned: number;
  booster_applied: BoosterSlug | null;
  // ----- NOUVEAU (v1.1) -----
  rarity_label: RarityLabel;
  bonus_rarity_points: number; // 0 si non applicable, +20/+30/+50/+70/+100 sinon
}
```

**Ajouter les deux nouveaux events** :

```ts
alert_threshold_reached: {
  match_id: string;
  match_tier: MatchTier;
  event_type: MarketEventType;
  signals_count: number;       // nombre de signaux uniques agrégés
  active_audience: number;     // audience active sur les 5 dernières minutes
  threshold_required: number;  // seuil dynamique requis (1, 2, 3 ou 5)
  time_to_threshold_seconds: number; // temps écoulé entre premier signal et atteinte du seuil
};

notif_suppressed_by_smart_mute: {
  notif_type: NotifType;
  reason: SmartMuteReason;
  match_id?: string;
};
```

## 1.2 Helper pour `speed_bracket`

Ajouter un helper utilitaire dans `src/lib/analytics.ts` :

```ts
// =====================================================
// Helper : calculer le speed bracket depuis le délai
// =====================================================

export function computeSpeedBracket(delaySeconds: number): SpeedBracket {
  if (delaySeconds <= 15) return "flash";
  if (delaySeconds <= 45) return "normal";
  return "late";
}
```

## 1.3 Helper pour `rarity_label`

Cas particulier : le `rarity_label` est calculé **côté serveur** dans la RPC `resolve_match_pronos`. Il faut soit :

- L'exposer dans le retour de la RPC (RECOMMANDÉ — modification de RPC à valider en Phase A du sprint patch)
- Soit le recalculer côté client (NON RECOMMANDÉ — coûteux et risque d'incohérence)

**À vérifier dans le code de la RPC** : `resolve_match_pronos` retourne-t-elle déjà le label de rareté ? Si oui, c'est simple à utiliser. Sinon, il faut soit l'ajouter au retour (mini patch RPC), soit faire une seconde query après résolution pour le récupérer depuis une table dérivée.

**Plan recommandé** :

1. Lire le code de la RPC `resolve_match_pronos` dans `supabase/migrations/`
2. Si le rarity_label est calculé mais non retourné, ajouter une property dans le JSON de retour
3. Sinon, créer une fonction client `getRarityLabel(pronoId)` qui fait une query rapide

**Stop & ask au founder** si la RPC doit être modifiée pour exposer le label. C'est une décision qui peut attendre si compliquée.

## 1.4 Commit Phase 1

```
feat(analytics): extend types for PostHog v1.1 patch

- Add SpeedBracket, RarityLabel, SmartMuteReason types
- Extend bet_placed event with speed_bracket + delay_seconds
- Extend prono_resolved event with rarity_label + bonus_rarity_points
- Add new events: alert_threshold_reached, notif_suppressed_by_smart_mute
- Add helper computeSpeedBracket()

No instrumentation changes yet — types only.
```

---

# PHASE 2 — Instrumentation des nouveaux events et properties

## 2.1 `bet_placed` — speed_bracket + delay_seconds

**Fichier cible** : `src/components/match/VotingModal.tsx` (ou équivalent qui appelle `/api/bet`)

**Logique** :

1. Au mount de la VotingModal, capturer le timestamp d'ouverture du market (depuis la prop `event.opened_at` ou équivalent)
2. Au moment du `bet_placed` track, calculer le délai

```tsx
import { track, computeSpeedBracket } from "@/lib/analytics";

// Dans le composant VotingModal, au handler de submit
const handleSubmitBet = async (option: string, amount: number) => {
  // ... logique existante ...

  const res = await fetch("/api/bet", {
    /* ... */
  });
  const data = await res.json();

  if (data.ok) {
    const delaySeconds = Math.floor(
      (Date.now() - new Date(event.opened_at).getTime()) / 1000,
    );
    track("bet_placed", {
      match_id: matchId,
      market_id: event.id,
      market_type: event.type,
      chosen_option: option,
      amount_staked: amount,
      booster_applied: selectedBoosterSlug,
      is_first_bet_of_session: sessionBetsCount === 0,
      bet_rank_in_session: sessionBetsCount + 1,
      via_quick_bet: viaQuickBet,
      // NOUVEAU
      speed_bracket: computeSpeedBracket(delaySeconds),
      delay_seconds: delaySeconds,
    });
  }
};
```

**Important** :

- Vérifier que `event.opened_at` est bien disponible dans le contexte. Sinon, le récupérer depuis la table `market_events.created_at`
- Si `delaySeconds < 0` (cas improbable mais possible si horloge mal synchronisée), forcer à `0`

## 2.2 `prono_resolved` — rarity_label

**Fichier cible** : selon la stratégie choisie en 1.3

- Si RPC retourne le label : `LiveRoom.tsx` ou layout qui écoute Realtime sur `pronos`
- Si calcul client-side : pareil mais avec query supplémentaire

**Logique de base** :

```tsx
// Sur Realtime UPDATE de pronos pour le user courant
.on('postgres_changes', {
  event: 'UPDATE',
  schema: 'public',
  table: 'pronos',
  filter: `user_id=eq.${userId}`,
}, (payload) => {
  const oldRow = payload.old as { status: string };
  const newRow = payload.new as {
    status: 'won' | 'lost';
    reward_amount: number;
    prono_type: PronoType;
    applied_booster_id: string | null;
    rarity_label: RarityLabel; // si exposé par la RPC
    bonus_rarity_points: number;
  };

  if (oldRow.status === 'pending' && (newRow.status === 'won' || newRow.status === 'lost')) {
    track('prono_resolved', {
      match_id: matchId,
      prono_type: newRow.prono_type,
      status: newRow.status,
      points_earned: newRow.reward_amount,
      booster_applied: /* lookup */,
      // NOUVEAU
      rarity_label: newRow.rarity_label ?? null,
      bonus_rarity_points: newRow.bonus_rarity_points ?? 0,
    });
  }
})
```

## 2.3 `alert_threshold_reached` (nouveau)

**Fichier cible** : `src/app/api/alert/route.ts` (probablement) — c'est l'endpoint qui agrège les signaux et décide quand ouvrir un market

**Logique** :

L'endpoint `/api/alert` reçoit un signal individuel. Quand il détecte que le seuil est atteint et qu'il s'apprête à ouvrir un market, il doit aussi tracker l'event.

⚠️ **Problème** : `track()` côté serveur n'envoie rien (le helper `analytics.ts` est client-side et garde-fou avec `posthog.has_opted_in_capturing()`).

**Solution recommandée** : retourner dans la response de `/api/alert` une info "threshold_reached: true" avec les counts, et tracker côté client au prochain re-render.

**Alternative** : utiliser le SDK Node de PostHog côté serveur pour cet event spécifique. Mais ça ajoute une dépendance — décision founder.

**Approche minimaliste recommandée pour cette v1.1** :

Côté serveur — modifier le retour de `/api/alert` :

```ts
// Dans /api/alert/route.ts, quand le seuil est atteint et qu'on ouvre un market
return NextResponse.json({
  ok: true,
  market_opened: true,
  threshold_info: {
    signals_count: signalsCount,
    active_audience: activeAudience,
    threshold_required: thresholdRequired,
    time_to_threshold_seconds: timeToThresholdSeconds,
    event_type: eventType,
    match_id: matchId,
    match_tier: matchTier,
  },
});
```

Côté client — dans le composant qui appelle `/api/alert` (probablement `ActionDrawer` ou `AlertButton`) :

```tsx
const res = await fetch("/api/alert", {
  /* ... */
});
const data = await res.json();

if (data.ok && data.market_opened && data.threshold_info) {
  track("alert_threshold_reached", {
    match_id: data.threshold_info.match_id,
    match_tier: data.threshold_info.match_tier,
    event_type: data.threshold_info.event_type,
    signals_count: data.threshold_info.signals_count,
    active_audience: data.threshold_info.active_audience,
    threshold_required: data.threshold_info.threshold_required,
    time_to_threshold_seconds: data.threshold_info.time_to_threshold_seconds,
  });
}
```

**Limite** : seul l'user qui déclenche l'ouverture du market (le N-ième signaleur qui fait atteindre le seuil) tracke cet event. Les autres signaleurs n'ont pas l'info. C'est acceptable pour la v1.1 — on aura un signal stat même incomplet.

## 2.4 `notif_suppressed_by_smart_mute` (nouveau)

**Fichier cible** : `public/sw.js` (service worker push handler) OU le hook React qui détecte une notif arrivée pendant que l'app est visible

**Logique** :

Quand le service worker reçoit un push mais détecte que l'app est visible (smart mute), au lieu d'afficher la notif, il :

1. Met à jour l'UI via postMessage si nécessaire
2. Track l'event suppression

```js
// Dans public/sw.js (exemple simplifié)
self.addEventListener("push", async (event) => {
  const data = event.data?.json();

  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  const isAppVisible = clients.some((c) => c.visibilityState === "visible");

  if (isAppVisible) {
    // Smart mute : ne pas afficher la notif
    // Envoyer un message à l'app pour tracker l'event suppression
    clients.forEach((c) =>
      c.postMessage({
        type: "NOTIF_SUPPRESSED_BY_SMART_MUTE",
        notif_type: data.type,
        reason: "app_visible",
        match_id: data.match_id,
      }),
    );
    return;
  }

  // ... show notification normalement
});
```

Côté React — ajouter un listener qui écoute `postMessage` du SW :

```tsx
// Dans un composant root ou un hook custom
useEffect(() => {
  const handler = (event: MessageEvent) => {
    if (event.data?.type === "NOTIF_SUPPRESSED_BY_SMART_MUTE") {
      track("notif_suppressed_by_smart_mute", {
        notif_type: event.data.notif_type,
        reason: event.data.reason,
        match_id: event.data.match_id,
      });
    }
  };
  navigator.serviceWorker?.addEventListener("message", handler);
  return () => navigator.serviceWorker?.removeEventListener("message", handler);
}, []);
```

**Cas particulier iOS budget épuisé** : il n'y a pas de hook côté client pour le détecter (le push n'arrive jamais). Cet event sera donc principalement déclenché pour `reason: 'app_visible'`. L'event reste utile pour mesurer combien de notifs sont supprimées par Smart Mute (donc combien d'engagement déjà sur l'app au moment du déclenchement).

## 2.5 Tests manuels

```markdown
## Tests Phase 2 — PostHog v1.1

### Setup

- [ ] Founder est opt-in PostHog
- [ ] Console DevTools ouverte pour voir les events partir
- [ ] PostHog UI EU ouvert sur le Live Events feed

### Test bet_placed v1.1

- [ ] Ouvrir une VotingModal sur un market venant d'être ouvert (< 15s)
- [ ] Placer un pari rapide
- [ ] Vérifier dans PostHog : event bet_placed avec speed_bracket='flash' et delay_seconds=N
- [ ] Refaire le test sur un market ouvert depuis ~30s → speed_bracket='normal'
- [ ] Refaire sur un market ouvert depuis 60s+ → speed_bracket='late'

### Test prono_resolved v1.1

- [ ] Forcer la résolution d'un match avec un user testeur qui a un score exact
- [ ] Vérifier event prono_resolved avec rarity_label != null et bonus_rarity_points > 0
- [ ] Tester sur un prono 1N2-only (sans exact score) → rarity_label=null, bonus_rarity_points=0
- [ ] Tester sur un match avec < 5 parieurs → rarity_label='default'

### Test alert_threshold_reached

- [ ] Mettre en place un scénario avec audience < 5 (seuil = 1 signal)
- [ ] Envoyer 1 signal d'alerte → market s'ouvre → vérifier event alert_threshold_reached
- [ ] Properties cohérentes : signals_count=1, threshold_required=1, time_to_threshold_seconds petit

### Test notif_suppressed_by_smart_mute

- [ ] App visible au premier plan
- [ ] Trigger un push test (via cron ou route admin)
- [ ] Vérifier que la notif n'apparaît PAS dans le centre de notif système
- [ ] Vérifier event notif_suppressed_by_smart_mute avec reason='app_visible'
```

## 2.6 Commit Phase 2

```
feat(analytics): instrument PostHog v1.1 patch events

- bet_placed: speed_bracket + delay_seconds based on market open time
- prono_resolved: rarity_label + bonus_rarity_points from RPC return
- alert_threshold_reached: new event tracked on /api/alert success when threshold reached
- notif_suppressed_by_smart_mute: new event via service worker postMessage

Refs: docs/GAME_MECHANICS.md (speed bonus, bonus rarity, dynamic threshold, smart mute)
```

---

# Documentation à produire

## Mettre à jour `docs/ANALYTICS.md`

Ajouter en haut une section "v1.1 changelog" :

```markdown
## v1.1 — 2026-05-10

### Properties étendues

- `bet_placed` : ajout de `speed_bracket` et `delay_seconds`
- `prono_resolved` : ajout de `rarity_label` et `bonus_rarity_points`

### Events nouveaux

- `alert_threshold_reached` : déclenché quand un seuil de signaux est atteint et un market s'ouvre
- `notif_suppressed_by_smart_mute` : déclenché quand un push est supprimé par Smart Mute
```

Documenter chaque nouveau type et property dans la table des events.

## Documenter les 3 nouveaux insights à créer dans PostHog UI

Section dédiée :

```markdown
## v1.1 — Insights/Dashboards à créer manuellement

### Insight 1 — Distribution Speed Bracket

- Type : Pie chart
- Event : bet_placed
- Breakdown : speed_bracket
- Période : 30 derniers jours
- Filtre : optionnel par match_tier
- **Quoi en faire** : si > 40% en 'late', revoir l'urgence des notifs push d'ouverture market

### Insight 2 — Distribution Rareté Scores Exacts

- Type : Bar chart
- Event : prono_resolved
- Breakdown : rarity_label
- Filtres : prono_type='exact_score' AND status='won'
- **Quoi en faire** : équilibrage économique, repérer si 'ultra_rare' est trop fréquent ou jamais atteint

### Insight 3 — Funnel Signal → Threshold → Market

- Type : Funnel
- Étapes : alert_signal_submitted → alert_threshold_reached → market_opened
- **Quoi en faire** : mesurer le ratio de signaux qui se transforment en market ouvert. Si trop bas (<50%), c'est un signal de death spiral sur petits matchs.
```

---

# Critères d'acceptation

- [x] Branche `posthog-v1.1-patch` mergeable sans conflit
- [x] `npm run build` passe
- [x] `npm test` passe
- [x] 2 commits séparés (types + instrumentation)
- [x] PostHog UI confirme la remontée des 2 nouveaux events
- [x] PostHog UI confirme les nouvelles properties sur bet_placed et prono_resolved
- [x] Tests manuels validés
- [x] Documentation : `docs/ANALYTICS.md` à jour avec section v1.1

---

# Ne PAS faire

- ❌ Modifier les events existants au-delà des additions de properties (pas casser ce qui marche)
- ❌ Changer la logique de consent / opt-in
- ❌ Créer des dashboards en code (UI manuelle)
- ❌ Étendre `analytics.ts` avec d'autres events non listés ici (rester focused)
- ❌ Modifier la RPC `resolve_match_pronos` sans accord founder explicite
- ❌ Toucher au cron `match-monitor` (il est en cours de refactor dans un autre sprint)
