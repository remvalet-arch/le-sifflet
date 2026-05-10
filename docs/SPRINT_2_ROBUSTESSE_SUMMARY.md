# Sprint 2 Robustesse — Résumé final

**Date** : 2026-05-10 | **Branche** : `sprint-2-robustesse`

---

## ✅ Phase 1 — Rate limiting DB-side sur les routes sociales

**Nouveaux rate limits** (`src/lib/constants/rate-limits.ts`) :

| Route                            | Clé              | Limite    |
| -------------------------------- | ---------------- | --------- |
| POST `/api/squads`               | `create-squad`   | 3 / 60 s  |
| POST `/api/squads/join`          | `join-squad`     | 10 / 60 s |
| POST `/api/squads/[id]/messages` | `squad-message`  | 20 / 60 s |
| POST `/api/messages/[otherId]`   | `direct-message` | 20 / 60 s |
| POST `/api/friend-requests`      | `friend-request` | 15 / 60 s |

**Changements** :

- `checkRateLimit(supabase, userId, route)` ajouté sur toutes ces routes
- Route DM : l'ancienne logique "COUNT(\*) depuis 2s" remplacée par le rate limiter centralisé
- **Nouvelle route** `POST /api/friend-requests` + `DELETE /api/friend-requests`
- `FriendButton.tsx` : writes routées via l'API (plus d'INSERT Supabase direct côté client)

## ✅ Phase 2 — Création de ligue atomique

**Migration** `0109_create_squad_atomic.sql` :

- Fonction SECURITY DEFINER `create_squad_atomic(name, is_private, owner_id)` → INSERT squad + squad_members + squad_message en une seule transaction
- Code d'invitation généré côté SQL (plus de `generateCode()` côté Node)
- Granted `EXECUTE` aux `authenticated` uniquement

**Code** :

- `POST /api/squads` : 3 INSERTs séquentiels → 1 appel `rpc('create_squad_atomic')`
- `src/types/database.ts` : type `create_squad_atomic` ajouté

## ✅ Phase 3 — Nettoyage console._ → log._

8 fichiers nettoyés :

| Fichier                     | Avant                | Après       |
| --------------------------- | -------------------- | ----------- |
| `PushOptIn.tsx`             | 5× `console.error`   | `log.error` |
| `ServiceWorkerRegister.tsx` | 1× `console.warn`    | `log.warn`  |
| `src/app/error.tsx`         | 1× `console.error`   | `log.error` |
| `src/app/(app)/error.tsx`   | 1× `console.error`   | `log.error` |
| `MatchNotificationBell.tsx` | 2× `console.error`   | `log.error` |
| `MatchLineups.tsx`          | 2× `console.error`   | `log.error` |
| `match/[id]/page.tsx`       | 1× `console.error`   | `log.error` |
| `FriendButton.tsx`          | 0 → new fetch errors | `log.error` |

---

## 📋 Actions manuelles requises avant merge

1. **Founder** : appliquer la migration `0109_create_squad_atomic.sql` dans le SQL Editor Supabase

---

## 📊 Stats du sprint

| Métrique                 | Valeur                     |
| ------------------------ | -------------------------- |
| Fichiers modifiés (code) | 15                         |
| Migrations créées        | 1 (`0109`)                 |
| Routes créées            | 1 (`/api/friend-requests`) |
| `console.*` supprimés    | 12                         |
| Erreurs TypeScript       | 0                          |
| Erreurs ESLint           | 0                          |
