# Diagnostic — Sprint Bugfixes Mobile PWA

> Généré le 2026-05-10 — Phase A (lecture seule). Aucun code modifié.

---

## Bug 1 — Toasts tronqués par la notch iOS

### Symptôme

Toasts Sonner partiellement masqués par la notch/Dynamic Island en PWA iOS installée.

### Cause racine identifiée

Le `viewportFit: "cover"` est bien en place dans `layout.tsx` et Sonner reçoit `offset="max(env(safe-area-inset-top, 0px), 50px)"`. Le problème est que le **fallback est 50px alors que le Dynamic Island mesure ~60px**. Si `env(safe-area-inset-top)` retourne 0 (cas fréquent au cold start PWA), le toast passe sous la Dynamic Island.

### Chaîne complète du problème

1. `layout.tsx:60` — `viewportFit: "cover"` ✅ en place
2. `ToasterProvider.tsx:10` — `offset="max(env(safe-area-inset-top, 0px), 50px)"`
3. Sur iPhone 14 Pro / 15 Pro / 15 Pro Max (Dynamic Island ~59px), le fallback 50px est insuffisant
4. Toast se positionne à 50px depuis le haut → chevauche la Dynamic Island de ~10px
5. Texte du toast masqué

### Fichiers concernés

- `src/components/providers/ToasterProvider.tsx` (ligne 10) — prop `offset`
- `src/app/layout.tsx` (ligne 60) — `viewportFit: "cover"` (OK, ne pas toucher)

### Ce que les fixes précédents ont probablement essayé

Ajout de `padding-top: 40px` ou `50px` en dur — remplacé ensuite par `env()` avec un fallback trop bas.

### Plan de fix proposé

Augmenter le fallback : `offset="max(env(safe-area-inset-top, 0px), 60px)"`.
— **1 ligne modifiée.**

### Risques du fix

Nul. iPhone SE (pas de notch) : 60px de marge en haut des toasts (acceptable). iPhone avec Dynamic Island : parfaitement aligné.

### Tests de non-régression

- Toast sur iPhone SE — visible, marge raisonnable
- Toast sur iPhone 12/13 (notch ~47px) — visible sous la notch
- Toast sur iPhone 14 Pro+ (Dynamic Island ~59px) — visible sous le Dynamic Island

---

## Bug 1.bis — Modales collées à la notch iOS

### Symptôme

VotingModal principalement : contenu collé sous la notch faute de marge.

### Cause racine identifiée

Le `paddingTop: "max(env(safe-area-inset-top, 0px), 1rem)"` est appliqué sur le **backdrop/overlay** (`fixed inset-0`), pas sur la modale elle-même. Un overlay `inset-0` avec `padding-top` crée de l'espace transparent en haut, mais la modale (`.animate-modal-sheet`) positionnée en `items-end` à l'intérieur n'en bénéficie pas : elle reste alignée sur le bas du viewport, et si elle est plus haute que l'espace disponible, son header dépasse sous la notch.

### Chaîne complète du problème

1. `VotingModal.tsx:134` — backdrop `fixed inset-0 flex items-end` avec `style={{ paddingTop: ... }}`
2. Le `paddingTop` rétrécit la zone flexible du backdrop, pas la modale
3. La modale `animate-modal-sheet` est `flex items-end` → elle colle au bas, mais peut déborder en haut selon sa hauteur
4. Header de la modale partiellement sous la notch sur grands contenus

### Fichiers concernés

- `src/components/match/VotingModal.tsx` (lignes 134–141) — padding sur mauvais élément
- `src/components/match/AlertDrawer.tsx` — OK (bottom drawer, pas concerné)
- `src/components/match/ActionDrawer.tsx` — OK (bottom drawer, pas concerné)

### Ce que les fixes précédents ont probablement essayé

Ajout du `paddingTop` sur le wrapper backdrop (ce qui ne transmet pas l'espace à la modale enfant).

### Plan de fix proposé

Déplacer le `paddingTop` du backdrop vers le div `.animate-modal-sheet` (la modale elle-même) via `marginTop` ou `paddingTop` directement sur le ref `sheetRef`.
— **~3 lignes modifiées.**

### Risques du fix

Vérifier que `max-h-[90vh]` de la modale n'entre pas en conflit avec le margin-top ajouté (réduire à `max-h-[85vh]` si besoin).

### Tests de non-régression

- VotingModal ouverte sur iPhone 12+ → titre visible sous la notch, bouton OUI/NON accessibles
- VotingModal sur iPhone SE → pas de perte d'espace inutile
- Scroll interne de la modale toujours fonctionnel

---

## Bug 2 — BottomNav qui remonte selon les pages

### Symptôme

La BottomNav n'est pas visuellement en bas sur certaines pages ; le contenu de fin de page passe sous la nav.

### Cause racine identifiée

La structure est correcte (`h-[100dvh]`, `flex-col`, `shrink-0` sur la nav). Le problème est l'**absence de `padding-bottom` sur `<main>`** compensant la hauteur de la BottomNav. Sur les pages à contenu court, le contenu finit avant la BottomNav, qui reste bien en bas. Sur les pages à contenu scrollable, le dernier élément est masqué DERRIÈRE la BottomNav car `<main>` est `overflow-y-auto` sans espace réservé en bas.

L'apparence "aléatoire" vient du fait que certaines pages ont un `pb-*` dans leurs propres composants enfants (et semblent OK) tandis que d'autres non.

### Chaîne complète du problème

1. `app/(app)/layout.tsx:111` — shell `h-[100dvh] flex-col` ✅
2. `app/(app)/layout.tsx:122` — `<main className="flex flex-1 overflow-y-auto">` — pas de `pb-*`
3. `BottomNav.tsx:128` — nav `shrink-0` bien ancrée en bas du shell ✅
4. Quand l'utilisateur scrolle jusqu'en bas d'une page → dernier élément visible passe sous la nav
5. iOS PWA aggrave : barre système réduit le dvh disponible au focus d'un input → le clavier push le layout, la BottomNav peut sembler "remonter"

### Fichiers concernés

- `src/app/(app)/layout.tsx` (lignes 120–126) — `<main>` sans padding-bottom

### Ce que les fixes précédents ont probablement essayé

Ajout de `pb-*` dans certaines pages enfant (fragile, pas global). Ou mauvais diagnostic : pensaient que la nav était `sticky` au lieu de voir que c'était le contenu qui chevauchait.

### Plan de fix proposé

Ajouter un `<div className="h-16 shrink-0" />` spacer à la fin du contenu de `<main>`, OU ajouter `pb-20` directement sur `<main>`.
— **1–2 lignes modifiées dans `layout.tsx`.**

### Risques du fix

Toutes les pages héritent du spacer → vérifier que les pages fullscreen (ex: LiveRoom avec fond noir) n'affichent pas un espace blanc inattendu en bas. Si LiveRoom gère son propre overflow, pas de problème.

### Tests de non-régression

- Lobby (liste de matchs) → dernier match visible au-dessus de la nav
- Match live → pas de contenu coupé
- Profil long (avec scroll) → dernier élément visible
- Shop → idem
- Settings → idem

---

## Bug 3 — Pastilles non lues qui reviennent (chat ligue + DM)

### Symptôme

Badge "non lu" réapparaît immédiatement après avoir ouvert le chat ou les DM, sans nouveau message.

---

### Bug 3.1 — Chat ligue

### Cause racine identifiée

**Double problème :**

1. `SquadChat.tsx` déclenche `last_read_at = NOW()` (heure client) **au mount**, avant que les messages ne soient chargés. Si l'horloge client est en retard sur le serveur Supabase de ne serait-ce que 1-2 secondes, des messages existants auront `created_at > last_read_at` et seront comptés comme non-lus.
2. Le Realtime de `BottomNav.tsx` écoute les INSERT sur `squad_messages` et pose `setHasUnread(true)` sans vérifier si l'utilisateur est actuellement en train de lire ce squad — la ref `isOnLiguesRef` ne distingue pas quel squad est ouvert.

### Chaîne complète du problème

1. User navigue vers `/ligues/[squadId]` → `SquadChat` monte
2. `useEffect` → `UPDATE squad_members SET last_read_at = NOW_CLIENT`
3. `NOW_CLIENT` est possiblement en retard de 1-2s sur `NOW_SERVEUR`
4. Des messages récents ont `created_at (serveur) > last_read_at (client)` → comptés comme non-lus
5. BottomNav re-query : `squad_messages WHERE created_at > last_read_at` → count > 0
6. Badge remonte

### Fichiers concernés

- `src/components/ligues/SquadChat.tsx` (lignes ~40–48) — `useEffect` avec `last_read_at = new Date().toISOString()` (heure client)
- `src/components/layout/BottomNav.tsx` (lignes ~64–80) — requête `created_at > last_read_at`
- `supabase/migrations/0094_squad_members_last_read.sql` — structure de `last_read_at` sur `squad_members`

### Ce que les fixes précédents ont probablement essayé

Marquer le state local `hasUnread = false` après visite (optimiste) sans corriger la persistance DB horodatage.

### Plan de fix proposé

Dans `SquadChat.tsx`, remplacer `new Date().toISOString()` (heure client) par un appel RPC qui utilise `NOW()` côté Supabase. Ou utiliser la RPC `mark_squad_read(p_squad_id)` si elle existe, sinon en créer une `SECURITY DEFINER` avec `last_read_at = NOW()` côté serveur.
— **Migration SQL ~10 lignes + 5 lignes TS modifiées.**

### Risques du fix

Nécessite un aller-retour réseau supplémentaire au mount de SquadChat (acceptable — c'est déjà le cas pour le fetch des messages).

---

### Bug 3.2 — DM (messages directs)

### Cause racine identifiée

`BottomNav` ne souscrit **à aucun channel Realtime pour les `direct_message_threads`**. Quand l'utilisateur lit les DM et que `user_a_read_at` est mis à jour, la BottomNav ne reçoit jamais ce signal → le badge reste affiché jusqu'au prochain full reload.

### Chaîne complète du problème

1. BottomNav calcule `hasUnreadDm` au mount (via layout Server Component)
2. User ouvre `/messages/[otherId]` → `MessagesConversation.tsx` update `user_a_read_at` via Supabase client
3. User revient sur une autre page
4. BottomNav affiche toujours `hasUnreadDm = true` car aucun event Realtime n'a signalé la mise à jour
5. Badge DM permanent jusqu'au rechargement

### Fichiers concernés

- `src/components/layout/BottomNav.tsx` — absence totale de subscription Realtime pour `direct_message_threads`
- `src/components/messages/MessagesConversation.tsx` (lignes ~55–67) — marquage lu uniquement déclenché par un nouvel INSERT, pas au render initial
- `src/app/(app)/layout.tsx` (lignes ~89–101) — calcul initial `hasUnreadDm` (Server Component, non réactif)

### Ce que les fixes précédents ont probablement essayé

Ajouter un `useEffect` qui poll ou re-fetch le count au changement de pathname — mais sans subscription Realtime, le badge reste décalé.

### Plan de fix proposé

1. Dans `BottomNav.tsx`, ajouter une subscription Realtime sur `direct_message_threads` (UPDATE) filtré sur `user_a_id = userId OR user_b_id = userId`
2. Dans le callback, recalculer `hasUnreadDm` depuis `last_message_at` vs `user_a_read_at`/`user_b_read_at`
3. Dans `MessagesConversation.tsx`, s'assurer que `user_a_read_at` est aussi mis à jour au mount (pas seulement à l'arrivée d'un nouveau message)
   — **~30 lignes TS dans BottomNav.tsx + ~5 lignes dans MessagesConversation.tsx.**

### Risques du fix

La subscription Realtime sur `direct_message_threads` nécessite `REPLICA IDENTITY FULL` sur cette table (migration SQL). Vérifier que la policy RLS autorise SELECT sur les rows de l'utilisateur.

---

## Récapitulatif des actions Phase B

| Ordre | Bug                         | Fichiers                                                 | Lignes modifiées | Risque |
| ----- | --------------------------- | -------------------------------------------------------- | ---------------- | ------ |
| 1     | Toast fallback              | `ToasterProvider.tsx`                                    | 1                | Nul    |
| 2     | VotingModal paddingTop      | `VotingModal.tsx`                                        | 3                | Faible |
| 3     | Main spacer                 | `app/(app)/layout.tsx`                                   | 2                | Faible |
| 4     | SquadChat last_read serveur | `SquadChat.tsx` + migration RPC                          | 15               | Moyen  |
| 5     | BottomNav DM Realtime       | `BottomNav.tsx` + `MessagesConversation.tsx` + migration | 35               | Moyen  |

**Stop. Validation founder requise avant Phase B.**
