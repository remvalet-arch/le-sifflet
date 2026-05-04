# 🗺️ ROADMAP & TACHES (TASKS.md)

> **Pour l'IA (AI Agent) :**
> Ton rôle est de piocher la première tâche "En cours" ou "À faire" ci-dessous.
>
> 1. Développe la fonctionnalité en suivant les règles de `.skills/`.
> 2. Une fois le code écrit, lance TOUJOURS `npm run ai:check` (ou `npm run ai:verify` si des tests E2E sont impliqués).
> 3. Si `ai:check` échoue, analyse l'erreur, corrige ton code, et relance la commande. Ne t'arrête QUE quand la commande passe au vert.
> 4. Une fois terminée et validée, coche la case [x], décris brièvement ce que tu as fait, et arrête-toi.

---

## 🏃 Sprint Actuel (Audit UX & Robustesse "Le Sifflet")

- [x] **Tâche 1 : Optimistic UI sur le VotingModal**
  - _Détails :_ Actuellement, lors d'un pari via `/api/bet`, le bouton affiche un `LoaderCircle` et le code attend la réponse du serveur (await fetch). Sur un réseau bondé au stade, ça paraît lent.
  - _Action :_ Modifier `src/components/match/VotingModal.tsx`. Dès le clic sur OUI ou NON, masquer immédiatement les deux boutons et afficher un design "Pari validé" (avec un effet de chargement discret en fond si on attend la confirmation, mais la décision est verrouillée visuellement sans latence).

- [x] **Tâche 2 : RSA du Parieur (Filet de sécurité)**
  - _Détails :_ Si un joueur tombe à zéro ou presque (moins de 10 Sifflets pour la mise minimale), il ne peut plus jouer.
  - _Action :_ Créer une route `/api/claim-rsa` ou l'intégrer au chargement du match, qui vérifie `sifflets_balance`. S'il est à 0, utiliser `service_role` (via admin client) pour lui recréditer 50 Sifflets avec un toast "L'arbitre te fait une fleur, revoilà 50 Sifflets 💸".

- [x] **Tâche 3 : Cotes Flottantes (UX Transparency)**
  - _Détails :_ L'UI indique "Cote" mais comme c'est du parimutuel, c'est une cote projetée qui va bouger.
  - _Action :_ Dans `VotingModal.tsx`, modifier tous les labels "Cote" par "~Cote" (ou "Cote estimée"). Ajouter une infobulle explicative (un `<span title="...">`) sur le mot "Cote" disant : _"Cote parimutuelle : elle s'ajuste selon les mises de tous les joueurs jusqu'à la fin du chrono."_

- [x] **Tâche 4 : Trust Score (Anti-Trolls Waze)**
  - _Détails :_ Empêcher les utilisateurs de spammer de fausses alertes. Actuellement, l'API `/api/alert` vérifie `trust_score` avec `MIN_TRUST_SCORE = 50`. Mais ce score n'est jamais mis à jour !
  - _Action :_ Modifier la RPC `resolve_event` (dans `0006_resolve_event.sql` ou son successeur si une migration a été ajoutée) ou créer une nouvelle fonction Postgres pour : +2 points de confiance pour chaque pari/alerte "gagnant/vrai", -5 points si l'alerte était une "fake news" (Option "NON" a gagné).

- [x] **Tâche 5 : Vraie PWA Offline-First (Manifest.json)**
  - _Détails :_ Il n'y a pas de `manifest.json` à la racine `public/`, et le `sw.js` fait un bypass de cache explicite. En cas de perte de 4G, on a la page du dinosaure.
  - _Action :_ Générer un `manifest.json` (icônes, standalone, theme_color `pitch-900`). Modifier `sw.js` ou utiliser `next-pwa` (via package) pour cacher la landing page et les assets statiques, afin d'afficher une belle page "Hors-ligne : l'arbitre demande la VAR" plutôt qu'une erreur réseau.

- [x] **Tâche 6 : Écran de chargement anti-écran blanc (Splash Screen & loading.tsx)**
  - _Détails :_ L'application affiche un écran blanc lors du démarrage (au moment du check d'authentification ou du chargement du lobby). Le logo est désormais "VAR" plutôt qu'un sifflet.
  - _Action 1 :_ Ajouter un fichier `src/app/loading.tsx` et `src/app/(app)/loading.tsx` contenant un UI de chargement "Mobile-first" élégant (fond `bg-pitch-900`, icône d'écran/VAR animée en pulse avec `<MonitorPlay />` ou `<Tv />` de `lucide-react`).
  - _Action 2 :_ Ajouter les balises meta `apple-touch-startup-image` et `theme-color` dans le layout principal pour forcer un Splash Screen natif sur iOS/Android.

- [x] **Tâche 7 : Clarification du bouton "VAR" (Call To Action)**
  - _Détails :_ Actuellement, le bouton central de la BottomNav (l'icône qui dessine un rectangle avec les doigts) n'est pas assez intuitif pour les nouveaux utilisateurs.
  - _Action :_ Remplacer le terme/concept "VAR" du bouton central dans `BottomNav` ou le Drawer par "Signaler une erreur", "Faute !" ou "Appeler la VAR" avec un label textuel clair en dessous ou un badge. Utiliser éventuellement une icône plus parlante (sifflet, drapeau, ou écran VAR).

- [x] **Tâche 8 : Verrouillage temporel des Pronostics**
  - _Détails :_ Il est actuellement possible de placer des pronostics (score exact, buteur) via le `PronosticsHubClient` ou `PolymarketTab` même si un match a déjà commencé (statut `live`) ou est terminé (`finished`).
  - _Action :_ Dans l'interface utilisateur, désactiver/griser les champs de pronostics avec un message clair ("Le match a commencé, pronos fermés") si `match.status !== "upcoming"`. Appliquer également cette validation côté backend dans la RPC `place_match_prono` (ou la route associée) pour rejeter silencieusement la triche API.

- [x] **Tâche 9 : Optimisation Desktop (Vue centrée mobile-first)**
  - _Détails :_ Le site est une PWA Mobile-First, mais s'il est ouvert sur grand écran (PC/Mac), l'interface s'étire probablement sur toute la largeur, ce qui brise le design.
  - _Action :_ Dans `src/app/layout.tsx` (ou `src/app/(app)/layout.tsx`), encapsuler le rendu `children` dans un conteneur qui force la largeur maximale à celle d'un mobile avec un fond sombre/flouté de chaque côté (façon Instagram/TikTok sur web). Ex: `<div className="mx-auto max-w-md min-h-screen bg-zinc-950 shadow-2xl overflow-hidden relative">`. Centrer également la BottomNav.

- [x] **Tâche 10 : Refonte Identité PWA & Installation (README)**
  - _Détails :_ Le logo actuel (`icon-192.png`) semble être un placeholder par défaut, le `manifest` n'a pas les bons chemins si on change l'icône, et le `README.md` contient toujours le texte générique de Next.js au lieu des instructions pour installer et contribuer à "VAR Time".
  - _Action 1 (Design) :_ L'IA ne pouvant pas créer de vraies images complexes, générer au moins un fichier SVG propre représentant une "TV VAR" (ou un écran de contrôle simple et stylisé sur fond vert) et le sauvegarder en tant que `public/icon.svg`. Le déclarer dans le `manifest.webmanifest`.
  - _Action 2 (Documentation) :_ Réécrire intégralement le `README.md`. Il doit contenir : Le nom du projet (VAR Time), le concept (Second écran communautaire), la stack (Next.js 16, Supabase, Tailwind), et les étapes d'installation (cloner, `.env.local`, npm install, db_reset, et les commandes V-Coder comme `npm run ai:verify`).
  - _Action 3 (UX PWA) :_ Ajouter un petit composant UI (un bandeau ou un Toast qui apparaît après 5 secondes) invitant l'utilisateur sur Safari/Chrome mobile à "Ajouter VAR Time à l'écran d'accueil" pour une meilleure expérience.

## 🏃 Sprint "Rétention & Social" (Notifications Push)

- [ ] **Tâche 11 : Infrastructure Web Push Native (VAPID)**
  - _Détails :_ Remplacer l'idée de Firebase par le standard natif VAPID + `web-push` (plus léger pour une PWA).
  - _Action 1 :_ Ajouter la table `push_subscriptions` (`user_id`, `endpoint`, `keys`).
  - _Action 2 :_ Ajouter une modale/toast d'Opt-In au moment où l'utilisateur valide son _tout premier_ pronostic (pour déclencher `Notification.requestPermission()`).
  - _Action 3 :_ Implémenter le stockage de la souscription via Server Action.

- [ ] **Tâche 12 : Smart Mute & Alertes Automatiques (Le Cycle du Match)**
  - _Détails :_ Le backend envoie les push, mais le téléphone doit filtrer intelligemment.
  - _Action 1 :_ Modifier le Service Worker (`sw.js`) pour écouter l'event `push`. Implémenter la logique "Smart Mute" : si `clients.matchAll({ type: 'window' })` indique que l'app est ouverte et active, ne PAS afficher la notification Push (l'UI gère déjà ça en direct), sinon utiliser `self.registration.showNotification`.
  - _Action 2 :_ Dans `api/alert` (ouverture marché VAR), déclencher l'envoi du Push aux utilisateurs qui ont la souscription au match.

- [ ] **Tâche 13 : Le Buzzer Social (Interactions de Ligue)**
  - _Détails :_ Outils pour harceler gentiment ses potes.
  - _Action 1 :_ Ajouter une route API `/api/squads/nudge`.
  - _Action 2 :_ Créer un bouton "Nudge" dans la page de Ligue pour cibler ceux qui n'ont pas fait leurs pronos : "Raph attend tes pronos pour le braquage de ce soir !"
  - _Action 3 :_ Créer le bouton "Sirène VAR / Panic Button" dans la LiveRoom pour rameuter la Ligue. Envoi limité via un cooldown/RLS pour éviter le spam.

## 🧊 Backlog (À faire plus tard)

- [ ] Ajouter les avatars personnalisés pour chaque "Arbitre".
- [ ] Classement global ("Board des sifflets") mis à jour toutes les 24h.

---

## 💡 Rappel des Commandes pour l'IA

- `npm run ai:check` : Formate, vérifie le typage (TS) et les règles de code (ESLint). **A faire à chaque fin de tâche.**
- `npm run ai:verify` : Fait tout ce qui est ci-dessus + lance les tests End-to-End Playwright.
