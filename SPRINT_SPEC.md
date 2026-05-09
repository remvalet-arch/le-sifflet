# SPRINT — Moteur VAR : Résolutions Auto + UX VotingModal

> Produit par PM Agent — 2026-05-09
> Statut : **EN ATTENTE DE VALIDATION HUMAINE**

**Objectif :** Rendre le moteur de paris VAR plus autonome (4 nouveaux types auto-résolus, suppression `injury_sub`) et simplifier l'UX de la VotingModal (% communauté + pot, sans côtes visibles).

---

## Tâches

---

### T1 — Migration SQL : supprimer `injury_sub` · `S` · ⚠️ Action humaine

**Fichier :** `supabase/migrations/XXXX_remove_injury_sub.sql`

```sql
-- Neutraliser les lignes injury_sub existantes
UPDATE market_events SET status = 'resolved', result = 'non'
  WHERE type = 'injury_sub' AND status IN ('open', 'closed');

-- Recréer le CHECK sans injury_sub sur market_events
ALTER TABLE market_events DROP CONSTRAINT IF EXISTS market_events_type_check;
ALTER TABLE market_events ADD CONSTRAINT market_events_type_check
  CHECK (type IN ('penalty','offside','card','var_goal','penalty_check',
                  'penalty_outcome','red_card','free_kick','corner'));

-- Recréer le CHECK sans injury_sub sur alert_signals
ALTER TABLE alert_signals DROP CONSTRAINT IF EXISTS alert_signals_action_type_check;
ALTER TABLE alert_signals ADD CONSTRAINT alert_signals_action_type_check
  CHECK (action_type IN ('penalty','offside','card','var_goal','penalty_check',
                         'penalty_outcome','red_card','free_kick','corner'));
```

**DoD :** Aucun `injury_sub` ne peut plus être inséré.
**⚠️ À appliquer manuellement dans Supabase SQL Editor (prod + staging).**

---

### T2 — `src/types/database.ts` : retirer `injury_sub` · `S`

Retirer `"injury_sub"` de `MarketEventType` et de `alert_signals.action_type`.

**DoD :** `tsc --noEmit` passe sans erreur.

---

### T3 — Bridge : résolution auto `offside` · `M`

**Fichier :** `src/lib/sports/api-football-market-bridge.ts`

**Logique :** Le marché `offside` = « Y a-t-il hors-jeu ? »
Utilise les mêmes events VAR que `var_goal` mais **OUI/NON inversés** :

- `"goal confirmed"` / `"goal stands"` → **NON** (pas de hors-jeu, but validé)
- `"goal cancelled"` / `"goal disallowed"` / `"no goal"` → **OUI** (hors-jeu, but refusé)

S'ouvre sur un event VAR avec `detailLower.includes("offside")`.

**DoD :** Event VAR "offside" ouvre marché ; "goal confirmed/cancelled" le résout automatiquement.

---

### T4 — Bridge : résolution auto `red_card` · `M`

**Fichier :** `src/lib/sports/api-football-market-bridge.ts`

**Logique :** Le marché `red_card` = « Va t-il y avoir un rouge ? »

- Event `type: "Card"` + `detail` contient `"red card"` (insensible casse) → **OUI**
- Expiration sans red card → **NON** (géré par le cron existant `close_expired_market_events`)
- Vérifier que l'event card est **postérieur à `market_events.created_at`**

**DoD :** API-Football remonte "Red Card" → marché résolu OUI sans admin.

---

### T5 — Bridge : résolution auto `corner` et `free_kick` · `M`

**Fichier :** `src/lib/sports/api-football-market-bridge.ts`

**Logique :** « Va t-il y avoir un but dans les 3 prochaines minutes ? »

- Event `type: "Goal"` (hors penalty) dans une **fenêtre de 3 min** après `created_at` → **OUI**
- Expiration → **NON**
- Edge case accepté : but de contre-attaque dans la fenêtre = OUI (approximation raisonnable)

**DoD :** Goal dans les 3 min après ouverture → résolu OUI.

---

### T6 — Bridge : résolution auto `penalty_outcome` · `S`

**Fichier :** `src/lib/sports/api-football-market-bridge.ts`

**Logique :** « Le penalty va-t-il être transformé ? »

- `type: "Goal"` + detail contient `"penalty"` → **OUI**
- `type: "Miss"` ou detail contient `"missed penalty"` / `"saved penalty"` → **NON**

**DoD :** Goal sur penalty ou raté → résolu automatiquement.

---

### T7 — VotingModal : % communauté + pot (sans côtes) · `M`

**Fichier :** `src/components/match/VotingModal.tsx`

**Supprime :** multiplicateur `×1.45`, gain potentiel `→ 145 🪙`, explication parimutuel, flash côte.

**Affiche à la place :**

```
┌─────────────────────────────────────┐
│  OUI ████████████░░░░  68%  │  32%  NON │
│         1 240 🪙 en jeu              │
└─────────────────────────────────────┘
```

- Deux barres de progression proportionnelles au %
- Pot total centré : `{total.toLocaleString("fr-FR")} 🪙 en jeu`
- Calculé depuis `get_event_odds` existant (`pool_staked` / `total_pool`) — poll 2s inchangé
- Le multiplier est toujours **calculé et envoyé au backend**, juste **caché côté UI**
- Slider de mise, boutons OUI/NON, timer 90s : inchangés

**DoD :** Plus de `×` visible. % + pot s'actualisent en temps réel. `npm run ai:check` passe.

---

### T8 — Retirer `injury_sub` de l'UI · `S`

**Fichiers :** `src/components/match/LiveRoom.tsx`, drawer alertes, libellés, constantes.

**DoD :** `injury_sub` n'apparaît plus nulle part dans l'UI.

---

## Ordre d'exécution

```
T2 (types DB) → T8 (UI cleanup)
             → T3 + T4 + T5 + T6 (bridge — parallélisables entre eux)
             → T7 (VotingModal)
T1 (migration SQL) → action humaine, peut être faite en parallèle
```

---

## Risques

| Risque                                                                  | Mitigation                                            |
| ----------------------------------------------------------------------- | ----------------------------------------------------- |
| API-Football : variantes de libellé "Red Card"                          | `includes()` insensible à la casse sur tout le détail |
| Fenêtre 3 min corner/free_kick : `match_minute` null                    | Fallback sur `created_at` + calcul temporel           |
| `latestMarketVerdictFromFixtureEvents` typé `var_goal \| penalty_check` | Élargir l'union type pour tous les nouveaux types     |
| Migration CHECK : lignes invalides existantes                           | UPDATE préalable neutralise les `injury_sub`          |

---

## Actions humaines requises

1. **Appliquer T1** dans Supabase SQL Editor (prod + staging)
2. Vérifier qu'aucun cron/webhook externe ne génère des alertes `injury_sub`

---

## Critère de succès principal

Marché `red_card` ouvert sur match live → API-Football remonte "Red Card" → résolu OUI automatiquement.
VotingModal : `68% OUI · 32% NON · 1 240 🪙 en jeu` à la place de `×1.47`.
