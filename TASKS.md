# 🗺️ ROADMAP & TACHES (TASKS.md)

> **Pour l'IA (AI Agent) :**
> Ton rôle est de piocher la première tâche "En cours" ou "À faire" ci-dessous.
>
> 1. Développe la fonctionnalité en suivant les règles de `.skills/`.
> 2. Une fois le code écrit, lance TOUJOURS `npm run ai:check` (ou `npm run ai:verify` si des tests E2E sont impliqués).
> 3. Si `ai:check` échoue, analyse l'erreur, corrige ton code, et relance la commande. Ne t'arrête QUE quand la commande passe au vert.
> 4. Une fois terminée et validée, coche la case [x], décris brièvement ce que tu as fait, et arrête-toi.

---

### 🔴 Sprint 1 : BUGS CRITIQUES & MÉCANIQUES DE BASE

- [x] **Fix 1 : Le Bug Mathématique des 100% (Stats Pronos)**
  - _Problème :_ Les statistiques donnent des aberrations (ex: 0% + 0% + 50%). Le dénominateur (total) est déconnecté des vrais votes.
  - _Action :_ Dans le calcul de répartition 1N2, force le calcul local : `const actualTotal = votes1 + votesN + votes2;`. Si `actualTotal === 0`, renvoie `0%, 0%, 0%`. Sinon, applique la méthode du plus grand reste : `pct1 = Math.round((votes1/actualTotal)*100); pct2 = Math.round((votesN/actualTotal)*100); pct3 = 100 - pct1 - pct2;`.

- [x] **Fix 2 : Le Color Clash des Maillots (Feuille de match)**
  - _Problème :_ Arsenal vs Atlético affiche tout en rouge.
  - _Action :_ Récupère `primary_color` et `secondary_color` des deux équipes. L'équipe Extérieure (Away) utilise sa couleur primaire SAUF si elle contraste mal avec la couleur Domicile. Dans ce cas, elle utilise sa couleur secondaire, ou un fallback (#FFFFFF ou #111827).

- [x] **Fix 3 : Le Cooldown de la VAR**
  - _Action :_ Modifie la logique d'alerte VAR. Si l'événement VAR précédent créé par l'utilisateur a le statut "résolu" (via admin/resolve), annule le cooldown. Il doit pouvoir relancer une alerte immédiatement.

---

### 🔵 Sprint 2 : SOCIAL & PROFILS (INSPIRATION MPP)

- [x] **Feature 1 : Le Profil Public & Système d'Amis**
  - _Action 1 :_ Rend les joueurs cliquables dans le classement de la ligue (`href="/profile/[id]"`).
  - _Action 2 :_ Crée un système d'ajout d'amis façon MPG (table `friends` ou `friend_requests`). Ajoute un bouton "Ajouter en ami" sur le profil public.
  - _Action 3 :_ Crée un système de chat entre amis / joueurs d'une ligue (inspiration mpg)
- [x] **Feature 2 : Refonte du Profil via Onglets (Tabs)**
  - _Action :_ Modifie la vue Profil avec 4 onglets (utilise shadcn/ui Tabs) :
    1. **Vestiaire** : Stats globales, rang.
    2. **Historique** : Résumé des points gagnés (Pronos Score/Buteurs - Prono VAR) mets la Liste des pronostics.
    3. badges
    4. Amis

- [x] **Feature 3 : Sécurité Anti-Triche des Pronos**
  - _Action :_ Dans l'onglet "Ses Pronos" d'un profil public, masque les scores des matchs "Non Commencés" (NS). Affiche un carré gris avec un cadenas 🔒 pour empêcher le copiage.

---

### 🟡 Sprint 3 : UX/UI PREMIUM & GAMIFICATION

- [ ] **Design 1 : Gamification du Classement & Filtres Temporels**
  - _Action 1 :_ Dans `LeagueLeaderboard`, ajoute un filtre temporel (Semaine, Mois, Général). Le classement filtré doit calculer la somme des `points_earned` sur la période, et non l'XP total.
  - _Action 2 :_ Différencie visuellement le Top 3 (Or pour le 1, Argent pour le 2, Bronze pour le 3) et ajoute un indicateur de tendance (flèche rouge/verte) à côté des points si les données le permettent.

- [x] **Design 2 : Les Cartes de Pronostics (PronoCard)**
  - _Action 1 :_ Remplace le texte "Mon pronostic : X - Y" par deux gros carrés design (ex: `w-10 h-10 bg-zinc-800 rounded`) contenant les scores.
  - _Action 2 :_ Si le match est terminé, ajoute un feedback visuel : bordure/lueur verte si le prono a rapporté des points, rouge/grise si perdu. Affiche les points gagnés en gros, en vert en dessous.

- [x] **Design 3 : Hiérarchie et Respiration (Ligues)**
  - _Action :_ Sur les listes de ligues, agrandis le titre, réduis la taille des métadonnées (membres, rang) et augmente le padding interne (`p-5`) pour faire respirer l'interface.

---

### 🟢 Sprint 4 : INFRASTRUCTURE (NOTIFICATIONS PWA)

- [x] **Setup : Push Notifications Web (Natif)**
  - _Action 1 :_ Crée une migration pour une table `push_subscriptions`.
  - _Action 2 :_ Configure le Service Worker PWA pour écouter l'événement `push` et afficher la notification.
  - _Action 3 :_ Ajoute un bouton "Activer les notifications" appelant `Notification.requestPermission()`.
  - _Action 4 :_ Installe `web-push` côté backend et crée une route API de test. Indique-moi la commande pour générer les clés VAPID.

### 🟣 Sprint 5 : ONBOARDING & TUTORIEL (Style MPP)

Nous voulons créer un flux d'onboarding immersif pour la première connexion, en nous inspirant de MPP.

Agis en tant que Lead Frontend et Expert UX.

- [x] **Feature 1 : Le gestionnaire d'Onboarding**
  - _Action :_ Crée un composant `OnboardingTour.tsx` (rendu à la racine, z-index très élevé). Utilise le `localStorage` (`hasCompletedOnboarding`) pour qu'il ne s'affiche qu'une fois. Gère un état `step` (1 à 3).

- [x] **Feature 2 : Le Design des Étapes (Spotlight)**
  - _Action 1 :_ Assombris tout l'écran (`bg-black/80`).
  - _Action 2 :_ Étape 1 ("Pronos") : Affiche une modale centrée ou en bottom-sheet. Titre : "FAIS TES PRONOS". Texte : "Saisis tes pronos et découvre ton classement après chaque match 🤩". Bouton : "J'ai compris". Laisse l'icône "Pronos" de la BottomNav visible par-dessus le voile noir (via z-index ou une copie visuelle) pour créer un effet "Spotlight".
  - _Action 3 :_ Étape 2 ("Ligues") : Même logique, focus sur l'icône Ligues. Titre : "REJOINS LES LIGUES AVEC TES POTES".

- [x] **Feature 3 : L'écran Notifications**
  - _Action :_ Étape 3 (Plein écran). Ajoute une belle illustration (ex: un arbitre ou un sifflet). Titre : "ACTIVE TES NOTIFS !". Texte : "Pour ne rater aucune VAR ni les résultats de tes potes.".
  - _Boutons :_ CTA principal "Activer les notifs" (déclenche le push API configuré dans l'Epic 4). Bouton secondaire texte simple : "Plus tard".

---

### 🟠 Sprint 6 : REFONTE UX DE L'ONGLET PRONOS (Slider 10 Jours)

Nous devons remplacer l'affichage actuel des pronostics par un calendrier horizontal glissant sur 10 jours, exactement comme l'UI de Mon Petit Prono.

Agis en tant que Lead Frontend.

- [x] **Feature 1 : Le Date Slider (Sélecteur horizontal)**
  - _Action 1 :_ En haut de la page Pronos, crée un composant `DateSlider.tsx` scrollable horizontalement (`overflow-x-auto`, `snap-x`, masquer la scrollbar).
  - _Action 2 :_ Génère un tableau de 10 dates strictes : J-4 (Passé) jusqu'à J+5 (Futur), en incluant J0 (Aujourd'hui).
  - _Action 3 :_ UI des dates : Affiche le jour court (ex: "mer.", "jeu.") et le numéro du jour ("28", "29"). Pour Aujourd'hui, utilise un fond distinctif (ex: `bg-blue-600` ou notre couleur primaire) avec le texte "Auj.".
  - _Action 4 :_ Gère un état `selectedDate` (par défaut sur Aujourd'hui).

- [x] **Feature 2 : Filtrage et Affichage des Matchs**
  - _Action 1 :_ La liste des matchs en dessous doit se filtrer automatiquement en fonction de `selectedDate`.
  - _Action 2 :_ Si un joueur navigue sur une date passée (J-1 à J-4), assure-toi que les cartes de pronos affichent les résultats terminés et les points gagnés (Epic 3). S'il n'y a pas de match à cette date, affiche un bel empty state ("Pas de matchs ce jour-là").

### 🟤 Sprint 7 : TUNNEL DE CRÉATION DE LIGUE & HUB

Nous voulons refondre l'expérience de création et de gestion des ligues pour la rendre aussi fluide que celle de Mon Petit Prono. Fini les formulaires longs, place à un "Wizard" (tunnel étape par étape).

Agis en tant que Lead Frontend et Expert UX.

- [x] **Feature 1 : Le Wizard de Création (`CreateLeagueWizard.tsx`)**
  - _Action 1 :_ Remplace le formulaire de création actuel par un composant à étapes multiples.
  - _Action 2 :_ Ajoute une barre de progression stylisée en haut de la modale/page.
  - _Action 3 (Étape 1) :_ "Le Nom". Un grand input textuel centré. Bouton "Suivant".
  - _Action 4 (Étape 2) :_ "Le Logo". Affiche une grille de 6 à 8 "Avatars/Logos" par défaut (utilise des emojis stylisés avec fond de couleur ou des icônes Lucide) ET un bouton "Uploader" pour ceux qui veulent une image perso.
  - _Action 5 (Étape 3) :_ "Le Mode". Deux grandes cartes cliquables (ex: "Classique" vs "Braquage communautaire").
  - _Action 6 :_ Sur la dernière étape, le bouton devient "Créer ma Ligue" et déclenche l'insertion Supabase.

- [x] **Feature 2 : Le bouton "Partager" (Viralité)**
  - _Action :_ Sur la page de détail d'une ligue (la vue d'une ligue spécifique), ajoute un bouton "Partager l'invitation" massif, fixé en bas de l'écran (sticky bottom) pour les admins.
  - _Logique :_ Ce bouton utilise l'API native `navigator.share()` sur mobile (qui ouvre le menu de partage WhatsApp/SMS de l'OS) pour envoyer un texte : "Rejoins ma ligue VAR TIME ! Code : XYZ123. Lien : [url]".

- [x] **Feature 3 : L'en-tête Premium (Blurred Header)**
  - _Action :_ Sur la page d'une ligue, récupère le logo/avatar de la ligue. Utilise-le en arrière-plan tout en haut de la page avec un fort effet de flou et un overlay sombre (via le style en ligne pour l'url, ex: `style={{ backgroundImage: '...' }}` et classes `bg-cover opacity-50 blur-xl`). Positionne les infos de la ligue par-dessus de manière nette.

### 🟢 Sprint 8 : L'ADN VAR TIME & MODES DE JEU

Nous devons nous assurer que les fonctionnalités uniques de VAR TIME (Paris en direct, Stats Live) sont au cœur de l'expérience, et que le système de classement prend bien en compte notre modèle hybride.

Agis en tant que Lead Backend et Game Designer.

- [x] **Feature 1 : Le Calcul Hybride du Classement (Ligue)**
  - _Action :_ Dans la fonction (RPC ou API) qui calcule les points d'un utilisateur pour le `LeagueLeaderboard`, assure-toi d'additionner STRICTEMENT deux sources : les points gagnés via les pronostics (`pronos.points_earned`) ET les points gagnés via les alertes VAR (`live_bets.points_earned`). Le "Pot Commun" de la ligue et le score individuel doivent refléter cette somme.

- [x] **Feature 2 : La Passerelle vers le "Stade" (Live)**
  - _Action :_ Dans le nouvel onglet Pronos (celui avec le Slider 10 jours de l'Epic 6), ajoute une condition visuelle forte : si un match est "En cours" (Live), remplace les scores simples par un bouton ou une bannière clignotante "🔴 REJOINDRE LE STADE". Ce bouton doit rediriger l'utilisateur vers la page détaillée du match (`/match/[id]`) où se trouvent les statistiques live et le bouton d'alerte VAR.

- [x] **Feature 3 : Préparation des Modes de Jeu (Base de données)**
  - _Action 1 :_ Ajoute une migration pour la table `leagues` afin d'y insérer une colonne `game_mode` (type string ou enum, défaut: 'classic').
  - _Action 2 :_ Dans l'étape 3 du Wizard de création de ligue (Epic 7), intègre le choix du mode visuellement : une carte "Classique (Pot commun & Classement général)" et une carte "1vs1 (Championnat - Prochainement)". Stocke la valeur sélectionnée dans la nouvelle colonne lors de la création.

---

### 🔴 Sprint A : RÉTENTION — "Remettre le cœur à battre"

> Issus de l'audit CTO (TECH_BIBLE.md). Ces bugs silencieux cassent les boucles de rétention fondamentales.

- [x] **A1 : Push Notification — Résolution VAR**
  - _Problème :_ Un utilisateur qui parie sur une VAR ne reçoit aucune notification de résultat s'il a quitté l'app.
  - _Action :_ Dans `/api/admin/resolve-event/route.ts`, après l'appel à `resolveEvent()`, appeler `sendPushToMatchSubscribers(matchId, payload)` pour tous les abonnés du match.
  - _Payload :_ `{ title: "⚡ VAR Résolue !", body: "Résultat : {OUI/NON} — découvre tes gains !", url: "/match/{matchId}" }`
  - _Note :_ Récupérer le `match_id` depuis `market_events` (déjà fetchée dans resolveEvent).

- [x] **A2 : Push Notification — Fin de match + Résultats Pronos**
  - _Problème :_ Le match se termine, les pronos sont résolus, personne n'est notifié.
  - _Action :_ Dans `/api/admin/finish-match/route.ts`, après la double résolution (`resolve_long_term_bets` + `resolve_match_pronos`), appeler `sendPushToMatchSubscribers(match_id, payload)`.
  - _Payload :_ `{ title: "⏱ Match terminé !", body: "{home} {homeScore}–{awayScore} {away} — Résultats pronos disponibles", url: "/match/{matchId}" }`

- [x] **A3 : Badges — Vérification après résolution des Pronos**
  - _Problème :_ `checkAndUnlockBadges` n'est appelé qu'après une résolution VAR ou une visite profil. Les badges "Nostradamus" et "Goleador" ne se déclenchent pas en temps réel.
  - _Action :_ Dans `/api/admin/finish-match/route.ts`, après `resolve_match_pronos`, récupérer les user_ids des pronos gagnés (`status = 'won'`) et appeler `Promise.all(userIds.map(uid => checkAndUnlockBadges(uid)))` en fire-and-forget.

- [x] **A4 : Nouveau Cron — Import quotidien des matchs (cron-job.org)**
  - _Problème :_ L'import du calendrier API-Football est 100% manuel (route admin). Si personne ne l'appelle, les matchs de demain n'apparaissent pas.
  - _Action :_ Sur **cron-job.org**, créer un nouveau job appelant `GET /api/admin/sync-apifootball-fixtures?date=YYYY-MM-DD` chaque jour à 6h00 UTC avec la date du jour suivant (J+1). La route est déjà sécurisée par Bearer CRON_SECRET.
  - _Note :_ cron-job.org permet les paramètres dynamiques via des variables de date — vérifier la documentation.

---

### 🟠 Sprint B : FIABILITÉ — "Soigner la Dette"

> Corrections de fond pour un code sain. Peut être traité en parallèle par l'IA.

- [x] **B1 : Nettoyage — Suppression des fichiers de debug racine**
  - _Action :_ Supprimer les 13 fichiers `.js` à la racine : `test-squad-route.js` (×9), `test-pronos-admin.js`, `test-query.js`, `test-squad-members.js`, `test-squads.js`, `fix-ts.js`, `test-supabase.ts`.
  - _Action 2 :_ Supprimer les scripts de test dans `/scripts/` non référencés dans `package.json` : `test_limit.ts`, `test_players.ts`, `test_players_2.ts`, `test_players_team_id.ts`, `test_missing_players.ts`, `test_matching.ts`, `test_rpc.ts`, `inspect_players.ts`.

- [x] **B2 : Badge "Fidèle au Poste" — Implémenter la logique login streak**
  - _Problème :_ Le `case "login_streak_3"` dans `src/app/actions/badges.ts:87` est vide — le badge ne peut jamais être débloqué.
  - _Action 1 :_ Créer une migration ajoutant `last_login_date DATE` et `login_streak INT DEFAULT 0` à `profiles`.
  - _Action 2 :_ Dans le layout `/(app)/layout.tsx` (ou une Server Action de login), mettre à jour ces colonnes à chaque visite : si `last_login_date = hier`, incrémenter `login_streak`; si > hier, remettre à 1.
  - _Action 3 :_ Dans `badges.ts`, implémenter le case : `shouldUnlock = profile.login_streak >= 3`.

- [x] **B3 : Types — Ajouter `friend_requests` à `database.ts` + supprimer les `any`**
  - _Problème :_ `src/components/profile/AmisContent.tsx` utilise `any` car la table `friend_requests` est absente de `src/types/database.ts`.
  - _Action 1 :_ Ajouter le type `FriendRequestRow`/`FriendRequestInsert` dans `src/types/database.ts` en miroir de la migration `0063_friends.sql`.
  - _Action 2 :_ Remplacer tous les `any` dans `AmisContent.tsx` par le type strict.

- [x] **B4 : Push Notification — Nouveau membre dans une ligue**
  - _Action :_ Dans `/api/squads/join/route.ts`, après l'insert dans `squad_members`, récupérer le `created_by` (admin de la squad) et lui envoyer `sendPushToUsers([adminId], { title: "🎉 Nouveau membre !", body: "{username} a rejoint ta ligue !", url: "/ligues/{squadId}" })`.

---

### 🟡 Sprint C : OPTIMISATION — "Polir & Scaler"

> Améliore la qualité sans impact utilisateur immédiat.

- [x] **C1 : UX — Séparation Pronos / VAR dans le Leaderboard**
  - _Problème :_ Le classement affiche un seul score global. La dualité des mécaniques (pronos + VAR) est invisible pour l'utilisateur.
  - _Action :_ Dans `SquadDetailClient.tsx`, modifier l'affichage du `LeaderboardRow` pour afficher 2 sous-scores : `🎯 {pronosXp} pts` et `⚡ {varXp} pts`. Modifier la route `/api/squads/[squadId]` pour retourner `pronos_xp` et `var_xp` séparément (en plus du total).

- [x] **C2 : UX — Dot "pronos saisis" sur le Date Slider**
  - _Problème :_ Sur la page Pronos, l'utilisateur ne sait pas visuellement pour quelles dates il a déjà pronostiqué.
  - _Action :_ Dans `PronosticsHubClient.tsx`, après le fetch des pronos, calculer un `Set<string>` des dates avec pronos existants. Dans le `DateSlider`, afficher un petit dot `w-1.5 h-1.5 rounded-full bg-green-400` sous la date si elle est dans ce Set.

- [x] **C3 : UX — Overlay post-pari VAR**
  - _Problème :_ Après confirmation d'un pari, la VotingModal se ferme sans transition ni feedback.
  - _Action :_ Dans `VotingModal.tsx`, après le succès de `fetch("/api/bet")`, afficher pendant 1.8s un état "confirmed" dans la modal avant de fermer : `"⚡ Pari enregistré · Cote : x{multiplier}"`. Utiliser un `setTimeout(() => onClose(), 1800)` déclenché sur succès.

- [x] **C4 : Perf — Optimisation requête `favoriteTeam` page Profil**
  - _Problème :_ La requête `teams` est séquentielle après le `Promise.all` initial (`profile/page.tsx:126-133`).
  - _Action :_ Récupérer le profil en premier (`await supabase.from("profiles")...`), puis lancer le `Promise.all` avec la requête `teams` incluse si `profile.favorite_team_id` est défini.

- [x] **C5 : Code — Retry/backoff sur `fetchApiFootball`**
  - _Problème :_ Un timeout réseau sur l'API-Football n'est pas retried — les données du tick sont simplement perdues.
  - _Action :_ Dans `src/lib/api-football-client.ts`, entourer le `fetch` d'une boucle retry (max 3 tentatives, délai `100ms × 2^attempt`). Lever une exception après le 3ème échec.

---

## 🧊 Backlog (À faire plus tard)

- [x] **Refonte du flux de connexion Google (Sign-in with id_token)**
- _Détails :_ Le frontend doit récupérer l'ID Token depuis Google directement, puis l'envoyer à Supabase via `signInWithIdToken`.
- _Action 1 (Installation) :_ Si besoin, installe la librairie `@react-oauth/google` pour faciliter l'intégration du bouton Google côté client dans Next.js, ou utilise le SDK natif Google Identity.
- _Action 2 (Provider) :_ Entoure l'application (ou la page de login) avec le `GoogleOAuthProvider` en utilisant la variable d'environnement `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
- _Action 3 (Refonte du Bouton) :_ Dans le composant d'authentification (ex: `AuthModal` ou `LoginPage`), remplace l'appel actuel `supabase.auth.signInWithOAuth(...)` par le composant Google.
- _Action 4 (Connexion Supabase) :_ Dans le callback `onSuccess` de Google, récupère le `credential` (l'id_token) et envoie-le à Supabase avec la méthode :
  `await supabase.auth.signInWithIdToken({ provider: 'google', token: credential })`
- _Action 5 (Redirection) :_ Une fois la promesse Supabase résolue avec succès, redirige l'utilisateur vers la page `/lobby`.

- [ ] Ajouter les avatars personnalisés pour chaque "Arbitre".
- [ ] Classement global ("Board des sifflets") mis à jour toutes les 24h.
- [ ] **Tâche 2X : Infrastructure i18n (Server & Client)**
  - _Détails :_ Le projet a besoin de supporter plusieurs langues (FR, EN, ES, DE, IT), mais l'architecture actuelle (un simple hook client `useLocale`) est incompatible avec Next.js App Router (Server Components).
  - _Action 1 :_ Mettre en place `next-intl` (qui gère l'App Router via le middleware pour détecter la langue du navigateur et injecter les traductions côté serveur).
  - _Action 2 :_ Extraire toutes les strings d'un seul module précis (ex: la `TopBar` et la `BottomNav`) dans les fichiers `.json` de `next-intl` pour prouver le concept sans casser le reste.
  - _Action 3 :_ Préparer le reste de la traduction pour des itérations futures, composant par composant.

---

## 💡 Rappel des Commandes pour l'IA

- `npm run ai:check` : Formate, vérifie le typage (TS) et les règles de code (ESLint). **A faire à chaque fin de tâche.**
- `npm run ai:verify` : Fait tout ce qui est ci-dessus + lance les tests End-to-End Playwright.
