# Audit Boosters — VAR TIME

> Lecture seule. Aucune modification de code. Rapport produit le 2026-05-10.

## Méthode d'audit

1. Lecture de la migration de création des boosters (`supabase/migrations/0090_boosters.sql`)
2. Lecture des RPCs de résolution (`supabase/migrations/0091_boosters_rpcs.sql`)
3. Lecture des composants d'achat et d'application UI
4. Lecture des routes API impliquées (`/api/bet`, `/api/boosters/purchase`)
5. Grep exhaustif sur `applied_booster_id`, `booster_id`, `consumed_at` dans tout le codebase

---

## Booster : `double_xp`

### Effet attendu (selon UI et catalog)

Multiplie par 2 la récompense du pari live VAR gagné.

### Achat

- **Route** : `POST /api/boosters/purchase` → `src/app/api/boosters/purchase/route.ts`
- **RPC** : `purchase_booster` (migration `0090_boosters.sql`, lignes 95-149)
- **Ce que fait la RPC** : débit atomique de `sifflets_balance` + INSERT de `p_quantity` lignes dans `user_boosters_inventory`

### Application

- **UI** : composant `BoosterPicker` dans `src/components/voting/VotingButtons.tsx` (lignes 351-409) — sélectionnable avant de voter sur un market VAR
- **Champ DB mis à jour** : `bets.applied_booster_id` (ajouté dans `0090_boosters.sql` ligne 75)
- **Endpoint** : `POST /api/bet` → appelle RPC `place_bet` avec `p_booster_id`

### Résolution

- **RPC vérifiée** : `resolve_event_parimutuel` (`0091_boosters_rpcs.sql`)
- **Consulte `applied_booster_id`** : OUI — lignes 255-268 : récupère `effect_type` du booster, applique `v_reward := v_reward * 2` si `double_xp`
- **Enregistrement** : INSERT dans `booster_highlights` (ligne 280-285)
- **Effet appliqué** : OUI

### Statut

✅ **FONCTIONNEL** — achat → application UI → résolution avec effet vérifiable

---

## Booster : `cote_plus`

### Effet attendu

Augmente la cote potentielle de +20% avant le pari, et booste le reward de +20% à la résolution.

### Achat

- **RPC** : `purchase_booster` (migration `0090_boosters.sql`)

### Application

- **UI** : `BoosterPicker` dans `src/components/voting/VotingButtons.tsx`
- **Champ DB** : `bets.applied_booster_id`
- **Endpoint** : `POST /api/bet` → RPC `place_bet`
- **Effet à l'application** : `place_bet` augmente `v_potential` de 20% lors du placement (migration `0090_boosters.sql`, lignes 85-86)

### Résolution

- **RPC vérifiée** : `resolve_event_parimutuel` (`0091_boosters_rpcs.sql`)
- **Consulte `applied_booster_id`** : OUI — lignes 266-267 : `v_reward := FLOOR(v_reward * 1.2)` si `cote_plus`
- **Enregistrement** : INSERT dans `booster_highlights`
- **Effet appliqué** : OUI

### Statut

✅ **FONCTIONNEL** — achat → application UI → résolution avec effet vérifiable

---

## Booster : `safety_net`

### Effet attendu

En cas de pari perdu, rembourse 50% de la mise.

### Achat

- **RPC** : `purchase_booster` (migration `0090_boosters.sql`)

### Application

- **UI** : `BoosterPicker` dans `src/components/voting/VotingButtons.tsx`
- **Champ DB** : `bets.applied_booster_id`
- **Endpoint** : `POST /api/bet` → RPC `place_bet`

### Résolution

- **RPCs vérifiées** : `resolve_event_parimutuel` + `resolve_match_pronos` (`0091_boosters_rpcs.sql`)
- **Consulte `applied_booster_id`** : OUI sur les deux RPCs
  - `resolve_event_parimutuel` lignes 226-241 (cas sans gagnants) et 293-296 (perdants) : `v_bonus := FLOOR(v_bet.amount_staked * 0.5)` → ajout au solde
  - `resolve_match_pronos` lignes 506-509 : `v_safety_refund := FLOOR(r.reward_amount * 0.5)` → ajout au solde
- **Effet appliqué** : OUI

### Statut

✅ **FONCTIONNEL** — achat → application UI → résolution avec remboursement 50% vérifiable

---

## Booster : `vision`

### Effet attendu (selon UI)

Censé révéler les choix des amis avant de voter — fonctionnalité "information advantage".

### Achat

- **RPC** : `purchase_booster` (migration `0090_boosters.sql`) — ✅ achat possible

### Application

- **UI** : visible dans `BoosterPicker` (`src/components/voting/VotingButtons.tsx`) — ✅ sélectionnable
- **Champ DB** : ABSENT — aucune colonne `applied_booster_id` ou équivalent n'est mis à jour spécifiquement pour vision
- **Endpoint** : `POST /api/bet` accepte `p_booster_id` mais aucun effet vision côté `place_bet`
- **Sur pronos** : `place_match_prono` (`0091_boosters_rpcs.sql`, lignes 144-145) **rejette explicitement** les boosters vision avec le message `"Ce booster ne s'applique pas aux pronostics"`

### Résolution

- **RPCs vérifiées** : `resolve_event_parimutuel`, `resolve_match_pronos`
- **Consulte booster vision** : NON — aucun bloc de code `vision` dans les RPCs de résolution
- **Effet appliqué** : NON

### Observation complémentaire

L'effet "vision" (révéler les choix des amis) est une feature UI qui devrait fonctionner **au moment de la sélection** (avant de voter), pas à la résolution. Elle impliquerait un appel à `/api/pronos/friend-hints` au clic sur le booster, et le "consommer" avant affichage. Cette logique est **totalement absente** du code.

### Statut

❌ **ABSENT** — achat possible, UI présente, mais aucune logique d'effet implémentée ni côté frontend ni côté backend

---

## Observation transverse : boosters sur pronos avant-match

`src/components/pronos/MatchPronoCard.tsx` (ligne 269) passe **systématiquement `p_booster_id: null`** à `place_match_prono`. Aucune UI de sélection de booster n'existe sur les pronos avant-match. Conséquence : même `double_xp`, `cote_plus` et `safety_net` ne sont **jamais appliqués aux pronos**, uniquement aux paris live VAR.

---

## Synthèse

| Booster      | Achat | Application UI     | Endpoint       | Effet à la résolution              | Statut            | Action recommandée               |
| ------------ | ----- | ------------------ | -------------- | ---------------------------------- | ----------------- | -------------------------------- |
| `double_xp`  | ✅    | ✅ `BoosterPicker` | ✅ `/api/bet`  | ✅ `resolve_event_parimutuel` ×2   | ✅ FONCTIONNEL    | Ajouter l'UI sur pronos si voulu |
| `cote_plus`  | ✅    | ✅ `BoosterPicker` | ✅ `/api/bet`  | ✅ `resolve_event_parimutuel` ×1.2 | ✅ FONCTIONNEL    | Ajouter l'UI sur pronos si voulu |
| `safety_net` | ✅    | ✅ `BoosterPicker` | ✅ `/api/bet`  | ✅ +50% remboursement sur perte    | ✅ FONCTIONNEL    | Ajouter l'UI sur pronos si voulu |
| `vision`     | ✅    | ✅ (UI présente)   | ❌ Aucun effet | ❌ Absent                          | ❌ NON IMPLÉMENTÉ | Implémenter ou supprimer du shop |

---

## Recommandations pour le founder

### 1. `vision` : implémenter ou supprimer (décision urgente)

Le booster est vendable en boutique mais sans aucun effet. Deux options :

- **Implémenter** : au clic sur vision dans `BoosterPicker`, appeler `/api/pronos/friend-hints?matchId=X`, afficher les choix des amis, marquer le booster comme consommé. Effort : ~1 sprint.
- **Supprimer du shop** : retirer la ligne du catalog `boosters_catalog` (migration), retirer l'entrée de `BoosterPicker`. Remboursement des stocks existants à décider.

### 2. Boosters sur pronos avant-match : décision de scope

`double_xp`, `cote_plus`, `safety_net` fonctionnent uniquement sur les paris VAR live. Si le founder veut les rendre disponibles aussi sur les pronos avant-match, il faut :

- Ajouter un `BoosterPicker` dans `MatchPronoCard`
- Passer le `booster_id` à `place_match_prono` au lieu de `null`
- Effort estimé : ~2 sprints (UI + tests résolution pronos).

### 3. `scorer` type orphelin dans `pronos`

Le type `'scorer'` est encore déclaré dans les types TypeScript (`database.ts` ligne 1238) mais l'action recommandée (supprimer du CHECK DB) attend confirmation founder via :

```sql
SELECT COUNT(*) FROM pronos WHERE prono_type = 'scorer';
```

Si 0 rows → décommenter section 4 de migration `0105`.
