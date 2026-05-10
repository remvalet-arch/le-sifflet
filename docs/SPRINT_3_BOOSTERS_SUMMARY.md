# Sprint 3 — Boosters — Résumé

> Branche : `sprint-3-boosters` · Date : 2026-05-10

## Phase 1 : Booster `vision` implémenté

- **Migration 0110** : RPC `activate_vision_booster(p_event_id)` — consomme un booster vision atomiquement, vérifie que l'event est open, retourne les counts agrégés des votes amis (aucune identité révélée)
- **Route** : `POST /api/boosters/activate-vision`
- **Composant** : `VisionBoosterButton` dans `VotingModal` — bouton dédié (indigo), s'efface après activation
- Vision exclu du `BoosterPicker` classique (qui passe `booster_id` au pari — sans effet à la résolution)

## Phase 2 : Boosters étendus aux pronos avant-match

- **Migration 0111** : `place_match_prono` stocke désormais `applied_booster_id` sur la row `scorer_allocation` (était absent) ; `resolve_match_pronos` applique `double_xp` (×2), `cote_plus` (×1.2), `safety_net` (50% remboursement) sur `scorer_allocation` — aligne sur le comportement déjà présent pour `exact_score`
- **Composant** : `BoosterPickerForPronos` — filtre vision, agrège les counts par type, réutilise les design tokens de `BoosterPicker`
- **MatchPronoCard** : `selectedBoosterId` câblé à `BoosterPickerForPronos` et transmis à `place_match_prono` (était `null` hardcodé)

## Périmètre

| Booster      | Avant Sprint 3         | Après Sprint 3                          |
| ------------ | ---------------------- | --------------------------------------- |
| `vision`     | ❌ Aucun effet          | ✅ Live VAR uniquement (reveal friends)  |
| `double_xp`  | ✅ Live VAR uniquement  | ✅ Live VAR + pronos avant-match         |
| `cote_plus`  | ✅ Live VAR uniquement  | ✅ Live VAR + pronos avant-match         |
| `safety_net` | ✅ Live VAR + partiellement pronos | ✅ Live VAR + pronos (scorer_allocation couvert) |

## Stats

- Migrations : 2 (0110, 0111)
- Routes créées : 1 (`/api/boosters/activate-vision`)
- Composants créés : 2 (`VisionBoosterButton`, `BoosterPickerForPronos`)
- Composants modifiés : 2 (`VotingModal`, `MatchPronoCard`)
- Types mis à jour : 1 (`database.ts` — `activate_vision_booster`)
