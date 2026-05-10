# Sprint Cleanup & RBAC — Résumé final

**Date** : 2026-05-10 | **Branche** : `cleanup-rbac-sprint`

---

## ✅ Phase 1 — Suppression PolyMarket

- `PolymarketTab.tsx` supprimé (était déjà orphelin — aucun parent ne l'importait)
- Migration `0105` : DROP `long_term_bets`, `place_long_term_bet`, `resolve_long_term_bets`, `place_prono`
- Routes `finish-match` et `force-resolve-past-matches` nettoyées
- Types DB nettoyés : `LongTermBetRow`, `place_long_term_bet`, `resolve_long_term_bets`, `place_prono`
- **Backup founder requis** avant exécution de la migration 0105
- **En attente** : nettoyage type `'scorer'` orphelin (section 4 migration 0105 commentée)

## ✅ Phase 2 — Audit boosters

- 3 boosters fonctionnels de bout en bout : `double_xp`, `cote_plus`, `safety_net`
- 1 booster non implémenté : `vision` (vendable, aucun effet)
- Découverte transverse : boosters jamais appliqués aux pronos avant-match (`p_booster_id: null` hardcodé)
- Rapport complet : `docs/BOOSTERS_AUDIT.md`

## ✅ Phase 3 — Système de rôles RBAC + audit log

**Migrations créées** :

- `0106_add_role_column.sql` — enum `user_role`, colonne `role` sur `profiles`
- `0107_role_helpers.sql` — fonctions `current_user_role()` et `is_admin()`
- `0108_audit_log.sql` — table `audit_log` avec RLS

**Code créé** :

- `src/lib/audit.ts` — helper `logAdminAction()`
- `src/lib/constants/permissions.ts` — ajout `ADMIN_ROLES`, `isAdminRole()`

**24 fichiers refactorisés** :

- 20 routes API : remplacement `trust_score/MODERATOR_THRESHOLD` → `role/isAdminRole`
- 4 pages admin : même remplacement
- Audit log ajouté sur 6 routes d'action destructive

**Middleware** : `/admin/*` protégé par rôle au niveau Next.js

---

## 📋 Décisions founder requises (issues de Phase 2)

1. **`vision` booster** : implémenter (~1 sprint) ou supprimer du shop ?
2. **Boosters sur pronos** : activer `double_xp`/`cote_plus`/`safety_net` sur les pronos avant-match ?
3. **`scorer` type orphelin** : confirmer via SQL `SELECT COUNT(*) FROM pronos WHERE prono_type = 'scorer'` avant nettoyage

---

## 🔧 Backlog ajouté

Voir `docs/CLEANUP_BACKLOG.md` — 8 items identifiés, aucun bloquant.

---

## ⚠️ Actions manuelles requises avant merge

1. **Founder** : exporter `long_term_bets` depuis Supabase SQL Editor (`COPY ... TO CSV`)
2. **Founder** : appliquer migrations 0106, 0107, 0108 dans le SQL Editor Supabase
3. **Founder** : exécuter `supabase/scripts/seed_founder.sql` avec son user_id
4. **Founder** : exécuter la checklist `docs/RBAC_MANUAL_TESTS.md`

---

## 📊 Stats du sprint

| Métrique                 | Valeur                  |
| ------------------------ | ----------------------- |
| Fichiers modifiés (code) | 29                      |
| Fichiers supprimés       | 1 (`PolymarketTab.tsx`) |
| Migrations créées        | 4 (`0105` à `0108`)     |
| Scripts créés            | 1 (`seed_founder.sql`)  |
| Docs créées/mises à jour | 6                       |
| Lignes supprimées (code) | ~750                    |
| Lignes ajoutées (code)   | ~200                    |
| Erreurs TypeScript       | 0                       |
| Erreurs ESLint           | 0                       |
