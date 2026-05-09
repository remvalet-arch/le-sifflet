# Sprint PERF — Images & ISR

> **Contexte produit** : VAR TIME est une PWA Next.js 16 sur Vercel. Pendant la CDM, on attend des pics de trafic concentrés (90 minutes par match × 64 matchs sur 5 semaines, avec des pics extrêmes sur les matchs France et finales). Sans optimisation, **chaque visite déclenche un rendu serveur** (mode `dynamic`) avec requêtes Supabase, ce qui fait gonfler la facture DB et dégrade le LCP (Largest Contentful Paint) sur mobile.
>
> **Problème actuel** : 9 pages sont en mode `dynamic` alors qu'elles pourraient bénéficier d'ISR (Incremental Static Regeneration), et 7 composants utilisent `<img>` brut au lieu de `next/image`, dégradant le LCP et coûtant de la bande passante.
>
> **Pourquoi c'est urgent avant la CDM** :
>
> - Coût : Supabase Free tier est limité à 500 MB de DB egress/mois. Avec 5k MAU et zéro ISR, on explose le quota en 1-2 jours pendant la CDM.
> - Performance : un LCP > 2.5s sur mobile fait fuir les utilisateurs avant même qu'ils voient le contenu. C'est exactement le moment où chaque seconde compte.
> - Réputation : si l'app rame le 11 juin à l'ouverture du premier match, les premiers retours sur Twitter seront mauvais et impossibles à rattraper.
>
> **Périmètre** : ajouter ISR sur 9 pages, convertir 7 `<img>` en `next/image`, ajouter Suspense + skeletons sur 3 pages clés. Aucune modification de logique métier.

---

## PERF-1 — Audit ISR : pages actuellement en mode dynamic

Identifier les pages en mode `dynamic` (forcé ou implicite) et confirmer pour chacune si elle peut passer en ISR.

- [ ] Pour chaque page listée ci-dessous, vérifier le fichier `page.tsx` :
  - Y a-t-il `export const dynamic = "force-dynamic"` ? (à virer si oui)
  - Y a-t-il un appel à `cookies()` ou `headers()` ? (force le mode dynamic — à inspecter)
  - Y a-t-il un appel à `getUser()` Supabase qui dépend de la session ?

- [ ] Pour les pages qui dépendent de la session utilisateur, **séparer la partie statique (en ISR) de la partie dynamique (composant client qui charge les données utilisateur)**. Pattern Next.js 15+ : la page elle-même est en ISR et rend un Skeleton, un composant client `"use client"` charge les données via `useEffect` ou SWR.

| Page              | revalidate cible | Justification                                                                        |
| ----------------- | ---------------- | ------------------------------------------------------------------------------------ |
| `/lobby`          | **30s**          | Liste des matchs change rarement (calendrier figé), 30s suffit pour les statuts live |
| `/shop`           | **3600s (1h)**   | Catalogue cosmétique change très peu                                                 |
| `/settings`       | **86400s (24h)** | Page quasi-statique                                                                  |
| `/ligues`         | **300s (5min)**  | Données partagées entre membres d'une ligue                                          |
| `/profile`        | **300s**         | Données personnelles, mais peuvent vivre 5 min                                       |
| `/profile/[id]`   | **300s**         | Profil public d'autres users                                                         |
| `/rules`, `/laws` | **86400s (24h)** | Pages statiques juridiques                                                           |
| `/squads`         | **300s**         | Liste des squads de l'utilisateur                                                    |

- [ ] **Cas particulier `/messages`** : NE PAS ajouter d'ISR (DM en temps réel, doit rester dynamique). Le marquer explicitement avec `export const dynamic = "force-dynamic"` pour le rendre intentionnel.

---

## PERF-2 — Implémentation ISR sur les pages catalogue (priorité haute)

Pages où l'ISR a le plus d'impact (changements rares, trafic élevé) : `/lobby`, `/shop`, `/rules`, `/laws`.

- [ ] Pour chaque page, ajouter en haut du fichier `page.tsx` :
  ```typescript
  export const revalidate = <secondes>;
  ```
- [ ] **Vérifier qu'aucune logique de la page ne dépend de `cookies()` ou `headers()`**. Si oui, déplacer cette logique dans un composant client.
- [ ] Pour `/lobby` spécifiquement :
  - Les données API-Football (calendrier des matchs) doivent être fetchées via `fetch(..., { next: { revalidate: 30 } })` côté serveur, **pas** via la lib Supabase qui ne supporte pas la cache de Next directement.
  - Les statuts live (qui changent rapidement pendant un match) doivent être chargés via un composant client séparé qui fait du polling ou souscrit au realtime Supabase.
- [ ] Pour `/shop` :
  - Le solde Sifflets de l'utilisateur ne doit PAS être inclus dans la page ISR (sinon tous les users voient le solde du premier user qui a déclenché le rebuild). Le solde doit être chargé côté client.

---

## PERF-3 — Implémentation ISR sur les pages personnelles

Pages : `/settings`, `/ligues`, `/profile`, `/profile/[id]`, `/squads`.

- [ ] Ces pages contiennent souvent des données utilisateur. **Pattern recommandé** :
  - La page `page.tsx` est en ISR et rend une coquille (header, navigation, skeleton de contenu).
  - Un composant client `"use client"` charge les données utilisateur via SWR ou un fetch dans `useEffect`.
  - L'utilisateur voit la coquille instantanément (servie depuis le CDN), puis les données arrivent en 100-300ms.
- [ ] Pour `/profile/[id]` :
  - Si le profil affiché est public (pas le profil de l'utilisateur connecté), les données peuvent être en ISR avec `revalidate: 300` directement dans la page (pas besoin de séparer).
  - Si c'est le profil de l'utilisateur connecté (`/profile` sans id), pattern coquille + client comme ci-dessus.
- [ ] **Risque** : avec ISR, des données obsolètes peuvent apparaître brièvement (ex : un user qui vient de gagner des points voit son ancien total pendant 5 min). C'est acceptable. Si une action utilisateur modifie un état affiché, **invalider la cache via `revalidatePath('/profile')`** dans la route API qui fait la modification.

---

## PERF-4 — Conversion des `<img>` en `next/image`

7 composants utilisent encore `<img>` brut avec un commentaire `eslint-disable` parce que l'hôte image n'est pas dans `remotePatterns`.

- [ ] Modifier `next.config.ts` pour ajouter API-Sports (et tout autre hôte image utilisé) dans `remotePatterns` :
  ```typescript
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'media.api-sports.io' },
      { protocol: 'https', hostname: 'media-1.api-sports.io' },
      { protocol: 'https', hostname: 'media-2.api-sports.io' },
      // ajouter tout autre hôte rencontré dans les fichiers concernés
    ],
  }
  ```
- [ ] Pour chaque composant, remplacer `<img src="..." />` par `<Image src="..." alt="..." width={N} height={N} />` :
  - `MatchCard`
  - `MatchLobby`
  - `MatchLineupsPitch`
  - `MatchLineups`
  - `MatchStats`
  - `PolymarketTab`
  - `Scoreboard`
- [ ] **Important** : `next/image` exige un `width` et `height` connus. Pour les logos d'équipes (taille fixe), c'est trivial (ex : `width={48} height={48}`). Pour les photos joueurs en lineup pitch, mesurer la taille rendue actuelle.
- [ ] Pour les images critiques visibles au-dessus du fold (logos d'équipes sur la liste des matchs), ajouter `priority` :
  ```tsx
  <Image src={...} alt={...} width={48} height={48} priority />
  ```
  Limiter à **2-3 images max** par page avec `priority`, sinon ça défait l'optimisation.
- [ ] Retirer les commentaires `eslint-disable-next-line @next/next/no-img-element` une fois la conversion faite.

---

## PERF-5 — Suspense boundaries et skeleton loaders

Pages : `/profile`, `/ligues`, `/shop`. Aujourd'hui, l'utilisateur voit une page blanche pendant le chargement initial.

- [ ] Pour chacune de ces pages, identifier les composants qui font des fetches lourds (Supabase, API externes).
- [ ] Wrapper ces composants avec `<Suspense fallback={<Skeleton />}>`.
- [ ] Créer ou réutiliser un composant `Skeleton` (ou plusieurs : `MatchCardSkeleton`, `ProfileSkeleton`, `ShopGridSkeleton`) qui mime la structure du contenu réel avec des blocs gris en `animate-pulse`. Tailwind a déjà la classe `animate-pulse`.
- [ ] Vérifier le résultat sur mobile : le skeleton doit apparaître **instantanément** (< 100ms après le premier paint) et être remplacé par le contenu en 200-500ms.
- [ ] Ne PAS sur-utiliser Suspense — uniquement sur les zones qui font de vrais fetches lents. Sinon le skeleton s'affiche partout pour rien et c'est pire UX qu'un blanc bref.

---

## PERF-6 — Parallélisation des awaits séquentiels

Le TECH_BIBLE identifie des `await` séquentiels dans `profile/[id]` et `profile/page.tsx` qui pourraient être parallélisés avec `Promise.all`.

- [ ] Lire les fichiers `src/app/(app)/profile/page.tsx` et `src/app/(app)/profile/[id]/page.tsx`.
- [ ] Identifier les blocs du type :
  ```typescript
  const userData = await fetchUserData(id);
  const badges = await fetchBadges(id);
  const stats = await fetchStats(id);
  ```
- [ ] Les transformer en :
  ```typescript
  const [userData, badges, stats] = await Promise.all([
    fetchUserData(id),
    fetchBadges(id),
    fetchStats(id),
  ]);
  ```
- [ ] **Attention** : ne paralléliser que si les fetches sont indépendants. Si `fetchBadges(userData.badge_ids)` dépend de `userData`, on ne peut pas paralléliser. Dans ce cas, vérifier si la dépendance est nécessaire — souvent on peut récupérer tous les badges du user en une seule requête sans avoir besoin de `userData` d'abord.
- [ ] Mesurer avant/après avec un `console.time()` temporaire pour chaque page (puis le retirer avant le commit).

---

## PERF-7 — Validation des Core Web Vitals

Avant de merger, mesurer l'impact réel.

- [ ] Lancer Lighthouse en mode mobile sur les pages modifiées :
  - `/lobby`
  - `/shop`
  - `/profile`
  - `/profile/[id]` (avec un id valide)
- [ ] Cibler :
  - **LCP** < 2.5s (idéal < 2s)
  - **FCP** < 1.8s
  - **CLS** < 0.1
  - **Performance score** > 80 sur mobile
- [ ] Si une page est en dessous de 80, identifier le bottleneck (images non optimisées restantes, fonts, JS bundle trop gros).
- [ ] Capturer les rapports avant/après dans le PR.

---

## PERF-8 — Vérification de la cache Vercel

Vérifier que les pages ISR sont bien servies depuis le CDN Vercel et pas re-rendues à chaque visite.

- [ ] Déployer la branche sur Vercel preview.
- [ ] Faire 2 requêtes consécutives sur `/lobby` avec `curl -I` ou DevTools Network.
- [ ] Vérifier le header `x-vercel-cache` :
  - Première requête : `MISS` ou `STALE` (rebuild)
  - Deuxième requête : `HIT` (servi depuis CDN)
- [ ] Si toutes les requêtes restent en `MISS`, c'est que la page n'est pas vraiment en ISR (probablement à cause d'un appel `cookies()` ou `headers()` qu'on a oublié).

---

## Hors scope (à NE PAS faire dans ce sprint)

- ❌ Refonte du bundle JS (code splitting agressif, dynamic imports) — sprint séparé.
- ❌ Optimisation des fonts (font-display, preload) — peut-être un mini-sprint à part si LCP reste > 2.5s.
- ❌ Migration vers une CDN externe pour les images (Cloudflare Images) — overkill pour le moment.
- ❌ Service Worker custom pour la PWA — déjà géré par next-pwa probablement.

---

## Critères d'acceptation du sprint

1. 9 pages listées ont leur `revalidate` configuré ou sont explicitement marquées `dynamic` avec justification (cas `/messages`).
2. 7 composants `<img>` sont convertis en `next/image`. `next.config.ts` à jour avec les bons `remotePatterns`.
3. 3 pages clés (`/profile`, `/ligues`, `/shop`) ont des Suspense + skeletons.
4. Les awaits séquentiels dans `/profile/*` sont parallélisés.
5. Lighthouse mobile > 80 sur les pages modifiées, LCP < 2.5s.
6. Cache Vercel `HIT` confirmé sur les pages ISR via `x-vercel-cache`.

---

## Pour Claude Code

- Faire les tâches dans l'ordre PERF-1 → PERF-8. PERF-1 est un audit qui peut révéler des surprises (pages avec dépendances cachées au session) qui changent la stratégie.
- Si en PERF-1 une page apparaît impossible à mettre en ISR (dépendance forte à la session), la documenter et passer à la suivante.
- Pour les Skeleton loaders, **rester sobre** : un bloc gris arrondi par section, pas une copie pixel-perfect du contenu. L'objectif c'est éviter le blanc, pas tromper l'utilisateur.
- Tester sur un vrai mobile (pas seulement DevTools mobile emulation) si possible — les Core Web Vitals sont parfois trompeurs en émulation.
