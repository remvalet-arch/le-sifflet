# Sprint BUTEURS-ODDS — Afficher les Pts potentiels sur les pronos Buteurs

> **Objectif :** Afficher les points potentiels à côté de chaque joueur dans le sélecteur de buteurs, pour que le joueur sache ce qu'il gagne avant de choisir.
>
> **Priorité :** 🟡 Post-CDM — utile mais non bloquant pour le 11 juin 2026.
>
> **Contexte :** Le prono Score Exact affiche déjà les "Pts possibles" pour le 1N2 (via `convertOddToPoints(match.odds_home/draw/away)`). Les buteurs, eux, affichent seulement le nom du joueur — aucune indication sur la récompense. La codebase a déjà `SCORER_DEFAULT_ODDS` (A: ×3.5, M: ×7, D: ×15) et `convertOddToPoints`. Il suffit d'afficher ce calcul dans la UI.

---

## Phase 1 — Afficher les Pts via les cotes statiques par position (S)

### 1a. Modifier `PlayerForSelect` pour exposer les pts

**Fichier :** `src/components/pronos/ScorerAllocationEditor.tsx`

`PlayerForSelect` a déjà `position`. Utiliser `SCORER_DEFAULT_ODDS` + `convertOddToPoints` pour calculer les pts côté composant.

```typescript
import { SCORER_DEFAULT_ODDS, SCORER_MAX_POINTS } from "@/lib/odds";
import { convertOddToPoints } from "@/lib/odds";

function getScorePreviewPts(position: string | null | undefined): number {
  const odd = SCORER_DEFAULT_ODDS[position ?? ""] ?? SCORER_DEFAULT_ODDS["A"];
  return convertOddToPoints(odd, SCORER_MAX_POINTS);
}
```

### 1b. Afficher les pts dans `PlayerPickerSheet`

**Fichier :** `src/components/pronos/PlayerPickerSheet.tsx`

Dans le rendu de chaque joueur (liste/recherche), ajouter le badge pts :

```tsx
// Après le nom du joueur et la position
const pts = getScorePreviewPts(player.position);
<span className="ml-auto shrink-0 rounded-full bg-whistle/10 px-2 py-0.5 text-xs font-bold text-whistle">
  ~{pts} pts
</span>;
```

**DoD :**

- Ouvrir le picker de buteur → chaque joueur affiche "~X pts" à droite
- Un attaquant affiche moins de pts qu'un défenseur (cote plus basse = moins de pts)
- Les gardiens (G) et CSC n'ont pas de badge pts (ou affichent "?" en fallback)

---

## Phase 2 — Cotes réelles API-Football pour les joueurs (M)

> Cette phase ajoute des cotes individuelles réelles depuis l'API bookmaker. À faire après CDM, car les odds API-Football ne sont pas toujours disponibles à J-2.

### 2a. Table `player_odds` (migration)

```sql
CREATE TABLE public.player_odds (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id    UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  odd_anytime NUMERIC(6,2),    -- "Anytime Scorer" (ex: 2.50)
  odd_first   NUMERIC(6,2),    -- "First Goal Scorer" (ex: 5.00)
  synced_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id, player_name)
);

CREATE INDEX idx_player_odds_match ON public.player_odds(match_id);
ALTER TABLE public.player_odds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "player_odds_select" ON public.player_odds FOR SELECT USING (true);
```

### 2b. Service de sync — `/src/services/api-football-odds-sync.ts`

**Endpoint API-Football :** `GET /odds?fixture={fixtureId}&bookmaker=8` (Bet365, marché "First Goal Scorer")

```typescript
export async function syncPlayerOddsForMatch(
  matchId: string,
  fixtureId: string,
): Promise<number> {
  const res = await fetch(
    `https://v3.football.api-sports.io/odds?fixture=${fixtureId}&bookmaker=8`,
    { headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY! } },
  );
  const json = await res.json();
  const bets = json.response?.[0]?.bookmakers?.[0]?.bets ?? [];

  const firstScorer = bets.find((b: { name: string }) =>
    b.name.toLowerCase().includes("first goal scorer"),
  );
  const anytimeScorer = bets.find((b: { name: string }) =>
    b.name.toLowerCase().includes("anytime scorer"),
  );

  if (!firstScorer && !anytimeScorer) return 0;

  const oddsMap = new Map<
    string,
    { odd_anytime?: number; odd_first?: number }
  >();

  for (const val of firstScorer?.values ?? []) {
    const name = val.value as string;
    oddsMap.set(name, { ...oddsMap.get(name), odd_first: parseFloat(val.odd) });
  }
  for (const val of anytimeScorer?.values ?? []) {
    const name = val.value as string;
    oddsMap.set(name, {
      ...oddsMap.get(name),
      odd_anytime: parseFloat(val.odd),
    });
  }

  const admin = createAdminClient();
  const rows = Array.from(oddsMap.entries()).map(([player_name, odds]) => ({
    match_id: matchId,
    player_name,
    ...odds,
  }));

  if (rows.length === 0) return 0;

  await admin.from("player_odds").upsert(rows, {
    onConflict: "match_id,player_name",
  });

  return rows.length;
}
```

### 2c. Câbler dans l'admin import match

**Fichier :** `/src/app/api/admin/import-match/route.ts` (ou le handler existant)

Appeler `syncPlayerOddsForMatch` après l'import du match si `external_id` est disponible.

### 2d. Passer les odds au composant

**Fichier :** `src/components/pronos/ScorerAllocationEditor.tsx`

Quand les joueurs sont chargés (`fetchPlayersForMatch`), joindre les cotes depuis `player_odds` :

```typescript
// Dans fetchPlayersForMatch, après la query lineups/players
const { data: oddsRows } = await supabase
  .from("player_odds")
  .select("player_name, odd_anytime, odd_first")
  .eq("match_id", matchId);

const oddsMap = new Map((oddsRows ?? []).map((r) => [r.player_name, r]));
// Enrichir PlayerForSelect avec les cotes réelles
```

Mettre à jour `PlayerForSelect` :

```typescript
export type PlayerForSelect = {
  player_name: string;
  position?: string | null;
  cutout_url?: string | null;
  image_url?: string | null;
  odd_anytime?: number | null; // Nouveau
  odd_first?: number | null; // Nouveau
};
```

`getScorePreviewPts` utilise `odd_anytime ?? SCORER_DEFAULT_ODDS[position]`.

---

## Critères d'acceptation (Phase 1)

1. Dans le `PlayerPickerSheet`, chaque joueur affiche `~X pts` en badge jaune
2. L'ordre de grandeur est cohérent : Attaquant (~28 pts) < Milieu (~76 pts) < Défenseur (~140 pts)
3. CSC et joueurs sans position affichent "?" ou pas de badge (pas de crash)
4. `npm run ai:check` passe sans erreur
5. `npm run build` passe sans erreur

## Critères d'acceptation (Phase 2 — bonus)

6. Admin : importer un match avec `external_id` → `player_odds` se peuple depuis API-Football
7. Dans le picker, les joueurs avec cotes réelles affichent le pts basé sur la cote bookmaker
8. Fallback gracieux si API-Football n'a pas d'odds pour ce match

## Fichiers à modifier

**Phase 1 :**

- `src/components/pronos/PlayerPickerSheet.tsx` — afficher badge pts
- `src/components/pronos/ScorerAllocationEditor.tsx` — fonction `getScorePreviewPts`
- `src/lib/odds.ts` — exposer `getScorePreviewPts` si partagé

**Phase 2 :**

- `supabase/migrations/XXXX_player_odds.sql` — nouvelle table
- `src/types/database.ts` — typer `player_odds`
- `src/services/api-football-odds-sync.ts` — service de sync
- `src/components/pronos/ScorerAllocationEditor.tsx` — enrichir `PlayerForSelect`
- `src/components/pronos/PlayerPickerSheet.tsx` — utiliser les cotes réelles

## Complexité estimée

- Phase 1 : S (15-20 min)
- Phase 2 : M (60-90 min)
