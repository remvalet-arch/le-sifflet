# Cleanup Backlog

Items identifiés pendant le sprint Cleanup & RBAC mais hors scope. À traiter dans des sprints dédiés.

## Dette technique

- ~~**Booster `vision` non implémenté**~~ — **résolu Sprint 3** : RPC `activate_vision_booster` (migration 0110), route `/api/boosters/activate-vision`, composant `VisionBoosterButton` dans `VotingModal`.
- ~~**Boosters non disponibles sur pronos avant-match**~~ — **résolu Sprint 3** : `BoosterPickerForPronos` dans `MatchPronoCard`, migrations 0111 (`place_match_prono` + `resolve_match_pronos`).
- **Nettoyage type `'scorer'` orphelin** : le type `'scorer'` est encore dans le CHECK constraint DB et les types TypeScript. Attente confirmation founder : `SELECT COUNT(*) FROM pronos WHERE prono_type = 'scorer'` → si 0, décommenter section 4 de migration `0105` et supprimer de `database.ts`.
- **Cache cookie pour rôle admin** : le middleware fait un SELECT `profiles` à chaque navigation `/admin/*`. OK pour un founder seul, à optimiser si plusieurs modérateurs actifs (stocker le rôle dans un cookie signé JWT après login).
- **ESLint warnings préexistants** : `SquadChat.tsx` ligne 155 et `SquadDetailClient.tsx` ligne 139 — `useCallback`/`useEffect` avec `'t'` manquant dans les deps. Non bloquant, à corriger dans un sprint dédié.
- ~~**Rate limiting absent sur plusieurs routes sociales**~~ — **résolu sprint-2-robustesse** : `create-squad`, `join-squad`, `squad-message`, `direct-message`, `friend-request` couverts via `checkRateLimit`.
- ~~**Absence de transaction atomique** sur la création de ligue~~ — **résolu sprint-2-robustesse** : RPC `create_squad_atomic` (migration 0109).
- **Boosters `test-email`, `test-cron`, `test-push-self`** : routes de debug sans audit log (intentionnel — pas des actions de production).

## Quick-wins

- **Index manquant** sur `pronos.match_id` — requête fréquente sans index dédié (mentionné audit section 8).
- **Validation du multiplicateur** côté serveur pour `place_long_term_bet` — supprimé avec la feature PolyMarket, donc résolu.

## Hors-scope confirmé (sprints séparés)

- ~~PostHog / analytics~~ → résolu Sprint 4 (22 events, consent RGPD, `docs/ANALYTICS.md`)
- Back-office `/admin` UI
- Patches des boosters cassés
- Système de notifications refactorisé
