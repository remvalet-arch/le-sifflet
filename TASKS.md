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

- [x] **Design 1 : Gamification du Classement & Filtres Temporels**
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

### 🚨 Sprint D : AUTH — "Réparer la Connexion Google"

> Issus de l'audit V3. La connexion Google est fragile en production — race condition + useOneTap cassé.

- [x] **D1 : Fix race condition — redirection avant persistance des cookies**
  - _Problème :_ `window.location.assign("/lobby")` est appelé avant que les cookies Supabase soient écrits. Le middleware reçoit la requête sans session → redirection vers "/" → boucle infinie possible.
  - _Fichier :_ `src/components/auth/SignInWithGoogleButton.tsx`
  - _Action :_ Destructurer `{ data, error }` au lieu de `{ error }` dans `signInWithIdToken`. Rediriger uniquement si `data?.session` est défini.
  - _Code :_
    ```ts
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: credentialResponse.credential,
    });
    if (error) {
      window.location.assign(
        `/?error=oauth&message=${encodeURIComponent(error.message)}`,
      );
    } else if (data?.session) {
      window.location.assign("/lobby");
    } else {
      window.location.assign("/?error=oauth&message=Session_Not_Created");
    }
    ```

- [x] **D2 : Désactiver `useOneTap` en développement**
  - _Problème :_ Le prop `useOneTap` sur `<GoogleLogin>` déclenche le prompt natif Google One Tap, qui ne fonctionne pas sur localhost/non-HTTPS et peut bloquer le widget standard.
  - _Fichier :_ `src/components/auth/SignInWithGoogleButton.tsx`
  - _Action :_ Remplacer `useOneTap` par `useOneTap={process.env.NODE_ENV === "production"}`.

- [x] **D3 : Ajouter `NEXT_PUBLIC_GOOGLE_CLIENT_ID` au `.env.example`**
  - _Problème :_ La variable est absente du fichier d'exemple — tout nouveau développeur est bloqué.
  - _Fichier :_ `.env.example`
  - _Action :_ Ajouter la ligne `NEXT_PUBLIC_GOOGLE_CLIENT_ID=` avec un commentaire explicatif.

- [x] **D4 : Afficher les erreurs OAuth sur la page d'accueil**
  - _Problème :_ La page `/` reçoit `?error=oauth&message=...` en query params mais ne les affiche pas — l'utilisateur voit juste la homepage sans explication.
  - _Fichier :_ `src/app/page.tsx`
  - _Action :_ Lire `searchParams.error` côté serveur et passer un message d'erreur au composant `HomeAuthCtas` pour l'afficher en toast ou en bannière.

---

### 🔴 Sprint E : PERFORMANCE — "Couper la Latence de 70%"

> Issus de l'audit V3. Awaits séquentiels + absence d'index DB = latences de 1-3s inutiles.

- [x] **E1 : Refactoriser `/profile/page.tsx` — Promise.all global + supprimer `select("*")`**
  - _Problème :_ Le profil est fetchée en premier (await bloquant), puis les bets/pronos/badges. Le `select("*")` charge 15+ colonnes inutilisées. Total : +300-500ms.
  - _Fichier :_ `src/app/(app)/profile/page.tsx`
  - _Action :_ Tout regrouper dans un seul `Promise.all` : profil + bets + pronos + badges + userBadges (favoriteTeam fetchée ensuite si needed). Remplacer `select("*")` par les colonnes explicites.

- [x] **E2 : Refactoriser `/match/[id]/page.tsx` — supprimer les awaits séquentiels**
  - _Problème :_ `generateMetadata()` fetch le match une première fois. La page le re-fetch + profile + squad RPC en séquentiel. Total : +400-600ms.
  - _Fichier :_ `src/app/(app)/match/[id]/page.tsx`
  - _Action :_ Grouper match + auth + squad RPC dans un `Promise.all` initial. Ensuite profile + pronos squad dans un second `Promise.all`. Supprimer `generateMetadata` ou le mettre en cache.

- [x] **E3 : Refactoriser `/api/squads/[squadId]/route.ts` — 8 requêtes → 3 batches parallèles**
  - _Problème :_ L'API fait 8 allers-retours Supabase en série (membership → squad → pairs → profiles → pronos → bets → bigWins → matches). Total : +500-800ms.
  - _Fichier :_ `src/app/api/squads/[squadId]/route.ts`
  - _Action :_ Batch 1 (parallèle) : membership + squad + RPC. Batch 2 (parallèle, une fois memberIds connus) : profiles + pronos + bets + bigWins. Batch 3 : matches des bigWins.

- [x] **E4 : Migration SQL — Index manquants sur les tables critiques**
  - _Problème :_ Les requêtes sur `matches`, `alert_signals`, `pronos`, `bets` font des sequential scans — aucun index composite.
  - _Action :_ Créer une migration `0066_perf_indexes.sql` avec :
    ```sql
    CREATE INDEX idx_matches_monitor ON matches(status, api_football_id) WHERE api_football_id IS NOT NULL;
    CREATE INDEX idx_matches_competition_time ON matches(competition_id, start_time DESC);
    CREATE INDEX idx_alert_signals ON alert_signals(match_id, action_type, created_at DESC);
    CREATE INDEX idx_pronos_user_status ON pronos(user_id, status) WHERE points_earned > 0;
    CREATE INDEX idx_bets_user_status ON bets(user_id, status);
    ```

- [x] **E5 : Ajouter ISR (`revalidate`) sur les pages Server Components statiques**
  - _Problème :_ Toutes les pages sont en `force-dynamic` implicite — chaque visite refetch tout depuis Supabase.
  - _Fichiers :_ `leaderboard/page.tsx`, `pronos/page.tsx`
  - _Action :_ Ajouter `export const revalidate = 300` (leaderboard) et `export const revalidate = 60` (pronos).

- [x] **E6 : Supprimer la requête profil redondante dans `/lobby/page.tsx`**
  - _Problème :_ Le lobby fetch `has_onboarded` séparément alors que le layout fetch déjà le profil complet.
  - _Fichier :_ `src/app/(app)/lobby/page.tsx` + `src/app/(app)/layout.tsx`
  - _Action :_ Ajouter `has_onboarded` au `select(...)` du layout et le passer via props ou supprimé si OnboardingTour peut être géré côté client.

---

### 🟠 Sprint F : DONNÉES & UX — "Corriger ce qui est faux"

> Classements incorrects, labels trompeurs, frictions UX identifiées lors de l'audit V3.

- [x] **F1 : Leaderboard global — classer par points gagnés (lifetime), pas par solde courant**
  - _Problème :_ `leaderboard/page.tsx` classe par `sifflets_balance` — un joueur qui a tout dépensé est classé dernier même s'il a été le meilleur.
  - _Action 1 :_ Créer une migration ajoutant `lifetime_points_earned INT DEFAULT 0` à `profiles`.
  - _Action 2 :_ Créer un trigger ou RPC qui incrémente cette colonne à chaque résolution de prono/bet gagnant.
  - _Action 3 :_ Changer le `order("sifflets_balance")` → `order("lifetime_points_earned")` dans `leaderboard/page.tsx`.

- [x] **F2 : Leaderboard ligue — corriger le filtre de période (placed_at vs match start_time)**
  - _Problème :_ Le filtre semaine/mois utilise `matches.start_time` du prono — un prono posé il y a 2 semaines sur un match de cette semaine est compté dans cette semaine.
  - _Fichier :_ `src/app/api/squads/[squadId]/route.ts`
  - _Action :_ Remplacer `.gte("matches.start_time", cutoffIso)` par `.gte("placed_at", cutoffIso)` pour les pronos ET les bets.

- [x] **F3 : "Pot Commun" — libellé et sémantique trompeurs**
  - _Problème :_ L'UI affiche "Pot commun : 50 000 Pts" — l'utilisateur croit qu'il s'agit d'un pool partageable. C'est en réalité la somme des gains de tous les membres.
  - _Fichiers :_ `src/components/ligues/LiguesPageClient.tsx`, `src/app/api/squads/route.ts`
  - _Action :_ Renommer le champ en `total_xp_earned` et l'afficher comme "🏆 50 000 XP cumulés".

- [x] **F4 : AmisContent — séparer demandes reçues / envoyées + Realtime**
  - _Problème :_ Le composant mélange les demandes envoyées et reçues dans une seule liste sans distinction. Pas de mise à jour en temps réel.
  - _Fichier :_ `src/components/profile/AmisContent.tsx`
  - _Action 1 :_ Séparer en deux sections : "Demandes reçues" (`receiver_id = currentUserId AND status = 'pending'`) et "Mes amis" (`status = 'accepted'`).
  - _Action 2 :_ Ajouter une souscription Supabase Realtime sur `friend_requests` pour mise à jour live.

- [x] **F5 : TrophyWall — afficher le critère de déblocage sur les badges verrouillés**
  - _Problème :_ L'utilisateur voit un badge grisé mais ne sait pas comment le débloquer — friction de gamification.
  - _Fichier :_ `src/components/profile/TrophyWall.tsx`
  - _Action :_ Au tap/hover sur un badge verrouillé, afficher une bottom sheet ou tooltip avec `badge.description` (le critère).

- [x] **F6 : Push-sender — ajouter logging des erreurs non-410**
  - _Problème :_ Les erreurs transitoires (5xx, timeout, crypto fail) sont silencieuses — impossible de debugger pourquoi des notifications ne partent pas.
  - _Fichier :_ `src/lib/push-sender.ts`
  - _Action :_ Dans le `catch`, loguer toute erreur non-410 : `console.error("[push-sender] Failed:", sub.endpoint, err)`. Distinguer erreurs permanentes (400, 404) à nettoyer vs transitoires à ignorer.

- [x] **F7 : VotingModal + Inputs Pronos — zones de tap < 48px + zoom iOS**
  - _Problème 1 :_ Boutons OUI/NON dans `VotingModal.tsx` ont une hauteur < 48px sur certains états.
  - _Problème 2 :_ Inputs score dans `PronosticsHubClient.tsx` ont `font-size < 16px` → zoom automatique iOS.
  - _Action 1 :_ Ajouter `min-h-[48px]` sur tous les boutons interactifs de `VotingModal`.
  - _Action 2 :_ Fixer `text-[16px]` (ou `text-base`) sur les `<ScoreInput>` pour neutraliser le zoom iOS.

---

---

### 🏆 Sprint G : MODE 1v1 — "Championnat entre amis"

> Implémentation complète du mode `game_mode = 'braquage'` (1vs1 type MPG).
> Chaque week-end, chaque membre affronte un adversaire désigné par le calendrier.
> On gagne le "match" si ses points pronos sur la semaine dépassent ceux de l'adversaire.
> Victoire = 3 pts | Nul = 1 pt | Défaite = 0 pt.

- [x] **G1 : Migration — Tables du mode championnat**
  - _Action :_ Créer `supabase/migrations/0069_league_championship.sql` avec :

    ```sql
    -- Saison d'un championnat privé (1 par squad en mode braquage)
    CREATE TABLE public.league_seasons (
      id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      squad_id     uuid NOT NULL REFERENCES public.squads(id) ON DELETE CASCADE,
      status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'finished')),
      total_rounds integer NOT NULL DEFAULT 0,
      current_round integer NOT NULL DEFAULT 0,
      started_at   timestamptz,
      ended_at     timestamptz,
      created_at   timestamptz NOT NULL DEFAULT now()
    );

    -- Calendrier généré (un fixture = une confrontation entre deux membres pour une semaine)
    CREATE TABLE public.league_fixtures (
      id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      season_id       uuid NOT NULL REFERENCES public.league_seasons(id) ON DELETE CASCADE,
      round_number    integer NOT NULL,
      week_start      date NOT NULL,  -- Lundi de la semaine
      home_member_id  uuid NOT NULL REFERENCES public.profiles(id),
      away_member_id  uuid NOT NULL REFERENCES public.profiles(id),
      home_points     integer,        -- NULL = non résolu
      away_points     integer,
      winner_id       uuid REFERENCES public.profiles(id),  -- NULL = nul ou non résolu
      status          text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'finished'))
    );

    -- Classement du championnat (W/D/L/Pts cumulés)
    CREATE TABLE public.league_standings (
      season_id   uuid NOT NULL REFERENCES public.league_seasons(id) ON DELETE CASCADE,
      user_id     uuid NOT NULL REFERENCES public.profiles(id),
      played      integer NOT NULL DEFAULT 0,
      won         integer NOT NULL DEFAULT 0,
      drawn       integer NOT NULL DEFAULT 0,
      lost        integer NOT NULL DEFAULT 0,
      points      integer NOT NULL DEFAULT 0,   -- 3W + 1D + 0L
      pronos_pts  integer NOT NULL DEFAULT 0,   -- total points pronos accumulés
      PRIMARY KEY (season_id, user_id)
    );

    -- Index
    CREATE INDEX ON public.league_fixtures(season_id, round_number);
    CREATE INDEX ON public.league_fixtures(week_start);
    CREATE INDEX ON public.league_standings(season_id, points DESC);

    -- RLS : lecture pour les membres de la squad, écriture service_role uniquement
    ALTER TABLE public.league_seasons ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.league_fixtures ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.league_standings ENABLE ROW LEVEL SECURITY;

    -- Membres lisent leurs propres saisons via squad_members
    CREATE POLICY "league_seasons_read" ON public.league_seasons FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.squad_members sm WHERE sm.squad_id = league_seasons.squad_id AND sm.user_id = auth.uid()));
    CREATE POLICY "league_fixtures_read" ON public.league_fixtures FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.league_seasons ls JOIN public.squad_members sm ON sm.squad_id = ls.squad_id WHERE ls.id = league_fixtures.season_id AND sm.user_id = auth.uid()));
    CREATE POLICY "league_standings_read" ON public.league_standings FOR SELECT
      USING (EXISTS (SELECT 1 FROM public.league_seasons ls JOIN public.squad_members sm ON sm.squad_id = ls.squad_id WHERE ls.id = league_standings.season_id AND sm.user_id = auth.uid()));
    ```

  - _Types :_ Ajouter `LeagueSeasonRow`, `LeagueFixtureRow`, `LeagueStandingRow` dans `src/types/database.ts`.

- [x] **G2 : API — Démarrage de saison (`POST /api/squads/[squadId]/start-season`)**
  - _Route :_ `src/app/api/squads/[squadId]/start-season/route.ts`
  - _Auth :_ Uniquement le `owner_id` de la squad.
  - _Validations :_
    - `game_mode === 'braquage'`
    - Aucune saison `active` déjà en cours
    - Nombre de membres pair, entre 2 et 18
  - _Algorithme (round-robin "cercle tournant") :_ Pour N membres :
    ```ts
    // Fix le membre[0], rotate les membres[1..N-1] sur N-1 rounds
    // Ex : 4 membres → 3 rounds aller + 3 rounds retour = 6 rounds
    // Chaque round = une semaine calendaire à partir du lundi suivant la création
    ```
  - _Action :_
    1. Charger les membres (`squad_members`)
    2. Générer les `N-1` rounds aller (algo cercle tournant), puis dupliquer en inversant home/away pour les retours
    3. Calculer `week_start` de chaque round = lundi de la semaine `startDate + (roundIndex × 7 jours)`
    4. INSERT `league_seasons` (status: 'active', total_rounds, started_at)
    5. INSERT bulk `league_fixtures`
    6. INSERT `league_standings` (un row par membre, tout à zéro)
  - _Réponse :_ `{ season_id, total_rounds, fixtures_count }`

- [x] **G3 : RPC + API — Résolution hebdomadaire d'un round**
  - _Déclenchement :_ Cron (cron-job.org) ou endpoint admin `POST /api/admin/resolve-league-round`
  - _Logique :_
    1. Trouver les `league_fixtures` dont `status = 'active'` et `week_start <= NOW() - 7j` (semaine révolue)
    2. Pour chaque fixture : calculer les points pronos de chaque membre sur la semaine du fixture :
       ```sql
       SELECT SUM(p.points_earned)
       FROM pronos p
       JOIN matches m ON m.id = p.match_id
       WHERE p.user_id = $member_id
         AND p.status = 'won'
         AND m.start_time >= $week_start
         AND m.start_time < $week_start + INTERVAL '7 days'
       ```
    3. Comparer → déterminer `winner_id` (ou nul si égalité)
    4. UPDATE `league_fixtures` (home_points, away_points, winner_id, status: 'finished')
    5. UPDATE `league_standings` : +3 au gagnant, +1 à chacun si nul, +pronos_pts pour les deux
    6. Si tous les rounds sont `finished` → passer `league_seasons.status` à `'finished'`
  - _Route :_ `src/app/api/admin/resolve-league-round/route.ts` (guard modérateur)
  - _RPC SQL :_ `resolve_league_round(p_season_id uuid, p_round_number integer) RETURNS jsonb`

- [x] **G4 : API — Retourner le championnat dans `GET /api/squads/[squadId]`**
  - _Condition :_ Si `squad.game_mode === 'braquage'` et qu'une saison active existe.
  - _Action :_ Ajouter au payload de réponse existant :
    ```ts
    championship: {
      season_id: string;
      current_round: number;
      total_rounds: number;
      standings: { user_id, username, played, won, drawn, lost, points, pronos_pts }[];
      current_fixtures: { round_number, home_member, away_member, week_start, status, home_points, away_points }[];
    } | null
    ```
  - Les standings sont triés par points DESC, puis pronos_pts DESC (goal average).

- [x] **G5 : UI — Vue championnat dans `SquadDetailClient.tsx`**
  - _Condition :_ Afficher la vue championnat si `data.championship != null`, sinon la vue classique (classement XP).
  - _Section 1 — Tableau de championnat :_ Colonnes : `#` | Joueur | J | V | N | D | Pts. Gras pour l'utilisateur connecté. Top 3 coloré (or/argent/bronze).
  - _Section 2 — Journée en cours :_ Liste des confrontations du round actuel avec score provisoire (points pronos en temps réel si semaine en cours) ou score final si résolu. Mettre en avant le match de l'utilisateur connecté ("Ton match cette semaine").
  - _Section 3 — Calendrier complet :_ Accordion par journée, affichant toutes les confrontations.

- [x] **G6 : UI — Démarrage de saison (admin squad)**
  - _Condition :_ Afficher un CTA "Lancer le championnat" sur la page de la squad si :
    - `squad.game_mode === 'braquage'`
    - Aucune saison active (`championship === null`)
    - L'utilisateur est l'`owner_id`
  - _Flow :_
    1. Modale de confirmation affichant : liste des membres, nombre de rounds calculé, date de début estimée
    2. Warning si le nombre de membres est impair ou < 2 (bloquer)
    3. Bouton "Lancer" → `POST /api/squads/[squadId]/start-season`
    4. Toast succès + rafraîchissement de la page
  - _Note :_ Une fois lancé, plus aucun membre ne peut rejoindre la ligue (le bouton "Rejoindre" doit être désactivé si une saison est active).

- [x] **G7 : Intégration match-monitor — Avancement automatique des rounds**
  - _Action :_ Dans `src/app/api/cron/match-monitor/route.ts`, ajouter une étape après la résolution FT :
    1. Vérifier si des `league_fixtures` ont `status = 'active'` et `week_start <= now() - 7j`
    2. Si oui, appeler `resolve_league_round` pour chacun (fire-and-forget)
  - _Note :_ Ajouter `week_start` dans la query des fixtures actifs pour ne déclencher la résolution qu'en fin de semaine.

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

---

### 🔴 Sprint H : RÉTENTION — "Ce qui fait revenir chaque jour"

- [x] **H1 : Streak & récompense quotidienne**
  - _Problème :_ Le `login_streak` existe en base mais n'est pas exploité côté UI. L'utilisateur n'a aucune incitation visuelle à revenir chaque jour.
  - _Action 1 :_ Sur la page profil / layout app, afficher un composant "Flamme du jour" avec le streak actuel et un bonus de Sifflets si l'utilisateur se connecte X jours consécutifs.
  - _Action 2 :_ Créer une migration ajoutant une colonne `streak_claimed_today BOOLEAN DEFAULT FALSE` (ou utiliser `last_login_date` existant) pour éviter les doubles attributions.
  - _Action 3 :_ Route API `POST /api/claim-daily-streak` qui vérifie le streak et crédite les Sifflets (ex: +50 pts × min(streak, 7)).

- [x] **H2 : Récap post-match**
  - _Problème :_ Quand un match se termine, les pronos sont résolus mais l'utilisateur ne voit pas de synthèse visuelle de sa performance.
  - _Action 1 :_ Créer une page ou bottom-sheet `/match/[id]/recap` accessible depuis la page match terminé : score final, points gagnés/perdus, classement dans la ligue mis à jour, ce que les autres membres de la squad ont eu.
  - _Action 2 :_ Ajouter un lien "Voir le récap" dans la push notification de fin de match (payload existant dans `finish-match/route.ts`).

- [x] **H3 : Rappel push "Tu n'as pas encore pronostiqué"**
  - _Problème :_ Si l'utilisateur n'a pas pronostiqué avant un match de sa ligue, il n'a pas de raison d'entrer dans la LiveRoom.
  - _Action 1 :_ Cron 1h avant chaque match : chercher les membres de squads actives qui n'ont pas de prono pour ce match, leur envoyer `sendPushToUsers([uid], { title: "⏰ PSG – OM dans 1h", body: "Tu n'as pas encore pronostiqué — fonce !", url: "/pronos" })`.
  - _Action 2 :_ Créer la route cron `GET /api/cron/prono-reminders` avec guard `CRON_SECRET`, à brancher sur cron-job.org à H-1 des matchs.

---

### 🟠 Sprint I : SOCIAL — "Ce qui fait inviter des amis"

- [x] **I1 : Partage de prono avant match**
  - _Problème :_ Aucun loop viral — un utilisateur ne peut pas partager sa prédiction à ses amis hors de l'app.
  - _Action 1 :_ Sur la `MatchPronoCard` d'un prono soumis, ajouter un bouton "Partager mon prono".
  - _Action 2 :_ Utiliser `navigator.share()` sur mobile pour partager un texte : "J'ai prédit PSG 2-1 OM sur VAR TIME — et toi ? [lien]". Sur desktop, copier dans le presse-papiers.
  - _Action 3 :_ (Bonus) Générer une image OG dynamique via `next/og` avec le prono stylisé pour un partage visuel sur réseaux sociaux.

- [x] **I2 : Chat dans les ligues**
  - _Problème :_ Les membres d'une squad ne peuvent pas communiquer dans l'app.
  - _Action 1 :_ Migration `squad_messages (id, squad_id, user_id, content, created_at)` avec RLS (membres lisent/écrivent dans leurs squads).
  - _Action 2 :_ Composant `SquadChat.tsx` dans `SquadDetailClient` : liste des messages + input, souscription Realtime sur `squad_messages`.
  - _Action 3 :_ Limiter à 200 caractères par message, 1 message par 3 secondes (anti-spam côté client).

- [x] **I3 : Cérémonie de fin de saison 1v1**
  - _Problème :_ Quand un championnat se termine, rien ne se passe — pas de podium, pas de trophée.
  - _Action 1 :_ Quand `squad_seasons.status` passe à `'finished'`, envoyer une push à tous les membres avec le podium final.
  - _Action 2 :_ Dans `SquadDetailClient`, si `championship.status === 'finished'`, afficher un écran de podium (Top 3 avec animations) au-dessus du tableau.
  - _Action 3 :_ Attribuer un badge exclusif "Champion de ligue" au vainqueur (nouvelle entrée dans la table `badges`).

---

### 🟡 Sprint J : COMPLÉTUDE PRODUIT — "Ce qui ne devrait pas manquer"

- [x] **J1 : Gestion des matchs reportés / annulés**
  - _Problème :_ Si un match passe en `CANC` (annulé) ou `PST` (reporté) côté API-Football, les pronos restent en `pending` indéfiniment.
  - _Action 1 :_ Dans `match-monitor`, détecter les statuts `CANC`, `PST`, `ABD`, `AWD`, `WO`.
  - _Action 2 :_ Pour `CANC`/`PST` : appeler une nouvelle RPC `cancel_match_pronos(p_match_id)` qui passe les pronos en `cancelled` et rembourse les `reward_amount` aux joueurs.
  - _Action 3 :_ Afficher un badge "Reporté" / "Annulé" sur la MatchCard et la PronoCard concernées.

- [x] **J2 : Historique des saisons 1v1**
  - _Problème :_ Une fois la saison 1v1 terminée, impossible de consulter les résultats passés dans la squad.
  - _Action 1 :_ Dans `SquadDetailClient`, ajouter un onglet ou section "Palmarès" listant les saisons terminées (`status = 'finished'`) avec le podium final de chacune.
  - _Action 2 :_ Modifier `GET /api/squads/[squadId]` pour retourner aussi les saisons `finished` (limitées aux 3 dernières).

- [x] **J3 : Saisons mensuelles du leaderboard global**
  - _Problème :_ Le leaderboard global `lifetime_points_earned` ne se réinitialise jamais — les premiers sont inamovibles, décourageant les nouveaux.
  - _Action 1 :_ Ajouter `monthly_points_earned INT DEFAULT 0` à `profiles`, remis à zéro le 1er de chaque mois via un cron.
  - _Action 2 :_ Sur `/leaderboard`, ajouter un filtre "Ce mois" qui classe par `monthly_points_earned` en plus du filtre "Général".

- [x] **J4 : Monitoring & fallback API-Football**
  - _Problème :_ Si l'API-Football rate-limit ou tombe, le `match-monitor` échoue silencieusement sans alerte.
  - _Action 1 :_ Dans `match-monitor`, si le nombre d'erreurs consécutives dépasse 3, envoyer un email ou une notif push au compte admin.
  - _Action 2 :_ Exposer un endpoint `/api/admin/health` qui retourne le statut du dernier tick du monitor (timestamp, nb matchs actifs, nb erreurs).

---

### 🟢 Sprint K : POLISH & UX — "Les finitions qui font la différence"

- [x] **K1 : Empty states soignés**
  - _Action :_ Auditer et améliorer les écrans vides : lobby sans match du jour, ligue sans membres, onglet pronos sans compétition suivie, onglet amis vide. Chaque empty state doit avoir une illustration simple + un CTA actionnable.

- [x] **K2 : Tutoriel contextuel LiveRoom**
  - _Problème :_ Un nouvel utilisateur qui arrive sur un match live ne comprend pas le mécanisme Waze/VAR → taux de rebond élevé.
  - _Action 1 :_ Au premier accès à une LiveRoom (clé localStorage `hasSeenLiveRoomTutorial`), afficher un overlay 2 étapes : "1. Signale une action douteuse" → "2. Mise tes Sifflets en 90s".
  - _Action 2 :_ Intégrer ce tutoriel dans l'`OnboardingTour` existant comme étape 4 optionnelle.

- [x] **K3 : Dashboard stats joueur enrichi**
  - _Problème :_ `winrate`, `trust_score`, `login_streak` sont en base mais peu valorisés dans le profil.
  - _Action :_ Dans l'onglet "Vestiaire" du profil, ajouter un bloc "Mon arbitrage" avec : % de bonnes prédictions de score, meilleure série de pronos gagnants, ligue préférée (compétition avec le plus de pronos), total de matchs pronostiqués.

---

### 🔴 Sprint L : ROBUSTESSE — "Bétonner avant le lancement"

> Issus de l'audit CTO V3. Ces lacunes peuvent faire crasher silencieusement l'app ou exposer des failles en production. Aucune fonctionnalité nouvelle ici — uniquement du béton.

- [x] **L1 : Error Boundary global — `/src/app/error.tsx`**
  - _Problème :_ Sans error boundary, n'importe quelle exception JS non catchée produit une page blanche sans message. L'utilisateur ne sait pas quoi faire.
  - _Action :_ Créer `src/app/error.tsx` (error boundary niveau root) ET `src/app/(app)/error.tsx` (niveau app protégé). Afficher un message immersif avec bouton "Réessayer" et lien de retour vers le lobby.
  - _Contenu :_ `"use client"` + `export default function Error({ error, reset })` — design dark cohérent avec le reste de l'app (fond zinc-900, bouton vert).

- [x] **L2 : Rate Limiting — Paris VAR (`/api/bet`)**
  - _Problème :_ Un bug client ou un utilisateur malveillant peut envoyer des centaines de requêtes `/api/bet` par minute, contournant la limite parimutuel.
  - _Action :_ Dans `/api/bet/route.ts`, vérifier via un compteur Redis ou en base (`bets` avec `placed_at > now() - interval '1 min'`) que l'utilisateur n'a pas posé > 10 paris dans la dernière minute. Retourner `errorResponse("Doucement l'arbitre…", 429)` si dépassement.
  - _Note :_ Si pas de Redis disponible, utiliser une vérification Supabase simple : `count(*) from bets where user_id = $uid and placed_at > now() - interval '60 seconds'`.

- [x] **L3 : Rate Limiting — Alertes VAR (`/api/alert`)**
  - _Problème :_ Un utilisateur peut spammer les alertes VAR — même si le marché ne s'ouvre qu'au seuil de 2 signaux, le comptage en DB peut être abusé.
  - _Action :_ Dans `/api/alert/route.ts`, vérifier que l'utilisateur n'a pas posté > 5 alertes dans la dernière minute. Retourner `{ok: true}` silencieusement (pas d'erreur exposée) pour ne pas donner d'information à l'attaquant.

- [x] **L4 : Indicateur de connexion Realtime dans LiveRoom**
  - _Problème :_ Si la souscription Supabase Realtime est droppée (réseau instable, mobile en arrière-plan), l'utilisateur voit des données figées sans le savoir. Il peut miser sur une cote obsolète.
  - _Action :_ Dans `LiveRoom.tsx`, écouter l'état du channel Supabase (`.on('system', ...)` ou via le statut de subscribe). Afficher un badge discret `"🔴 Reconnexion..."` dans le coin supérieur quand `CHANNEL_ERROR` ou `CLOSED`, qui disparaît sur `SUBSCRIBED`.

- [x] **L5 : Logger centralisé — remplacer `console.log` prod**
  - _Problème :_ Plusieurs routes admin et cron loguent avec `console.log` brut — pas de niveaux, pas de contexte structuré, difficile à filtrer en prod.
  - _Action 1 :_ Créer `src/lib/logger.ts` exportant `log.info(service, msg, data?)`, `log.warn(...)`, `log.error(...)`. Format : `[${service}] ${level} — ${msg}` + JSON des data si présent.
  - _Action 2 :_ Remplacer tous les `console.log` dans `/api/cron/match-monitor/route.ts`, `/api/alert/route.ts`, et les services de sync par `log.info(...)` ou `log.warn(...)`.

- [x] **L6 : Fix ARIA dans VotingModal**
  - _Problème :_ `titleId` et `descId` sont définis (lignes ~123-124) mais jamais assignés aux éléments HTML (`aria-labelledby`, `aria-describedby`). La modal n'est pas accessible aux lecteurs d'écran.
  - _Action :_ Dans `VotingModal.tsx`, ajouter `aria-labelledby={titleId}` sur le `<div role="dialog">` et `aria-describedby={descId}` sur l'élément de description. Vérifier que le focus trap fonctionne correctement (touche ESC + clic overlay).

---

### 🟠 Sprint M : REFACTOR ARCHITECTURE — "Nettoyer pour scaler"

> Composants trop gros, couplage lâche, magic numbers — ces dettes ralentissent tous les développements futurs. À traiter avant d'ajouter de nouvelles features.

- [x] **M1 : Extraire `ScorerAllocationEditor` de `PronosticsHubClient`**
  - _Problème :_ `PronosticsHubClient.tsx` fait 1 360 lignes — la logique de sélection de buteurs (joueurs, allocations, bunker) représente ~300 lignes auto-contenues.
  - _Action :_ Créer `src/components/pronos/ScorerAllocationEditor.tsx` qui reçoit `{ players, homeTeam, awayTeam, value, onChange }`. Extraire toute la logique de `PlayerPickerSheet` + état d'allocation depuis `PronosticsHubClient`.

- [x] **M2 : Extraire `MatchFilterBar` de `PronosticsHubClient`**
  - _Problème :_ La barre de filtres (compétition, date slider) est mélangée dans le même composant que la logique de saisie des pronos.
  - _Action :_ Créer `src/components/pronos/MatchFilterBar.tsx` avec les props `{ competitions, selectedComp, onCompChange, dates, selectedDate, onDateChange, pronoedDates }`. Le `DateSlider` existant peut être réutilisé.

- [x] **M3 : Remplacer `window.dispatchEvent("sifflet:...")` par un Context React**
  - _Problème :_ `LiveRoom.tsx` envoie des événements custom au `BottomNav.tsx` via `window.dispatchEvent(new CustomEvent("sifflet:drawer-available", ...))`. Couplage invisible, non typé, impossible à tester.
  - _Action 1 :_ Créer `src/contexts/LiveRoomContext.tsx` avec `drawerAvailable: boolean` et `setDrawerAvailable(v: boolean)`.
  - _Action 2 :_ Fournir le Context dans le layout `/(app)/layout.tsx`.
  - _Action 3 :_ Remplacer les `window.dispatchEvent` dans `LiveRoom` par `setDrawerAvailable(true)` et les `window.addEventListener` dans `BottomNav` par `useContext(LiveRoomContext)`.

- [x] **M4 : Extraire les constantes magic numbers**
  - _Action :_ Créer `src/lib/constants/alert.ts` avec `ALERT_THRESHOLD`, `ALERT_WINDOW_SECONDS`, `COOLDOWN_MINUTES`, `MIN_TRUST_ALERT_SCORE`. Créer `src/lib/constants/economy.ts` avec `REFILL_THRESHOLD`, `DAILY_REFILL_AMOUNT`, `MS_PER_DAY`. Remplacer toutes les valeurs hardcodées (voir TECH_BIBLE § 5.4).

- [x] **M5 : Décomposer `SquadDetailClient` en sous-composants**
  - _Problème :_ `SquadDetailClient.tsx` fait 855 lignes avec 4 responsabilités distinctes : classement, chat, championnat, standings compétition.
  - _Action :_ Extraire les composants suivants (chacun dans `src/components/ligues/`) :
    - `SquadLeaderboard.tsx` — classement hybride + filtres temporels
    - `SquadChat.tsx` — messages + Realtime (peut déjà exister — vérifier)
    - `SquadChampionship.tsx` — tableau W/D/L, journée en cours, calendrier
  - `SquadDetailClient` ne fait plus que la navigation entre onglets.

---

### 🟡 Sprint N : PAGES LÉGALES & COMPLÉTUDE — "Ce qui ne devrait pas manquer"

> Prérequis pour la soumission App Store + conformité RGPD.

- [x] **N1 : Page `/rules` — Règles du Jeu**
  - _Action :_ Créer `src/app/(app)/rules/page.tsx` (Server Component statique). Expliquer le mécanisme VAR, les Sifflets, le classement. Le lien existe déjà dans `TopBar.tsx` — la page est juste manquante.

- [x] **N2 : Page `/laws` — Lois IFAB**
  - _Action :_ Créer `src/app/(app)/laws/page.tsx`. Contenu : les 17 lois du football avec explications immersives. Le lien existe déjà dans `TopBar.tsx` avec badge "IFAB".

- [x] **N3 : Pages légales publiques**
  - _Action :_ Créer `src/app/cgu/page.tsx` (CGU) et `src/app/mentions-legales/page.tsx`. Contenu minimal suffisant pour les stores (données collectées : email Google, tokens push, scores de jeu — aucune donnée financière).
  - _Action 2 :_ Fixer les liens `href="#"` du footer de `src/app/page.tsx` vers ces vraies URLs.

- [x] **N4 : Privacy Policy hébergée (prérequis App Store)**
  - _Action :_ La privacy policy doit être accessible via une URL publique sans connexion. Utiliser `src/app/privacy/page.tsx` ou héberger sur une page Notion publique. Inclure : quelles données sont collectées, pourquoi, durée de conservation, droits RGPD.

---

### 🟢 Sprint O : TESTS & CI — "Ne pas régresser"

> L'app n'a actuellement aucun test automatisé. Avant le lancement public, au moins les flux critiques doivent être couverts.

- [x] **O1 : Tests E2E — Flux de connexion Google**
  - _Fichier :_ `tests/e2e/auth.spec.ts`
  - _Action :_ Utiliser Playwright avec mock Google OAuth (via `page.route()` pour intercepter `signInWithIdToken`). Tester : login → redirect /lobby → TopBar visible avec balance.

- [x] **O2 : Tests E2E — Flux de prono**
  - _Fichier :_ `tests/e2e/pronos.spec.ts`
  - _Action :_ Utilisateur connecté → page pronos → sélectionner un match upcoming → saisir score 1-0 → valider → vérifier que le prono apparaît dans l'historique profil.

- [x] **O3 : Tests unitaires — Fonctions de calcul**
  - _Fichiers :_ `src/lib/__tests__/`
  - _Action :_ Tester `buildMatchGroups()` (profil historique), `stoppageResult()` (match-monitor), `formatPronoValue()` (ProfileClient), `getXpProgress()` (ProfileHeader). Utiliser Vitest (déjà dans les dépendances ou à installer).

- [x] **O4 : CI GitHub Actions**
  - _Action :_ Créer `.github/workflows/ci.yml` qui lance `npm run ai:check` sur chaque PR. Optionnel : lancer les tests E2E en headless sur push vers main.

---

### 📱 Sprint Cap : Application Mobile Native (Capacitor)

> Transformer la PWA en vraie app iOS + Android via Capacitor (chargement URL distante — zéro réécriture Next.js).
> Prérequis : Apple Developer Program ($99/an) + Google Play Console ($25 one-time).

- [ ] **Cap-1 : Setup Capacitor & premier build**
  - _Action 1 :_ Installer `@capacitor/cli`, `@capacitor/core`, `@capacitor/ios`, `@capacitor/android`.
  - _Action 2 :_ Configurer le mode URL distante dans `capacitor.config.ts` (pointer vers le domaine Vercel de prod).
  - _Action 3 :_ Générer les projets natifs (`npx cap add ios`, `npx cap add android`).
  - _Action 4 :_ Valider le premier build sur simulateur iOS (Xcode) + émulateur Android (Android Studio).
  - _Action 5 :_ Splash screen + icônes (toutes tailles requises par les stores).
  - _Action 6 :_ Gérer les safe areas iOS (notch, home indicator) via CSS `env(safe-area-inset-*)`.

- [ ] **Cap-2 : Push notifications natives**
  - _Problème :_ Le web push VAPID actuel ne fonctionne pas dans un contexte Capacitor/natif.
  - _Action 1 :_ Intégrer `@capacitor/push-notifications`.
  - _Action 2 :_ Configurer **FCM** (Firebase Cloud Messaging) pour Android + **APNs** pour iOS (certificats Apple).
  - _Action 3 :_ Mettre à jour `src/lib/push-sender.ts` pour router vers FCM vs web push selon la plateforme.
  - _Action 4 :_ Tester sur device réel (les notifs push ne fonctionnent pas en simulateur).

- [ ] **Cap-3 : Polish natif**
  - _Action 1 :_ Status bar styling (couleur, mode dark/light) via `@capacitor/status-bar`.
  - _Action 2 :_ Désactiver le bounce scroll iOS (rubber banding) via CSS `overscroll-behavior: none`.
  - _Action 3 :_ Haptic feedback sur actions clés (alerte VAR, pari confirmé) via `@capacitor/haptics`.
  - _Action 4 :_ Configurer les deep links (`vartime://match/xxx`) pour les notifications.
  - _Action 5 :_ Gérer le back button Android (fermer modales avant de quitter).

- [ ] **Cap-4 : Préparation stores**
  - _Action 1 :_ Générer screenshots 6.7" + 5.5" + iPad pour l'App Store, screenshots Android pour le Play Store.
  - _Action 2 :_ Rédiger descriptions FR + EN pour les deux stores.
  - _Action 3 :_ Héberger une **Privacy Policy** complète (données collectées : email Google OAuth, tokens push, scores).
  - _Action 4 :_ Déclarer l'App Privacy (nutrition labels Apple) : données liées à l'utilisateur, tracking, etc.
  - _Action 5 :_ Distribuer via **TestFlight** (beta iOS) + Internal Testing (Play Store) avant soumission publique.

- [ ] **Cap-5 : Soumission & certification**
  - _Action 1 :_ Soumettre sur Google Play Store (validation 1-3 jours, peu de risques).
  - _Action 2 :_ Soumettre sur App Store Connect — prévoir 1-2 semaines de délai de review.
  - _Action 3 :_ Gérer les retours Apple (voir note wording ci-dessous).

- [ ] **Cap-6 : Wording store & UI — Revue anti-rejet Apple**
  - _Contexte :_ Apple est strict sur le vocabulaire lié aux paris, même fictifs.
  - _Action 1 :_ Dans les métadonnées store (titre, description, keywords) : bannir "pari" / "bet" → utiliser "pronostic", "prédiction", "défi entre amis".
  - _Action 2 :_ Auditer l'UI de l'app : remplacer les occurrences visibles de "Paris VAR" par "Alertes VAR" ou "Défis VAR" dans les écrans critiques (lobby, profil, classement).
  - _Action 3 :_ S'assurer que les Sifflets ne peuvent **jamais** être achetés avec de l'argent réel (aucun IAP monétaire) — condition sine qua non pour éviter les 30% Apple.
  - _Action 4 :_ Préparer une justification écrite pour l'App Review Team : "jeu de pronostics avec monnaie fictive exclusivement gagnée en jouant, aucun argent réel impliqué".
  - _Note risques :_ Classification 17+ probable imposée par Apple (gambling-adjacent). Play Store : aucun risque majeur.

---

- [ ] **Tâche 2X : Infrastructure i18n (Server & Client)**
  - _Détails :_ Le projet a besoin de supporter plusieurs langues (FR, EN, ES, DE, IT), mais l'architecture actuelle (un simple hook client `useLocale`) est incompatible avec Next.js App Router (Server Components).
  - _Action 1 :_ Mettre en place `next-intl` (qui gère l'App Router via le middleware pour détecter la langue du navigateur et injecter les traductions côté serveur).
  - _Action 2 :_ Extraire toutes les strings d'un seul module précis (ex: la `TopBar` et la `BottomNav`) dans les fichiers `.json` de `next-intl` pour prouver le concept sans casser le reste.
  - _Action 3 :_ Préparer le reste de la traduction pour des itérations futures, composant par composant.

---

### 🎨 Sprint UX1 : IDENTITÉ & LANDING — "Unifier la marque VAR TIME"

> Issu de l'audit UX du 07/05/2026. La landing page dit encore "Le Sifflet" à certains endroits et contient des incohérences visuelles et de contenu. Ce sprint aligne tout sur VAR TIME.

- [x] **UX1-1 : Unifier le nom de marque — "Le Sifflet" → "VAR TIME" sur la landing**
  - _Problème :_ Le header de la landing + certains textes utilisent encore "Le Sifflet" alors que l'app affiche "VAR TIME". Un visiteur qui voit les deux noms est déstabilisé.
  - _Action :_ Auditer `src/app/page.tsx` et tous les composants du dossier `src/components/home/`. Remplacer chaque occurrence de "Le Sifflet" par "VAR TIME". Vérifier aussi les meta tags (`<title>`, `og:title`, `description`) dans `src/app/layout.tsx`.

- [x] **UX1-2 : Corriger la contradiction App Store sur la landing**
  - _Problème :_ Les boutons "App Store" et "Google Play" sont affichés comme actifs, mais le QR code dit "Bientôt disponible" — message contradictoire pour un visiteur.
  - _Action :_ Dans `src/app/page.tsx`, remplacer les boutons App Store / Google Play par un unique bloc "Bientôt disponible sur iOS & Android" avec une formule de liste d'attente (input email + bouton "Me prévenir") ou à défaut les masquer complètement jusqu'à disponibilité réelle. Conserver le QR code si l'app PWA est installable.

- [x] **UX1-3 : Alléger les sections "Quatre façons" et "Trois étapes" de la landing**
  - _Problème :_ Chaque carte contient un paragraphe entier — trop dense, ne se lit pas en scroll rapide.
  - _Action :_ Dans `src/app/page.tsx`, réduire le texte de chaque carte à **1 ligne maximum** (pitch en une phrase). Le contenu détaillé peut rester dans un tooltip ou être supprimé. Vérifier que les 4 icônes/emojis sont bien visibles et cohérents visuellement.

- [x] **UX1-4 : Remonter la section "Progression des rangs" en position 2 sur la landing**
  - _Problème :_ La section "Ton Expertise au Kop" (Arbitre de District → Boss de la VAR) est tout en bas de page — c'est pourtant le meilleur hook de rétention.
  - _Action :_ Dans `src/app/page.tsx`, déplacer la section de progression des rangs juste après le hero (section 2), avant "Quatre façons de jouer".

---

### 🎨 Sprint UX2 : NAVIGATION & AFFORDANCES — "Ce qu'on ne voit pas, on ne clique pas"

> Problèmes d'affordance identifiés sur Stade, Pronos et Profil.

- [x] **UX2-1 : Affordance de scroll sur les tabs de ligues (Stade)**
  - _Problème :_ Les onglets DIRECT / LIGUE 1 / PREMIER LEAGUE / LA LIGA sont scrollables horizontalement mais rien ne l'indique. Les ligues de droite sont invisibles.
  - _Action :_ Dans le composant de tabs du Stade (`src/app/(app)/lobby/page.tsx` ou le composant concerné), ajouter un **gradient fade sur le bord droit** (`via un pseudo-élément ou un div absolu`) quand il reste des tabs hors-écran. Le gradient disparaît quand on a scrollé jusqu'au bout.

- [x] **UX2-2 : Affordance de scroll sur les tabs du Profil**
  - _Problème :_ Même problème sur PROFIL / HISTORIQUE 35 / BADGES / AMIS — "HISTORIQUE 35" est large et peut couper "BADGES" ou "AMIS" sur petits écrans.
  - _Action :_ Appliquer le même traitement gradient fade que UX2-1 sur les tabs du profil (`src/components/profile/ProfileClient.tsx`). Vérifier aussi que le compteur "35" dans l'onglet HISTORIQUE ne fait pas déborder le tab — si oui, le passer en badge superposé plutôt qu'en texte inline.

- [x] **UX2-3 : Corriger le label "← Terrain" dans la feuille de match**
  - _Problème :_ "← Terrain" comme bouton retour est thématique mais UX-ment ambigu — les utilisateurs cherchent "Retour" ou une flèche seule.
  - _Action :_ Dans `src/app/(app)/match/[id]/page.tsx` ou le composant header de la feuille de match, remplacer le label "Terrain" par une simple flèche `←` sans texte, ou "← Matchs". Conserver la couleur jaune/whistle actuelle.

- [x] **UX2-4 : Corriger "V S" (avec espace) dans le header match À VENIR**
  - _Problème :_ Le score des matchs à venir affiche "V S" avec un espace parasite — artefact typographique.
  - _Action :_ Trouver l'origine du rendu "VS" dans le composant de score (probablement `src/components/match/MatchStats.tsx` ou le header du match). Corriger pour afficher "VS" sans espace, ou remplacer par un tiret `—` plus sobre.

- [x] **UX2-5 : Indiquer que les cases de score Pronos sont éditables**
  - _Problème :_ Dans la page Pronos, les cases pour entrer le score ressemblent à des placeholders statiques — pas d'affordance visuelle d'édition.
  - _Action :_ Dans `src/components/pronos/PronosticsHubClient.tsx` ou `ScorerAllocationEditor.tsx`, ajouter un placeholder `?` dans chaque input de score vide, et une bordure en tirets ou une légère lueur au focus pour signaler l'interactivité. S'assurer que `font-size >= 16px` sur ces inputs pour éviter le zoom automatique iOS (déjà listé en F7 mais vérifier si fait).

---

### 🎨 Sprint UX3 : EMPTY STATES & FEEDBACK — "Chaque écran vide doit inviter à agir"

- [x] **UX3-1 : Refaire l'empty state du Vestiaire (Chat de ligue)**
  - _Problème :_ L'onglet Vestiaire (chat) d'une ligue affiche presque uniquement du noir — c'est l'écran le plus vide et le moins motivant de l'app.
  - _Action :_ Dans `src/components/ligues/SquadDetailClient.tsx` (ou le composant chat extrait), détecter quand il n'y a aucun message. Afficher un empty state : illustration simple (emoji ou SVG minimaliste), texte "Personne n'a encore pris la parole... Brise la glace !", et focus automatique sur l'input à l'arrivée sur cet onglet.
  - _Bonus :_ Insérer automatiquement un message système à la création de la ligue : `"🎉 Bienvenue dans [Nom de la ligue] ! Présentez-vous..."`.

- [x] **UX3-2 : Améliorer l'empty state KOP (match À VENIR)**
  - _Problème :_ Quand un match n'a pas encore commencé, le KOP affiche juste "En attente des premiers événements..." sur un écran vide. L'utilisateur est bloqué sans action possible.
  - _Action :_ Dans `src/components/match/MatchTimeline.tsx`, quand `matchStatus === 'upcoming'`, afficher à la place : l'heure de coup d'envoi en gros, un compteur de temps restant si < 24h, et un CTA "Voir la Compo" qui switche sur l'onglet COMPO. Conserver le message actuel uniquement pour les matchs `live` sans événements.

- [x] **UX3-3 : Améliorer l'onglet Amis (recherche directe)**
  - _Problème :_ L'onglet Amis du profil renvoie vers les Ligues pour trouver des amis — parcours brisé. Il n'y a pas de recherche par pseudo.
  - _Action :_ Dans `src/components/profile/AmisContent.tsx`, ajouter en haut de l'onglet un champ de recherche `input` avec placeholder "Chercher un joueur par pseudo...". Au submit, appeler une query Supabase `profiles` filtrant par `username ilike %query%` (limité à 5 résultats). Afficher les résultats avec un bouton "Ajouter" inline. Conserver le CTA "Rejoins une ligue" en bas comme action secondaire.

---

### 🎨 Sprint UX4 : LISIBILITÉ & HIÉRARCHIE — "Chaque info à sa bonne place"

- [x] **UX4-1 : Corriger l'abréviation "Dem." dans le sélecteur de jours (Pronos)**
  - _Problème :_ Le sélecteur de jours mélange des jours absolus (Dim, Lun, Mar...) avec "Dem." (relatif = Demain) — incohérence de convention.
  - _Action :_ Dans `src/components/pronos/MatchFilterBar.tsx` ou le composant de sélection de dates, remplacer "Dem." par l'abréviation réelle du jour (`format(date, 'EEE', { locale: fr })` → "Jeu.", "Ven."...). Si on veut signaler "Demain", ajouter un badge secondaire sous le numéro du jour plutôt que remplacer le nom.

- [x] **UX4-2 : Ajouter une légende aux cotes dans les cartes Pronos**
  - _Problème :_ Les chiffres 193 / 166 / 65 sous les boutons de pronostic n'ont pas de label — un nouvel utilisateur ne sait pas ce qu'ils représentent.
  - _Action :_ Dans la `MatchPronoCard` de `src/components/pronos/PronosticsHubClient.tsx`, ajouter sous chaque cote un micro-label `"pts si correct"` (ou `"XP"`) en texte très petit (`text-[10px] text-zinc-500`). Alternative : une icône info ⓘ qui affiche un tooltip au tap.

- [x] **UX4-3 : Clarifier le label "Score exact" dans l'Historique profil**
  - _Problème :_ Dans l'historique, "Score exact · 1-4" pour un match 0-0 est confus — "Score exact" ressemble à une catégorie de résultat, pas à un type de pari.
  - _Action :_ Dans `src/components/profile/ProfileClient.tsx` ou le composant d'historique, renommer le label affiché de "Score exact" en "Mon prono :" suivi du score prédit. Le résultat réel doit être clairement séparé visuellement (ex: `Résultat : 0-0` en grisé dessous).

- [x] **UX4-4 : Remonter "Score de confiance" dans le hero du profil**
  - _Problème :_ Le "Score de confiance" (indicateur de qualité de prédiction) est tout en bas du profil, sous le fold. C'est pourtant une métrique-clé de progression.
  - _Action :_ Dans `src/components/profile/ProfileClient.tsx` (ou le composant hero du profil), déplacer le bloc "Score de confiance" dans la carte hero, à côté ou juste en dessous du streak. Le streak (`🔥 2j`) mérite aussi d'être agrandi — passer de `text-xs` à `text-sm` minimum.

- [x] **UX4-5 : Améliorer le code de ligue sur les cartes (Ligues)**
  - _Problème :_ Le "Code: F9DQXT" prend l'espace d'un bouton pleine largeur alors que c'est une action secondaire (partager le code).
  - _Action :_ Dans `src/components/ligues/LiguesPageClient.tsx`, remplacer le bouton pleine largeur "Code: F9DQXT" par une ligne inline affichant le code en `font-mono` + une icône `Copy` (Lucide) cliquable qui copie dans le presse-papiers avec un toast "Code copié !". Libérer ainsi l'espace visuel sur la carte.

- [x] **UX4-6 : Ajouter confirmation avant "Quitter" une ligue**
  - _Problème :_ Le bouton "Quitter" est une action destructive sans confirmation — risque de quitter accidentellement une ligue.
  - _Action :_ Dans `src/components/ligues/LiguesPageClient.tsx`, entourer l'action "Quitter" d'une modale de confirmation (`AlertDialog` ou `confirm()` natif) : "Es-tu sûr de vouloir quitter [Nom de la ligue] ? Tu perdras ton classement.". Bouton de confirmation en rouge.

---

### 🚨 Sprint UX5 : BLOQUANTS AVANT LANCEMENT — "L'app ne doit jamais sembler vide ou cassée"

> Issu de l'audit UX agent du 07/05/2026. Ces points créent une impression de "l'app est cassée" ou "il n'y a rien à faire ici" pour un premier utilisateur. À corriger avant tout lancement public.

- [ ] **UX5-1 : Redirect auto DIRECT → Pronos quand aucun match live**
  - _Problème :_ L'onglet "DIRECT" est l'onglet par défaut du Stade. En dehors des soirées de matchs (soit ~80% du temps), l'utilisateur ouvre l'app et tombe immédiatement sur l'empty state "La VAR dort". Premier réflexe : "L'app est cassée" ou "il n'y a rien à faire ici".
  - _Action :_ Dans `src/components/lobby/MatchLobby.tsx`, au montage du composant, vérifier si `directRows.length === 0`. Si oui, switcher automatiquement l'onglet actif vers `"l1"` (ou le premier onglet avec des matchs). Si aucun onglet n'a de matchs ce jour-là, basculer vers l'onglet `"pronos"` via un `Link` redirect ou une navigation programmatique vers `/pronos`. Ajouter éventuellement un bandeau discret "Aucun match en direct — on t'a redirigé vers tes Pronos".

- [ ] **UX5-2 : Empty state Pronos — remplacer le fantôme par un vrai skeleton loader**
  - _Problème :_ L'onglet Pronos à l'ouverture affiche "ENTRÉE SUR LE TERRAIN..." avec un écran presque vide. L'utilisateur ne sait pas si c'est un loader ou un empty state final — impression de page cassée.
  - _Action :_ Dans `src/components/pronos/PronosticsHubClient.tsx` ou la page `src/app/(app)/pronos/page.tsx`, détecter l'état `loading` et afficher des **skeleton cards** animées (placeholders gris `animate-pulse`, 3 fausses cartes de match avec hauteur réaliste). Le texte "ENTRÉE SUR LE TERRAIN..." peut subsister comme titre d'en-tête mais ne doit jamais être l'unique élément visible.

- [ ] **UX5-3 : "La VAR dort" — enrichir avec 2 CTAs sortants**
  - _Problème :_ L'empty state du Stade n'a qu'un seul CTA "FAIRE MES PRONOS". Un seul choix = trop sec, et certains utilisateurs n'ont pas de match à pronostiquer non plus.
  - _Action :_ Dans `src/components/lobby/MatchLobby.tsx`, dans le bloc empty state "La VAR dort", ajouter sous le bouton "FAIRE MES PRONOS" deux actions secondaires en `flex gap-2` : un bouton "Voir le classement" (`href="/leaderboard"`) et un bouton "Mes ligues" (`href="/ligues"`). Style : bordure simple `border border-white/15 bg-zinc-900`, texte `text-xs font-black text-zinc-400`.

- [ ] **UX5-4 : Hub stats Stade — retirer Classement/Résultats officiels, garder Buteurs**
  - _Problème :_ Les onglets "Classement" (classement officiel Ligue 1) et "Résultats" dans le hub stats dilue la proposition de valeur de l'app. Un utilisateur qui veut le classement Ligue 1 va sur L'Équipe, pas sur VAR TIME. Ça transforme l'app en "app d'actu foot générique" au lieu de "app de pronos et paris".
  - _Action :_ Dans `src/components/lobby/LeagueHub.tsx` (ou le composant contenant les onglets Résultats / Classement / Buteurs / Passeurs), **masquer ou supprimer les onglets "Classement" et "Résultats"**. Garder uniquement "Buteurs" et "Passeurs" car ils sont directement utiles pour les pronos buteurs. Si l'onglet "Classement" est utilisé par <5% des sessions (à vérifier avec Vercel Analytics), le supprimer définitivement. Mettre "Buteurs" comme premier onglet par défaut.

- [ ] **UX5-5 : Avatars profil — gater les avatars par rang d'Arbitre**
  - _Problème :_ La modale "Modifier mon profil" affiche ~20 avatars en grille 4×5 → paralysie de choix. De plus, le backlog prévoit des "avatars personnalisés par rang" — autant l'implémenter maintenant plutôt que d'avoir une grille plate.
  - _Action :_ Dans `src/components/profile/ProfileEditModal.tsx`, restructurer la grille d'avatars en 4 niveaux débloqués progressivement selon le `rank` de l'utilisateur (ou son `xp`) :
    - Niveau 1 (tous) : 4-5 avatars de base (ballon ⚽, sifflet 🎯, maillot, carton 🟨, terrain)
    - Niveau 2 (Lanceur d'Alerte, xp ≥ 50) : +4 avatars (lion 🦁, aigle 🦅, renard 🦊, ours 🐻)
    - Niveau 3 (Arbitre Officiel, xp ≥ 100) : +4 avatars (trophée 🏆, médaille 🏅, couronne 👑, étoile ⭐)
    - Niveau 4 (Arbitre Élite, xp ≥ 200) : +4 avatars exclusifs (dorés, animés ou stylisés 💎🔥⚡🌟)
    Les avatars verrouillés sont **visibles mais grisés** avec un petit badge "Arbitre Officiel requis" — visible = désir, verrouillé = motivation de progression.

---

### ⚠️ Sprint UX6 : FRICTIONS MAJEURES — "Les données doivent travailler pour l'utilisateur"

> Corrections à apporter pendant la phase bêta. Ces points ne cassent pas l'expérience mais créent des confusions ou des opportunités manquées de feedback émotionnel.

- [ ] **UX6-1 : Stats communautaires Pronos — masquer si trop peu de votes**
  - _Problème :_ Les 3 stats communautaires "0% / 0% / 0%" affichées sous chaque match dans le hub Pronos donnent l'impression que personne ne joue à l'app. C'est particulièrement destructeur en bêta avec peu d'utilisateurs.
  - _Action :_ Dans `src/components/pronos/PronosticsHubClient.tsx`, dans le bloc des Community Percentages, ajouter une condition : si `(match.community_stats?.total_pronos ?? 0) < 10`, remplacer les 3 chiffres `%` par le message `"⚡ Sois le premier à pronostiquer"` (centré, `text-[10px] text-amber-400 font-black`). Au-delà de 10 votes, afficher normalement les pourcentages.

- [ ] **UX6-2 : Labels récompenses Pronos — rendre le gain potentiel explicite**
  - _Problème :_ Les chiffres "113 pts / 152 pts / 157 pts" sous les boutons de pronostic ne sont pas accompagnés d'un contexte clair. Un utilisateur ne comprend pas instinctivement que c'est ce qu'il gagnera **si son prono est correct** pour ce résultat précis.
  - _Action :_ Dans `src/components/pronos/PronosticsHubClient.tsx`, dans le `MatchPronoCard`, modifier le layout des cotes pills. Le label déjà présent `"pts"` (ajouté en UX4-2) peut être enrichi : au lieu de juste `"pts"`, afficher `"pts si correct"` en `text-[8px]`. Alternativement, ajouter un bandeau contextuel sous les 3 pills : `"Si ton pronostic est bon → tu empoches {max(pts1,ptsN,pts2)} pts max"` en `text-[9px] text-zinc-500 text-center` (affiché uniquement avant soumission).

- [ ] **UX6-3 : Historique profil — inverser le tri (résolus d'abord)**
  - _Problème :_ L'historique affiche les pronos "en attente" en premier. Comme la majorité des pronos sont souvent en attente (matchs futurs), l'utilisateur scrolle sans jamais voir ses gains. Le dopamine hit est enterré.
  - _Action :_ Dans `src/components/profile/ProfileClient.tsx`, dans la liste `pronos` et `shortBets` du tab "Historique", trier en mettant les entrées avec `status === "won"` ou `status === "lost"` en premier, les `"pending"` en dernier. Dans chaque groupe, conserver l'ordre chronologique inverse (le plus récent d'abord). Renforcer visuellement : bordure gauche `border-l-2 border-green-500` pour `won`, `border-l-2 border-red-500` pour `lost`, neutre pour `pending`.

- [ ] **UX6-4 : Historique profil — bloc résumé "7 derniers jours"**
  - _Problème :_ L'utilisateur doit scroller tout l'historique pour comprendre sa performance récente. Il n'y a pas de vue synthétique immédiate.
  - _Action :_ Dans `src/components/profile/ProfileClient.tsx`, en haut du tab "Historique" (avant la liste), ajouter un bloc résumé `"📊 Tes 7 derniers jours"` calculé côté client depuis la prop `pronos` + `shortBets` : filtrer les entrées des 7 derniers jours, compter won / lost / pending, sommer les `points_earned`. Afficher : `"+320 pts · 5 gagnés · 3 perdus · 2 en attente"` en `text-sm font-black` avec couleur verte si gain net positif, rouge sinon.

- [ ] **UX6-5 : Corriger le chip de grade trompeur dans le hero Profil**
  - _Problème :_ Le chip affiché dans le hero du profil (ex: "Arbitre Élite") correspond au grade **maximum** du système plutôt qu'au grade **actuel** de l'utilisateur, ou est mal connecté aux données. Un utilisateur "Arbitre de District" qui voit "Arbitre Élite" sur son profil est confus.
  - _Action :_ Dans `src/components/profile/ProfileHeader.tsx`, vérifier la fonction `getTrustGradeCompact(score)` et s'assurer qu'elle affiche bien le grade de l'utilisateur courant (pas le grade suivant ni le grade max). Si un indicateur de progression est souhaité, ajouter sous le chip actuel un `"→ Prochain : [grade suivant]"` en `text-[9px] text-zinc-500` seulement s'il existe un grade supérieur. Ne pas afficher le grade max si l'utilisateur n'y est pas encore.

- [ ] **UX6-6 : Solde "Pts" dans le header — plus visible, plus contrasté**
  - _Problème :_ Le solde de Sifflets (ex: "955 pts") affiché dans la TopBar est petit, peu contrasté sur fond sombre. C'est pourtant LA métrique centrale de l'app — l'équivalent du "solde de compte" dans une app bancaire ou de gaming.
  - _Action :_ Dans `src/components/layout/TopBar.tsx`, augmenter la taille du solde : passer de `text-sm` à `text-base font-black`. Augmenter le contraste de la couleur (utiliser `text-whistle` au lieu de `text-zinc-300` ou similaire). Rendre l'élément **cliquable** → ouvre une mini-modale ou redirige vers `/profile` avec l'onglet "Profil" actif. Ajouter une **animation de pulse** (`animate-ping` pendant 2s) quand le solde augmente en temps réel (écoute du Realtime `profiles` déjà branché).

- [ ] **UX6-7 : Leaderboard ligue — corriger les couleurs médailles**
  - _Problème :_ La médaille bronze (#3 du classement) est affichée en orange ambre — la même teinte que l'accent principal de l'app. Confusion entre "c'est une couleur d'interface" et "c'est une médaille". L'orange est aussi utilisé pour le joueur courant (bordure surlignée), ce qui amplifie la confusion.
  - _Action :_ Dans `src/components/ligues/SquadLeaderboard.tsx`, remplacer la classe Tailwind de la pastille bronze (idx === 2) par une vraie couleur bronze : `bg-amber-700 text-amber-100 border-amber-600` → utiliser plutôt `bg-[#CD7F32] text-white border-[#A0522D] shadow-[0_0_10px_rgba(205,127,50,0.3)]`. Vérifier que les positions 4+ restent en gris neutre `bg-zinc-800 text-zinc-400` sans aucun orange.

- [ ] **UX6-8 : Leaderboard ligue — label "XP total" → "Points cumulés"**
  - _Problème :_ Le chip "XP total : 2 383 Pts" dans l'en-tête du classement ligue mélange deux notions : "XP" (progression de rang individuel) et "Pts" (monnaie virtuelle). Dans le contexte ligue, on parle de points gagnés en commun, pas d'XP individuel.
  - _Action :_ Dans `src/components/ligues/SquadDetailClient.tsx`, remplacer le label "XP total :" par "Points cumulés :" (ou "Cagnotte cumulée :"). Vérifier aussi dans `src/components/ligues/SquadLeaderboard.tsx` que le label de la colonne de score en mode `period === "general"` est cohérent (déjà corrigé en "pts" mais vérifier la description texte associée).

---

### ✨ Sprint UX7 : POLISH LANCEMENT — "Les micro-détails qui font la différence"

> À traiter en parallèle du lancement ou juste après. Ces points améliorent la qualité perçue sans débloquer de nouvelle fonctionnalité.

- [ ] **UX7-1 : Hero profil — version compacte sur les onglets non-PROFIL**
  - _Problème :_ Le bandeau hero du profil (avatar + pseudo + stats) occupe ~40% de la hauteur d'écran et est répété identiquement sur les onglets Historique, Badges et Amis. Il pousse le contenu utile sous la ligne de flottaison.
  - _Action :_ Dans `src/components/profile/ProfileClient.tsx`, détecter `activeTab !== "profil"`. Quand ce n'est pas l'onglet Profil, passer le `<ProfileHeader>` en mode compact (prop `compact={true}`) : n'afficher que le pseudo, le solde et le badge de grade sur une seule ligne de 60px environ, sans l'XP bar ni les stat cards. L'onglet PROFIL garde le hero pleine taille. Gérer la prop `compact?: boolean` dans `ProfileHeader.tsx` pour conditionner les éléments affichés.

- [ ] **UX7-2 : Badge HISTORIQUE — pastille whistle (jaune) au lieu de gris**
  - _Problème :_ Le badge "35" sur l'onglet HISTORIQUE dans les tabs du profil est un rond gris peu visible. C'est un signal de progression important (35 paris/pronos en attente ou résolus) qui passe inaperçu.
  - _Action :_ Dans `src/components/profile/ProfileClient.tsx`, dans le rendu des tabs pills, modifier la couleur du badge de l'onglet "historique" : utiliser `bg-whistle text-pitch-900` (jaune sur vert foncé) au lieu du gris actuel. Appliquer uniquement si le badge correspond à des entrées **en attente** (pas résolus) pour signaler une action à faire.

- [ ] **UX7-3 : Cards matchs futurs Stade — compte-à-rebours ou heure de coup d'envoi**
  - _Problème :_ Les cartes de matchs "à venir" dans le Stade affichent un score vide. Sur mobile, ça ressemble à une carte vide ou cassée. L'attente doit être exploitée comme opportunité d'engagement.
  - _Action :_ Dans `src/components/lobby/MatchCard.tsx`, si le match a `status === "upcoming"` et que `start_time` est dans les prochaines 24h, afficher à la place du score vide un compte-à-rebours dynamique "Dans Xh Xmin" (calculé côté client) avec une pastille verte pulsante `🟢`. Si le match est dans plus de 24h, afficher juste l'heure locale "À 20:45" avec un emoji 🕐. Utiliser `useEffect` + `setInterval` pour le compte-à-rebours.

- [ ] **UX7-4 : BottomNav — indicateur LIVE urgence si match en cours**
  - _Problème :_ Quand un match est en cours en direct, rien dans la BottomNav ne l'indique. Un utilisateur revenant sur l'app ne sait pas qu'il y a quelque chose à faire maintenant.
  - _Action :_ Dans `src/components/layout/BottomNav.tsx`, si l'utilisateur a une `match_subscription` active sur un match actuellement `live` (requête légère au montage ou via Supabase Realtime), afficher une pastille rouge `animate-pulse` sur l'icône STADE du BottomNav. Alternative plus simple et sans requête : si l'URL courante n'est pas `/lobby` et que l'heure locale est dans une plage typique de match (18h-23h en semaine), afficher la pastille conditionnellement. Prioriser la solution Realtime si le coût perf est acceptable.

- [ ] **UX7-5 : Bouton "Quitter" ligue — rendre discret**
  - _Problème :_ Le bouton "Quitter" sur les cartes de ligue dans `LiguesPageClient.tsx` a autant de visibilité qu'une action principale alors que c'est une action de dernière instance destructive.
  - _Action :_ Dans `src/components/ligues/LiguesPageClient.tsx`, réduire la visibilité du bouton "Quitter" : passer en `text-[10px] text-zinc-600 font-medium` (texte seul, sans fond coloré), positionné en bas à droite de la carte ligue. Ou mieux, déplacer l'action dans un menu trois points `MoreVertical` (Lucide) qui affiche un dropdown avec "Partager le code" + "Quitter la ligue" (en rouge). La confirmation `window.confirm()` déjà en place reste.

- [ ] **UX7-6 : Gradient fade tabs Stade — vérifier que "La Liga" est bien coupé**
  - _Problème :_ L'agent UX rapporte que sur les captures d'écran de Stade, "LA LIGA" apparaît encore coupé sans aucun fade visible. Le sprint UX2-1 avait ajouté le gradient, mais il se peut qu'il soit mal positionné ou que le `z-index` ou `overflow` l'écrase.
  - _Action :_ Dans `src/components/lobby/MatchLobby.tsx`, vérifier visuellement que le gradient `bg-gradient-to-l from-zinc-950` est bien visible sur le dernier onglet visible. S'assurer que le conteneur parent n'a pas `overflow: hidden` qui bloquerait le gradient. Si nécessaire, augmenter la largeur du gradient fade de `w-12` à `w-16` et vérifier qu'il est `z-10` pour passer par-dessus les tabs.

---

### 🌍 Sprint P : PERSONNALISATION — "Mes ligues, mon app"

> Réduire la friction de pronostiquer en filtrant le contenu sur les compétitions que l'utilisateur suit vraiment. Préférence globale appliquée à Pronos + Stade + Push. Comportement par défaut pour un nouvel utilisateur : déduction depuis le `favorite_team_id` (club de cœur) → puis `Accept-Language` → fallback Ligue 1 + UCL. Les préférences s'appliquent partout (Pronos, Stade, Push).

- [ ] **P1 : Migration `preferred_competitions` sur profiles**
  - _Action 1 :_ Créer `supabase/migrations/0078_preferred_competitions.sql` :
    - Ajouter colonne `preferred_competitions UUID[] DEFAULT ARRAY[]::UUID[]` sur `profiles`
    - Ajouter index GIN : `CREATE INDEX idx_profiles_preferred_competitions ON profiles USING GIN (preferred_competitions);`
    - Backfill : pour chaque profil existant avec `favorite_team_id` non null, déduire la ligue domestique du club via `teams.competition_id` et la mettre dans `preferred_competitions`
    - Ajouter aussi l'ID de la Champions League à tous les profils backfillés
  - _Action 2 :_ Mettre à jour `src/types/database.ts` — ajouter `preferred_competitions: string[] | null` sur `ProfileRow` (Insert + Update).
  - _Action 3 :_ Étendre la RPC `update_profile` (`supabase/migrations/0079_update_profile_preferred.sql`) pour accepter le paramètre `p_preferred_competitions UUID[]` (optionnel — ne touche pas si NULL).

- [ ] **P2 : Détection automatique de la langue → ligues par défaut**
  - _Contexte :_ Pour les nouveaux utilisateurs sans `favorite_team_id`, déduire les ligues par défaut depuis la langue navigateur. Mapping : `fr` → Ligue 1 + UCL, `en` → Premier League + UCL, `es` → La Liga + UCL, `de` → Bundesliga + UCL, `it` → Serie A + UCL, autre → UCL seulement.
  - _Action 1 :_ Créer `src/lib/default-competitions.ts` exportant `getDefaultCompetitionsByLocale(locale: string): string[]`. Les UUIDs Supabase des compétitions sont référencés depuis une constante `src/lib/constants/competitions.ts` (mapping `api_football_league_id` → UUID Supabase, hardcodé et commenté).
  - _Action 2 :_ Dans le callback d'auth (`src/app/auth/callback/route.ts`), après création du profil, si `preferred_competitions` est vide : lire `headers().get('accept-language')`, appeler `getDefaultCompetitionsByLocale()`, écrire en DB via le client admin.
  - _Ordre de priorité :_ Club de cœur → Langue → Fallback Ligue 1 + UCL.

- [ ] **P3 : Composant `CompetitionFilter` réutilisable**
  - _Action 1 :_ Créer `src/components/shared/CompetitionFilter.tsx` (Client Component) :
    - Props : `competitions: CompetitionRow[]`, `selectedIds: string[]`, `onChange: (ids: string[]) => void`, `showCounts?: Record<string, number>`
    - UI : rangée scrollable horizontale (`overflow-x-auto snap-x`), gradient fade à droite (pattern UX2-1)
    - Chip "TOUTES" en premier (sélectionne/désélectionne tout)
    - Chips suivantes : drapeau emoji + nom court + compteur si > 0 (ex: `🇫🇷 L1 (3)`)
    - État actif : `bg-whistle text-pitch-900` ; inactif : `bg-zinc-800/90 text-zinc-400`
  - _Action 2 :_ Créer hook `src/hooks/usePreferredCompetitions.ts` :
    - Lit `profile.preferred_competitions` au mount (passé en prop depuis la page Server Component)
    - Expose `preferences` + `setPreferences(ids)` (appelle `PUT /api/profile`, optimistic update, rollback sur erreur, toast Sonner).

- [ ] **P4 : Intégration dans le Hub Pronos**
  - _Action 1 :_ Dans `src/components/pronos/PronosticsHubClient.tsx`, insérer `<CompetitionFilter />` **entre le `DateSlider` et la liste des matchs** (pas au-dessus du DateSlider — ordre : barre progression → DateSlider → filtre compétitions → accordéon matchs).
  - _Action 2 :_ Filtrer le tableau de matchs côté client : `match.competition_id IN selectedCompetitionIds` quand le filtre actif n'est pas "TOUTES".
  - _Action 3 :_ Mettre à jour la barre de progression "X/Y pronostiqués" pour refléter uniquement les matchs du filtre actif (ex: "8/12 sur tes ligues" vs "25/72 tous").
  - _Action 4 :_ Empty state si filtre actif + 0 match ce jour : "Aucun match {noms des ligues filtrées} ce jour-là — essaie une autre date ou élargis tes ligues." + bouton "Voir tous les matchs" (reset filtre).

- [ ] **P5 : Intégration dans le Stade (Lobby)**
  - _Action 1 :_ Dans `src/components/lobby/MatchLobby.tsx`, réordonner les onglets de ligues : les compétitions présentes dans `preferredCompetitions` de l'utilisateur apparaissent EN PREMIER (après "DIRECT"), les autres après. Passer les préférences depuis la page Server Component (`src/app/(app)/lobby/page.tsx` qui lit `profile.preferred_competitions`).
  - _Action 2 :_ Onglet "DIRECT" : si plusieurs matchs live, afficher en priorité ceux des ligues suivies — les autres en repli sous un séparateur discret "Autres compétitions".
  - _Action 3 :_ Empty state "La VAR dort" : personnaliser → "Aucun match {Ligue 1 ou Champions League} en direct. Tes prochains matchs : {liste 2-3 prochains matchs des ligues suivies}."

- [ ] **P6 : Filtrage des push notifications**
  - _Action 1 :_ Dans `src/lib/push-sender.ts`, fonction `sendPushToMatchSubscribers(matchId, payload)` : avant d'envoyer à un destinataire, vérifier que `match.competition_id` figure dans `profile.preferred_competitions`. Sinon, skip silencieux.
  - _Action 2 :_ Idem pour `POST /api/squads/nudge` (nudge pronos) : ne réveille pas un user dont la compétition du match n'est pas dans ses préférences.
  - _Note :_ La sirène VAR (`POST /api/squads/var-alert`) est une action sociale explicite d'un membre de la ligue — ne pas filtrer.

- [ ] **P7 : UI de gestion des préférences**
  - _Action 1 :_ Dans la modale "Modifier mon profil" (`src/components/profile/ProfileEditModal.tsx`), ajouter une section "MES LIGUES" sous "CLUB DE CŒUR" — liste de chips toggle pour les 8 compétitions disponibles, état initial depuis `profile.preferred_competitions`.
  - _Action 2 :_ Inclure `preferred_competitions` dans l'appel `update_profile` au submit du formulaire.
  - _Action 3 (bonus) :_ Ajouter un bouton "⚙️ Mes ligues" à droite du `CompetitionFilter` dans Pronos qui ouvre directement la section "MES LIGUES" de la modale profil (deep-link).

- [ ] **P8 : Onboarding préférences pour nouveaux utilisateurs**
  - _Action :_ Dans `src/components/onboarding/OnboardingTour.tsx`, insérer une étape "Choisis tes ligues" (déclenchée si `preferred_competitions` est vide ET l'utilisateur a moins de 24h d'ancienneté) : grille de 8 cards compétition avec drapeau + nom, pré-cochées selon la langue détectée (P2). Bouton "C'est parti !" → écrit en DB puis ferme l'onboarding.

---

## 💡 Rappel des Commandes pour l'IA

- `npm run ai:check` : Formate, vérifie le typage (TS) et les règles de code (ESLint). **A faire à chaque fin de tâche.**
- `npm run ai:verify` : Fait tout ce qui est ci-dessus + lance les tests End-to-End Playwright.
