# 04 — Audit UX (Inférée du code)

> Branche : `stage` — 2026-05-11

---

## 4.1 Parcours utilisateurs principaux

### 1. Inscription et première connexion

```mermaid
flowchart LR
    A[Landing /] -->|Clique Sign In| B[Bouton Google OAuth]
    B -->|Supabase PKCE| C[/auth/callback]
    C -->|Profil auto-créé| D[/lobby]
    D -->|has_onboarded == false| E[OnboardingTour]
    E -->|Dismissed| F[Lobby matchs]
```

### 2. Parcours match live — paris VAR

```mermaid
flowchart TD
    A[/lobby] -->|Clique match| B[/match/id - Scoreboard]
    B -->|Tab KOP| C[LiveRoom - flux alertes]
    C -->|Envoie alerte Waze| D{Seuil atteint?}
    D -->|Oui| E[VotingModal ouverte]
    D -->|Non| C
    E -->|Choisit option + mise| F[Confirmation 90s]
    F -->|Résolution auto| G[VerdictOverlay win/loss]
    G -->|Toast + balance update| C
```

### 3. Parcours pronostics avant-match

```mermaid
flowchart LR
    A[/pronos] -->|Filtre compétition| B[Liste matchs]
    B -->|Clique match| C[MatchPronoCard]
    C -->|Exact score| D[Score picker]
    C -->|Scorer allocation| E[PlayerPickerSheet]
    D & E -->|Confirme| F[RPC place_prono]
    F -->|Toast success| B
```

### 4. Gestion d'une ligue (squad)

```mermaid
flowchart TD
    A[/ligues] -->|Pas de squad| B[CreateLeagueWizard]
    B -->|Crée + code invite| C[SquadPage]
    A -->|A déjà squad| C
    C -->|Tab Chat| D[SquadChat - Realtime]
    C -->|Tab Classement| E[LeaderboardTab]
    C -->|Tab Pronos| F[LeaguePronosList]
    E & F & D --> C
```

### 5. Shop & Boosters

```mermaid
flowchart LR
    A[/shop] -->|Tab items| B[ShopClient]
    B -->|Purchase cosmétique| C[RPC purchase_shop_item]
    B -->|Purchase booster| D[RPC purchase_booster]
    C & D -->|Toast + mise à jour Points| B
    B -->|Equip| E[RPC equip_shop_item]
```

---

## 4.2 États d'interface gérés

| Écran/Composant   | Loading                  | Empty                   | Error                           | Success               | Offline                   |
| ----------------- | ------------------------ | ----------------------- | ------------------------------- | --------------------- | ------------------------- |
| Lobby (matchs)    | ✅ (skeleton inféré RSC) | 🟡 (message texte)      | ✅ (redirect)                   | ✅                    | ✅ (SW offline.html)      |
| VotingModal       | ✅ (`isSubmitting`)      | —                       | ✅ (toast.error)                | ✅ (BetConfirmedView) | ❌ silencieux             |
| MatchPronoCard    | ✅ (`isLoading`)         | —                       | 🟡 (catch vide sur l.84)        | ✅                    | ❌                        |
| ShopClient        | ✅ (`isPurchasing`)      | 🟡                      | 🟡 (catch vide l.125, 161, 207) | ✅ (toast)            | ❌                        |
| PushOptIn         | ✅ (`isLoading`)         | —                       | ✅ (toast.error)                | ✅                    | —                         |
| ProfileHistorique | ✅                       | ✅ (texte "aucun pari") | ❌                              | ✅                    | ❌                        |
| SquadChat         | ✅                       | ✅                      | 🟡                              | ✅                    | ❌                        |
| LiveRoom          | ✅ (tabs)                | 🟡                      | ✅ (WifiOff icon)               | ✅                    | 🟡 (WifiOff icon + toast) |

**Légende** : ✅ géré explicitement · 🟡 géré partiellement · ❌ non géré

---

## 4.3 Gestion des erreurs côté utilisateur

### Toast Sonner — pattern global

✅ **Observé** : Toutes les actions asynchrones utilisent `toast.success` / `toast.error` via Sonner. Messages en français immersifs et contextuels. `<Toaster />` monté dans le layout racine.

### Catch silencieux — **P2**

🔴 **Observé** : Plusieurs blocs `catch {}` vides dans les composants côté client :

- `src/components/pronos/MatchPronoCard.tsx:84` — catch sur soumission prono, silencieux
- `src/components/pronos/MatchPronoCard.tsx:323` — idem
- `src/components/shop/ShopClient.tsx:125, 161, 207` — catch sur achat, silencieux (toast affiché avant le try ?)
- `src/components/pwa/InstallPrompt.tsx:19` — catch sur `beforeinstallprompt.prompt()`, acceptable

### Messages d'erreur

✅ **Observé** : Les Route Handlers retournent des messages d'erreur métier en français (ex. `"Solde insuffisant"`, `"Le temps de vote est écoulé"`). L'UI les affiche en toast.

### Errors page

✅ **Observé** : `src/app/error.tsx` présent (Next.js error boundary global).

---

## 4.4 Accessibilité

### Points positifs

- 232 attributs `aria-*` / `role=` détectés dans les composants
- 58 utilisations de `aria-label` / `aria-live`
- `ConsentBanner` avec `role="dialog"` et `aria-label` (`src/components/consent/ConsentBanner.tsx:20`)
- `VotingModal` : focus trap implémenté via `useFocusTrap` hook (`src/hooks/useFocusTrap.ts`)
- Fermeture modale via `Escape` (`VotingModal:123` — `document.addEventListener("keydown", onKeyDown)`)
- Balise `<main>` présente dans les layouts
- 10 `alt=""` sur `<Image>` — images décoratives correctement marquées

### Lacunes

| Issue                                                                                                       | Localisation          | Priorité |
| ----------------------------------------------------------------------------------------------------------- | --------------------- | -------- |
| Seulement 8 déclarations `focus-visible` / `focus:ring` pour 281 fichiers — navigation clavier insuffisante | Globale               | **P1**   |
| 345 valeurs de couleur `text-[...]` arbitraires — contrastes non vérifiables sans outil                     | Globale               | **P2**   |
| Pas de skip link "Aller au contenu"                                                                         | Layout racine         | **P2**   |
| Landmarks ARIA : présence de `<main>` mais pas de `<nav>` semantic ni `<aside>`                             | `BottomNav`, `TopBar` | **P2**   |

### Navigation clavier

🟡 **Inféré** : Tailwind v4 ne génère pas `focus-visible` par défaut sur les éléments interactifs custom. Les boutons natifs HTML ont un focus par défaut mais les `<div onClick>` et `<button className>` sans `focus-visible:ring` sont invisibles au clavier.

---

## 4.5 Responsive & Mobile

### Architecture shell

✅ **Observé** : Shell `position: fixed, inset-0`, `h-[100dvh]`, `max-w-md mx-auto` — PWA mobile-first exemplaire. Pas de scroll `window` (évite les bugs PWA iOS).

### Safe area iOS

✅ **Observé** : `paddingBottom: "max(env(safe-area-inset-bottom, 0px), 1rem)"` sur les modales et la ConsentBanner. `viewportFit: "cover"` dans les metadata.

### Breakpoints

- Usage de `sm:` sparingly (64 occurrences) — la plupart des composants sont strictement mobile
- `max-w-md` (448px) = width fixe du shell — les grands écrans voient une colonne centrée
- 0 usage de `img` HTML natif (tous via `<Image>` Next.js avec `remotePatterns`)

### Composants non responsive identifiés

🟡 **Inféré** : `src/app/admin/resolve/page.tsx` et les autres pages admin — elles utilisent probablement des tables/grids non optimisés mobile (usage admin = desktop).

---

## 4.6 Internationalisation

✅ **Observé** : `next-intl` v4.11 configuré avec 5 locales : `fr`, `en`, `de`, `es`, `it`.

| Langue   | Fichier            | Lignes |
| -------- | ------------------ | ------ |
| Français | `messages/fr.json` | 894    |
| Anglais  | `messages/en.json` | 895    |
| Allemand | `messages/de.json` | 905    |
| Espagnol | `messages/es.json` | 903    |
| Italien  | `messages/it.json` | 902    |

- Middleware redirige `/` → `/{locale}` selon cookie `NEXT_LOCALE` (pour non-authentifié)
- `useTranslations()` utilisé dans les composants client (VotingModal, etc.)
- Pages de landing localisées : `/en`, `/de`, `/es`, `/it`

**P2** : Strings hardcodées en français détectées dans certains composants côté client (ex. les emails HTML dans `src/lib/email.ts` sont entièrement en français sans i18n). Les emails ne sont donc envoyés qu'en français quelle que soit la locale de l'utilisateur.

---

## 4.7 Friction Points Inférés

| Point de friction                                                                       | Localisation                           | Priorité |
| --------------------------------------------------------------------------------------- | -------------------------------------- | -------- |
| VotingModal : 90 secondes, pas de persistance si refresh — pari perdu si l'user quitte  | `src/components/match/VotingModal.tsx` | **P1**   |
| Catch silencieux sur soumission prono — l'utilisateur ne sait pas si son prono a échoué | `MatchPronoCard.tsx:84`                | **P1**   |
| Catch silencieux sur achat shop — aucun feedback en cas d'échec                         | `ShopClient.tsx:125,161,207`           | **P1**   |
| Refill manuel — l'utilisateur doit naviguer vers son profil pour recharger              | `ProfileHeader.tsx`                    | **P2**   |
| Mode braquage squad — règles non expliquées dans l'UI (présumé)                         | `squads`                               | **P2**   |
| Push permission : demandée au moment du `/match/[id]` — trop tôt dans le parcours?      | `PushOptIn.tsx`                        | **P2**   |

---

## 4.8 Cohérence du design system

### Tokens centralisés

✅ **Observé** : Tokens Tailwind custom définis : `pitch-800`, `pitch-900`, `chalk`, `whistle` (selon CLAUDE.md — couleurs dark green + accent jaune).

### Valeurs magiques

🟡 **Observé** : **345 valeurs de couleur arbitraires** en `text-[...]`/`bg-[...]` Tailwind. Mélange de tokens design system et de couleurs one-shot. Ex : `bg-[#2D2D2D]`, `text-[#141a14]`. Pas critique mais crée de l'incohérence visuelle progressive.

### Bibliothèque UI

- `lucide-react` pour les icônes (v1.12) — usage cohérent
- `@radix-ui/react-tabs` pour les tabs — usage minimal (1 seul composant Radix)
- `sonner` pour les toasts — cohérent, centralisé via `ToasterProvider`
- Composants UI custom dans `src/components/ui/` — étendue non mesurée ici

### Composants réutilisés vs one-shot

✅ **Observé** : Architecture composants cohérente. `VotingModal` décomposé en sous-composants (`VotingButtons`, `BinaryButtons`, `StoppageButtons`, `VotingTimer`, etc.). `ProfileOverview`, `ProfileHistorique` séparés. Pattern correct.

---

## Ce que je n'ai pas pu auditer

- Contrastes de couleurs réels (nécessite outil WCAG — Lighthouse, axe-core)
- Temps de chargement perçus (LCP, CLS, INP) — nécessite prod
- Comportement exact des catch silencieux dans ShopClient (peut-être toast avant try ?)
- Tests utilisateurs réels sur le parcours onboarding

## Questions ouvertes pour le mainteneur

1. Les catch vides dans `ShopClient.tsx` et `MatchPronoCard.tsx` sont-ils intentionnels (toast déjà affiché avant le try) ou des oublis ?
2. La VotingModal est-elle testée sur des connexions lentes (3G) pour s'assurer que le timer et la mise à jour du solde fonctionnent ?
3. Les pages admin (`/admin/*`) ont-elles besoin d'être responsive mobile, ou toujours utilisées sur desktop ?
4. Les emails en français uniquement (`src/lib/email.ts`) — est-ce intentionnel pour la cible initiale FR ?
5. Y a-t-il des retours utilisateurs sur la VotingModal (90s ressenti comme trop court/long) ?
