# Cleanup Backlog

Items identifiés pendant le sprint Cleanup & RBAC mais hors scope. À traiter dans des sprints dédiés.

## Dette technique

- **Booster `vision` non implémenté** : vendable en boutique, aucun effet. Décision founder requise (implémenter ou supprimer). Voir `docs/BOOSTERS_AUDIT.md`.
- **Boosters non disponibles sur pronos avant-match** : `MatchPronoCard` passe `p_booster_id: null` en dur. Les boosters `double_xp`, `cote_plus`, `safety_net` ne fonctionnent que sur les paris live VAR.
- **Nettoyage type `'scorer'` orphelin** : le type `'scorer'` est encore dans le CHECK constraint DB et les types TypeScript. Attente confirmation founder : `SELECT COUNT(*) FROM pronos WHERE prono_type = 'scorer'` → si 0, décommenter section 4 de migration `0105` et supprimer de `database.ts`.
- **Cache cookie pour rôle admin** : le middleware fait un SELECT `profiles` à chaque navigation `/admin/*`. OK pour un founder seul, à optimiser si plusieurs modérateurs actifs (stocker le rôle dans un cookie signé JWT après login).
- **ESLint warnings préexistants** : `SquadChat.tsx` ligne 155 et `SquadDetailClient.tsx` ligne 139 — `useCallback`/`useEffect` avec `'t'` manquant dans les deps. Non bloquant, à corriger dans un sprint dédié.
- **Rate limiting absent sur plusieurs routes sociales** : création de ligue, rejoindre une ligue, messages DM, demandes d'amis — aucun rate limiting. Voir `docs/AUDIT_TRACKING_ADMIN.md` section 8.
- **Absence de transaction atomique** sur la création de ligue (INSERT séquentiels `squads` + `squad_members` + `squad_messages`).
- **Boosters `test-email`, `test-cron`, `test-push-self`** : routes de debug sans audit log (intentionnel — pas des actions de production).

## Quick-wins

- **Index manquant** sur `pronos.match_id` — requête fréquente sans index dédié (mentionné audit section 8).
- **Validation du multiplicateur** côté serveur pour `place_long_term_bet` — supprimé avec la feature PolyMarket, donc résolu.

## Hors-scope confirmé (sprints séparés)

- PostHog / analytics
- Back-office `/admin` UI
- Patches des boosters cassés
- Système de notifications refactorisé
