# BRIEF CLAUDE CODE — Sprint 3 : Booster `vision` + extension boosters aux pronos

> **Date** : 2026-05-10
> **Branche cible** : `sprint-3-boosters` depuis `stage` (après merge Sprint 2)
> **Estimation** : 2-3 jours
> **Pré-requis** : Sprints cleanup-rbac et Sprint 2 mergés sur `stage`

---

## Contexte

VAR TIME — PWA mobile-first de paris VAR communautaires. Stack Next.js 16 / React 19 / Supabase.

**Constats de l'audit boosters** (`docs/BOOSTERS_AUDIT.md`) :

1. Booster `vision` est **vendable mais sans aucun effet** (achat OK, sélection UI OK, mais zéro logique de résolution / révélation)
2. Boosters `double_xp`, `cote_plus`, `safety_net` fonctionnent **uniquement sur paris VAR live**, jamais sur pronos avant-match (`MatchPronoCard` passe `p_booster_id: null` en dur)

**Décisions founder** :

- Implémenter `vision` proprement
- Étendre les 3 boosters fonctionnels aux pronos avant-match
- Pas de refonte économique (prix, prix de vente inchangés)

---

## Objectifs

1. **Implémenter le booster `vision`** : effet "révéler les choix des amis" au moment du vote VAR live
2. **Étendre `double_xp`, `cote_plus`, `safety_net` aux pronos avant-match** : UI, RPC `place_match_prono`, RPC `resolve_match_pronos`
3. **Mettre à jour la documentation et les types**

**Hors scope** :

- ❌ Modifier les prix des boosters
- ❌ Ajouter de nouveaux boosters
- ❌ Modifier la logique d'affichage de "friend hints" (réutiliser l'endpoint existant `/api/pronos/friend-hints`)
- ❌ Étendre les boosters à `long_term_bets` (table supprimée au Sprint 1)

---

## Règles de conduite

1. **Branche dédiée** : `sprint-3-boosters` depuis `stage` à jour
2. **2 phases, 2 commits séparés**
3. **Stop & ask** au founder si :
   - Le mécanisme exact de "vision" est ambigu en fonction de la définition produit
   - Une RPC déjà appliquée doit être recréée plutôt que modifiée
   - Les types TypeScript divergent fortement de l'attendu
4. **Tests** : `npm run build` et `npm test` doivent passer
5. **Migrations** : numérotation à partir de `0110+`. Idempotence stricte.
6. **Pas de PR**. Commits sur la branche.

---

# PHASE 1 — Implémentation booster `vision`

## 1.1 Définition produit

**Effet du booster `vision`** : au moment où le user ouvre la `VotingModal` pour un market VAR live, s'il a un booster `vision` disponible et qu'il l'active, l'app **révèle les choix qu'ont fait ses amis sur le même market**, sous forme indicative non engageante (ex : "3 amis ont voté OUI, 1 ami a voté NON").

**Important** :

- L'effet est **avant le vote** (pas à la résolution)
- L'effet est **consommé immédiatement** au clic sur "Activer Vision"
- Si le user choisit ensuite de ne pas voter, le booster reste consommé (pas de remboursement)
- Si aucun ami n'a encore voté sur ce market, le système affiche "Aucun ami n'a encore voté"
- Le booster ne révèle JAMAIS l'identité des amis (juste les counts agrégés)

## 1.2 Endpoint d'activation

Créer `src/app/api/boosters/activate-vision/route.ts` :

```ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { log } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
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

  const body = await req.json();
  const { eventId } = body as { eventId: string };

  if (!eventId || typeof eventId !== "string") {
    return NextResponse.json(
      { ok: false, error: "eventId required" },
      { status: 400 },
    );
  }

  // Appel RPC qui fait tout en atomique :
  // 1. Vérifie que le user a un booster vision disponible
  // 2. Vérifie que l'event est ouvert
  // 3. Consomme un booster (UPDATE consumed_at + consumed_on_event_id)
  // 4. Retourne les choix des amis sur cet event
  const { data, error } = await supabase.rpc("activate_vision_booster", {
    p_user_id: user.id,
    p_event_id: eventId,
  });

  if (error) {
    if (error.message?.includes("no_booster_available")) {
      return NextResponse.json(
        { ok: false, error: "Tu n'as pas de booster Vision disponible" },
        { status: 400 },
      );
    }
    if (error.message?.includes("event_not_open")) {
      return NextResponse.json(
        { ok: false, error: "Ce market n'est plus ouvert" },
        { status: 400 },
      );
    }
    log.error("activate_vision failed", { error, userId: user.id, eventId });
    return NextResponse.json(
      { ok: false, error: "Erreur serveur" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, hints: data });
}
```

## 1.3 RPC `activate_vision_booster`

Créer migration `0110_vision_booster.sql` :

```sql
CREATE OR REPLACE FUNCTION activate_vision_booster(
  p_user_id uuid,
  p_event_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booster_inventory_id uuid;
  v_event_status text;
  v_match_id uuid;
  v_friend_choices jsonb;
BEGIN
  -- 1. Vérifier que le user a un booster vision dispo (non consommé)
  SELECT ubi.id INTO v_booster_inventory_id
  FROM user_boosters_inventory ubi
  JOIN boosters_catalog bc ON bc.id = ubi.booster_id
  WHERE ubi.user_id = p_user_id
    AND bc.slug = 'vision'
    AND ubi.consumed_at IS NULL
  LIMIT 1
  FOR UPDATE;

  IF v_booster_inventory_id IS NULL THEN
    RAISE EXCEPTION 'no_booster_available';
  END IF;

  -- 2. Vérifier que l'event existe et est ouvert
  SELECT status, match_id INTO v_event_status, v_match_id
  FROM market_events
  WHERE id = p_event_id;

  IF v_event_status IS NULL THEN
    RAISE EXCEPTION 'event_not_found';
  END IF;

  IF v_event_status != 'open' THEN
    RAISE EXCEPTION 'event_not_open';
  END IF;

  -- 3. Consommer le booster
  UPDATE user_boosters_inventory
  SET consumed_at = now(),
      consumed_on_event_id = p_event_id
  WHERE id = v_booster_inventory_id;

  -- 4. Calculer les choix des amis sur cet event (counts agrégés)
  -- "Amis" = friend_requests acceptées dans les deux sens
  WITH user_friends AS (
    SELECT receiver_id AS friend_id FROM friend_requests
    WHERE sender_id = p_user_id AND status = 'accepted'
    UNION
    SELECT sender_id AS friend_id FROM friend_requests
    WHERE receiver_id = p_user_id AND status = 'accepted'
  ),
  friend_bets_on_event AS (
    SELECT b.chosen_option, count(*) AS cnt
    FROM bets b
    JOIN user_friends uf ON uf.friend_id = b.user_id
    WHERE b.event_id = p_event_id
    GROUP BY b.chosen_option
  )
  SELECT jsonb_object_agg(chosen_option, cnt) INTO v_friend_choices
  FROM friend_bets_on_event;

  -- Si aucun ami n'a voté, retourner objet vide (pas null)
  IF v_friend_choices IS NULL THEN
    v_friend_choices := '{}'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'event_id', p_event_id,
    'match_id', v_match_id,
    'friend_choices', v_friend_choices,
    'booster_consumed_at', now()
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION activate_vision_booster(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION activate_vision_booster(uuid, uuid) TO authenticated;
```

## 1.4 UI — `VisionBoosterButton.tsx`

Créer `src/components/voting/VisionBoosterButton.tsx` :

```tsx
"use client";

import { useState } from "react";
import { log } from "@/lib/logger";

interface VisionBoosterButtonProps {
  eventId: string;
  hasVisionBooster: boolean; // au moins un booster vision dans l'inventory
  onActivated: (hints: Record<string, number>) => void;
}

export function VisionBoosterButton({
  eventId,
  hasVisionBooster,
  onActivated,
}: VisionBoosterButtonProps) {
  const [loading, setLoading] = useState(false);
  const [activated, setActivated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hasVisionBooster || activated) return null;

  const handleActivate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/boosters/activate-vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Erreur inconnue");
        return;
      }
      setActivated(true);
      onActivated(data.hints?.friend_choices ?? {});
    } catch (err) {
      log.error("vision activation failed", { error: err, eventId });
      setError("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vision-booster-section">
      <button
        type="button"
        onClick={handleActivate}
        disabled={loading}
        className="vision-booster-btn"
        aria-label="Activer le booster Vision pour révéler les choix de tes amis"
      >
        {loading ? "Activation..." : "👁️ Activer Vision"}
      </button>
      {error && (
        <p className="vision-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
```

**Note styling** : utiliser les classes Tailwind/CSS existantes du projet. Les classes ci-dessus sont des placeholders à remplacer par celles cohérentes avec le design system VAR TIME.

## 1.5 Affichage des hints dans `VotingModal`

Modifier `src/components/match/VotingModal.tsx` :

1. Ajouter un state local pour les hints révélés :

```tsx
const [revealedHints, setRevealedHints] = useState<Record<
  string,
  number
> | null>(null);
```

2. Ajouter le composant `VisionBoosterButton` au-dessus des options de vote :

```tsx
<VisionBoosterButton
  eventId={event.id}
  hasVisionBooster={hasVisionBoosterAvailable}
  onActivated={(hints) => setRevealedHints(hints)}
/>;

{
  revealedHints && (
    <div className="friend-hints" role="status" aria-live="polite">
      <p>👁️ Vision activé — choix de tes amis :</p>
      {Object.entries(revealedHints).length === 0 ? (
        <p>Aucun ami n'a encore voté sur ce market.</p>
      ) : (
        <ul>
          {Object.entries(revealedHints).map(([option, count]) => (
            <li key={option}>
              {count} ami{count > 1 ? "s" : ""} → {option.toUpperCase()}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

3. La prop `hasVisionBoosterAvailable` doit venir d'un hook ou d'un fetch. Récupérer via une query SELECT sur `user_boosters_inventory` joint à `boosters_catalog`. Réutiliser le pattern existant de `BoosterPicker`.

## 1.6 Tests manuels

```markdown
## Tests Phase 1 — Booster vision

### Setup

- [ ] Founder achète 2 boosters vision via /shop
- [ ] Vérifier en DB : 2 rows dans user_boosters_inventory avec consumed_at = NULL

### Test 1 — Activation nominale (avec amis qui ont voté)

- [ ] Avoir au moins 1 ami (friend_request status='accepted')
- [ ] L'ami a voté sur un event ouvert d'un match
- [ ] Founder ouvre la VotingModal sur ce même event
- [ ] Founder voit le bouton "Activer Vision"
- [ ] Founder clique → spinner → affichage des hints
- [ ] En DB : 1 booster vision consommé (consumed_at != NULL, consumed_on_event_id = event)
- [ ] Founder a maintenant 1 booster vision restant

### Test 2 — Aucun ami n'a voté

- [ ] Founder ouvre la VotingModal sur un event où aucun ami n'a voté
- [ ] Active vision → reçoit "Aucun ami n'a encore voté"
- [ ] Booster bien consommé malgré tout

### Test 3 — Pas de booster disponible

- [ ] Founder consomme tous ses boosters vision
- [ ] Le bouton "Activer Vision" ne s'affiche plus

### Test 4 — Event fermé entre ouverture modal et clic

- [ ] Forcer manuellement market_events.status = 'closed'
- [ ] Cliquer Activer Vision → erreur 400 "Ce market n'est plus ouvert"
- [ ] Booster NON consommé
```

## 1.7 Commit Phase 1

```
feat(boosters): implement vision booster

- New RPC activate_vision_booster (migration 0110)
- New route POST /api/boosters/activate-vision
- New component VisionBoosterButton in VotingModal
- Reveals friend choice counts on the current market event
- Booster consumed immediately, identity of friends not revealed

Effect: aggregated counts of friends' votes (e.g., "3 friends → OUI")
Refs: docs/BOOSTERS_AUDIT.md (vision was unimplemented)
```

**Stop. Review founder + tests manuels avant Phase 2.**

---

# PHASE 2 — Extension boosters fonctionnels aux pronos avant-match

## 2.1 Contexte

Aujourd'hui :

- `MatchPronoCard.tsx` ligne 269 : `place_match_prono` est appelé avec `p_booster_id: null` hardcodé
- Aucune UI de sélection de booster n'existe sur les pronos avant-match
- Les RPCs `place_match_prono` et `resolve_match_pronos` n'utilisent pas le `applied_booster_id` (pour les boosters non-`safety_net`)

**Important** : `safety_net` fonctionne déjà partiellement sur les pronos selon l'audit (`resolve_match_pronos` lignes 506-509). On va vérifier ça en Phase 2.0 avant tout.

## 2.0 Vérification préalable

```bash
# Lire les RPCs actuelles pour comprendre exactement ce qui est implémenté
grep -A 20 "applied_booster_id" supabase/migrations/0091_boosters_rpcs.sql
```

**Si le rapport `BOOSTERS_AUDIT.md` indique que `safety_net` est déjà appliqué sur pronos** : ne pas dupliquer la logique. Noter dans le commit message "safety_net already worked, only added double_xp and cote_plus".

## 2.2 Migration RPC mise à jour

Créer migration `0111_extend_boosters_to_pronos.sql` :

```sql
-- Mise à jour de place_match_prono pour accepter et valider p_booster_id
-- Mise à jour de resolve_match_pronos pour appliquer les effets

-- IMPORTANT : on RECRÉE les fonctions (CREATE OR REPLACE), on ne MODIFIE pas en place
-- Ça permet le rollback en réappliquant l'ancienne version

CREATE OR REPLACE FUNCTION place_match_prono(
  p_match_id uuid,
  p_home integer,
  p_away integer,
  p_scorers jsonb,
  p_booster_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_match_status text;
  v_booster_slug text;
  v_booster_inventory_id uuid;
  v_exact_score_prono_id uuid;
  v_scorer_alloc_prono_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Vérifier que le match est upcoming
  SELECT status INTO v_match_status FROM matches WHERE id = p_match_id;
  IF v_match_status != 'upcoming' THEN
    RAISE EXCEPTION 'match_not_upcoming';
  END IF;

  -- Si booster fourni, le valider et le consommer
  IF p_booster_id IS NOT NULL THEN
    -- Récupérer le slug du booster
    SELECT bc.slug INTO v_booster_slug
    FROM boosters_catalog bc WHERE bc.id = p_booster_id;

    IF v_booster_slug IS NULL THEN
      RAISE EXCEPTION 'invalid_booster_id';
    END IF;

    -- Refuser vision sur pronos (cohérent avec l'usage actuel)
    IF v_booster_slug = 'vision' THEN
      RAISE EXCEPTION 'Ce booster ne s''applique pas aux pronostics';
    END IF;

    -- Réserver un booster non-consommé
    SELECT ubi.id INTO v_booster_inventory_id
    FROM user_boosters_inventory ubi
    WHERE ubi.user_id = v_user_id
      AND ubi.booster_id = p_booster_id
      AND ubi.consumed_at IS NULL
    LIMIT 1
    FOR UPDATE;

    IF v_booster_inventory_id IS NULL THEN
      RAISE EXCEPTION 'no_booster_available';
    END IF;
  END IF;

  -- INSERT/UPSERT exact_score
  INSERT INTO pronos (match_id, user_id, prono_type, prono_value, reward_amount, status, applied_booster_id, placed_at)
  VALUES (p_match_id, v_user_id, 'exact_score',
          format('%s-%s', p_home, p_away),
          2000, 'pending', p_booster_id, now())
  ON CONFLICT (match_id, user_id) WHERE prono_type = 'exact_score'
  DO UPDATE SET
    prono_value = EXCLUDED.prono_value,
    reward_amount = EXCLUDED.reward_amount,
    applied_booster_id = EXCLUDED.applied_booster_id,
    placed_at = EXCLUDED.placed_at
  RETURNING id INTO v_exact_score_prono_id;

  -- INSERT/UPSERT scorer_allocation (même booster appliqué)
  IF p_scorers IS NOT NULL AND jsonb_array_length(p_scorers) > 0 THEN
    INSERT INTO pronos (match_id, user_id, prono_type, prono_value, reward_amount, status, applied_booster_id, placed_at)
    VALUES (p_match_id, v_user_id, 'scorer_allocation',
            p_scorers::text,
            500, 'pending', p_booster_id, now())
    ON CONFLICT (match_id, user_id) WHERE prono_type = 'scorer_allocation'
    DO UPDATE SET
      prono_value = EXCLUDED.prono_value,
      reward_amount = EXCLUDED.reward_amount,
      applied_booster_id = EXCLUDED.applied_booster_id,
      placed_at = EXCLUDED.placed_at
    RETURNING id INTO v_scorer_alloc_prono_id;
  END IF;

  -- Consommer le booster (UPDATE après les pronos)
  IF v_booster_inventory_id IS NOT NULL THEN
    UPDATE user_boosters_inventory
    SET consumed_at = now(),
        consumed_on_prono_id = COALESCE(v_exact_score_prono_id, v_scorer_alloc_prono_id)
    WHERE id = v_booster_inventory_id;
  END IF;

  RETURN jsonb_build_object(
    'exact_score_prono_id', v_exact_score_prono_id,
    'scorer_alloc_prono_id', v_scorer_alloc_prono_id,
    'booster_consumed', v_booster_inventory_id IS NOT NULL
  );
END;
$$;

GRANT EXECUTE ON FUNCTION place_match_prono(uuid, integer, integer, jsonb, uuid) TO authenticated;
```

**Pour `resolve_match_pronos`** : si l'audit indique que `safety_net` y est déjà géré, étendre la même logique à `double_xp` (×2 sur reward) et `cote_plus` (×1.2 sur reward).

```sql
-- Modèle de bloc à intégrer dans resolve_match_pronos selon le code existant
-- À adapter au pattern actuel de la fonction

DECLARE
  v_booster_slug text;
  v_multiplier numeric := 1.0;
  v_safety_refund integer := 0;
BEGIN
  -- Pour chaque prono à résoudre
  FOR r IN SELECT * FROM pronos WHERE match_id = p_match_id AND status = 'pending' LOOP
    v_multiplier := 1.0;
    v_safety_refund := 0;

    IF r.applied_booster_id IS NOT NULL THEN
      SELECT slug INTO v_booster_slug FROM boosters_catalog WHERE id = r.applied_booster_id;

      IF prono_won THEN
        IF v_booster_slug = 'double_xp' THEN
          v_multiplier := 2.0;
        ELSIF v_booster_slug = 'cote_plus' THEN
          v_multiplier := 1.2;
        END IF;
      ELSE
        IF v_booster_slug = 'safety_net' THEN
          v_safety_refund := FLOOR(r.reward_amount * 0.5);
        END IF;
      END IF;
    END IF;

    -- Appliquer v_multiplier sur le reward gagné OU v_safety_refund sur la perte
  END LOOP;
END;
```

## 2.3 UI — `BoosterPickerForPronos.tsx`

Créer un composant analogue au `BoosterPicker` existant, mais filtré pour exclure `vision` :

```tsx
"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

interface BoosterOption {
  id: string;
  slug: string;
  name: string;
  available_count: number;
}

interface BoosterPickerForPronosProps {
  userId: string;
  selectedBoosterId: string | null;
  onSelect: (boosterId: string | null) => void;
}

export function BoosterPickerForPronos({
  userId,
  selectedBoosterId,
  onSelect,
}: BoosterPickerForPronosProps) {
  const [boosters, setBoosters] = useState<BoosterOption[]>([]);
  const supabase = createBrowserClient();

  useEffect(() => {
    async function loadBoosters() {
      const { data } = await supabase
        .from("user_boosters_inventory")
        .select("booster_id, boosters_catalog!inner(id, slug, name)")
        .eq("user_id", userId)
        .is("consumed_at", null)
        .neq("boosters_catalog.slug", "vision"); // Exclure vision
      // Agréger par booster_id pour avoir le count
      // ... (code de groupement)
      setBoosters(/* result */);
    }
    loadBoosters();
  }, [userId]);

  if (boosters.length === 0) return null;

  return (
    <div className="booster-picker-pronos">
      <p className="text-sm">Appliquer un booster ? (optionnel)</p>
      <div className="booster-options">
        <button
          type="button"
          onClick={() => onSelect(null)}
          aria-pressed={selectedBoosterId === null}
        >
          Aucun
        </button>
        {boosters.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => onSelect(b.id)}
            aria-pressed={selectedBoosterId === b.id}
          >
            {b.name} ({b.available_count})
          </button>
        ))}
      </div>
    </div>
  );
}
```

## 2.4 Intégration dans `MatchPronoCard.tsx`

```tsx
// Ajouter le state
const [selectedBoosterId, setSelectedBoosterId] = useState<string | null>(null);

// Ajouter le composant dans le JSX (avant le bouton submit)
<BoosterPickerForPronos
  userId={userId}
  selectedBoosterId={selectedBoosterId}
  onSelect={setSelectedBoosterId}
/>;

// Adapter l'appel RPC : remplacer p_booster_id: null par selectedBoosterId
const { data, error } = await supabase.rpc("place_match_prono", {
  p_match_id: matchId,
  p_home: homeScore,
  p_away: awayScore,
  p_scorers: scorers,
  p_booster_id: selectedBoosterId, // au lieu de null
});
```

## 2.5 Tests manuels

```markdown
## Tests Phase 2 — Boosters sur pronos

### Setup

- [ ] Founder a 1 booster double_xp, 1 cote_plus, 1 safety_net en stock
- [ ] Match upcoming avec score connu à venir

### Test double_xp

- [ ] Founder fait un prono avec booster double_xp appliqué
- [ ] Match résolu, prono CORRECT
- [ ] Vérifier reward = 2000 × 2 = 4000 (au lieu de 2000)
- [ ] Booster consommé en DB

### Test cote_plus

- [ ] Founder fait un prono avec booster cote_plus appliqué
- [ ] Match résolu, prono CORRECT
- [ ] Vérifier reward = 2000 × 1.2 = 2400
- [ ] Booster consommé

### Test safety_net

- [ ] Founder fait un prono avec safety_net appliqué
- [ ] Match résolu, prono FAUX
- [ ] Vérifier crédit = reward_amount × 0.5 = 1000
- [ ] Booster consommé

### Test vision rejeté sur prono

- [ ] Founder tente d'appliquer vision sur un prono → erreur 400 "Ce booster ne s'applique pas aux pronostics"
- [ ] Booster NON consommé
```

## 2.6 Commit Phase 2

```
feat(boosters): extend boosters to pre-match pronos

- Updated RPC place_match_prono to accept and consume p_booster_id
- Updated RPC resolve_match_pronos to apply double_xp and cote_plus multipliers
- New component BoosterPickerForPronos (excludes vision booster)
- MatchPronoCard now passes selectedBoosterId instead of null

Boosters supported on pronos: double_xp (×2), cote_plus (×1.2), safety_net (50% refund)
Vision booster remains paris-only (rejected on pronos with explicit error)

Migration: 0111
Refs: docs/BOOSTERS_AUDIT.md (boosters not applied to pronos)
```

---

# Synthèse & Documentation

À la fin du sprint :

## Mettre à jour `docs/BOOSTERS_AUDIT.md`

Marquer chaque booster comme :

- `vision` : ✅ FONCTIONNEL (live VAR)
- `double_xp` : ✅ FONCTIONNEL (live VAR + pronos)
- `cote_plus` : ✅ FONCTIONNEL (live VAR + pronos)
- `safety_net` : ✅ FONCTIONNEL (live VAR + pronos)

## Mettre à jour `docs/CLEANUP_BACKLOG.md`

Retirer les items résolus :

- ~~Booster vision non implémenté~~ → résolu Sprint 3
- ~~Boosters non disponibles sur pronos avant-match~~ → résolu Sprint 3

## Créer `docs/SPRINT_3_BOOSTERS_SUMMARY.md`

```markdown
# Sprint 3 — Boosters — Résumé

## Phase 1 : Vision implémenté

- RPC activate_vision_booster (0110)
- Route /api/boosters/activate-vision
- VisionBoosterButton dans VotingModal

## Phase 2 : Boosters étendus aux pronos

- RPC place_match_prono mise à jour pour accepter p_booster_id
- RPC resolve_match_pronos applique double_xp/cote_plus/safety_net
- BoosterPickerForPronos dans MatchPronoCard

## Stats

- Migrations : 2 (0110, 0111)
- Routes créées : 1
- Composants créés : 2
- Composants modifiés : 2 (VotingModal, MatchPronoCard)
- Lignes ajoutées : ~XXX
- Lignes supprimées : ~XXX
```

---

# Critères d'acceptation

- [x] Branche `sprint-3-boosters` mergeable sans conflit
- [x] `npm run build` passe
- [x] `npm test` passe
- [x] 2 commits séparés conformes
- [x] Migrations 0110 et 0111 appliquées et testées
- [x] Tests manuels Phase 1 (vision) tous validés
- [x] Tests manuels Phase 2 (boosters pronos) tous validés
- [x] Documentation mise à jour : `BOOSTERS_AUDIT.md`, `CLEANUP_BACKLOG.md`, `SPRINT_3_BOOSTERS_SUMMARY.md`

---

# Ne PAS faire

- ❌ Modifier les prix des boosters
- ❌ Implémenter de nouveaux boosters
- ❌ Changer la logique de calcul du reward (multiplicateurs déjà définis)
- ❌ Toucher à la résolution parimutuel des paris VAR live (déjà fonctionnel)
- ❌ Modifier l'API friend-hints existante (réutiliser la logique d'amis)
- ❌ Implémenter PostHog (Sprint 4)
- ❌ Créer le back-office admin (Sprint 5)
