# BRIEF CLAUDE CODE — Sprint Bugfixes Mobile PWA

> **Mission** : corriger 4 bugs systémiques qui ont déjà résisté à plusieurs tentatives de fix.
>
> **⚠️ INSTRUCTION CRITIQUE DE MÉTHODE** : ces 4 bugs ont déjà été tentés et échoué. La raison : les fixes précédents ont traité **le symptôme là où il était visible**, sans remonter à la **cause profonde** dans la chaîne complète. **Cette fois, on procède différemment.**
>
> **Branche cible** : `bugfix-mobile-pwa` depuis `stage`
> **Date** : 2026-05-10
> **Estimation** : 1 jour (mais avec phase de diagnostic obligatoire en amont)

---

## Contexte projet

VAR TIME — PWA mobile-first de paris VAR communautaires. Stack Next.js 16 / React 19 / Supabase / TypeScript.

**Plateforme cible des bugs** : **iOS Safari installée en PWA** (sur l'écran d'accueil de l'iPhone). Tests Android secondaires.

---

## ⚠️ Méthode obligatoire pour ce sprint

Ce sprint a **deux phases distinctes**, séparées par un checkpoint humain obligatoire.

### Phase A — DIAGNOSTIC (lecture seule, ~1-2h)

Pour chacun des 4 bugs, produire dans `docs/BUGFIX_MOBILE_DIAGNOSTIC.md` :

1. **Localisation exacte** des fichiers concernés (chemins précis, pas "quelque part dans...")
2. **Hypothèse de cause racine** confirmée par lecture du code
3. **Chaîne complète** depuis l'origine jusqu'au symptôme visible
4. **Ce que les fixes précédents ont probablement essayé et raté**
5. **Plan de fix proposé**

⚠️ **AUCUNE modification de code en Phase A. Pure lecture/analyse.**

Stop ici. Demander review au founder avant Phase B.

### Phase B — FIX (après validation founder)

Application des fixes validés par le founder.

---

## Les 4 bugs à diagnostiquer puis corriger

### Bug 1 — Toasts/notifications IN APP tronqués par la notch (iOS PWA)

**Symptôme observé** :

- Tous les types : confirmations, erreurs, achievements, notifs Tatie, etc.
- Apparaissent par le haut de l'écran
- Sont **partiellement visibles** : on devine qu'il y a un toast mais le texte est masqué par la notch/Dynamic Island
- Reproduit **uniquement en PWA installée sur iOS** (pas en Safari classique)

**Diagnostic attendu (à confirmer par lecture du code)** :

C'est un problème de **safe-area iOS** non respecté. La chaîne complète à vérifier :

1. **Meta viewport** : présence de `viewport-fit=cover` dans le `<meta name="viewport">` du `<head>` (fichier `src/app/layout.tsx` ou `next/head` global). Sans ça, `env(safe-area-inset-*)` retourne `0`.
2. **CSS global** : présence de définitions sur le `body` ou le root pour ne pas créer un container qui ignore les safe-areas
3. **Composant Toast root** : identifier la lib utilisée (Sonner ? react-hot-toast ? toast maison ?) et où il est mounté
4. **Application du `env(safe-area-inset-top)`** sur le bon élément (le portail/wrapper du toast, pas un parent qui ne reçoit pas la prop)
5. **Z-index** : vérifier que le toast ne passe pas DERRIÈRE un overlay de status bar

**À chercher dans le code** :

```bash
grep -rn "viewport-fit" src/
grep -rn "safe-area-inset" src/
grep -rn "Toaster\|toast\b\|sonner\|hot-toast" src/ package.json
```

**Note critique** : les fixes précédents ont peut-être ajouté du `padding-top` en dur (40px, 50px). C'est faux. Il faut `env(safe-area-inset-top)` qui s'adapte à chaque appareil. Vérifier qu'aucun `top: 40px` ou similaire ne pollue le composant Toast.

**Test final attendu après fix** :

- En PWA iOS installée (pas Safari classique), un toast déclenché reste **entièrement visible** sous la notch
- Le texte est lisible sur iPhone avec notch (iPhone 12+) ET sur iPhone sans notch (SE) ET sur iPhone avec Dynamic Island (15 Pro+)

---

### Bug 1.bis — Modales Paris VAR trop proches de la notch

**Symptôme observé** :

- **Plusieurs modales** concernées (VotingModal, ActionDrawer, modale de confirmation alerte)
- La modale ne déborde pas sous la notch comme le toast, mais son contenu est **collé au bord supérieur** alors qu'il y a de l'espace inutilisé plus bas
- Donne une impression de mauvaise hiérarchie visuelle et risque tronquage selon device

**Diagnostic attendu (à confirmer)** :

Probablement la même cause que le bug 1, mais sur les composants modales :

- Soit les modales utilisent `top: 0` sans tenir compte de `env(safe-area-inset-top)`
- Soit les modales ont un padding interne fixe qui n'est pas safe-area-aware
- Soit le contenu de la modale est en `position: absolute` à `top: 0` du wrapper

**À chercher** :

```bash
grep -rn "VotingModal\|ActionDrawer\|AlertConfirmation\|AlertDrawer" src/components/
```

Pour chaque modale identifiée, regarder :

- Le wrapper de la modale (probablement Radix UI Dialog, Sheet, ou custom)
- Le `style` ou les classes Tailwind appliquées au container
- Si la modale est full-screen (`h-screen`) ou centred

**Plan de fix probable** :

- Si les modales utilisent un Radix Dialog : ajouter `paddingTop: 'env(safe-area-inset-top)'` sur le `<Dialog.Content>` ou via une classe utilitaire
- Sur les drawers bottom-anchored : pas de problème en haut, mais vérifier que le contenu ne déborde pas si fullscreen
- Créer une utility class Tailwind `pt-safe` qui mappe sur `padding-top: env(safe-area-inset-top)` pour réutilisation

**Test final attendu** :

- VotingModal : titre/header visible avec marge confortable sous la notch
- ActionDrawer : même test
- Confirmation d'alerte : même test
- Sur tous les iPhones (avec/sans notch, avec/sans Dynamic Island)

---

### Bug 2 — BottomNav qui remonte (pas systématique, "selon les pages")

**Symptôme observé** :

- BottomNav remonte parfois, prend trop de place, oblige à scroller pour la remettre en bas
- **Pas reproductible systématiquement** — le founder n'arrive pas à isoler le scénario exact
- "Selon la navigation"

**Diagnostic attendu (à confirmer)** :

Hypothèse principale : la BottomNav est en **`position: sticky` ou `position: relative`** au lieu de `position: fixed`. Conséquence :

- Sur les pages où le contenu fait **moins que la hauteur viewport** (`min-h-screen` non appliqué), la BottomNav suit le flow du contenu et remonte
- Sur les pages où le contenu est long, elle reste visuellement en bas par scroll naturel
- D'où l'aspect "aléatoire" — c'est en fait corrélé à la longueur du contenu de chaque page

Hypothèse secondaire : utilisation de `100vh` au lieu de `100dvh` (dynamic viewport height). Sur iOS PWA, `100vh` ne tient pas compte de la barre dynamique de Safari → un layout en `100vh` devient trop grand de 30-50px → la BottomNav se retrouve hors écran ou collée à un faux fond.

**À chercher** :

```bash
grep -rn "BottomNav\|MobileNav" src/components/ src/app/
grep -rn "position: fixed\|position: sticky" src/components/BottomNav* src/components/*Nav*
grep -rn "100vh\|min-h-screen\|h-screen" src/app/
```

Inspecter le composant `BottomNav` :

- Position CSS appliquée (fixed/sticky/relative)
- Où il est mounté dans la hiérarchie de layout (layout root ou par page ?)
- Si layout root : pourquoi remonte-t-il selon les pages ?

**Plan de fix probable** :

1. Faire de la `BottomNav` un composant **`position: fixed`** ancré en bas du viewport, ajouté au **layout root authenticated** (pas dans chaque page)
2. Ajouter `bottom: env(safe-area-inset-bottom)` pour iPhone avec home indicator
3. Ajouter un `padding-bottom` équivalent à la hauteur de la BottomNav + safe-area-inset-bottom sur le **wrapper de contenu** (`main`) pour que le contenu de chaque page ne soit pas caché derrière la nav
4. Remplacer `100vh` par `100dvh` partout où ça concerne le layout root mobile

**Test final attendu** :

- Naviguer sur 10 pages différentes (Lobby, Match, Profil court, Profil long, Ligues, Shop, etc.) : la BottomNav reste **toujours** en bas du viewport
- Le contenu de chaque page n'est jamais caché derrière la BottomNav
- Pas de "scroll pour remettre la nav en bas" nécessaire
- Test en PWA iOS installée prioritaire

---

### Bug 3 — Pastilles non lues qui reviennent immédiatement (chat ligue + DM)

**Symptôme observé** :

- Type de pastilles : **chat de ligue** + **DM**
- User ouvre l'onglet → la pastille disparaît
- User quitte puis revient dans l'onglet → la pastille **réapparaît immédiatement**
- Pas besoin d'un nouveau message pour qu'elle revienne

**Diagnostic attendu (à confirmer)** :

C'est **certainement un bug de persistance serveur** : le marquage "lu" côté DB ne se fait pas, ou se fait sur un mauvais filtre, ou échoue silencieusement.

**Scénario probable** :

1. User ouvre `/ligues/[squadId]` ou `/messages/[otherId]`
2. Le composant affiche la pastille à `0` (state local optimiste, OK)
3. Le composant essaie d'UPDATE quelque part en DB :
   - Soit `UPDATE squad_messages SET read_at = now() WHERE squad_id = X AND user_id != current AND read_at IS NULL`
   - Soit une table dédiée `message_read_receipts` avec INSERT/UPSERT
   - Soit un champ `last_read_at` sur `squad_members.last_read_at` ou `direct_message_threads.last_read_at_user_A` / `last_read_at_user_B`
4. **L'UPDATE échoue silencieusement** : RLS, mauvaise foreign key, mauvais filtre, erreur swallowée par un try/catch sans log
5. User quitte la page
6. Au mount du layout supérieur (ou retour dans l'onglet), un **`useEffect` re-fetch le compteur global** depuis la DB
7. Le COUNT retourne toujours > 0 car l'UPDATE de l'étape 3 a échoué
8. La pastille re-apparaît

**Hypothèse alternative** : il existe **deux systèmes de comptage parallèles**

- Un sur la table source (`messages`, `squad_messages`)
- Un sur une table dérivée (`notifications`, `unread_counts`, `user_badges`)
- Quand l'user lit, un seul des deux est mis à jour
- Le compteur affiché lit l'autre, qui n'a pas été décrémenté

**À chercher** :

```bash
# Trouver tous les endpoints/RPCs de "mark as read"
grep -rn "mark.*read\|read_at\|last_read\|markRead\|markAsRead" src/ supabase/migrations/

# Trouver tous les compteurs de pastilles
grep -rn "unread\|unreadCount\|notification.*count\|badge.*count" src/

# Vérifier les RLS sur les tables messages
grep -rn "RLS\|enable row level security\|create policy" supabase/migrations/ | grep -i "message\|squad"
```

**Investigation à mener** (sans patcher) :

1. **Identifier le mécanisme exact** de "marquer comme lu" :
   - Quel composant déclenche la lecture ? (probablement `SquadDetailClient.tsx`, `MessagesConversation.tsx`)
   - Quel endpoint/RPC est appelé ? (probablement `POST /api/messages/[id]/read` ou direct Supabase client)
   - Sur quelle table l'UPDATE est fait ?
   - Y a-t-il un try/catch qui swallow l'erreur sans logger ?

2. **Identifier le mécanisme exact** d'affichage de la pastille :
   - Quel composant affiche la pastille ? (probablement `BottomNav` + `LayoutHeader`)
   - Où est calculé le compteur ? (query Supabase ? state global Zustand/Context ? hook custom ?)
   - À quel moment le compteur est-il re-fetch ?

3. **Identifier toute discordance** :
   - Le mécanisme de lecture met-il à jour la même source que le mécanisme d'affichage lit ?
   - Y a-t-il un trigger DB ou une RPC qui sync les deux ?

4. **Vérifier les RLS** :
   - L'user a-t-il bien le droit d'UPDATE le champ `read_at` ou `last_read_at` ?
   - Si l'UPDATE est tenté via une RPC `SECURITY DEFINER`, est-ce que la RPC valide bien `auth.uid()` ?

**Pourquoi les fixes précédents ont raté** :

Probablement parce que Claude Code a corrigé le **state client** ("force la pastille à rester à zéro après une visite"), au lieu de corriger la **persistance DB**. Le bug visible disparaît momentanément, mais au prochain re-fetch (par exemple au navigate vers une autre page puis retour), la valeur DB revient à la surface car elle n'a jamais été mise à jour.

**Plan de fix probable** :

Le fix exact dépend de ce que le diagnostic révèle, mais probablement :

1. Identifier le vrai mécanisme attendu (UPDATE `read_at` ou autre)
2. Confirmer que l'appel API/RPC est bien fait au mount du composant de chat/DM
3. Confirmer qu'il **réussit** (pas swallowed)
4. Si RLS bloque : créer une policy ou une RPC `SECURITY DEFINER` qui permet l'UPDATE
5. Ajouter un log explicite si l'UPDATE échoue (pour ne plus rater ce bug à l'avenir)
6. Tester en provoquant le scénario complet (ouvrir, quitter, revenir, vérifier que la pastille reste à zéro)

**Test final attendu** :

- User reçoit un message dans un chat ligue → pastille à 1
- User ouvre le chat → pastille disparaît
- User navigue ailleurs → pastille reste à zéro
- User revient sur l'onglet ligues → pastille **reste à zéro** (le bug)
- User reçoit un nouveau message → pastille remonte à 1 (comportement normal)
- Idem pour DM

---

## Phase A — Livrable du diagnostic

Le document `docs/BUGFIX_MOBILE_DIAGNOSTIC.md` doit contenir, pour chaque bug :

```markdown
## Bug N — [Nom]

### Symptôme

[1 ligne de rappel]

### Cause racine identifiée

[2-5 phrases techniques précises]

### Chaîne complète du problème

1. [Étape 1 dans le code]
2. [Étape 2]
3. ...

### Fichiers concernés

- `src/path/to/file1.tsx` (lignes X-Y)
- `src/path/to/file2.ts` (lignes X-Y)
- `supabase/migrations/00XX.sql` (lignes X-Y)
- ...

### Ce que les fixes précédents ont probablement essayé

[Hypothèses sur les tentatives ratées : padding-top fixe, state client uniquement, etc.]

### Plan de fix proposé

[Liste numérotée d'actions, avec ESTIMATION DU CHANGEMENT en lignes de code modifiées]

### Risques du fix

[Régressions possibles, parties touchées qui pourraient casser]

### Tests de non-régression nécessaires

[Liste de scénarios à valider manuellement après le fix]
```

**Stop. Demander review founder avant de coder quoi que ce soit.**

---

## Phase B — Application des fixes (après validation founder)

Une fois le diagnostic validé par le founder, appliquer les fixes dans cet ordre :

### Ordre recommandé d'application

1. **Bug 1 + 1.bis ensemble** (cause commune : safe-area iOS)
   - Ajout viewport-fit=cover si manquant
   - Création utility class `pt-safe`, `pb-safe`, `px-safe` réutilisable
   - Application sur le composant Toast root
   - Application sur chaque modale concernée
   - Commit : `fix(mobile): respect iOS safe-area for toasts and modals`

2. **Bug 2** (BottomNav)
   - Refactor BottomNav en `position: fixed` au niveau layout root authenticated
   - Ajout `bottom: env(safe-area-inset-bottom)` + padding-bottom contenu
   - Remplacement `100vh` → `100dvh` sur le layout mobile
   - Commit : `fix(mobile): make BottomNav truly fixed across pages`

3. **Bug 3** (pastilles)
   - Diagnostic-dépendant — la solution n'est pas connue avant Phase A
   - Possiblement migration DB (RLS, ou nouvelle RPC), refactor du marquage côté client, ajout de logs
   - Commit : `fix(messages): persist read state to DB and fix unread badge regression`

### Tests manuels obligatoires après Phase B

Créer une checklist `docs/BUGFIX_MOBILE_TESTS.md` :

```markdown
## Tests manuels post-fix

### Setup

- [ ] Installer la PWA sur iPhone (Ajouter à l'écran d'accueil depuis Safari)
- [ ] Lancer l'app depuis l'écran d'accueil (pas depuis Safari)

### Bug 1 — Toasts

- [ ] Toast de succès (ex: pari placé) → entièrement visible sous la notch
- [ ] Toast d'erreur (ex: solde insuffisant) → idem
- [ ] Toast achievement → idem
- [ ] Sur iPhone avec Dynamic Island → marge correcte

### Bug 1.bis — Modales

- [ ] VotingModal ouverte → header visible avec marge sous notch
- [ ] ActionDrawer → idem
- [ ] Modale de confirmation alerte → idem

### Bug 2 — BottomNav

- [ ] Page Lobby → BottomNav en bas, contenu lisible
- [ ] Page Match → idem
- [ ] Page Profil (court) → idem
- [ ] Page Profil (long avec scroll) → idem
- [ ] Page Ligues → idem
- [ ] Page Shop → idem
- [ ] Page Settings → idem
- [ ] Aucune page ne nécessite de scroller pour remettre la nav en bas

### Bug 3 — Pastilles

- [ ] Recevoir un message en DM → pastille à 1
- [ ] Ouvrir le DM → pastille disparaît
- [ ] Naviguer vers Lobby → pastille reste à zéro
- [ ] Revenir sur Messages → pastille reste à zéro
- [ ] Idem pour chat ligue
- [ ] Recevoir un nouveau message → pastille remonte à 1
```

---

## Critères d'acceptation

- [x] `docs/BUGFIX_MOBILE_DIAGNOSTIC.md` produit en Phase A et validé par founder
- [x] Phase B exécutée uniquement APRÈS validation Phase A
- [x] 3 commits séparés (bug 1+1.bis groupés, bug 2, bug 3)
- [x] `npm run build` passe
- [x] `npm test` passe
- [x] Tests manuels exécutés en PWA iOS installée (pas en navigation Safari)
- [x] Tous les scénarios de `docs/BUGFIX_MOBILE_TESTS.md` validés

---

## Ne PAS faire dans ce sprint

- ❌ Patcher uniquement le symptôme visible (objectif : remonter à la cause)
- ❌ Ajouter du `padding-top: 40px` ou autre hardcoding (utiliser `env(safe-area-inset-*)`)
- ❌ Corriger le state client de la pastille sans corriger la persistance DB
- ❌ Fix sur une seule page pour la BottomNav (corriger au niveau layout root)
- ❌ Refactorer hors-scope (le projet a d'autres sprints en cours, ne pas mélanger)
- ❌ Skipper la Phase A même si "ça paraît évident" (la Phase A est la raison d'être de ce brief)

---

## Note finale au LLM exécutant

Si tu lis ce brief et tu te dis "c'est évident, je peux corriger direct sans diagnostic", **arrête-toi**. Ces bugs ont déjà été tentés et ratés plusieurs fois précisément parce que les LLM précédents ont sauté le diagnostic. La Phase A n'est pas optionnelle, elle est la valeur de ce brief.

Si pendant la Phase A tu rencontres un cas où le code est plus complexe que prévu (par exemple deux systèmes de comptage en parallèle), **ne tranche pas seul**. Documente l'ambiguïté dans le diagnostic et demande au founder de trancher avant la Phase B.
