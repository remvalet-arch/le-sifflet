# Tests manuels — Phase 3 RBAC

À exécuter par le founder après avoir appliqué les migrations 0106, 0107, 0108 et seedé son rôle.

## Setup préalable

- [ ] Appliquer migration `0106_add_role_column.sql` dans le SQL Editor Supabase
- [ ] Appliquer migration `0107_role_helpers.sql`
- [ ] Appliquer migration `0108_audit_log.sql`
- [ ] Exécuter `UPDATE profiles SET role = 'founder' WHERE id = '<FOUNDER_USER_ID>'`
- [ ] Créer un compte test "moderator" avec `role = 'moderator'` (ou utiliser un compte existant)
- [ ] Confirmer qu'un compte "user" normal a `role = 'user'` (défaut)

---

## Test 1 : Accès /admin

| Scénario                                         | Attendu                     |
| ------------------------------------------------ | --------------------------- |
| Founder accède à `/admin/resolve`                | ✅ Page affichée            |
| Moderator accède à `/admin/resolve`              | ✅ Page affichée            |
| User normal accède à `/admin/resolve`            | ↩ Redirect `/lobby`         |
| Anonyme (non connecté) accède à `/admin/resolve` | ↩ Redirect `/` (page login) |

---

## Test 2 : Action admin avec audit log

### 2a — Résolution d'un event VAR

1. Founder résout un event via `/admin/resolve`
2. Vérifier dans Supabase SQL Editor :

```sql
SELECT * FROM audit_log WHERE action_type = 'resolve_event' ORDER BY created_at DESC LIMIT 1;
```

- [ ] La row existe avec `actor_user_id` = founder, `actor_role = 'founder'`
- [ ] `target_resource_type = 'market_event'`, `target_resource_id` = UUID de l'event

### 2b — Terminer un match

1. Founder POST `/api/admin/finish-match` avec un `match_id`
2. Vérifier :

```sql
SELECT * FROM audit_log WHERE action_type = 'force_finish_match' ORDER BY created_at DESC LIMIT 1;
```

- [ ] `target_resource_type = 'match'`, `target_resource_id` = UUID du match

### 2c — Accès refusé (403)

- [ ] User normal POST `/api/admin/resolve-event` → réponse `{ ok: false, error: "Accès réservé aux administrateurs" }`, status 403
- [ ] User normal POST `/api/admin/finish-match` → 403

---

## Test 3 : Lecture audit_log

```sql
-- En tant que founder (role = 'founder') :
SELECT COUNT(*) FROM audit_log;
-- Attendu : nombre > 0 (actions des tests précédents)

-- En tant que user normal (simulé via RLS) :
-- Attendu : 0 rows (bloqué par RLS)
```

- [ ] Founder voit les lignes de `audit_log`
- [ ] User normal voit 0 lignes (RLS `is_admin()` filtre)

---

## Test 4 : Régression trust_score

Vérifier qu'un user avec `trust_score >= 150` mais `role = 'user'` n'a plus accès admin :

1. Trouver en DB un user avec `trust_score >= 150` et `role = 'user'`
2. Se connecter avec ce compte (ou simuler en modifiant temporairement)
3. Accéder à `/admin/resolve`

- [ ] Redirect `/lobby` (accès refusé)

4. POST `/api/admin/resolve-event`

- [ ] 403 Accès réservé aux administrateurs

---

## Test 5 : Badge communautaire inchangé

Vérifier que le badge 🛡️ (karma communautaire) fonctionne toujours :

- [ ] Un user avec `trust_score >= 150` voit toujours le badge 🛡️ sur son profil et dans le leaderboard
- [ ] Le badge n'est PAS lié au `role` mais uniquement au `trust_score`
