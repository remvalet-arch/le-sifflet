# BRIEF CLAUDE CODE — AUDIT EXISTANT pour analytics & back-office admin

> **Mission** : audit en lecture seule du codebase VAR TIME pour produire un document d'analyse qui servira de base aux specs détaillées de l'instrumentation analytics (PostHog) et du back-office admin (`/admin`).
>
> **Important : ne modifie aucun fichier de code.** Le seul livrable attendu est le document markdown décrit en fin de brief.

---

## Contexte projet

**VAR TIME** — PWA mobile-first de pari VAR communautaire en temps réel sur le foot.

- Stack : Next.js 16 (App Router) / React 19 / Supabase / TypeScript
- ~97 migrations Supabase, ~80 composants client
- Multi-langue : FR (default sans préfixe URL), EN/ES/IT/DE
- Monnaie fictive (Sifflets), zéro argent réel
- Vocabulaire ADN : Sifflets (solde), Points (classements), XP (rang), Braquage, Cote+, Visionnaire, Joli Coup, Sirène VAR

**Phase actuelle** : préparation d'une instrumentation analytics complète + d'un back-office admin (`/admin`) pour pilotage produit et modération opérationnelle.

**Pourquoi cet audit** : avant d'écrire les specs détaillées (events PostHog, schémas back-office), j'ai besoin d'une vue exhaustive de ce qui existe déjà dans le code. Les specs basées sur des hypothèses produisent des trous (ex : oubli des pronostics avant-match). L'audit factuel évite ça.

---

## Méthode

1. **Lecture seule du codebase complet** : `src/`, `supabase/migrations/`, `app/`, `pages/` (selon structure), routes API, hooks, services.
2. **Pas d'exécution de code, pas de modification.** Tu peux lancer `grep`, `find`, lire des fichiers.
3. Si une section ne peut pas être renseignée par certitude (ex : volumétrie réelle inconnue), **dis-le explicitement** plutôt que d'inventer.
4. Si tu identifies un risque, une incohérence, ou un quick-win pendant l'audit (ex : index manquant flagrant, endpoint sans rate limiting), note-le dans la section "Observations transverses" en fin de doc.
5. Le doc doit être **factuel et précis**, pas vague. Citer les chemins de fichiers exacts (ex : `src/app/api/var-bets/quick-bet/route.ts`), pas "il y a une route quelque part".

---

## Livrable attendu

Un seul fichier : `docs/AUDIT_TRACKING_ADMIN.md` à la racine du repo (créer le dossier `docs/` s'il n'existe pas).

Structure imposée du document, **dans cet ordre** :

```
# AUDIT VAR TIME — Tracking & Admin

## 0. Résumé exécutif (10 lignes max)
## 1. Inventaire des actions utilisateur trackables
## 2. Inventaire des features pronostics
## 3. Schéma DB simplifié (tables clés)
## 4. Inventaire des comportements de modération existants
## 5. Stack analytics existante
## 6. Auth admin existante
## 7. Realtime existant
## 8. Observations transverses (risques, quick-wins, incohérences)
## 9. Questions ouvertes pour le founder
```

Détail de chaque section ci-dessous.

---

## Section 0 — Résumé exécutif

10 lignes max. Synthèse de ce que tu as trouvé : volume du codebase, niveau de maturité général, présence ou non d'analytics, présence ou non de notion admin, principaux risques identifiés. Pas de blabla.

---

## Section 1 — Inventaire des actions utilisateur trackables

**Objectif** : lister exhaustivement tous les endroits où l'utilisateur déclenche une action significative (= candidate à un event analytics).

**Format demandé** : tableau markdown avec ces colonnes :

| Action utilisateur | Trigger UI (composant) | Endpoint/handler | Méthode | Side effects (DB) | Fichier source |
| ------------------ | ---------------------- | ---------------- | ------- | ----------------- | -------------- |

**Catégories à couvrir** (ne PAS s'y limiter, ajouter ce que tu trouves) :

- **Auth** : signup, login, logout, password reset, OAuth providers (Google, Apple, etc.)
- **Navigation/Engagement** : entrée dans une LiveRoom, sortie, switch de match, ouverture du shop, ouverture du profil, ouverture du classement
- **Pronostics avant-match** : tous les types (winner, score exact, scorers, cartons, corners, etc.) — voir aussi section 2 dédiée
- **Pronostics live (markets VAR)** : ouverture market communautaire, signalement d'événement, placement de pari live, modification/annulation
- **Économie** : achat boutique (cosmétique, booster, pack), gain Sifflets, perte Sifflets, conversion XP/rang
- **Social** : invitations, rejoindre une ligue, créer une ligue, kick d'un membre, message dans un kop/vestiaire
- **Notifications** : opt-in push, opt-out, click sur notif
- **Settings** : changement langue, changement profil, changement préférences notifs

**Pour chaque action, identifier aussi** :

- Y a-t-il un **rate limit** en place ? (si oui, mentionner où — middleware, dans le handler, etc.)
- Y a-t-il une **transaction Supabase atomique** ? (RPC, transaction côté client, ou rien)
- Le succès/échec est-il **logué quelque part** ? (console, Sentry, autre)

---

## Section 2 — Inventaire des features pronostics

**Objectif** : avoir une vue complète des différents TYPES de pronostics dans l'app, parce que c'est le cœur du produit et que mes specs initiales ont raté la partie avant-match.

**Format** : pour chaque type de pronostic identifié, produire un bloc :

```markdown
### Type : [Nom — ex: "Winner avant-match"]

- **Description** : que parie le user
- **Quand est-ce ouvert** : ex "à l'annonce du match jusqu'au coup d'envoi"
- **Quand est-ce fermé** : ex "coup d'envoi automatique via cron"
- **Comment c'est résolu** : ex "API-Football au coup de sifflet final"
- **Tables Supabase impliquées** : ex `predictions`, `predictions_results`
- **Endpoints API** : ex `POST /api/predictions/create`, `GET /api/predictions/by-match/[id]`
- **Composants UI** : ex `PreMatchPredictionForm.tsx`, `PredictionCard.tsx`
- **Cycle de vie** : draft → submitted → locked → resolved → paid
- **Cote / multiplicateur** : statique ? dynamique ? communautaire ?
```

**Catégories de pronostics à chercher (liste non exhaustive)** :

- Avant-match : winner (1N2), score exact, scorers, premier buteur, cartons (oui/non, nombre), corners, mi-temps/fin de match, etc.
- Live (markets VAR) : penalty accordé, but refusé, carton rouge, durée temps additionnel, etc.
- Méta/longue durée : vainqueur compétition, top scorer saison, qualifié pour finales, etc.
- Spéciaux : pronos communautaires custom, défis entre amis, défis de ligue

**Si une catégorie n'existe pas dans le code, le dire explicitement.** C'est aussi une info précieuse.

---

## Section 3 — Schéma DB simplifié (tables clés)

**Objectif** : avoir les tables qui servent au tracking analytics et au back-office admin, sans noyer dans tout le schéma.

**Méthode** : lire les migrations dans `supabase/migrations/` (ou équivalent) et synthétiser.

**Format demandé** : pour chaque table jugée clé, un bloc :

```markdown
### Table : `nom_table`

**Rôle** : 1 phrase

**Colonnes clés** :

- `id` (uuid, PK)
- `user_id` (uuid, FK users)
- `created_at` (timestamptz)
- `status` (enum: 'draft' | 'submitted' | ...)
- ... (uniquement les colonnes pertinentes pour tracking/admin, pas TOUT)

**Indexes existants** : list ou "aucun à part PK"

**Relations** : références vers/depuis quelles tables

**Volume estimé** : ordre de grandeur (100, 10k, 1M+) si déductible. Sinon "inconnu".

**Realtime activé ?** : oui/non (chercher `realtime.publication` dans les migrations)

**RLS activé ?** : oui/non + résumé des policies si oui
```

**Tables à inclure obligatoirement** (si elles existent — sinon le signaler) :

- `users` / `profiles`
- Tables de pronostics avant-match
- Tables de markets/paris live (VAR)
- Tables de matchs
- Tables d'économie (Sifflets, transactions, achats shop)
- Tables sociales (ligues, kops, vestiaires)
- Tables de modération existantes (bans, reports, signalements)
- Tables de logs/audit existantes (s'il y en a)
- Tables de notifications

---

## Section 4 — Inventaire des comportements de modération existants

**Objectif** : identifier ce qui existe DÉJÀ comme logique de modération, pour ne pas réinventer dans le back-office.

**Chercher (liste non exhaustive)** :

- Notion de **ban** : table `bans` ? colonne `banned_at` sur users ? middleware qui bloque les bannis ?
- Notion de **shadow-ban** : flag `is_shadow_banned` ? logique de filtrage côté lecture ?
- **Rate limiting** : où est-il appliqué ? middleware Next.js ? edge function Supabase ? lib utilisée (upstash, custom) ?
- **Reports / signalements** : table `reports` ? endpoint pour signaler un user/post ?
- **Spam detection** : heuristiques anti-spam dans le code (ex : ne peut pas poster 2x le même message, captcha, etc.)
- **Multi-comptes detection** : check IP, device fingerprint, captcha à l'inscription ?
- **Anti-abus paris** : limites de mise quotidiennes, cap sur signaux par match, etc.
- **Audit log** : table qui log les actions sensibles ? log applicatif structuré ?

**Format** : tableau

| Comportement | Implémentation actuelle | Fichier(s) | Manque évident |
| ------------ | ----------------------- | ---------- | -------------- |

Si rien n'existe pour un point, le marquer "**absent**" — c'est crucial pour les specs futures.

---

## Section 5 — Stack analytics existante

**Objectif** : confirmer qu'on part vraiment de zéro côté analytics, ou identifier ce qui existe.

**Chercher** :

- Présence de `posthog`, `mixpanel`, `amplitude`, `plausible`, `umami`, `segment` dans `package.json`
- Présence de scripts analytics dans `_document.tsx`, `layout.tsx`, ou `<head>` dans `next.config.js` headers
- Vercel Analytics activé ? (`@vercel/analytics`)
- Vercel Speed Insights ? (`@vercel/speed-insights`)
- Sentry / DataDog / autre APM ?
- Logs structurés custom (chercher des wrapper du genre `logger.event(...)`, `track(...)`, `analytics.track(...)`)
- Logs `console.log` orientés analytics (= candidats à remplacer)

**Format** : liste avec présent/absent + fichier où c'est branché.

---

## Section 6 — Auth admin existante

**Objectif** : identifier si une notion d'admin/role existe pour ne pas réinventer.

**Chercher** :

- Colonne `role`, `is_admin`, `is_staff`, `is_moderator` sur `users` ou `profiles`
- Table `roles` séparée
- RLS Supabase basé sur un rôle (chercher `auth.jwt() ->>` ou `current_setting`)
- Middleware Next.js qui check un rôle pour certaines routes
- Composant `<AdminOnly>` ou wrapper équivalent
- Routes `/admin/*` existantes (même vide)
- Variables d'env type `ADMIN_USER_IDS`

**Format** : checklist avec présent/absent + détails.

---

## Section 7 — Realtime existant

**Objectif** : identifier où Supabase Realtime est déjà utilisé pour réutiliser le pattern dans `/admin/live`.

**Chercher** :

- Tables avec realtime activé (chercher dans migrations : `alter publication supabase_realtime add table ...`)
- Hooks custom qui s'abonnent à des channels (`useRealtimeBets`, `useLiveMatches`, etc.)
- Patterns d'usage : channel par match ? channel global ? broadcast ? presence ?
- Gestion de la déconnexion / reconnexion
- Throttle / debounce sur les updates UI

**Format** :

```markdown
### Tables avec Realtime

- `matches` : oui (filtre `status = 'live'`)
- ...

### Hooks/services Realtime

- `src/hooks/useLiveMatch.ts` — channel `match:${id}` — écoute INSERT/UPDATE sur `markets`, `bets`
- ...

### Patterns identifiés

- ...
```

---

## Section 8 — Observations transverses

Section libre où tu notes ce que tu as remarqué pendant l'audit qui ne rentre pas dans les sections précédentes. Catégoriser :

### Risques identifiés

Ex : "L'endpoint `/api/var-bets/quick-bet` n'a pas de transaction atomique : il fait un SELECT puis un UPDATE séparés sur le solde, race condition possible."

### Quick-wins repérés

Ex : "Les requêtes sur `predictions` filtrent toutes par `match_id` mais aucun index sur cette colonne."

### Incohérences / dette technique

Ex : "Deux systèmes de logs coexistent : `console.log` dans `src/services/` et `logger.info()` dans `src/lib/`."

### Surprises positives

Ex : "Le système de rate limiting est déjà bien fait via middleware avec Redis Upstash."

---

## Section 9 — Questions ouvertes pour le founder

Liste des questions qui ne peuvent pas être tranchées par lecture du code seul et qui me bloqueraient pour rédiger les specs. Format :

```markdown
1. [QUESTION] — pourquoi je pose la question / contexte de la décision à prendre
2. ...
```

Exemples de questions probables :

- "Plusieurs tables `predictions_v1` et `predictions_v2` coexistent — laquelle est utilisée en prod ?"
- "La table `events_log` semble inutilisée — peut-on la supprimer/réutiliser pour l'audit log admin ?"
- "Le seuil de `match_tier` (top/mid/low) doit être basé sur quoi : popularité historique, ranking équipes, importance match ?"

---

## Critères de qualité du livrable

Le doc sera jugé sur :

1. **Exhaustivité** : aucune action utilisateur significative oubliée. Si tu en oublies une, on aura un trou dans les events PostHog.
2. **Précision factuelle** : chemins de fichiers exacts, noms de tables exacts, pas d'approximation.
3. **Honnêteté épistémique** : tout ce qui n'est pas certain est marqué "inconnu" ou "à confirmer", pas inventé.
4. **Lisibilité** : 30-60 minutes de lecture pour un humain qui découvre. Si c'est plus long, tu noies l'info importante.
5. **Actionnable** : à la fin de la lecture, le founder doit pouvoir trancher les questions de la section 9 sans avoir à replonger dans le code.

**Volume cible** : 1500-3000 lignes markdown. Si tu es nettement en dessous, tu as raté de la matière. Si tu es nettement au-dessus, tu noies dans le détail.

---

## Ne PAS faire dans ce sprint

- ❌ Modifier du code (lecture seule absolue)
- ❌ Implémenter PostHog ou le back-office (specs viendront APRÈS l'audit)
- ❌ Refactorer ce que tu trouves "moche" (juste le noter en section 8)
- ❌ Créer des tests
- ❌ Mettre à jour la documentation existante (juste créer le nouveau doc d'audit)
- ❌ Inventer des conclusions si l'info n'est pas dans le code (préférer "à confirmer avec founder")

---

## Workflow recommandé

1. **Phase exploration (30 min)** : `find`, `grep`, `tree` pour comprendre la structure globale du repo
2. **Phase migrations DB (1h)** : lire toutes les migrations Supabase dans l'ordre chronologique pour comprendre l'évolution du schéma
3. **Phase API routes (1h)** : lister tous les endpoints, comprendre leur rôle
4. **Phase composants client (1h)** : identifier les composants qui déclenchent des actions
5. **Phase hooks et services (45 min)** : comprendre les patterns d'auth, realtime, rate limiting
6. **Phase rédaction (1h)** : produire le document d'audit

**Temps total estimé : 4-5h de travail Claude Code.**

---

## Livrable final

Un seul fichier : `docs/AUDIT_TRACKING_ADMIN.md`

Une fois produit, faire un résumé bref dans le chat (5-10 lignes) listant :

- Volume du doc produit
- 3 surprises majeures rencontrées
- 3 questions critiques pour le founder (les plus bloquantes de la section 9)

Pas de PR, pas de commit automatique. Le founder review le doc, puis décide de la suite.
