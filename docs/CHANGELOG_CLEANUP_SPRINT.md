# Changelog — Sprint Cleanup & RBAC

## Phase 1 — Suppression PolyMarket + cleanup legacy (2026-05-10)

### Suppressions DB (migration 0105)

- `DROP FUNCTION place_long_term_bet(uuid, text, text, integer, numeric)`
- `DROP FUNCTION resolve_long_term_bets(uuid)`
- `DROP TABLE long_term_bets CASCADE`
- `DROP FUNCTION place_prono(uuid, text, text, numeric)` — legacy, remplacée par `place_match_prono` depuis migration 0050

Note : le nettoyage du CHECK constraint `prono_type` (suppression du type `'scorer'` orphelin) est **en attente** de confirmation founder via :

```sql
SELECT COUNT(*) FROM pronos WHERE prono_type = 'scorer';
```

Si résultat = 0, décommenter la section 4 de la migration 0105 et l'exécuter.

**Backup** : le founder doit confirmer avoir exporté `long_term_bets` avant l'exécution de la migration (voir commentaire migration 0105).

### Fichiers TypeScript supprimés

- `src/components/match/PolymarketTab.tsx` — composant PolyMarket (orphelin, plus importé nulle part)

### Fichiers TypeScript modifiés

- `src/types/database.ts` — suppression des types `long_term_bets`, `LongTermBetRow`, `place_long_term_bet`, `resolve_long_term_bets`, `place_prono`
- `src/app/api/admin/finish-match/route.ts` — suppression de l'appel RPC `resolve_long_term_bets`
- `src/app/api/admin/force-resolve-past-matches/route.ts` — suppression de la section LTB, mise à jour du résumé de réponse

### Observations notées (hors scope)

- `PolymarketTab.tsx` n'était plus importé par aucun composant parent — dead code pur.
- `place_prono` RPC existait en 3 versions de migration (0037, 0046, 0052) — supprimée proprement.

---

## Phase 2 — Audit boosters (2026-05-10)

→ Voir `docs/BOOSTERS_AUDIT.md`

---

## Phase 3 — Système de rôles RBAC + audit_log (2026-05-10)

→ Voir `docs/RBAC.md`
