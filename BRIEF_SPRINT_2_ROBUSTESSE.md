# BRIEF CLAUDE CODE — Sprint 2 : Robustesse (Rate Limit + Atomicité + Cleanup)

> **Date** : 2026-05-10
> **Branche cible** : créer `sprint-2-robustesse` depuis `stage` (après merge du sprint cleanup-rbac)
> **Estimation** : 1-1.5 jour
> **Pré-requis** : sprint cleanup-rbac mergé sur `stage` (migrations 0105-0108 appliquées, RBAC fonctionnel)

---

## Contexte projet

VAR TIME, PWA mobile-first de paris VAR communautaires sur le foot. Stack Next.js 16 / React 19 / Supabase / TypeScript.

**État actuel** : zéro user en production (fenêtre dorée). On en profite pour combler les trous de robustesse identifiés dans `docs/AUDIT_TRACKING_ADMIN.md` et `docs/CLEANUP_BACKLOG.md`, sans contrainte de migration de données.

**Décisions du founder pour ce sprint** :

- Rate limiting **DB-side** via la table `rate_limit_log` existante (pas de Redis/Upstash, pas d'outil payant)
- Pattern à reproduire : voir `src/lib/db-rate-limiter.ts` et constantes dans `src/lib/constants/rate-limits.ts`
- Cleanup orienté qualité : pas de feature nouvelle, on durcit l'existant

---

## Objectifs du sprint

1. **Rate limiting** sur les 5 routes sociales aujourd'hui non protégées
2. **Transaction atomique** sur la création de ligue (3 INSERT séquentiels actuellement → 1 RPC atomique)
3. **Cleanup `console.error` non structurés** dans les composants client → migration vers `log.error`

**Hors scope** :

- ❌ Pas de PostHog
- ❌ Pas d'extension boosters
- ❌ Pas de feature `vision`
- ❌ Pas de back-office `/admin`
- ❌ Pas de refactoring opportuniste hors-liste

---

## Règles de conduite

1. **Branche dédiée** : `sprint-2-robustesse` créée depuis `stage` à jour
2. **Trois commits séparés**, un par phase
3. **Stop & ask** au founder si :
   - Un fichier listé n'existe plus (le code a évolué)
   - Une route a déjà un rate limit non documenté dans l'audit
   - Le cleanup d'un `console.error` révèle un cas d'erreur métier
4. **Tests** : `npm run build` et `npm test` doivent passer entre chaque phase
5. **Migrations Supabase** : numérotation `0109+`. Idempotence (`IF NOT EXISTS`).
6. **Pas de PR**. Commits sur la branche, le founder décide quand merger.

---

# PHASE 1 — Rate limiting sur routes sociales

## 1.1 Routes ciblées et limites

Reproduire le pattern de `src/lib/db-rate-limiter.ts` (déjà utilisé par `claim-daily-streak`, `claim-rsa`, `admin-resolve-event`, `admin-finish-match`).

| Route                                  | Limite proposée | Justification                                                       |
| -------------------------------------- | --------------- | ------------------------------------------------------------------- |
| `POST /api/squads`                     | **3 / 60s**     | Création de ligue : action rare, 3/min très permissif               |
| `POST /api/squads/join`                | **10 / 60s**    | Rejoindre une ligue : un peu plus fréquent (multi-ligues possibles) |
| `POST /api/squads/[squadId]/messages`  | **20 / 60s**    | Chat ligue : conversation normale, pas de spam                      |
| `POST /api/messages/[otherId]`         | **20 / 60s**    | DM : idem chat                                                      |
| `INSERT friend_requests` (côté client) | **15 / 60s**    | Anti-spam demandes d'amis                                           |

**Note importante sur friend_requests** : actuellement l'INSERT est fait côté client direct via Supabase, pas via une route API. Pour ajouter du rate limiting il faut :

**Option A (recommandée)** : créer une route API `POST /api/friend-requests` et router l'INSERT dessus
**Option B** : ajouter un trigger DB qui consulte `rate_limit_log` (plus complexe, moins maintenable)

Choisir l'**Option A**. Documenter le changement dans le commit.

## 1.2 Constantes

Ajouter à `src/lib/constants/rate-limits.ts` :

```ts
export const RATE_LIMIT_SOCIAL = {
  CREATE_SQUAD: { route: "create-squad", max: 3, windowSeconds: 60 },
  JOIN_SQUAD: { route: "join-squad", max: 10, windowSeconds: 60 },
  SQUAD_MESSAGE: { route: "squad-message", max: 20, windowSeconds: 60 },
  DIRECT_MESSAGE: { route: "direct-message", max: 20, windowSeconds: 60 },
  FRIEND_REQUEST: { route: "friend-request", max: 15, windowSeconds: 60 },
} as const;
```

## 1.3 Implémentation par route

Pour chaque route, le pattern est identique :

```ts
import { checkRateLimit } from "@/lib/db-rate-limiter";
import { RATE_LIMIT_SOCIAL } from "@/lib/constants/rate-limits";

// Au début du handler, APRÈS l'auth check
const limit = await checkRateLimit({
  userId: user.id,
  config: RATE_LIMIT_SOCIAL.CREATE_SQUAD, // adapter selon la route
});

if (!limit.allowed) {
  return NextResponse.json(
    {
      ok: false,
      error: "Trop de requêtes. Patiente un instant.",
      retryAfter: limit.retryAfterSeconds,
    },
    {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfterSeconds) },
    },
  );
}

// ... reste de la logique route
```

**Important** : la vérification doit être faite **APRÈS l'auth** (pour avoir `user.id`) mais **AVANT** toute mutation DB.

## 1.4 Création de `POST /api/friend-requests`

Créer `src/app/api/friend-requests/route.ts` :

```ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/db-rate-limiter";
import { RATE_LIMIT_SOCIAL } from "@/lib/constants/rate-limits";
import { log } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const supabase = createServerClient();

  // 1. Auth
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  // 2. Rate limit
  const limit = await checkRateLimit({
    userId: user.id,
    config: RATE_LIMIT_SOCIAL.FRIEND_REQUEST,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: "Trop de demandes envoyées. Patiente un instant.",
        retryAfter: limit.retryAfterSeconds,
      },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  // 3. Body
  const body = await req.json();
  const { receiverId } = body as { receiverId: string };

  if (!receiverId || typeof receiverId !== "string") {
    return NextResponse.json(
      { ok: false, error: "receiverId required" },
      { status: 400 },
    );
  }

  if (receiverId === user.id) {
    return NextResponse.json(
      { ok: false, error: "Tu ne peux pas t'ajouter toi-même" },
      { status: 400 },
    );
  }

  // 4. Insert (RLS check : sender_id = auth.uid() doit être conforme)
  const { data, error } = await supabase
    .from("friend_requests")
    .insert({ sender_id: user.id, receiver_id: receiverId, status: "pending" })
    .select()
    .single();

  if (error) {
    // Cas commun : doublon (UNIQUE constraint)
    if (error.code === "23505") {
      return NextResponse.json(
        { ok: false, error: "Demande déjà envoyée" },
        { status: 409 },
      );
    }
    log.error("friend-request insert failed", {
      error,
      userId: user.id,
      receiverId,
    });
    return NextResponse.json(
      { ok: false, error: "Erreur serveur" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, friendRequest: data });
}
```

### Adapter le composant `FriendButton.tsx`

Remplacer l'appel direct Supabase par un fetch sur la nouvelle route :

```ts
// AVANT (à remplacer dans FriendButton.tsx)
const { error } = await supabase.from("friend_requests").insert({
  sender_id: currentUserId,
  receiver_id: targetUserId,
  status: "pending",
});

// APRÈS
const res = await fetch("/api/friend-requests", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ receiverId: targetUserId }),
});
const data = await res.json();
if (!data.ok) {
  // afficher l'erreur (toast ou état UI)
  // gérer spécifiquement le 429 (rate limit) avec un message dédié
}
```

**Important** : conserver les éventuels appels à `UPDATE friend_requests.status` (accepter/refuser) côté client tels quels — ils restent rares et la RLS protège déjà.

## 1.5 Tests manuels (à documenter dans `docs/SPRINT_2_TESTS.md`)

Pour chaque route protégée, vérifier :

```markdown
## Test rate limit — POST /api/squads

- [ ] Founder crée 3 ligues d'affilée → OK
- [ ] 4e tentative dans la fenêtre 60s → 429 avec retryAfter dans la réponse
- [ ] Attendre 60s → 5e tentative passe

## Test rate limit — POST /api/squads/[squadId]/messages

- [ ] Envoyer 20 messages d'affilée → OK
- [ ] 21e message dans la fenêtre → 429
```

(Idem pour les 3 autres routes.)

## 1.6 Commit Phase 1

```
feat(robustness): add DB-side rate limiting on social routes

- POST /api/squads (3/60s)
- POST /api/squads/join (10/60s)
- POST /api/squads/[squadId]/messages (20/60s)
- POST /api/messages/[otherId] (20/60s)
- POST /api/friend-requests NEW route (15/60s) replacing client-side INSERT

All using existing db-rate-limiter pattern (rate_limit_log table).
FriendButton.tsx updated to use the new route.

Refs: docs/CLEANUP_BACKLOG.md (rate limiting absent on social routes)
```

**Stop. Demander review founder avant Phase 2.**

---

# PHASE 2 — Atomicité création de ligue

## 2.1 Problème actuel

`POST /api/squads` fait 3 INSERT séquentiels non transactionnels :

1. INSERT `squads`
2. INSERT `squad_members` (le créateur)
3. INSERT `squad_messages` (message de bienvenue système)

Si l'étape 2 ou 3 échoue, on se retrouve avec une ligue zombie sans owner ou sans message d'accueil. Pas de rollback automatique.

## 2.2 Solution : RPC atomique

Créer migration `0109_create_squad_atomic.sql` :

```sql
CREATE OR REPLACE FUNCTION create_squad_atomic(
  p_owner_id uuid,
  p_name text,
  p_invite_code text,
  p_game_mode text DEFAULT 'classic',
  p_is_private boolean DEFAULT true,
  p_welcome_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_squad_id uuid;
  v_squad_record jsonb;
  v_welcome_text text;
BEGIN
  -- Validation des paramètres
  IF p_owner_id IS NULL THEN
    RAISE EXCEPTION 'p_owner_id required';
  END IF;
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'p_name required';
  END IF;
  IF length(p_name) > 30 THEN
    RAISE EXCEPTION 'p_name too long (max 30 chars)';
  END IF;
  IF p_invite_code IS NULL OR length(p_invite_code) != 6 THEN
    RAISE EXCEPTION 'p_invite_code must be 6 chars';
  END IF;
  IF p_game_mode NOT IN ('classic', 'braquage') THEN
    RAISE EXCEPTION 'invalid game_mode';
  END IF;

  -- Vérifier que l'owner existe
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_owner_id) THEN
    RAISE EXCEPTION 'owner profile not found';
  END IF;

  -- 1. INSERT squad
  INSERT INTO squads (owner_id, name, invite_code, game_mode, is_private)
  VALUES (p_owner_id, trim(p_name), upper(p_invite_code), p_game_mode, p_is_private)
  RETURNING id INTO v_squad_id;

  -- 2. INSERT squad_member (le créateur rejoint automatiquement)
  INSERT INTO squad_members (squad_id, user_id, joined_at)
  VALUES (v_squad_id, p_owner_id, now());

  -- 3. INSERT message de bienvenue
  v_welcome_text := COALESCE(p_welcome_message, 'Bienvenue dans la ligue ! Que les meilleurs gagnent.');

  INSERT INTO squad_messages (squad_id, user_id, content, is_system_message, created_at)
  VALUES (v_squad_id, NULL, v_welcome_text, true, now());

  -- Retourner le squad créé
  SELECT jsonb_build_object(
    'id', s.id,
    'name', s.name,
    'invite_code', s.invite_code,
    'owner_id', s.owner_id,
    'game_mode', s.game_mode,
    'is_private', s.is_private,
    'created_at', s.created_at
  ) INTO v_squad_record
  FROM squads s
  WHERE s.id = v_squad_id;

  RETURN v_squad_record;

EXCEPTION
  WHEN unique_violation THEN
    -- Code invite déjà utilisé : remonter une erreur explicite
    RAISE EXCEPTION 'invite_code_collision';
  WHEN OTHERS THEN
    -- Toute autre erreur : remonter avec contexte
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION create_squad_atomic(uuid, text, text, text, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_squad_atomic(uuid, text, text, text, boolean, text) TO authenticated;
```

**Important sur SECURITY DEFINER + RLS** :
La RPC s'exécute avec les privilèges du créateur (typiquement `postgres` ou `service_role`), donc elle bypass les RLS. C'est intentionnel ici pour pouvoir INSERT dans `squad_members` (RLS de cette table empêcherait normalement l'INSERT d'un row d'un autre user). On valide à la place via `p_owner_id` qui est passé explicitement.

**Sécurité** : le caller (la route Next.js) doit garantir que `p_owner_id == auth.uid()`. À enforcer dans le code de la route ci-dessous.

## 2.3 Refactor de la route `POST /api/squads`

Remplacer les 3 INSERT séquentiels par l'appel RPC :

```ts
// AVANT (à remplacer)
const { data: squad, error: e1 } = await supabase.from('squads').insert({...}).select().single();
if (e1) return NextResponse.json({ error: 'failed' }, { status: 500 });

const { error: e2 } = await supabase.from('squad_members').insert({squad_id: squad.id, user_id: user.id});
if (e2) {
  // Tentative de cleanup partielle, fragile
  await supabase.from('squads').delete().eq('id', squad.id);
  return NextResponse.json({ error: 'failed' }, { status: 500 });
}

const { error: e3 } = await supabase.from('squad_messages').insert({...});
// Si erreur ici, pas de cleanup → ligue + member sans message

// APRÈS
const { data: squad, error } = await supabase.rpc('create_squad_atomic', {
  p_owner_id: user.id,
  p_name: name,
  p_invite_code: inviteCode,
  p_game_mode: gameMode,
  p_is_private: isPrivate,
  p_welcome_message: welcomeMessage ?? null,
});

if (error) {
  if (error.message?.includes('invite_code_collision')) {
    return NextResponse.json(
      { ok: false, error: 'Code d\'invitation déjà utilisé, réessaie' },
      { status: 409 }
    );
  }
  log.error('create_squad_atomic failed', { error, userId: user.id });
  return NextResponse.json({ ok: false, error: 'Erreur lors de la création' }, { status: 500 });
}

return NextResponse.json({ ok: true, squad });
```

## 2.4 Tests manuels

```markdown
## Test atomicité création ligue

### Scénario nominal

- [ ] Founder crée une ligue → OK, squad + member + welcome message en DB

### Scénario collision code invite

- [ ] Insérer manuellement un row avec un invite_code donné
- [ ] Founder tente de créer avec le même code → 409 "Code d'invitation déjà utilisé"
- [ ] Vérifier qu'AUCUN row n'a été créé (squads, squad_members, squad_messages)

### Vérification post-création

- [ ] La table squads contient la ligue
- [ ] La table squad_members contient le créateur
- [ ] La table squad_messages contient le message système
- [ ] Tous avec le même squad_id
```

## 2.5 Commit Phase 2

```
feat(robustness): atomic squad creation via RPC

- New RPC create_squad_atomic (migration 0109)
- Handles all 3 inserts (squad + member + welcome message) in single transaction
- Replaces 3 sequential inserts in POST /api/squads
- Proper error handling for invite_code collisions

Refs: docs/CLEANUP_BACKLOG.md (atomicité création ligue)
```

**Stop. Review founder.**

---

# PHASE 3 — Cleanup `console.error` et logs non structurés

## 3.1 Inventaire

L'audit (DT1) signale que `src/lib/logger.ts` (logger structuré) coexiste avec des `console.error` directs dans les composants client. Faire un grep exhaustif :

```bash
grep -rn "console\.\(error\|warn\|log\)" src/components/ src/app/
```

**Filtrer** :

- ❌ Ignorer les `console.log` dans `src/lib/logger.ts` lui-même (c'est sa job)
- ❌ Ignorer les usages dans `src/lib/__tests__/` ou autres tests
- ✅ Cibler les composants client et les hooks

## 3.2 Stratégie de remplacement

Pour chaque occurrence trouvée :

**Cas 1 — Erreur de fetch ou de Supabase** :

```ts
// AVANT
console.error("[Push] subscription failed", err);

// APRÈS
import { log } from "@/lib/logger";
log.error("push subscription failed", { error: err, context: "PushOptIn" });
```

**Cas 2 — Warning de validation utilisateur (non-erreur)** :

```ts
// AVANT
console.warn("Username trop court");

// APRÈS : remplacer par un état UI (toast, message d'erreur de form)
// Ne pas logger via logger pour les erreurs UX, seulement pour les erreurs techniques
```

**Cas 3 — Debug log oublié** :

```ts
// AVANT
console.log("user data:", userData);

// APRÈS : SUPPRIMER (ne devrait pas être en prod)
```

## 3.3 Note importante sur le logger côté client

Le logger `src/lib/logger.ts` est compatible client-side, mais en environnement navigateur les logs partent dans la console (pas vers stdout serveur). Donc remplacer `console.error` par `log.error` côté client n'envoie toujours rien à un service externe — mais ça :

- Standardise le format JSON
- Permet une intégration future (Sentry/PostHog) en un seul endroit
- Améliore la grepabilité dans les DevTools

**Ne PAS** ajouter de complexité pour envoyer les logs client vers un endpoint serveur dans ce sprint. Hors scope.

## 3.4 Cas spécifiques attendus

D'après l'audit :

- `src/components/pwa/PushOptIn.tsx` — `console.error("[Push] ...")`
- Probablement d'autres dans les composants client

Liste à compléter par grep réel.

## 3.5 Tests

```bash
# Vérifier qu'il ne reste que les usages légitimes
grep -rn "console\." src/components/ src/app/(app)/ | grep -v "// eslint-disable" | grep -v "logger.ts"
```

L'idéal : 0 résultat (ou seulement des cas où c'est clairement justifié et commenté).

## 3.6 Commit Phase 3

```
chore(cleanup): standardize logging in client components

- Replace direct console.error/warn/log calls with log.* from src/lib/logger
- Removed forgotten debug console.log statements
- UI validation messages remain inline (not logged)

Note: client-side logs still go to browser console only.
Future Sentry/PostHog integration will route them externally.

Refs: docs/AUDIT_TRACKING_ADMIN.md DT1 (deux systèmes de logs)
```

---

# Synthèse finale

À la fin du sprint, créer `docs/SPRINT_2_ROBUSTESSE_SUMMARY.md` :

```markdown
# Sprint 2 — Robustesse — Résumé

## Phase 1 — Rate limiting

- 4 routes existantes protégées + 1 nouvelle route créée
- Constantes centralisées dans rate-limits.ts
- Pattern db-rate-limiter réutilisé

## Phase 2 — Atomicité création ligue

- Nouvelle RPC create_squad_atomic
- 3 INSERT séquentiels remplacés par 1 transaction
- Gestion propre des collisions de code invite

## Phase 3 — Cleanup logs

- N occurrences de console.\* nettoyées
- Logger structuré utilisé partout côté client

## Stats

- Migrations : 1 (0109)
- Routes modifiées : 4
- Routes créées : 1 (/api/friend-requests)
- Composants modifiés : N
- Lignes ajoutées : ~XXX
- Lignes supprimées : ~XXX
```

---

# Critères d'acceptation

- [x] Branche `sprint-2-robustesse` mergeable sans conflit
- [x] `npm run build` passe
- [x] `npm test` passe
- [x] 3 commits séparés conformes
- [x] Migration 0109 appliquée et testée
- [x] Rate limit testé manuellement sur les 5 routes (checklist `docs/SPRINT_2_TESTS.md`)
- [x] Création de ligue testée (nominal + collision)
- [x] Grep `console.error` dans `src/components/` retourne uniquement les cas légitimes
- [x] Documentation : `SPRINT_2_ROBUSTESSE_SUMMARY.md` créé, `CLEANUP_BACKLOG.md` mis à jour (items résolus retirés)

---

# Ne PAS faire

- ❌ Implémenter PostHog (Sprint 4)
- ❌ Toucher au booster `vision` (statu quo founder)
- ❌ Étendre les boosters aux pronos avant-match (Sprint 3)
- ❌ Créer le back-office admin (Sprint 5)
- ❌ Refactorer le système de notifications
- ❌ Optimiser les requêtes lentes signalées dans l'audit (sprint perf dédié plus tard)
- ❌ Bascule Redis pour le rate limiting (décision founder : DB-side)
