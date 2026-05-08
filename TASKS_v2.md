# 🗺️ ROADMAP & TACHES (TASKS.md)

> **Pour l'IA (AI Agent) :**
> Ton rôle est de piocher la première tâche "En cours" ou "À faire" ci-dessous.
>
> 1. Développe la fonctionnalité en suivant les règles de `.skills/`.
> 2. Une fois le code écrit, lance TOUJOURS `npm run ai:check` (ou `npm run ai:verify` si des tests E2E sont impliqués).
> 3. Si `ai:check` échoue, analyse l'erreur, corrige ton code, et relance la commande. Ne t'arrête QUE quand la commande passe au vert.
> 4. Une fois terminée et validée, coche la case [x], décris brièvement ce que tu as fait, et arrête-toi.

---

## 🎯 PRIORITÉ DU MOMENT (semaine du 12 mai 2026 — pré-CDM)

> **Mise à jour :** 9 mai 2026.
>
> **Contexte :** Bêta publique CDM le 11 juin 2026 (J-33). Lancement officiel L1 le 8 août 2026. Bilans stratégiques détaillés dans `STRATEGY_v2.md`, `FRICTION_REDUCTION_v2.md`, et `BUGS_POST_MIGRATION.md`.

### Ordre de traitement recommandé

L'IA doit traiter les sprints **dans cet ordre exact**, en validant l'achèvement de chaque sprint avant de passer au suivant.

**Phase 1 — DIAGNOSTIC + FONDATIONS (semaine 1, 12-18 mai)**

1. **Sprint AUDIT-NOTIF** (priorité absolue, fondation push) — voir bloc dédié plus bas
2. **BUG-8** (régression onglets Résultats/Classement disparus sur Stade > Ligue 1) — voir `BUGS_POST_MIGRATION.md`
3. **Sprint Q : Quorum dynamique** (débloque mécanique communautaire) — voir bloc dédié plus bas

**Phase 2 — MÉCANIQUE CORE + ÉCONOMIE ** 4. **Sprint FRICTION-FK2 : Web Push avec actions OUI/NON** (LE killer feature) 5. **Sprint Eco-1 : Saisons mensuelles** (économie saine, anti-inflation) 6. **Sprint FRICTION-FK1 : Push pré-match** (réduction friction d'ouverture)

**Phase 3 — POLISH + MARKETING ** 7. **Sprint INSP-4 : Polish VotingModal Twitch-style** (mécanique core impeccable) 8. **Sprint LAND : Landing v2** (nouveau pitch "L'app qui vient à toi") 9. **Sprint MPP-1 : Badges narratifs** (quick win 2-3h de copy) 10. **Sprint Push-1 : Notifications post-résolution**

**Phase 4 — VIRALITÉ ** 11. **Sprint V : Viralité** (deep links + VictoryShareCard) 12. **Sprint UX restants critiques** (UX5, UX6 si pas faits)

**11 juin = bêta publique CDM. Tout doit être prêt avant.**

### ⚠️ Sprints à NE PAS traiter avant la CDM

- **Sprint Cap** (Capacitor) — septembre 2026

### 🚫 Sprints supprimés (ne pas restaurer)

- ~~**Sprint FRICTION-FK4** (Pot d'amorçage)~~ — supprimé le 9 mai 2026. Le système parimutuel actuel est sain. Consensus évident = risque faible = gain faible (logique économique cohérente). Décision validée par le PM. **NE PAS restaurer ce sprint sans validation explicite.**

### 📋 Workflow attendu de l'IA pour chaque sprint

1. **Avant de coder** : décris ton plan d'action en 5 étapes max. Liste les fichiers que tu prévois de modifier.
2. **Pendant le code** : suis les règles de `.skills/`, fais des commits atomiques.
3. **Avant la fin** : lance `npm run ai:check` (ou `ai:verify`).
4. **À la fin** : coche les cases `[ ]` → `[x]`, décris brièvement ce qui a été fait, **liste exhaustivement les fichiers modifiés** (utile pour le smoke test du PM).
5. **Stop** : ne passe PAS au sprint suivant sans validation explicite du PM.

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

- [x] Ajouter les avatars personnalisés pour chaque "Arbitre".
- [x] Classement global ("Board des sifflets") mis à jour toutes les 24h.

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

- [x] **Tâche 2X : Infrastructure i18n (Server & Client)**
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

- [x] **UX5-1 : Redirect auto DIRECT → Pronos quand aucun match live**
  - _Problème :_ L'onglet "DIRECT" est l'onglet par défaut du Stade. En dehors des soirées de matchs (soit ~80% du temps), l'utilisateur ouvre l'app et tombe immédiatement sur l'empty state "La VAR dort". Premier réflexe : "L'app est cassée" ou "il n'y a rien à faire ici".
  - _Action :_ Dans `src/components/lobby/MatchLobby.tsx`, au montage du composant, vérifier si `directRows.length === 0`. Si oui, switcher automatiquement l'onglet actif vers `"l1"` (ou le premier onglet avec des matchs). Si aucun onglet n'a de matchs ce jour-là, basculer vers l'onglet `"pronos"` via un `Link` redirect ou une navigation programmatique vers `/pronos`. Ajouter éventuellement un bandeau discret "Aucun match en direct — on t'a redirigé vers tes Pronos".

- [x] **UX5-2 : Empty state Pronos — remplacer le fantôme par un vrai skeleton loader**
  - _Problème :_ L'onglet Pronos à l'ouverture affiche "ENTRÉE SUR LE TERRAIN..." avec un écran presque vide. L'utilisateur ne sait pas si c'est un loader ou un empty state final — impression de page cassée.
  - _Action :_ Dans `src/components/pronos/PronosticsHubClient.tsx` ou la page `src/app/(app)/pronos/page.tsx`, détecter l'état `loading` et afficher des **skeleton cards** animées (placeholders gris `animate-pulse`, 3 fausses cartes de match avec hauteur réaliste). Le texte "ENTRÉE SUR LE TERRAIN..." peut subsister comme titre d'en-tête mais ne doit jamais être l'unique élément visible.

- [x] **UX5-3 : "La VAR dort" — enrichir avec 2 CTAs sortants**
  - _Problème :_ L'empty state du Stade n'a qu'un seul CTA "FAIRE MES PRONOS". Un seul choix = trop sec, et certains utilisateurs n'ont pas de match à pronostiquer non plus.
  - _Action :_ Dans `src/components/lobby/MatchLobby.tsx`, dans le bloc empty state "La VAR dort", ajouter sous le bouton "FAIRE MES PRONOS" deux actions secondaires en `flex gap-2` : un bouton "Voir le classement" (`href="/leaderboard"`) et un bouton "Mes ligues" (`href="/ligues"`). Style : bordure simple `border border-white/15 bg-zinc-900`, texte `text-xs font-black text-zinc-400`.

- [x] **UX5-4 : Hub stats Stade — retirer Classement/Résultats officiels, garder Buteurs**
  - _Problème :_ Les onglets "Classement" (classement officiel Ligue 1) et "Résultats" dans le hub stats dilue la proposition de valeur de l'app. Un utilisateur qui veut le classement Ligue 1 va sur L'Équipe, pas sur VAR TIME. Ça transforme l'app en "app d'actu foot générique" au lieu de "app de pronos et paris".
  - _Action :_ Dans `src/components/lobby/LeagueHub.tsx` (ou le composant contenant les onglets Résultats / Classement / Buteurs / Passeurs), **masquer ou supprimer les onglets "Classement" et "Résultats"**. Garder uniquement "Buteurs" et "Passeurs" car ils sont directement utiles pour les pronos buteurs. Si l'onglet "Classement" est utilisé par <5% des sessions (à vérifier avec Vercel Analytics), le supprimer définitivement. Mettre "Buteurs" comme premier onglet par défaut.

- [x] **UX5-5 : Avatars profil — gater les avatars par rang d'Arbitre**
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

- [x] **UX6-1 : Stats communautaires Pronos — masquer si trop peu de votes**
  - _Problème :_ Les 3 stats communautaires "0% / 0% / 0%" affichées sous chaque match dans le hub Pronos donnent l'impression que personne ne joue à l'app. C'est particulièrement destructeur en bêta avec peu d'utilisateurs.
  - _Action :_ Dans `src/components/pronos/PronosticsHubClient.tsx`, dans le bloc des Community Percentages, ajouter une condition : si `(match.community_stats?.total_pronos ?? 0) < 10`, remplacer les 3 chiffres `%` par le message `"⚡ Sois le premier à pronostiquer"` (centré, `text-[10px] text-amber-400 font-black`). Au-delà de 10 votes, afficher normalement les pourcentages.

- [x] **UX6-2 : Labels récompenses Pronos — rendre le gain potentiel explicite**
  - _Problème :_ Les chiffres "113 pts / 152 pts / 157 pts" sous les boutons de pronostic ne sont pas accompagnés d'un contexte clair. Un utilisateur ne comprend pas instinctivement que c'est ce qu'il gagnera **si son prono est correct** pour ce résultat précis.
  - _Action :_ Dans `src/components/pronos/PronosticsHubClient.tsx`, dans le `MatchPronoCard`, modifier le layout des cotes pills. Le label déjà présent `"pts"` (ajouté en UX4-2) peut être enrichi : au lieu de juste `"pts"`, afficher `"pts si correct"` en `text-[8px]`. Alternativement, ajouter un bandeau contextuel sous les 3 pills : `"Si ton pronostic est bon → tu empoches {max(pts1,ptsN,pts2)} pts max"` en `text-[9px] text-zinc-500 text-center` (affiché uniquement avant soumission).

- [x] **UX6-3 : Historique profil — inverser le tri (résolus d'abord)**
  - _Problème :_ L'historique affiche les pronos "en attente" en premier. Comme la majorité des pronos sont souvent en attente (matchs futurs), l'utilisateur scrolle sans jamais voir ses gains. Le dopamine hit est enterré.
  - _Action :_ Dans `src/components/profile/ProfileClient.tsx`, dans la liste `pronos` et `shortBets` du tab "Historique", trier en mettant les entrées avec `status === "won"` ou `status === "lost"` en premier, les `"pending"` en dernier. Dans chaque groupe, conserver l'ordre chronologique inverse (le plus récent d'abord). Renforcer visuellement : bordure gauche `border-l-2 border-green-500` pour `won`, `border-l-2 border-red-500` pour `lost`, neutre pour `pending`.

- [x] **UX6-4 : Historique profil — bloc résumé "7 derniers jours"**
  - _Problème :_ L'utilisateur doit scroller tout l'historique pour comprendre sa performance récente. Il n'y a pas de vue synthétique immédiate.
  - _Action :_ Dans `src/components/profile/ProfileClient.tsx`, en haut du tab "Historique" (avant la liste), ajouter un bloc résumé `"📊 Tes 7 derniers jours"` calculé côté client depuis la prop `pronos` + `shortBets` : filtrer les entrées des 7 derniers jours, compter won / lost / pending, sommer les `points_earned`. Afficher : `"+320 pts · 5 gagnés · 3 perdus · 2 en attente"` en `text-sm font-black` avec couleur verte si gain net positif, rouge sinon.

- [x] **UX6-5 : Corriger le chip de grade trompeur dans le hero Profil**
  - _Problème :_ Le chip affiché dans le hero du profil (ex: "Arbitre Élite") correspond au grade **maximum** du système plutôt qu'au grade **actuel** de l'utilisateur, ou est mal connecté aux données. Un utilisateur "Arbitre de District" qui voit "Arbitre Élite" sur son profil est confus.
  - _Action :_ Dans `src/components/profile/ProfileHeader.tsx`, vérifier la fonction `getTrustGradeCompact(score)` et s'assurer qu'elle affiche bien le grade de l'utilisateur courant (pas le grade suivant ni le grade max). Si un indicateur de progression est souhaité, ajouter sous le chip actuel un `"→ Prochain : [grade suivant]"` en `text-[9px] text-zinc-500` seulement s'il existe un grade supérieur. Ne pas afficher le grade max si l'utilisateur n'y est pas encore.

- [x] **UX6-6 : Solde "Pts" dans le header — plus visible, plus contrasté**
  - _Problème :_ Le solde de Sifflets (ex: "955 pts") affiché dans la TopBar est petit, peu contrasté sur fond sombre. C'est pourtant LA métrique centrale de l'app — l'équivalent du "solde de compte" dans une app bancaire ou de gaming.
  - _Action :_ Dans `src/components/layout/TopBar.tsx`, augmenter la taille du solde : passer de `text-sm` à `text-base font-black`. Augmenter le contraste de la couleur (utiliser `text-whistle` au lieu de `text-zinc-300` ou similaire). Rendre l'élément **cliquable** → ouvre une mini-modale ou redirige vers `/profile` avec l'onglet "Profil" actif. Ajouter une **animation de pulse** (`animate-ping` pendant 2s) quand le solde augmente en temps réel (écoute du Realtime `profiles` déjà branché).

- [x] **UX6-7 : Leaderboard ligue — corriger les couleurs médailles**
  - _Problème :_ La médaille bronze (#3 du classement) est affichée en orange ambre — la même teinte que l'accent principal de l'app. Confusion entre "c'est une couleur d'interface" et "c'est une médaille". L'orange est aussi utilisé pour le joueur courant (bordure surlignée), ce qui amplifie la confusion.
  - _Action :_ Dans `src/components/ligues/SquadLeaderboard.tsx`, remplacer la classe Tailwind de la pastille bronze (idx === 2) par une vraie couleur bronze : `bg-amber-700 text-amber-100 border-amber-600` → utiliser plutôt `bg-[#CD7F32] text-white border-[#A0522D] shadow-[0_0_10px_rgba(205,127,50,0.3)]`. Vérifier que les positions 4+ restent en gris neutre `bg-zinc-800 text-zinc-400` sans aucun orange.

- [x] **UX6-8 : Leaderboard ligue — label "XP total" → "Points cumulés"**
  - _Problème :_ Le chip "XP total : 2 383 Pts" dans l'en-tête du classement ligue mélange deux notions : "XP" (progression de rang individuel) et "Pts" (monnaie virtuelle). Dans le contexte ligue, on parle de points gagnés en commun, pas d'XP individuel.
  - _Action :_ Dans `src/components/ligues/SquadDetailClient.tsx`, remplacer le label "XP total :" par "Points cumulés :" (ou "Cagnotte cumulée :"). Vérifier aussi dans `src/components/ligues/SquadLeaderboard.tsx` que le label de la colonne de score en mode `period === "general"` est cohérent (déjà corrigé en "pts" mais vérifier la description texte associée).

---

### ✨ Sprint UX7 : POLISH LANCEMENT — "Les micro-détails qui font la différence"

> À traiter en parallèle du lancement ou juste après. Ces points améliorent la qualité perçue sans débloquer de nouvelle fonctionnalité.

- [x] **UX7-1 : Hero profil — version compacte sur les onglets non-PROFIL**
  - _Problème :_ Le bandeau hero du profil (avatar + pseudo + stats) occupe ~40% de la hauteur d'écran et est répété identiquement sur les onglets Historique, Badges et Amis. Il pousse le contenu utile sous la ligne de flottaison.
  - _Action :_ Dans `src/components/profile/ProfileClient.tsx`, détecter `activeTab !== "profil"`. Quand ce n'est pas l'onglet Profil, passer le `<ProfileHeader>` en mode compact (prop `compact={true}`) : n'afficher que le pseudo, le solde et le badge de grade sur une seule ligne de 60px environ, sans l'XP bar ni les stat cards. L'onglet PROFIL garde le hero pleine taille. Gérer la prop `compact?: boolean` dans `ProfileHeader.tsx` pour conditionner les éléments affichés.

- [x] **UX7-2 : Badge HISTORIQUE — pastille whistle (jaune) au lieu de gris**
  - _Problème :_ Le badge "35" sur l'onglet HISTORIQUE dans les tabs du profil est un rond gris peu visible. C'est un signal de progression important (35 paris/pronos en attente ou résolus) qui passe inaperçu.
  - _Action :_ Dans `src/components/profile/ProfileClient.tsx`, dans le rendu des tabs pills, modifier la couleur du badge de l'onglet "historique" : utiliser `bg-whistle text-pitch-900` (jaune sur vert foncé) au lieu du gris actuel. Appliquer uniquement si le badge correspond à des entrées **en attente** (pas résolus) pour signaler une action à faire.

- [x] **UX7-3 : Cards matchs futurs Stade — compte-à-rebours ou heure de coup d'envoi**
  - _Problème :_ Les cartes de matchs "à venir" dans le Stade affichent un score vide. Sur mobile, ça ressemble à une carte vide ou cassée. L'attente doit être exploitée comme opportunité d'engagement.
  - _Action :_ Dans `src/components/lobby/MatchCard.tsx`, si le match a `status === "upcoming"` et que `start_time` est dans les prochaines 24h, afficher à la place du score vide un compte-à-rebours dynamique "Dans Xh Xmin" (calculé côté client) avec une pastille verte pulsante `🟢`. Si le match est dans plus de 24h, afficher juste l'heure locale "À 20:45" avec un emoji 🕐. Utiliser `useEffect` + `setInterval` pour le compte-à-rebours.

- [x] **UX7-4 : BottomNav — indicateur LIVE urgence si match en cours**
  - _Problème :_ Quand un match est en cours en direct, rien dans la BottomNav ne l'indique. Un utilisateur revenant sur l'app ne sait pas qu'il y a quelque chose à faire maintenant.
  - _Action :_ Dans `src/components/layout/BottomNav.tsx`, si l'utilisateur a une `match_subscription` active sur un match actuellement `live` (requête légère au montage ou via Supabase Realtime), afficher une pastille rouge `animate-pulse` sur l'icône STADE du BottomNav. Alternative plus simple et sans requête : si l'URL courante n'est pas `/lobby` et que l'heure locale est dans une plage typique de match (18h-23h en semaine), afficher la pastille conditionnellement. Prioriser la solution Realtime si le coût perf est acceptable.

- [x] **UX7-5 : Bouton "Quitter" ligue — rendre discret**
  - _Problème :_ Le bouton "Quitter" sur les cartes de ligue dans `LiguesPageClient.tsx` a autant de visibilité qu'une action principale alors que c'est une action de dernière instance destructive.
  - _Action :_ Dans `src/components/ligues/LiguesPageClient.tsx`, réduire la visibilité du bouton "Quitter" : passer en `text-[10px] text-zinc-600 font-medium` (texte seul, sans fond coloré), positionné en bas à droite de la carte ligue. Ou mieux, déplacer l'action dans un menu trois points `MoreVertical` (Lucide) qui affiche un dropdown avec "Partager le code" + "Quitter la ligue" (en rouge). La confirmation `window.confirm()` déjà en place reste.

- [x] **UX7-6 : Gradient fade tabs Stade — vérifier que "La Liga" est bien coupé**
  - _Problème :_ L'agent UX rapporte que sur les captures d'écran de Stade, "LA LIGA" apparaît encore coupé sans aucun fade visible. Le sprint UX2-1 avait ajouté le gradient, mais il se peut qu'il soit mal positionné ou que le `z-index` ou `overflow` l'écrase.
  - _Action :_ Dans `src/components/lobby/MatchLobby.tsx`, vérifier visuellement que le gradient `bg-gradient-to-l from-zinc-950` est bien visible sur le dernier onglet visible. S'assurer que le conteneur parent n'a pas `overflow: hidden` qui bloquerait le gradient. Si nécessaire, augmenter la largeur du gradient fade de `w-12` à `w-16` et vérifier qu'il est `z-10` pour passer par-dessus les tabs.

---

### 🌍 Sprint P : PERSONNALISATION — "Mes ligues, mon app"

> Réduire la friction de pronostiquer en filtrant le contenu sur les compétitions que l'utilisateur suit vraiment. Préférence globale appliquée à Pronos + Stade + Push. Comportement par défaut pour un nouvel utilisateur : déduction depuis le `favorite_team_id` (club de cœur) → puis `Accept-Language` → fallback Ligue 1 + UCL. Les préférences s'appliquent partout (Pronos, Stade, Push).

- [x] **P1 : Migration `preferred_competitions` sur profiles**
  - _Action 1 :_ Créer `supabase/migrations/0078_preferred_competitions.sql` :
    - Ajouter colonne `preferred_competitions UUID[] DEFAULT ARRAY[]::UUID[]` sur `profiles`
    - Ajouter index GIN : `CREATE INDEX idx_profiles_preferred_competitions ON profiles USING GIN (preferred_competitions);`
    - Backfill : pour chaque profil existant avec `favorite_team_id` non null, déduire la ligue domestique du club via `teams.competition_id` et la mettre dans `preferred_competitions`
    - Ajouter aussi l'ID de la Champions League à tous les profils backfillés
  - _Action 2 :_ Mettre à jour `src/types/database.ts` — ajouter `preferred_competitions: string[] | null` sur `ProfileRow` (Insert + Update).
  - _Action 3 :_ Étendre la RPC `update_profile` (`supabase/migrations/0079_update_profile_preferred.sql`) pour accepter le paramètre `p_preferred_competitions UUID[]` (optionnel — ne touche pas si NULL).

- [x] **P2 : Détection automatique de la langue → ligues par défaut**
  - _Contexte :_ Pour les nouveaux utilisateurs sans `favorite_team_id`, déduire les ligues par défaut depuis la langue navigateur. Mapping : `fr` → Ligue 1 + UCL, `en` → Premier League + UCL, `es` → La Liga + UCL, `de` → Bundesliga + UCL, `it` → Serie A + UCL, autre → UCL seulement.
  - _Action 1 :_ Créer `src/lib/default-competitions.ts` exportant `getDefaultCompetitionsByLocale(locale: string): string[]`. Les UUIDs Supabase des compétitions sont référencés depuis une constante `src/lib/constants/competitions.ts` (mapping `api_football_league_id` → UUID Supabase, hardcodé et commenté).
  - _Action 2 :_ Dans le callback d'auth (`src/app/auth/callback/route.ts`), après création du profil, si `preferred_competitions` est vide : lire `headers().get('accept-language')`, appeler `getDefaultCompetitionsByLocale()`, écrire en DB via le client admin.
  - _Ordre de priorité :_ Club de cœur → Langue → Fallback Ligue 1 + UCL.

- [x] **P3 : Composant `CompetitionFilter` réutilisable**
  - _Action 1 :_ Créer `src/components/shared/CompetitionFilter.tsx` (Client Component) :
    - Props : `competitions: CompetitionRow[]`, `selectedIds: string[]`, `onChange: (ids: string[]) => void`, `showCounts?: Record<string, number>`
    - UI : rangée scrollable horizontale (`overflow-x-auto snap-x`), gradient fade à droite (pattern UX2-1)
    - Chip "TOUTES" en premier (sélectionne/désélectionne tout)
    - Chips suivantes : drapeau emoji + nom court + compteur si > 0 (ex: `🇫🇷 L1 (3)`)
    - État actif : `bg-whistle text-pitch-900` ; inactif : `bg-zinc-800/90 text-zinc-400`
  - _Action 2 :_ Créer hook `src/hooks/usePreferredCompetitions.ts` :
    - Lit `profile.preferred_competitions` au mount (passé en prop depuis la page Server Component)
    - Expose `preferences` + `setPreferences(ids)` (appelle `PUT /api/profile`, optimistic update, rollback sur erreur, toast Sonner).

- [x] **P4 : Intégration dans le Hub Pronos**
  - _Action 1 :_ Dans `src/components/pronos/PronosticsHubClient.tsx`, insérer `<CompetitionFilter />` **entre le `DateSlider` et la liste des matchs** (pas au-dessus du DateSlider — ordre : barre progression → DateSlider → filtre compétitions → accordéon matchs).
  - _Action 2 :_ Filtrer le tableau de matchs côté client : `match.competition_id IN selectedCompetitionIds` quand le filtre actif n'est pas "TOUTES".
  - _Action 3 :_ Mettre à jour la barre de progression "X/Y pronostiqués" pour refléter uniquement les matchs du filtre actif (ex: "8/12 sur tes ligues" vs "25/72 tous").
  - _Action 4 :_ Empty state si filtre actif + 0 match ce jour : "Aucun match {noms des ligues filtrées} ce jour-là — essaie une autre date ou élargis tes ligues." + bouton "Voir tous les matchs" (reset filtre).

- [x] **P5 : Intégration dans le Stade (Lobby)**
  - _Action 1 :_ Dans `src/components/lobby/MatchLobby.tsx`, réordonner les onglets de ligues : les compétitions présentes dans `preferredCompetitions` de l'utilisateur apparaissent EN PREMIER (après "DIRECT"), les autres après. Passer les préférences depuis la page Server Component (`src/app/(app)/lobby/page.tsx` qui lit `profile.preferred_competitions`).
  - _Action 2 :_ Onglet "DIRECT" : si plusieurs matchs live, afficher en priorité ceux des ligues suivies — les autres en repli sous un séparateur discret "Autres compétitions".
  - _Action 3 :_ Empty state "La VAR dort" : personnaliser → "Aucun match {Ligue 1 ou Champions League} en direct. Tes prochains matchs : {liste 2-3 prochains matchs des ligues suivies}."

- [x] **P6 : Filtrage des push notifications**
  - _Action 1 :_ Dans `src/lib/push-sender.ts`, fonction `sendPushToMatchSubscribers(matchId, payload)` : avant d'envoyer à un destinataire, vérifier que `match.competition_id` figure dans `profile.preferred_competitions`. Sinon, skip silencieux.
  - _Action 2 :_ Idem pour `POST /api/squads/nudge` (nudge pronos) : ne réveille pas un user dont la compétition du match n'est pas dans ses préférences.
  - _Note :_ La sirène VAR (`POST /api/squads/var-alert`) est une action sociale explicite d'un membre de la ligue — ne pas filtrer.

- [x] **P7 : UI de gestion des préférences**
  - _Action 1 :_ Dans la modale "Modifier mon profil" (`src/components/profile/ProfileEditModal.tsx`), ajouter une section "MES LIGUES" sous "CLUB DE CŒUR" — liste de chips toggle pour les 8 compétitions disponibles, état initial depuis `profile.preferred_competitions`.
  - _Action 2 :_ Inclure `preferred_competitions` dans l'appel `update_profile` au submit du formulaire.
  - _Action 3 (bonus) :_ Ajouter un bouton "⚙️ Mes ligues" à droite du `CompetitionFilter` dans Pronos qui ouvre directement la section "MES LIGUES" de la modale profil (deep-link).

- [x] **P8 : Onboarding préférences pour nouveaux utilisateurs**
  - _Action :_ Dans `src/components/onboarding/OnboardingTour.tsx`, insérer une étape "Choisis tes ligues" (déclenchée si `preferred_competitions` est vide ET l'utilisateur a moins de 24h d'ancienneté) : grille de 8 cards compétition avec drapeau + nom, pré-cochées selon la langue détectée (P2). Bouton "C'est parti !" → écrit en DB puis ferme l'onboarding.

---

### 🎯 Sprint Q : QUORUM DYNAMIQUE — "Réveiller le mode communautaire"

> **Contexte stratégique :** Le seuil fixe `MIN_SIGNALS_TO_TRIGGER` actuel ne fonctionne que sur les gros matchs. Sur 95% des matchs (audience faible), aucun market ne s'ouvre → l'utilisateur se connecte, voit "La VAR dort", part. Cette dette tue silencieusement la rétention. L'API-Football remontant les events avec ~1min de délai, on ne peut PAS l'utiliser comme déclencheur principal — le mode communautaire reste donc le SEUL moyen d'ouvrir des markets en temps utile. Solution : adapter le seuil à l'audience réelle du match.

- [x] **Q1 : Compteur d'audience temps réel par match**
  - ✅ Migration `0079_match_presence.sql` : table `match_presence`, RPC `count_active_users_on_match`, RPC `cleanup_match_presence`, RLS, index.
  - ✅ Types `MatchPresenceRow` + fonctions RPC ajoutés à `database.ts`.
  - ✅ `LiveRoom.tsx` : hook inline upsert présence toutes les 60s + polling audience toutes les 30s.
  - ⚠️ Action humaine : appliquer `0079_match_presence.sql` dans Supabase SQL Editor.

- [x] **Q2 : Constante de seuil dynamique**
  - ✅ `getRequiredSignals(n)` ajouté dans `src/lib/constants/alert.ts`.
  - ✅ `/api/alert/route.ts` appelle `count_active_users_on_match` puis `getRequiredSignals`. Log : `audience / seuil / signals`. Réponse enrichie avec `current_signals`, `required_signals`, `market_opened`.

- [x] **Q3 : Affichage de l'audience dans la LiveRoom**
  - ✅ Badge "👁️ {count}" dans le header (jaune whistle si ≥ 5, gris si < 5). Tooltip "Sois le premier à alerter ⚡".
  - ✅ Toast signal enrichi : "Signal envoyé — X/Y pour ouvrir le pari ⚡" (ou "Le marché VAR vient d'ouvrir ! 🔥" si déclenché).

- [x] **Q4 : Mise à jour de la page Règles**
  - ✅ `rules/page.tsx` : description du seuil dynamique ajoutée dans "Le système Waze".

---

### 💰 Sprint Eco-1 : SAISONS MENSUELLES — "Reset, fresh start, hype mensuel"

> **Contexte stratégique :** Sans saisons, l'économie des Sifflets s'inflate sans contrôle (les vieux comptes deviennent intouchables, les nouveaux n'ont aucune chance). Le reset mensuel crée un événement de ré-engagement régulier ("Saison VAR de Mai", "Champion d'avril archivé"), donne une chance à tous, et permet de communiquer chaque 1er du mois (newsletter, push, social). C'est la base de toute économie virtuelle saine (cf. MPG, Fortnite, Sorare).

- [x] **Eco1-1 : Modèle de saison en base**
  - _Action 1 :_ Créer `supabase/migrations/0079_seasons.sql`. Ajouter une table `seasons` (`id UUID PK`, `slug TEXT UNIQUE` ex: `2026-05`, `label TEXT` ex: `Saison de Mai 2026`, `starts_at TIMESTAMPTZ`, `ends_at TIMESTAMPTZ`, `is_current BOOLEAN`, `created_at`).
  - _Action 2 :_ Ajouter sur `profiles` les colonnes `season_points INT DEFAULT 0` (points de la saison courante, reset chaque mois) et `current_season_id UUID REFERENCES seasons(id)`.
  - _Action 3 :_ Ajouter une table `season_archives` (`user_id UUID`, `season_id UUID`, `final_rank INT`, `final_points INT`, `final_rank_label TEXT` ex: "Champion", "Top 10", `archived_at TIMESTAMPTZ`, PK (`user_id`, `season_id`)). Cette table conserve l'historique pour toujours.
  - _Action 4 :_ Insérer la saison courante en seed : `('2026-05', 'Saison de Mai 2026', '2026-05-01 00:00 Europe/Paris', '2026-05-31 23:59 Europe/Paris', true)`.

- [x] **Eco1-2 : RPC de bascule de saison**
  - _Action 1 :_ Créer la RPC `transition_season()` (SECURITY DEFINER, `service_role` only) qui :
    1. Identifie la saison courante (`is_current = true`)
    2. Snapshot tous les profils dans `season_archives` (rank par `season_points`, label "Champion" pour le 1er, "Top 3" pour 2-3, "Top 10" pour 4-10, "Participant" sinon)
    3. **Reporte 10% des `season_points` arrondis vers le bas** dans le nouveau `season_points` (l'utilisateur ne perd pas tout, juste 90%)
    4. Marque l'ancienne saison `is_current = false`, crée la nouvelle saison du mois suivant avec `is_current = true`
    5. Update tous les profils avec le nouveau `current_season_id`
  - _Action 2 :_ Adapter la logique de gain de points existante (RPCs `resolve_event_parimutuel`, `resolve_match_pronos`, `claim_daily_streak`) pour incrémenter À LA FOIS `lifetime_points_earned` (immuable) ET `season_points` (saisonnier). `sifflets_balance` reste indépendant — c'est le solde dépensable, pas le ranking.
  - _Important :_ `lifetime_points_earned` ne se reset JAMAIS (leaderboard global = "Hall of Fame"). Le ranking saisonnier utilise `season_points`.

- [x] **Eco1-3 : Cron mensuel**
  - _Action 1 :_ Créer `src/app/api/cron/transition-season/route.ts` qui appelle la RPC `transition_season()`. Protéger avec `CRON_SECRET`.
  - _Action 2 :_ Ajouter dans `vercel.json` (ou la config cron Vercel équivalente) un job `cron: "0 0 1 * *"` (1er du mois à 00:00 UTC) pointant vers cette route. Note : Vercel fait du UTC — comme ton "jour Paris" est UTC-4h (cf. `paris-day.ts`), la bascule sera donc à 02:00 Paris le 1er. Acceptable.
  - _Action 3 :_ Logger l'exécution dans une table `cron_logs` (si elle n'existe pas, la créer) pour audit.

- [x] **Eco1-4 : UI de la saison courante**
  - _Action 1 :_ Créer un composant `SeasonBadge.tsx` qui affiche en haut du Profil et du Leaderboard : "🏆 Saison de Mai 2026 — J-X jours". Calcule les jours restants côté client.
  - _Action 2 :_ Adapter `LeaderboardClient.tsx` (Stade > Classement global) : le leaderboard "actuel" trie par `season_points`, un onglet "Hall of Fame" trie par `lifetime_points_earned` (le classement perpétuel).
  - _Action 3 :_ Adapter `SquadLeaderboard.tsx` : le filtre "Général" devient "Saison courante" (tri par `season_points`), conserver "Mois" et "Semaine" comme avant.
  - _Action 4 :_ Sur la page Profil, ajouter une section "🏅 Mes saisons" affichant les `season_archives` de l'utilisateur (3 dernières par défaut, "Voir tout" pour la suite). Un trophée d'or si `final_rank == 1`, argent si Top 3, bronze si Top 10.

- [x] **Eco1-5 : Communication de la bascule**
  - _Action 1 :_ Le 1er du mois, déclencher un push notification à tous les utilisateurs ayant `season_points > 0` sur la saison écoulée : "🏆 La Saison de Mai est terminée ! Tu finis {final_rank_label} avec {final_points} pts. La Saison de Juin commence MAINTENANT."
  - _Action 2 :_ Sur le **3 derniers jours** de chaque saison, afficher une bannière permanente sur la home : "⏰ La saison se termine dans X jours — donne tout pour ton classement final !"
  - _Action 3 :_ **Mise à jour de la page Règles** (`src/app/(app)/rules/page.tsx`) : ajouter une section "🗓️ Saisons" expliquant : "Tous les 1ers du mois, le classement saisonnier est figé et archivé. Les Sifflets gagnés sont reportés à 10% pour donner à tous une chance de briller chaque mois. Ton total de points cumulés, lui, n'est jamais effacé — il alimente ton 'Hall of Fame' personnel."
  - _Action 4 :_ **Mise à jour de la landing** (`src/app/page.tsx`) : ajouter dans la section "Progression des rangs" (déjà en position 2 depuis UX1-4) un bloc "🗓️ Saisons mensuelles — Chaque mois, un nouveau champion couronné. Tu démarres avec une vraie chance, peu importe quand tu rejoins."

---

### 🛒 Sprint Eco-2 : BOUTIQUE COSMÉTIQUE — "Le premier puits"

> **Contexte stratégique :** Sans puits réel, les Sifflets s'accumulent et perdent leur valeur perçue. Une boutique de cosmétiques crée la première rareté désirable, brûle des Sifflets en circulation, et fait jouer le **collection effect** (moteur de rétention prouvé). Aucun achat avec de l'argent réel — uniquement des Sifflets. Cosmétique pur, pay-to-win impossible.

- [x] **Eco2-1 : Modèle de boutique en base**
  - _Action 1 :_ Créer `supabase/migrations/0080_shop.sql`. Tables :
    - `shop_items` (`id UUID PK`, `slug TEXT UNIQUE`, `category TEXT CHECK IN ('avatar','border','effect')`, `name TEXT`, `description TEXT`, `price_pts INT`, `unlock_rank TEXT NULLABLE` (ex: 'arbitre_elite' — alternative gratuite), `asset_url TEXT`, `is_active BOOLEAN`)
    - `user_shop_inventory` (`user_id UUID`, `shop_item_id UUID`, `purchased_at`, `is_equipped BOOLEAN`, PK (`user_id`, `shop_item_id`))
  - _Action 2 :_ Ajouter sur `profiles` : `equipped_avatar_id UUID NULLABLE`, `equipped_border_id UUID NULLABLE`, `equipped_effect_id UUID NULLABLE` (FKs vers `shop_items`).
  - _Action 3 :_ Seed initial : 8 avatars (4 standards déblocables par rang, 4 premium achetables 1500-3000 pts), 4 bordures animées (3000-5000 pts), 3 effets de pari (500 pts/usage — voir Eco-3 pour la consommation).

- [x] **Eco2-2 : RPC d'achat**
  - _Action 1 :_ RPC `purchase_shop_item(p_item_id UUID)` SECURITY DEFINER :
    1. Vérifie que l'item est actif et que l'utilisateur n'est pas déjà propriétaire
    2. Vérifie que `sifflets_balance >= price_pts`
    3. Débite atomiquement `sifflets_balance` et insère la ligne dans `user_shop_inventory`
    4. Retourne `{ ok: true, new_balance, item: {...} }` ou erreur structurée
  - _Action 2 :_ RPC `equip_shop_item(p_item_id UUID)` qui met à jour la colonne `equipped_*_id` correspondante sur `profiles` (un seul item équipé par catégorie à la fois). Vérifie la propriété.
  - _Action 3 :_ Routes API associées : `POST /api/shop/purchase`, `POST /api/shop/equip` — wrap des RPCs avec response `{ ok, data | error }`.

- [x] **Eco2-3 : UI Boutique**
  - _Action 1 :_ Nouveau path `src/app/(app)/shop/page.tsx` accessible depuis le menu burger ("🛒 Boutique"). Pas dans la BottomNav (priorités).
  - _Action 2 :_ 3 onglets : Avatars / Bordures / Effets. Chaque item = card avec preview visuelle, prix en pts, bouton "Acheter" (ou "Équipé ✓" si possédé et équipé, ou "Équiper" si possédé non équipé).
  - _Action 3 :_ Sur les avatars **déblocables par rang ET achetables**, double affichage : "🔓 Débloqué automatiquement à Arbitre Élite — OU 1500 pts". L'utilisateur choisit sa porte.
  - _Action 4 :_ Animation "🎉 +Avatar débloqué" + toast confettis lors d'un achat.
  - _Action 5 :_ Section "Aperçu" en haut de la boutique qui montre le profil de l'utilisateur en live avec l'item survolé/sélectionné — feedback visuel immédiat.

- [x] **Eco2-4 : Application des cosmétiques équipés**
  - _Action 1 :_ Dans `ProfileHeader.tsx`, lire `equipped_avatar_id`, `equipped_border_id`, charger les assets correspondants. Fallback sur l'avatar emoji par défaut si rien d'équipé.
  - _Action 2 :_ Dans le leaderboard et les chats de ligue, afficher les bordures animées des autres utilisateurs (status flex visible socialement).
  - _Action 3 :_ Pour les effets de pari (consommables) : voir Sprint Eco-3 (utilisation lors d'un pari).

- [x] **Eco2-5 : Pages Règles + Landing**
  - _Action 1 :_ **Mise à jour Règles** : ajouter une section "🛒 Boutique" : "Dépense tes Sifflets pour personnaliser ton arbitre — avatars premium, bordures animées, effets de pari visibles par tous. Aucun achat avec de l'argent réel, jamais. Les Sifflets se gagnent uniquement en jouant."
  - _Action 2 :_ **Mise à jour Landing** : ajouter dans la section progression / hero un visuel d'avatars premium ("Affiche ton style — collectionne avatars, bordures et effets exclusifs en jouant"). Conserver la mention "monnaie virtuelle, aucun argent réel" pour Apple.

---

### ⚡ Sprint Eco-3 : BOOSTERS CONSOMMABLES — "Power-ups stratégiques"

> **Contexte stratégique :** Deuxième puits, mais aussi mécanique de jeu. Les boosters introduisent du choix tactique (« est-ce que je dépense mon double-XP sur ce match risqué ? »), brûlent des Sifflets, et créent du **moment de gloire shareable** quand un booster fait basculer un gain. Strict garde-fou : 1 booster max par pari, jamais d'achat en argent réel, jamais de booster qui modifie le résultat (uniquement la récompense).

- [x] **Eco3-1 : Modèle de boosters**
  - _Action 1 :_ Créer `supabase/migrations/0081_boosters.sql`. Tables :
    - `boosters_catalog` (`id UUID PK`, `slug TEXT UNIQUE`, `name TEXT`, `description TEXT`, `price_pts INT`, `effect_type TEXT CHECK IN ('double_xp','cote_plus','safety_net','vision')`, `effect_value JSONB`, `is_active BOOLEAN`)
    - `user_boosters_inventory` (`id UUID PK`, `user_id UUID`, `booster_id UUID`, `acquired_at`, `consumed_at NULLABLE`, `consumed_on_event_id UUID NULLABLE`, `consumed_on_prono_id UUID NULLABLE`)
  - _Action 2 :_ Ajouter sur `bets` et `pronos` : colonne `applied_booster_id UUID NULLABLE` pour traçabilité.
  - _Action 3 :_ Seed initial :
    - **Double XP** (300 pts) : prochain pari/prono gagnant → +100% sur les points
    - **Cote+** (200 pts) : ta récompense potentielle est +20% (visible avant le pari)
    - **Filet** (500 pts) : si tu perds, tu récupères 50% de la mise
    - **Vision** (100 pts/match) : voir les pronos détaillés des amis sur ce match (sinon masqués cf. anti-triche)

- [x] **Eco3-2 : RPC d'achat et de consommation**
  - _Action 1 :_ RPC `purchase_booster(p_booster_id UUID, p_quantity INT DEFAULT 1)` : débit atomique + insert dans `user_boosters_inventory` (quantity rows).
  - _Action 2 :_ Étendre `place_bet` et `place_match_prono` pour accepter un paramètre optionnel `p_booster_id UUID`. Si fourni :
    1. Vérifie que l'utilisateur possède ce booster non consommé
    2. Marque le booster comme `consumed_at = now()` dans la même transaction
    3. Stocke `applied_booster_id` sur le pari/prono
  - _Action 3 :_ Étendre `resolve_event_parimutuel` et `resolve_match_pronos` pour appliquer l'effet du booster lors du calcul du gain :
    - `double_xp` : `points_earned * 2`
    - `cote_plus` : multiplicateur 1.2 sur le reward
    - `safety_net` : si perdu, créditer 50% de la mise
    - `vision` : pas de calcul, c'est un effet UI uniquement
  - _Important :_ 1 seul booster par pari/prono. Garde-fou en base (CHECK ou trigger).

- [x] **Eco3-3 : UI de sélection du booster**
  - _Action 1 :_ Dans `VotingModal.tsx` (paris VAR), ajouter sous le slider de mise une section "⚡ Utiliser un booster ?" avec une rangée horizontale de chips représentant les boosters possédés. Tap = sélection (un seul à la fois). État neutre = aucun booster.
  - _Action 2 :_ Idem dans le composant de saisie de prono (`MatchPronoSheet` ou équivalent). Le booster s'applique au prono entier (1N2 + score exact).
  - _Action 3 :_ Si l'inventaire est vide → CTA "Acheter des boosters" qui deep-link vers la boutique avec scroll sur l'onglet Boosters.
  - _Action 4 :_ Affichage clair de l'effet anticipé : "Avec Double XP : tu gagnes potentiellement {x2} pts sur ce pari".

- [x] **Eco3-4 : Feedback de victoire boostée**
  - _Action 1 :_ Lors de la résolution, si `applied_booster_id` était posé et que le pari/prono est gagné, déclencher un toast Sonner spécial : "💥 Booster {nom} activé — tu gagnes {x_amount} pts au lieu de {base_amount} !" avec une animation plus marquée (gradient pulse).
  - _Action 2 :_ Stocker dans une table `booster_highlights` les 10 plus gros gains boostés du mois → exploités plus tard (sprint social) pour générer des stories de ligue type "💥 Cafoutch a explosé son booster Double XP : +1200 pts sur PSG-OM".

- [x] **Eco3-5 : Pages Règles + Landing**
  - _Action 1 :_ **Mise à jour Règles** : nouvelle section "⚡ Boosters" listant les 4 boosters avec coût et effet en clair. Insister sur : "1 seul booster par pari maximum. Les boosters ne modifient PAS le résultat, seulement ta récompense. Aucun pay-to-win."
  - _Action 2 :_ **Mise à jour Landing** : NE PAS mettre les boosters en avant sur la landing publique (risque de mauvaise perception "ils essaient de me faire payer"). Plutôt mentionner discrètement dans la section "Comment ça marche" : "Personnalise ta stratégie avec des boosters tactiques débloqués en jouant".

---

### 🎚️ Sprint Eco-4 : MISES MINIMUM SCALANTES — "Les riches doivent risquer"

> **Contexte stratégique :** Sans mise minimum scalante, un utilisateur avec 50 000 Sifflets peut miser 5 pts par pari pour pas en perdre. Conséquence : les Sifflets s'accumulent, les paris perdent du sens, l'app devient ennuyeuse. La mise min scalante force les "riches" à brûler proportionnellement, sans punir les nouveaux. C'est aussi un signal de status (« mise min affichée = ton rang d'ancienneté »).

- [x] **Eco4-1 : Logique de mise min**
  - _Action 1 :_ Créer `src/lib/economy/min-bet.ts` exportant :
    ```ts
    export function getMinBetForBalance(balance: number): number {
      if (balance < 5_000) return 5;
      if (balance < 20_000) return 50;
      if (balance < 50_000) return 200;
      if (balance < 100_000) return 500;
      return 1_000;
    }
    ```
  - _Action 2 :_ Garde-fou serveur : étendre `place_bet` (RPC) pour rejeter avec une erreur explicite `MIN_BET_NOT_REACHED` si `p_amount < getMinBetForBalance(profile.sifflets_balance)`. Tester unitairement avec Vitest dans `src/lib/__tests__/min-bet.test.ts`.

- [x] **Eco4-2 : UI dans la VotingModal**
  - _Action 1 :_ Dans `VotingModal.tsx`, lire le solde courant et calculer la mise min via `getMinBetForBalance`. Afficher en sous-texte de la mise : "Mise minimum sur ton solde : {X} pts" (chalk subtil).
  - _Action 2 :_ Le slider de mise commence à `getMinBetForBalance` (pas à 0). Les preset chips (rapides) doivent tous être ≥ ce min.
  - _Action 3 :_ Si l'utilisateur tente de soumettre en dessous (cas edge, ne devrait pas arriver), toast d'erreur clair : "Sur ton solde, mise minimum : {X} pts."

- [x] **Eco4-3 : Communication transparente**
  - _Action 1 :_ Sur la page Profil, dans la section Vestiaire, afficher discrètement "🎚️ Ta mise minimum : {X} pts" comme un trait de status (pas une punition).
  - _Action 2 :_ Quand un utilisateur passe un palier (ex: solde de 4 800 → 5 100), déclencher un push notif gentil : "🎚️ Tu viens de passer un palier ! Ta mise minimum monte à 50 pts. Plus de risque, plus de gloire."

- [x] **Eco4-4 : Pages Règles + Landing**
  - _Action 1 :_ **Mise à jour Règles** : nouvelle sous-section dans "Économie des Sifflets" : "🎚️ Mises minimum — Plus tu accumules, plus tes mises minimums montent. C'est un trait de status : les meilleurs prennent les plus gros risques. Liste des paliers : [tableau]."
  - _Action 2 :_ Ne **PAS** mettre sur la landing (sujet trop technique pour un nouveau visiteur, et négatif présenté hors contexte).

---

## 🚨 PHASE 1 — AVANT CDM (Priorité absolue, avant le 11 juin 2026)

> **Ordre d'exécution recommandé :** AUDIT-NOTIF → BUG-8 (cf. `BUGS_POST_MIGRATION.md`) → Sprint Q (cf. plus bas) → FRICTION-FK2 → Sprint Eco-1 → FRICTION-FK1 → INSP-4 → LAND → MPP-1 → Push-1 → V
>
> ⚠️ Sprint FRICTION-FK4 (Pot d'amorçage) a été **supprimé volontairement** le 9 mai 2026 — voir l'en-tête du fichier.

---

### 🔴 Sprint AUDIT-NOTIF : DIAGNOSTIC PUSH — "Ça marche ou pas ?"

> **Pré-requis absolu avant tout autre sprint friction.** Le système push est peut-être cassé post-migration domaine. Sans push qui marchent, RIEN ne marche. Voir `FRICTION_REDUCTION_v2.md` (BUG-0) pour le détail complet.

- [x] **AUDIT-NOTIF-1 : Vérifier les VAPID keys en prod**
  - ✅ Fallback `VAPID_SUBJECT` corrigé dans `src/lib/push-sender.ts` (`lesifflet.app` → `vartime.app`).
  - ⚠️ Action humaine : vérifier que les keys prod dans Vercel n'ont pas changé depuis la migration.

- [x] **AUDIT-NOTIF-2 : Auditer la table `push_subscriptions`**
  - ✅ Route `POST /api/admin/test-push` créée (auth Bearer CRON_SECRET).
  - ⚠️ Action humaine : `SELECT COUNT(*) FROM push_subscriptions WHERE endpoint LIKE '%le-sifflet%';` → si > 0, appeler `/api/admin/invalidate-push-subscriptions`.

- [x] **AUDIT-NOTIF-3 : Vérifier le Service Worker**
  - ✅ `public/sw.js` : pas d'URL `le-sifflet` hardcodée. Cache bumped `vartime-offline-v1 → v2`, `console.info('[SW] vartime.app — v2')` ajouté.

- [x] **AUDIT-NOTIF-4 : Reset et re-onboarding si nécessaire**
  - ✅ Route `POST /api/admin/invalidate-push-subscriptions` créée (supprime toutes les rows, auth Bearer).
  - ✅ `push-sender.ts` supprime déjà automatiquement les subscriptions qui retournent 410.
  - ⚠️ Action humaine : tester `curl -X POST https://vartime.app/api/admin/test-push -H "Authorization: Bearer <CRON_SECRET>" -H "Content-Type: application/json" -d '{"userId":"<ton-user-id>"}'`

---

### ⚡ Sprint FRICTION-FK2 : WEB PUSH AVEC ACTIONS OUI/NON — "Parier sans ouvrir l'app"

> **LE sprint le plus impactant du produit.** Latence pari : 2 secondes. L'utilisateur reçoit la notif VAR, tape OUI ou NON dans la notif, le pari est posé — sans jamais ouvrir l'app. Voir `FRICTION_REDUCTION_v2.md` (FRICTION-2) pour le payload JSON complet et le code Service Worker exact.

- [x] **FK2-1 : Payload push VAR avec action buttons**
  - ✅ `PushPayload` étendu dans `push-sender.ts` : `actions`, `tag`, `requireInteraction`, `vibrate`, `extra_data`.
  - ✅ `alert/route.ts` : capture `newEvent.id`, passe `actions: [{bet_yes, bet_no}]`, `tag: "var-{id}"`, `requireInteraction: true`, `vibrate`, `extra_data: { marketEventId, matchId, type: "var_alert" }`.

- [x] **FK2-2 : Listener `notificationclick` dans le Service Worker**
  - ✅ `public/sw.js` : `notificationclick` handler — si `action = bet_yes/bet_no`, POSTe `/api/var-bets/quick-bet` avec `credentials: 'include'`, affiche notif de confirmation.
  - ✅ Tap direct (iOS / desktop sans bouton) → `openWindow(url)`.
  - ✅ SW bumped v3, cache `vartime-offline-v3`.

- [x] **FK2-3 : Endpoint `POST /api/var-bets/quick-bet`**
  - ✅ `src/app/api/var-bets/quick-bet/route.ts` créé.
  - ✅ Auth cookie, vérif marché ouvert, `default_var_bet_amount`, cotes parimutuel live, `place_bet` RPC.
  - ✅ Retourne `{ bet_id, amount, vote, message }` + fire-and-forget confirmation push.

- [x] **FK2-4 : Colonne `default_var_bet_amount` + UI Settings**
  - ✅ `supabase/migrations/0080_quick_bet.sql` créé.
  - ✅ `src/types/database.ts` : `default_var_bet_amount` dans `ProfileRow`/`Insert`/`Update`.
  - ✅ `src/app/(app)/settings/page.tsx` + `SettingsClient.tsx` : slider 10–500 pts, presets, sauvegarde Supabase.
  - ⚠️ Action humaine : appliquer `0080_quick_bet.sql` dans Supabase SQL Editor.

- [x] **FK2-5 : Gestion iOS (pas d'actions) + test E2E**
  - ✅ iOS gère nativement : les `actions` sont ignorées par le navigateur iOS, le tap direct déclenche `event.action === ""` → `openWindow(url)` vers la LiveRoom. Aucune détection UA nécessaire.
  - ⚠️ Test manuel requis : Android → tap "OUI" dans la notif → vérifier pari en BDD. iOS → tap notif → LiveRoom ouvre `/match/{id}`.

---

### 🔔 Sprint FRICTION-FK1 : PUSH PRÉ-MATCH — "Réveille l'utilisateur au bon moment"

> **Pré-requis :** Sprint AUDIT-NOTIF validé. Voir `FRICTION_REDUCTION_v2.md` (FRICTION-1).

- [x] **FK1-1 : Cron pré-match 5–7 min avant coup d'envoi**
  - _Action 1 :_ Créer (ou étendre) un cron Vercel `match-imminent` qui tourne toutes les 2 minutes.
  - _Action 2 :_ Pour chaque match avec `start_time` entre `now + 5min` et `now + 8min` :
    - Récupérer les users dont `preferred_competitions` contient la `competition_id` du match.
    - Envoyer push : "🔴 {HomeTeam} vs {AwayTeam} dans 5 min ! Mode Stade activé."
    - Deep link : `/match/{matchId}` (ouvre directement la LiveRoom).
  - _Action 3 :_ Cooldown : 1 seul push FK1 par user par match (table `push_logs` ou colonne).
  - _Action 4 :_ Garde-fou : ne pas envoyer entre 23h et 8h (sauf matchs Amérique/Asie).

- [x] **FK1-2 : Toggle utilisateur `notif_pre_match_5min`**
  - _Action 1 :_ Migration : `ALTER TABLE profiles ADD COLUMN notif_pre_match_5min BOOLEAN DEFAULT TRUE;`.
  - _Action 2 :_ Ajouter le toggle dans la page Notifications (Settings).

- [x] **FK1-3 : Budget journalier anti-spam**
  - _Action :_ Créer `canSendPushToUser(userId, type)` qui vérifie le nombre de push déjà envoyés aujourd'hui. Budget : max 3 push critiques + 1 digest = 4/jour. Priorité : VAR alert > pre_match > resolution > digest > nudge.

---

### 🎬 Sprint INSP-4 : POLISH VOTINGMODAL — "Twitch-level UX sur notre mécanique core"

> **La mécanique core doit être parfaite avant la CDM.** Voir `INSPIRATIONS_BACKLOG.md` (INSP-4) pour l'étude Twitch Predictions détaillée.

- [x] **INSP4-1 : Cotes dynamiques en temps réel dans VotingModal**
  - _Action 1 :_ Afficher en live via Realtime (subscription `market_events` UPDATE ou `bets` INSERT) : "OUI : 1.8x · 67% misé" / "NON : 3.2x · 33% misé". Mettre à jour à chaque nouveau pari.
  - _Action 2 :_ Afficher "👁️ {n} dans le stade votent en ce moment" (depuis `match_presence`, Sprint Q).

- [x] **INSP4-2 : Timer en hero + urgence sur les 10 dernières secondes**
  - _Action 1 :_ Le timer (90s) doit être affiché en grand format bold "0:47" au centre de la modale, pas en discret.
  - _Action 2 :_ Sous les 10 dernières secondes : couleur du timer passe au rouge + haptic feedback léger (`navigator.vibrate([100])`) toutes les 3 secondes.

- [x] **INSP4-3 : Animation de résolution dramatique (style Twitch)**
  - _Action 1 :_ Post-résolution, avant l'affichage du résultat final, afficher pendant 2 secondes : "⏳ Le verdict tombe..." avec animation sablier ou spinner.
  - _Action 2 :_ Puis affichage full-screen : "PENALTY ! Tu avais raison ! +500 pts 🔥" avec confettis/flame si gain > 200 pts.

- [x] **INSP4-4 : Mini-leaderboard post-match "Top Predictors"**
  - _Action 1 :_ Après résolution d'un market, afficher les Top 5 utilisateurs qui ont le plus gagné sur ce market (avec leur pseudo + gains).
  - _Action 2 :_ Push aux Top 3 : "🏆 Tu es 2e des prédicteurs de PSG-OM ! +800 pts."

---

### 🎨 Sprint LAND : LANDING V2 — "Vitrine prête pour la CDM 2026"

> **Nouveau pitch post-friction :** "L'app qui te tape sur l'épaule pendant le match." Voir `SPRINTS_LANDING_VIRALITE_PUSH.md` (Sprint L) pour le détail complet.

- [x] **LAND-1 : Section hero refonte — "L'app qui vient à toi"**
  - _Action 1 :_ Changer le sous-titre de la landing (`src/app/page.tsx`) : remplacer l'existant par "Tu regardes le match. VAR TIME te prévient. 1 tap pour parier sur la VAR avant l'arbitre."
  - _Action 2 :_ Ajouter une section "🏟️ Mode Stade" en hero secondaire : visuel smartphone avec notif VAR active pendant que la TV diffuse un match. Texte : "Pas besoin d'ouvrir l'app."

- [x] **LAND-2 : Section anti-rejet "Application mobile"**
  - _Action 1 :_ Ajouter un bloc rassurant : "Pas d'App Store. Ajoute VAR TIME à ton écran d'accueil en 3 secondes depuis Safari ou Chrome." Avec un GIF/animation courte du processus.
  - _Action 2 :_ Badge "PWA — 100% gratuit, aucun compte requis pour découvrir."

- [x] **LAND-3 : Section "⚽ LA CDM 2026 COMMENCE BIENTÔT"**
  - _Action :_ Ajouter une section avec compte-à-rebours jusqu'au 11 juin 2026 (premier match CDM). CTA : "Inscris-toi maintenant pour ne pas rater le premier match."

- [x] **LAND-4 : FAQ (les vraies questions)**
  - _Action :_ Section "❓ Tout ce que tu te demandes" avec 6 Q&A : C'est quoi la VAR TIME ? / C'est gratuit ? / Ça marche sur iPhone ? / Je peux perdre de l'argent ? / C'est légal ? / Comment inviter mes potes ?

- [x] **LAND-5 : Landing alternative `/discover` (version store-friendly)**
  - _Action :_ Créer `src/app/discover/page.tsx` — version sans le mot "pari" (remplacé par "pronostic" et "sifflet"), pensée pour le dossier de presse et les stores éventuels. Même contenu mais lexique nettoyé. Noindex.

- [x] **LAND-6 : Audit terminologie (légal)**
  - _Action :_ `grep -rn "pari\|parier\|miser\|mise" src/app/page.tsx` → remplacer par "pronostic"/"sifflet" sur la landing publique (garder "pari" uniquement dans l'app authentifiée).

---

### 🦠 Sprint V : VIRALITÉ — "Le moteur de croissance organique"

> Voir `SPRINTS_LANDING_VIRALITE_PUSH.md` (Sprint V) et `INSPIRATIONS_BACKLOG.md` (INSP-3) pour le détail complet.

- [x] **V1 : Deep links d'invitation ligue**
  - _Action 1 :_ Modifier l'`invite_code` d'une squad pour qu'il soit utilisable via URL : `vartime.app/join/{invite_code}`.
  - _Action 2 :_ Créer `src/app/join/[code]/page.tsx` : si non connecté → afficher la landing de la ligue + CTA login. Si connecté → rejoindre la ligue automatiquement + redirect `SquadDetail`.
  - _Action 3 :_ Le bouton "Partager l'invitation" dans `SquadDetailClient.tsx` doit utiliser `navigator.share({ url: 'https://vartime.app/join/{code}', text: 'Rejoins ma ligue VAR TIME !' })`.

- [x] **V2 : VictoryShareCard — Partage automatique de victoire**
  - _Action 1 :_ Créer une route `GET /api/og/victory?userId={id}&marketId={id}` qui génère une image Open Graph dynamique (via `@vercel/og`) avec : gains en gros, pseudo, match, branding VAR TIME + QR code vers `vartime.app`.
  - _Action 2 :_ 4 templates visuels selon le type : pari VAR gagné (pitch + flame), score exact rare (or + éclair), promotion de division (trophée), champion mensuel (sablier animé).
  - _Action 3 :_ Modale post-victoire (si gain > 200 pts) : preview de la card + boutons "Partager WhatsApp / Story Instagram / X / Pas maintenant".
  - _Action 4 :_ Chaque card embed un QR code unique `vartime.app/join-via/{userCode}` pour tracker la viralité par utilisateur (combien d'inscrits via mes partages).

- [x] **V3 : Pronos des amis visibles sur les matchs**
  - _Action 1 :_ Sur la page match (LiveRoom ou PronoCard), afficher les pronos des amis (`friend_requests` status=accepted) : "3 de tes amis ont mis PSG gagnant."
  - _Action 2 :_ RPC `get_friend_pronos(matchId, userId)` pour récupérer les pronos des amis.

- [x] **V4 : Push "dépassement" (revenge addiction)**
  - _Action :_ Quand un ami dépasse l'utilisateur au classement ligue, push : "🔥 {Pseudo} vient de te dépasser dans {Nom Ligue} ! Réponds sur le prochain match."

---

### 🔔 Sprint Push-1 : NOTIFICATIONS POST-RÉSOLUTION — "Le frein rétention #1"

> Voir `SPRINTS_LANDING_VIRALITE_PUSH.md` (Sprint Push-1) pour le détail.

- [x] **Push1-1 : Push après résolution VAR**
  - _Action :_ Déjà partiellement fait (Sprint A1). Vérifier que le push contient le gain/perte explicite : "⚡ VAR Résolue : PENALTY ! +350 pts gagnés 🔥" ou "❌ VAR Résolue : NON Penalty. -100 pts." Deep link : `/match/{matchId}`.

- [x] **Push1-2 : Push après fin de match (résultats pronos)**
  - _Action :_ Déjà partiellement fait (Sprint A2). Vérifier que le payload inclut le score final et les points pronos gagnés. Exemple : "⏱ PSG 2–1 OM — Tu as gagné +120 pts sur tes pronos ! Voir le détail →".

- [x] **Push1-3 : Push digest quotidien**
  - _Action 1 :_ Cron à 09h00 Paris. Pour chaque user ayant eu ≥ 1 pari ou prono résolu la veille, envoyer : "🏆 C'est l'heure du bilan ! Tu as gagné +XXX pts hier. Découvre ton classement →".
  - _Action 2 :_ Respecter le toggle `notif_daily_digest` (à ajouter en colonne `profiles`).

- [x] **Push1-4 : Push J-2h avant un match de ligue suivie**
  - _Action 1 :_ Cron toutes les 30min. Pour chaque match live dans 2h, push aux users ayant cette competition dans `preferred_competitions` (si `notif_pre_match_2h = true`).
  - _Action 2 :_ Message : "⚽ PSG-OM dans 2h ! Fais ton prono maintenant avant le coup d'envoi."

- [x] **Push1-5 : Page de gestion des notifications**
  - _Action 1 :_ Créer `src/app/(app)/settings/notifications/page.tsx` avec toggles pour chaque type : Alertes VAR (toujours ON), Résultats pronos, Résultats VAR, Digest quotidien, Rappel pré-match 2h, Rappel pré-match 5min, Dépassement classement.
  - _Action 2 :_ Stocker en colonnes `notif_*` sur `profiles` et mettre à jour via PATCH `/api/profile`.

---

## ⭐ PHASE 2 — POST-CDM (engagement long-terme)

---

### 🏅 Sprint MPP-1 : BADGES NARRATIFS — "Réécrire l'âme des badges"

> **Effort :** 2-3h de copy (humain) + 1h code. Quick win à fort impact perçu. Voir `MPP_INSPIRATIONS.md` (MPP-1).

- [x] **MPP1-1 : Audit et réécriture des descriptions**
  - _Action 1 :_ `SELECT id, slug, name, description FROM badges ORDER BY category, name;` → exporter la liste.
  - _Action 2 :_ Réécrire chaque description selon 4 règles : tutoiement, hook émotionnel en début, punchline chambreur/flatteur, max 2 phrases courtes.
  - _Exemples :_ "Œil de Faucon" → "Tu sens l'arnaque avant tout le monde. 3 paris VAR gagnés d'affilée. La VAR n'a aucun secret pour toi." / "Le Chat Noir" → "Personne n'aime jouer contre toi. 5 paris VAR perdus dans le même match. C'est statistique, ça."

- [x] **MPP1-2 : Migration SQL pour les nouvelles descriptions**
  - _Action :_ `UPDATE badges SET description = '...' WHERE slug = '...' ;` pour chaque badge. Migration idempotente.

---

### 🛡️ Sprint INSP-1 : STREAK FREEZE — "Protéger ses utilisateurs contre eux-mêmes"

> **Inspiration Duolingo.** Achetable avec des Sifflets (pas de vrai argent). Activation automatique. Voir `INSPIRATIONS_BACKLOG.md` (INSP-1).

- [x] **INSP1-1 : Migration**
  - _Action :_ `ALTER TABLE profiles ADD COLUMN streak_freezes_owned INT DEFAULT 0, ADD COLUMN streak_freezes_used_count INT DEFAULT 0;`. Contrainte : max 3 freezes possédés simultanément.

- [x] **INSP1-2 : RPC `purchase_streak_freeze()` + logique auto-consommation**
  - _Action 1 :_ RPC SECURITY DEFINER : coût 500 pts, vérifie max 3 owned, débite solde, incrémente `streak_freezes_owned`.
  - _Action 2 :_ Dans la logique de calcul du streak (layout `/(app)/layout.tsx`), si `last_login_date` n'est pas hier NI aujourd'hui ET `streak_freezes_owned > 0` → consommer 1 freeze, conserver le streak.
  - _Action 3 :_ Push de confirmation : "🛡️ Streak sauvé ! Un Streak Freeze a été utilisé."

- [x] **INSP1-3 : UI Boutique + Profil**
  - _Action 1 :_ Ajouter dans la boutique (ou section dédiée Settings) : "🛡️ Streak Freeze — 500 pts" avec description et limite de 3.
  - _Action 2 :_ Sur le profil, afficher "🔥 12j · 🛡️ x2" (streak + freezes en stock).

---

### 📊 Sprint MPP-2 : BILAN QUOTIDIEN — "C'est l'heure du bilan !"

> **Inspiration MPP.** Moment rituel quotidien post-résolution. Voir `MPP_INSPIRATIONS.md` (MPP-2).

- [x] **MPP2-1 : Table `user_daily_recaps`**
  - _Action :_ Migration avec colonnes : `user_id`, `recap_date DATE`, `pronos_total`, `pronos_correct`, `pronos_exact`, `var_bets_total`, `var_bets_won`, `points_earned`, `rank_general`, `rank_squad_primary`, `dismissed_at TIMESTAMPTZ NULL`. PK composite `(user_id, recap_date)`.

- [x] **MPP2-2 : Cron de génération des recaps (09h00 Paris)**
  - _Action :_ Pour chaque user ayant ≥ 1 prono ou pari résolu la veille, générer une row `user_daily_recaps` avec les agrégats J-1. Idempotent.

- [x] **MPP2-3 : Composant `MatchdayRecapModal.tsx`**
  - _Action 1 :_ Modale fullscreen avec : fond gradient pitch, titre "C'EST L'HEURE DU BILAN !", 4 cards (Pronos bons, Exacts, Total pts, Paris VAR gagnés), section "Mes classements" (général + ligue principale), animation count-up sur les chiffres.
  - _Action 2 :_ Déclenchement au premier accès du jour si une row non-dismissed existe. UPDATE `dismissed_at` au "Fermer".

- [x] **MPP2-4 : Push du matin**
  - _Action :_ Le cron de génération envoie aussi un push : "🏆 C'est l'heure du bilan ! +XXX pts hier. Découvre ton classement →" (si `notif_daily_digest = true`).

---

### 📈 Sprint MPP-3 : STATS PAR CLUB — "Mon histoire sur l'app"

> **Inspiration MPP.** Ancrage identitaire fort. Voir `MPP_INSPIRATIONS.md` (MPP-3).

- [x] **MPP3-1 : RPC `get_user_stats(userId, competitionId?, teamId?, seasonId?)`**
  - _Action :_ RPC SECURITY DEFINER retournant `pronos_total`, `pronos_correct`, `pronos_exact`, `var_bets_total`, `var_bets_won`, `points_total`, `streak_max`. Filtres optionnels dynamiques.

- [x] **MPP3-2 : Composant `StatsFiltersBar.tsx`**
  - _Action :_ Filtres horizontaux : Saison (dropdown), Compétition (chips), Club préféré (chip toggle). Re-fetch RPC au tap.

- [x] **MPP3-3 : Section "Stats VAR" sur le profil**
  - _Action :_ Ajouter bloc dédié : "📊 Mes stats VAR — X gagnés / Y total · Win rate : Z% · Plus gros gain : +XXX pts."

---

## 🆕 PHASE PRÉ-CDM — DÉBRIEF UX/UI + ARCHITECTURE MONNAIES (8 mai 2026)

> Issus du débriefing UX complet du 8 mai 2026 (19 écrans navigation hors-match + 8 écrans match live).
> Ordre de traitement recommandé : **MONNAIES → BUG-CSC → SWEEP-NAMING → UX8 → UX9 → UX10**.
> Le sprint MONNAIES est un pré-requis structurel : sans séparation propre, la boutique sera désertée et les classements seront perçus comme injustes par les acheteurs.

---

### 🔴 Sprint MONNAIES : SÉPARATION SCORE / SOLDE — "Une action, une monnaie"

> **Contexte stratégique :** L'app utilise actuellement le label "pts" pour 5 valeurs différentes : `sifflets_balance` (TopBar, dépensable), `season_points` (leaderboard saisonnier), `lifetime_points_earned` (Hall of Fame), cagnotte cumulée XP de ligue, et XP de progression de rang. L'utilisateur ne sait pas que dépenser ses Sifflets dans la boutique n'impacte pas son classement → personne n'achète. Inversement, si la séparation backend n'est pas propre, dépenser PEUT vraiment impacter le classement → injustice perçue. Ce sprint résout les deux problèmes simultanément.

- [x] **MON-1 : Audit backend de la séparation des monnaies (Claude Code)**
  - _Action :_ Lancer le prompt d'audit "Séparation Monnaies VAR TIME" dans Claude Code (cf. fichier dédié). L'audit doit identifier les écarts dans :
    - RPCs de gain (`resolve_event_parimutuel`, `resolve_match_pronos`, `claim_daily_streak`, `claim_rsa`, `transition_season`) — vérifier que les 3 colonnes (`sifflets_balance`, `season_points`, `lifetime_points_earned`) sont incrémentées.
    - RPCs de dépense (`place_bet`, `purchase_shop_item`, `purchase_booster`, `equip_shop_item`, `purchase_streak_freeze`) — vérifier qu'elles débitent UNIQUEMENT `sifflets_balance` et ne touchent JAMAIS au score.
    - Tris de leaderboards (`/leaderboard`, `SquadLeaderboard`, `SquadChampionship`, `resolve_league_round`) — vérifier qu'ils utilisent `season_points` ou `lifetime_points_earned`, jamais `sifflets_balance`.
    - Triggers SQL et contraintes CHECK.
  - _Livrable :_ Rapport structuré "ÉCART CRITIQUE / MINEUR" + plan de fix proposé à valider par le PM avant exécution.

- [x] **MON-2 : Fix des écarts identifiés (suite à MON-1)**
  - _Action :_ Selon le rapport d'audit, créer les migrations SQL et patches code pour corriger les RPCs/queries défaillantes. Tester unitairement chaque RPC modifiée avec Vitest. Validation : un achat boutique de 1 000 pts ne doit JAMAIS modifier `season_points` ni `lifetime_points_earned`.

- [x] **MON-3 : Naming officiel — décision PM**
  - _Décision proposée :_
    - **Sifflets** (🪙) = solde dépensable (TopBar, boutique, mises, boosters)
    - **Points** ou **pts** = score (leaderboards, profil "Points gagnés", cagnotte ligue)
    - **XP** = progression de rang uniquement (barre 150/500 District)
  - _Action :_ Trancher cette convention avant de lancer le sweep (UX10).

---

### 🔴 Sprint BUG-CSC : JSON BRUT QUI FUITE DANS LE VESTIAIRE — "L'app paraît cassée"

> **Bug critique identifié sur device le 8 mai 2026.** Dans l'onglet Vestiaire d'un match live, quand un ami a pronostiqué un buteur CSC (contre-son-camp), la chaîne `{"away": [], "home": [{"name": "CSC", "goals": 1}]}` s'affiche brute au lieu d'être formatée. Le rendu correct existe pour le score exact ("1 ami a mis score exact 1-0") mais pas pour les buteurs CSC. À fixer en urgence : la friction UX est immédiate sur l'écran social par excellence.

- [x] **CSC-1 : Identifier le composant qui rend les pronos amis dans le Vestiaire**
  - _Action :_ Localiser dans `src/components/match/` (probablement dans le tab Vestiaire de la LiveRoom ou un sous-composant `FriendsPronos.tsx` / `MatchVestiaire.tsx`) la logique qui formate les pronos amis sur un match en cours.

- [x] **CSC-2 : Ajouter le formatage CSC**
  - _Action :_ Dans la fonction qui sérialise les buteurs prédits, gérer explicitement le cas `name === "CSC"` (contre-son-camp) avec une formulation lisible. Exemples :
    - `1 ami a mis Borussia CSC (1)` → "1 ami a misé sur un CSC de Borussia"
    - Plusieurs CSC : "1 ami a misé : CSC pour Borussia (×1)"
    - CSC + buteur normal : "1 ami a misé : Reggiani (×1) + CSC pour Eintracht"
  - _Test :_ Vérifier sur le match Borussia-Eintracht (ou créer un cas de test) que le rendu est lisible quel que soit le mix score/CSC/buteurs nommés.

- [x] **CSC-3 : Audit des autres endroits où les buteurs sont affichés**
  - _Action :_ Grep sur le projet `JSON.stringify`, `home.*goals`, `away.*goals` dans les composants pour identifier d'autres potentielles fuites JSON. Vérifier au minimum : ProfileClient (historique pronos), PronosticsHubClient (récap après saisie), MatchPronoCard. Patcher si nécessaire.

---

### 🟠 Sprint SWEEP-NAMING : RENOMMAGE COHÉRENT "Sifflets / Points / XP"

> Suite à la décision MON-3, sweep complet de l'app pour aligner le vocabulaire. Sans ça, même avec le backend propre, l'utilisateur restera confus.

- [x] **NAM-1 : Inventaire complet (Claude Code)**
  - _Action :_ Prompt Claude Code dédié qui grep toutes les occurrences de "pts", "Pts", "points", "Points", "XP", "Sifflets", "sifflet" dans `src/` et liste pour chaque occurrence : fichier, ligne, contexte (label UI, message toast, clé i18n, commentaire), valeur sémantique (solde dépensable / score saisonnier / score perpétuel / XP de rang / cagnotte ligue / autre). Livrable : tableau Markdown avec colonne "Renommage proposé".

- [x] **NAM-2 : TopBar — passage à "🪙 Sifflets"**
  - _Action :_ Dans `src/components/layout/TopBar.tsx`, remplacer "355 pts" par "🪙 355" (ou "355 Sifflets" si la place le permet). Vérifier que l'état actif/cliquable mène bien au profil ou à la boutique (UX6-6 prévu mais à confirmer en visuel). Tester l'animation pulse sur changement de solde.

- [x] **NAM-3 : Boutique — affichage prix en "Sifflets"**
  - _Action :_ Dans `src/app/(app)/shop/page.tsx` et composants associés, remplacer "1 000 pts" par "1 000 🪙" ou "1 000 Sifflets" selon contexte. Le solde en haut à droite de la boutique passe aussi en "🪙 355".

- [x] **NAM-4 : VotingModal et place_bet — "Engagement Sifflets"**
  - _Action :_ Dans `src/components/match/VotingModal.tsx`, remplacer "Engagement 35 pts" par "Mise : 35 🪙" ou "Mise : 35 Sifflets". Idem dans la modale d'achat de booster.

- [x] **NAM-5 : Leaderboards — passage à "Points"**
  - _Action :_ Dans `LeaderboardClient.tsx`, `SquadLeaderboard.tsx`, `SquadChampionship.tsx`, `ProfileClient.tsx` (section "Points gagnés"), remplacer "pts" par "Points" ou conserver "pts" mais ajouter un sous-label "(score saisonnier)" ou "(score perpétuel)" selon le contexte. Garantir la distinction visuelle avec les Sifflets.

- [x] **NAM-6 : Profil — clarification XP vs Points vs Sifflets**
  - _Action :_ Dans `ProfileHeader.tsx`, libeller explicitement chaque valeur :
    - Barre de progression "XP · DISTRICT 150 / 500" → conserver "XP" (c'est de la progression)
    - Card "355 PTS" en hero → renommer "355 🪙 SIFFLETS" pour la dépense, ET ajouter à côté ou en dessous un "725 Points gagnés" (lifetime) ou "Saison de Mai : X Points"
    - Card "725 POINTS GAGNÉS" → garder "Points" (c'est le score)

- [x] **NAM-7 : i18n — propagation aux fichiers `messages/*.json`**
  - _Action :_ Si certaines strings sont déjà dans `next-intl`, mettre à jour les 5 langues (FR/EN/ES/DE/IT). Sinon, prévoir le naming pour quand l'i18n sera branchée.

---

### 🟡 Sprint UX8 : POLISH ÉCRANS NAVIGATION (hors-match)

> Issus du débrief des 19 écrans hors-match du 8 mai 2026.

- [x] **UX8-1 : Logo "VAR TIME" — unifier le lockup**
  - _Problème :_ "VAR" est dans une box bordée et "TIME" est en texte libre, ça ressemble à deux marques accolées.
  - _Action :_ Dans le composant logo (probablement `WhistleLogo.tsx` ou `BrandLogo.tsx`), unifier le lockup : soit boxer les deux, soit aucun. Recommandation : un seul lockup propre, éventuellement avec l'éclair ⚡ comme symbole de marque entre "VAR" et "TIME". Tester le rendu sur fond sombre et clair.

- [x] **UX8-2 : Empty state "La VAR dort" — alléger le texte**
  - _Problème :_ "Profites-en pour préparer tes pronos, consulter le classement ou challenger tes ligues" est descriptif et redondant avec les 3 CTAs en dessous.
  - _Action :_ Dans `src/components/lobby/MatchLobby.tsx`, remplacer le paragraphe par : "Aucun match en direct. C'est le moment de poser tes pronos." (une seule phrase). Les 3 CTAs en dessous parlent d'eux-mêmes.
- [x] **UX8-2bis : Afficher cette page en entrée sur l'application**

- [x] **UX8-3 : Bug visuel "Quitter la ligue" qui flotte détaché**
  - _Problème :_ Sur la page Ligues (`LiguesPageClient.tsx`), le menu trois points qui ouvre "Quitter la ligue" affiche le tooltip détaché de la card, comme une bulle flottante orpheline.
  - _Action :_ Ancrer le dropdown sous le bouton trois points avec un positionnement relatif strict. Utiliser un composant Popover/DropdownMenu de Radix si pas déjà fait. Tester sur petit et grand écran.

- [x] **UX8-4 : Slider Pronos — clarifier le saut de jours sans match**
  - _Contexte :_ Le slider affiche uniquement les jours avec des matchs (ex: saute Jeu et Ven s'il n'y a aucun match). C'est une décision UX volontaire et juste — ça évite des taps sur des jours vides.
  - _Problème :_ L'utilisateur peut être perplexe la première fois qu'il voit Mer 6 → Auj → Sam 9 sans transition. Le saut n'est pas explicite.
  - _Action :_ Pas de refonte. Juste vérifier que :
    - Le label "Demain" sous "Sam 9" s'affiche bien quand le prochain jour avec match n'est pas littéralement demain (ce qui semble déjà être le cas).
    - Le label "Auj." apparaît même quand il n'y a aucun match aujourd'hui (l'utilisateur doit pouvoir voir où il en est dans le temps).
    - Optionnel : ajouter un micro-séparateur visuel (un `·` discret ou un espacement légèrement plus grand) entre deux jours non-consécutifs, pour signaler implicitement le saut.

- [x] **UX8-5 : Pronos — légender les 5 ronds historique sous les noms d'équipe**
  - _Problème :_ Sous chaque équipe (Forest, Newcastle, Burnley, Aston Villa) on voit 5 ronds verts/rouges qui représentent les 5 derniers matchs. Pas de légende.
  - _Action :_ Dans la `MatchPronoCard`, ajouter un micro-label "5 derniers" ou un tooltip au tap. Alternative : ajouter une icône d'info ⓘ qui ouvre un mini-explainer.

- [x] **UX8-7 : Stats compactes du profil — colorisation**
  - _Problème :_ La section PRONOS (5 total / 2 corrects / 2 exacts / 40% win rate) et PARIS VAR (4 total / 2 gagnés) est plate visuellement par rapport au hero du dessus.
  - _Action :_ Dans `ProfileClient.tsx` ou `MppStatsSection.tsx`, coloriser les ratios : vert si >= 60%, ambre 30-60%, rouge < 30%. Augmenter la taille des chiffres principaux (text-3xl bold) et réduire les labels (text-xs uppercase tracking).

- [x] **UX8-8 : Burger menu — masquer ou marquer "Bientôt" les langues non actives**
  - _Problème :_ 5 langues affichées (FR/EN/ES/DE/IT) alors que la couverture i18n est à ~5%. Trompeur.
  - _Action :_ Tant que `next-intl` n'est pas branché complètement, n'afficher que FR (et EN si traduit). Marquer ES/DE/IT comme "Bientôt" en disabled state, ou les masquer.

- [x] **UX8-10 : Tabs scrollables — gradient fade visible (vérification UX2-1 et UX7-6)**
  - _Problème :_ Sur l'image du Stade, "LA LIGA" est encore tronqué sans fade visible.
  - _Action :_ Vérifier dans `MatchLobby.tsx` que le gradient `bg-gradient-to-l from-zinc-950` est bien présent ET visible (pas coupé par overflow:hidden parent). Augmenter w-12 → w-16 si nécessaire. Vérifier z-index >= 10.

---

### 🟡 Sprint UX9 : POLISH ÉCRANS MATCH LIVE

> Issus du débrief des 8 écrans match live du 8 mai 2026 (KOP, Vestiaire, Compo, Stats, VotingModal, ActionDrawer).

- [x] **UX9-1 : Tabs KOP/VESTIAIRE/COMPO/STATS — underline du tab actif plus visible**
  - _Problème :_ L'underline vert sous le tab actif est très discret (h-0.5).
  - _Action :_ Dans le composant Tabs de la LiveRoom, augmenter l'underline à `h-1` voire `h-1.5`, avec léger glow. Alternative : ajouter un fond pill subtil (`bg-pitch-700/30`) sur le tab actif en plus de l'underline.

- [x] **UX9-2 : Statut live "1ÈRE MI-TEMPS · 5'" — augmenter la visibilité**
  - _Problème :_ Le statut le plus dynamique (la minute du match) est en text-xs sous le score, trop petit.
  - _Action :_ Dans le Scoreboard de la LiveRoom, augmenter la taille à `text-sm font-bold` minimum, garder le rouge avec dot pulse animé (`animate-pulse`). Tester sur petite résolution (iPhone SE).

- [x] **UX9-3 : Bouton notification (cloche) — cohérence d'état**
  - _Problème :_ La cloche en haut à droite est tantôt verte plein, tantôt verte outline selon les écrans (image 1 vs image 3). Incohérence ou bug.
  - _Action :_ Identifier le composant (probablement dans le header de la LiveRoom). Définir clairement l'état : plein = abonné aux notifs du match, outline = pas abonné. Ajouter un toast au tap "Notifs activées pour ce match" / "Désactivées".

- [x] **UX9-4 : Compo — affichage des noms longs**
  - _Problème :_ "Schlott..." pour Schlotterbeck, "Bellingh..." pour Bellingham — tronquage moche.
  - _Action :_ Dans `MatchLineupsPitch.tsx` ou équivalent, afficher uniquement le nom de famille en `text-xs`, ou prénom abrégé + nom complet ("M. Schlotterbeck"). Si le nom dépasse 12 caractères, basculer en abréviation propre. Pas de "..." en suffixe.

- [x] **UX9-5 : Vestiaire — header "TES AMIS" plus explicite**
  - _Problème :_ La card jaune "TES AMIS" ne dit pas qu'il s'agit d'une synthèse des pronos amis sur ce match précis.
  - _Action :_ Dans le composant Vestiaire de la LiveRoom, remplacer "TES AMIS" par "👥 Pronos de tes amis sur ce match" ou "Ce qu'ont misé tes amis ici". Plus explicite, plus social.

- [x] **UX9-6 : Pronos de la ligue — passage en row compact**
  - _Problème :_ Chaque membre (Remi, Cafoutch...) a une card pleine largeur avec score + buteurs. Sur ligue de 6 membres = scroll infini.
  - _Action :_ Dans le Vestiaire LiveRoom, transformer les cards en rows compacts : avatar + pseudo + score "1-0" + chevron pour expand. Au tap, expand affiche les buteurs prédits. Limite par défaut : 3 rows visibles, "Voir les X autres" dessous.

- [x] **UX9-7 : VotingModal — slider plus lisible**
  - _Problème :_ Le slider de mise n'a pas de label flottant qui suit le drag. La valeur "35 pts" est déconnectée visuellement.
  - _Action :_ Dans `VotingModal.tsx`, ajouter un tooltip flottant au-dessus du dot du slider qui affiche la mise courante en gros (ex: "🪙 35"). Le tooltip suit le drag en temps réel. Améliore drastiquement la sensation de contrôle.

- [x] **UX9-8 : VotingModal — clarifier "COTES ESTIMÉES (MASSE DES MISES)"**
  - _Problème :_ Le footer underline ressemble à un lien cliquable mais c'est probablement juste un label.
  - _Action :_ Si c'est un label statique, retirer l'underline. Si c'est cliquable (tooltip explicatif), le rendre visiblement interactif (icône ⓘ + label "Comment sont calculées les cotes ?"). Au tap, ouvrir un mini-explainer ou un lien vers `/rules#cotes`.

- [x] **UX9-9 : ActionDrawer — masquer la barre de tabs côté user**
  - _Problème :_ Les onglets ALERTES / FEUILLE / CONTRÔLE sont visibles mais FEUILLE/CONTRÔLE sont admin-only (cachés en pratique). Côté user, ALERTES seul = pas besoin de tab.
  - _Action :_ Dans `ActionDrawer.tsx`, conditionner l'affichage de la barre de tabs à `user.trust_score >= MODERATOR_THRESHOLD`. Côté user normal, afficher directement la grid de cards "Décisions VAR à signaler" sans tab. Côté modérateur, garder les 3 tabs.

- [x] **UX9-10 : LiveRoom — afficher le badge d'audience "👁️ X" (vérification Sprint Q)**
  - _Problème :_ Le sprint Q (quorum dynamique) est marqué `[x]` côté code mais aucun screen ne montre le badge audience visible. À vérifier sur device qu'il s'affiche bien dans le header de la LiveRoom.
  - _Action :_ Tester sur device pendant un match live. Si le badge n'apparaît pas, déboguer la souscription Realtime à `match_presence` et la requête `count_active_users_on_match`. Si le badge apparaît mais est peu visible, augmenter sa visibilité (text-sm minimum, jaune whistle si audience >= 5).

---

### 🟢 Sprint UX10 : MICRO-DÉTAILS POST-DÉBRIEF

> À traiter en parallèle des sprints critiques. Chaque tâche est < 15 min de code.

- [x] **UX10-1 : Bouton retour LiveRoom — arbitrer "← Matchs" vs flèche seule**
  - _Action :_ Décision PM : garder "← Matchs" (texte explicite)

- [x] **UX10-2 : Compo — vérifier le terrain en mode portrait/paysage**
  - _Action :_ Sur petits écrans (iPhone SE), le terrain peut déborder. Tester et ajuster les `viewBox` SVG si nécessaire.

- [x] **UX10-3 : Captures admin/résolution — à demander au PM**
  - _Action :_ Capter ce soir pendant Lens-Nantes ou Monaco-Lille :
    - Le moment où un market VAR se résout (animation gain/perte côté user)
    - L'écran admin de résolution (UX modérateur)
    - Une notification push native (format actions OUI/NON sur Android)
  - Ces écrans manquent au débrief et bloquent une review complète.

---

### 🟠 Sprint CHAT-LIVE : AMORÇAGE & VIE DES CHATS DE LIGUE — "Que ça parle"

> **Contexte stratégique :** Les chats de ligue sont vides en pratique (cf. screens du 8 mai 2026). Le problème n'est pas la découvrabilité (pastille rouge déjà présente) mais l'amorçage : sans premier message, personne n'ose parler. Sans contenu généré automatiquement, le chat n'a rien à offrir entre deux conversations humaines. Ce sprint donne vie au chat sans demander aux utilisateurs de produire le contenu.

- [x] **CHAT-1 : Message de bienvenue auto à la création de ligue**
  - _Problème :_ Le bonus UX3-1 prévoyait ce message mais n'a pas été implémenté. Tous les chats créés depuis sont muets par défaut.
  - _Action 1 :_ Dans `POST /api/squads` (création de ligue), juste après l'INSERT dans `squads` et `squad_members`, insérer une row dans `squad_messages` avec :
    - `user_id` = NULL (ou un user_id "system" dédié)
    - `is_system_message` = TRUE (ajouter cette colonne via migration si elle n'existe pas)
    - `content` = "🎉 Bienvenue dans **[Nom de la ligue]** ! Présentez-vous, chambrez-vous, et que le Boss de la VAR remporte le mois ! 🏆"
  - _Action 2 :_ Migration ajoutant `is_system_message BOOLEAN DEFAULT FALSE` à `squad_messages`.
  - _Action 3 :_ Dans `SquadChat.tsx`, styliser différemment les messages système : fond légèrement vert pitch, italique, sans avatar utilisateur, badge "VAR TIME" en lieu et place du pseudo.
  - _Action 4 :_ Backfill des ligues existantes sans messages : insérer un message système rétroactivement sur toutes les `squads` qui n'ont aucun `squad_messages` à date.

- [x] **CHAT-2 : Messages système auto sur événements importants**
  - _Problème :_ Le chat n'a rien à raconter entre deux interactions humaines. Aucun feed dynamique.
  - _Action 1 :_ Identifier les triggers à brancher (dans les RPCs ou les routes API qui résolvent des paris/pronos) :
    - **Gros gain** : un membre gagne ≥ 200 pts sur un pari VAR ou un prono → "🔥 **{pseudo}** vient d'empocher +{points} pts sur {match} !"
    - **All In** : un membre mise > 80% de son solde sur un pari → "⚡ **{pseudo}** met {amount} 🪙 All In sur {market_event} — folie ou génie ?"
    - **Badge débloqué** : un membre débloque un badge → "🏆 **{pseudo}** vient de débloquer le badge **{badge_name}** !"
    - **Score exact trouvé** : un membre a fait un score exact sur un match → "🎯 **{pseudo}** avait prédit le score exact {score} sur {match}. Respect."
    - **Promotion de division/rang** : un membre passe à un grade supérieur → "🚀 **{pseudo}** est promu **{nouveau_grade}** ! Bienvenue chez les grands."
  - _Action 2 :_ Créer une fonction utilitaire `postSquadSystemMessage(squadId, content)` dans `src/lib/squad-messages.ts` qui insère un message système dans `squad_messages` avec le bon flag.
  - _Action 3 :_ Dans `resolve_event_parimutuel`, après distribution des gains, identifier le plus gros gagnant par squad et déclencher le message "Gros gain" si > 200 pts. Idem dans `resolve_match_pronos` pour les scores exacts.
  - _Action 4 :_ Rate-limiting : pas plus de 5 messages système / squad / 24h pour éviter le spam. Compteur en table `squad_system_message_log` ou logique simple dans la fonction utilitaire.

- [x] **CHAT-3 : Push notification quand un chat de ligue s'anime**
  - _Problème :_ Même avec des messages auto, les utilisateurs ne reviennent pas sur le chat sans rappel.
  - _Action 1 :_ Dans `SquadChat.tsx`, lors de l'INSERT d'un message humain, déclencher (côté API) un push aux autres membres de la squad ayant `notif_squad_chat = TRUE` (toggle à ajouter dans `profiles`).
  - _Action 2 :_ Format du push : "💬 **{pseudo}** dans **{squad_name}** : {first_50_chars_of_message}..."
  - _Action 3 :_ Cooldown : 1 push max / squad / 30 min pour éviter d'inonder pendant une conversation active.
  - _Action 4 :_ Toggle `notif_squad_chat` dans la page Notifications (Settings).

- [x] **CHAT-4 : Pastille rouge sur l'icône Ligues du BottomNav**
  - _Problème :_ Vérifier que UX7-2 (pastille whistle sur tab HISTORIQUE) a bien été étendue au tab LIGUES quand un message non-lu existe.
  - _Action 1 :_ Si pas déjà fait : ajouter une pastille `bg-whistle` (ou rouge animate-pulse pour les MP, à voir Sprint MP) sur l'icône Ligues du `BottomNav` quand au moins une squad a un message non-lu.
  - _Action 2 :_ Marquer comme lu : utiliser `last_read_at` sur `squad_members` (ajouter colonne via migration). Mettre à jour à chaque visite du chat.
  - _Action 3 :_ Les messages système (bienvenue, événements auto) déclenchent aussi la pastille pour rappeler le membre.

---

### 🟢 Sprint MP : MESSAGERIE PRIVÉE ENTRE AMIS — "L'inbox"

> **Contexte stratégique :** Le système d'amis existe (`friend_requests` avec statut `accepted`) mais aucune mécanique sociale 1-to-1. Les messages privés entre amis créent un canal informel hors-ligue, idéal pour chambrer son meilleur pote sur un prono raté. C'est aussi un signal de sérieux pour les utilisateurs (vraie app sociale). **À NE PAS LANCER AVANT LA CDM** — ça nécessite modération + signalement + blocage. Backlog post-CDM, à activer une fois la masse d'utilisateurs stabilisée. Pour la CDM, garder le focus sur les chats de ligue (Sprint CHAT-LIVE).

- [x] **MP-1 : Modèle de données**
  - _Action 1 :_ Migration `supabase/migrations/00XX_direct_messages.sql` :

```sql
    CREATE TABLE direct_message_threads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_a_id UUID REFERENCES profiles(id) NOT NULL,
      user_b_id UUID REFERENCES profiles(id) NOT NULL,
      last_message_at TIMESTAMPTZ,
      last_message_preview TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      CHECK (user_a_id < user_b_id),  -- ordre canonique pour unicité
      UNIQUE (user_a_id, user_b_id)
    );

    CREATE TABLE direct_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      thread_id UUID REFERENCES direct_message_threads(id) ON DELETE CASCADE NOT NULL,
      sender_id UUID REFERENCES profiles(id) NOT NULL,
      content TEXT NOT NULL CHECK (length(content) <= 500),
      sent_at TIMESTAMPTZ DEFAULT NOW(),
      read_at TIMESTAMPTZ
    );

    -- RLS : seuls les 2 participants peuvent lire/écrire
    -- Index sur thread_id, sent_at DESC
```

- _Action 2 :_ Types dans `src/types/database.ts`.

- [x] **MP-2 : Bouton "Envoyer un MP" sur le profil public d'un ami**
  - _Action :_ Dans `src/app/(app)/profile/[id]/page.tsx`, si la relation `friend_requests` est `accepted`, afficher un bouton "💬 Message" qui ouvre une nouvelle thread (ou la thread existante) et redirige vers `/messages/[threadId]`.

- [x] **MP-3 : Page `/messages` — liste des threads**
  - _Action :_ Créer `src/app/(app)/messages/page.tsx` qui liste les threads de l'utilisateur, triés par `last_message_at DESC`. Format : avatar de l'autre user + pseudo + preview du dernier message + timestamp + pastille si non-lu.

- [x] **MP-4 : Page `/messages/[threadId]` — conversation 1-to-1**
  - _Action :_ Page de chat similaire à `SquadChat.tsx` mais simplifié (2 participants, pas de modération communautaire). Bulles à gauche/droite, scroll auto, input + bouton envoyer. Souscription Realtime sur `direct_messages` filtrée par `thread_id`.

- [x] **MP-5 : Bouton "💬" dans la TopBar (à côté du burger)**
  - _Problème :_ Aujourd'hui la TopBar a logo + solde + burger. Avec les MP, ajouter un 4ème élément se justifie (l'inbox privée n'a pas de page parente naturelle).
  - _Action :_ Dans `src/components/layout/TopBar.tsx`, ajouter une icône `MessageCircle` (Lucide) à gauche du burger. Pastille rouge animée si messages non-lus. Au tap, redirige vers `/messages`.
  - _Note :_ Garder l'icône **uniquement** quand l'utilisateur a au moins 1 ami (`friend_requests.status = 'accepted'`). Sinon, masquer pour ne pas polluer la TopBar des nouveaux utilisateurs.

- [ ] **MP-6 : Modération — signalement et blocage**
  - _Action 1 :_ Dans la conversation, long-press sur un message ouvre un menu "Signaler ce message". Insère une row dans `message_reports` (à créer).
  - _Action 2 :_ Dans le profil public d'un ami, ajouter un bouton "Bloquer" qui supprime la friendship et empêche tout futur MP. Table `user_blocks` (blocker_id, blocked_id).
  - _Action 3 :_ Dashboard admin pour les modérateurs : liste des messages signalés, action "Supprimer + warn" ou "Ignorer".

- [x] **MP-7 : Push notification sur nouveau MP**
  - _Action :_ Quand un message est envoyé, push à l'autre user (si `notif_dm = TRUE`) : "💬 **{pseudo}** : {first_50_chars}...". Au tap, ouvre la thread.

- [ ] **MP-8 : Hub social unifié dans `/messages` (optionnel V2)**
  - _Note :_ À faire seulement si le besoin émerge. La page `/messages` pourrait afficher 2 sections : "Conversations privées" (MP) et "Mes ligues" (raccourcis vers chats de ligue). Hub centralisé tout-social.

## 💎 PHASE 3 — LONG TERME (post-validation PMF)

### 🏆 Sprint INSP-2 : DIVISIONS PROMOTION/RELÉGATION — "Bronze → Or → Elite"

> **Pré-requis : 200+ users actifs par division.** À déployer uniquement post-CDM si la masse est là. Voir `INSPIRATIONS_BACKLOG.md` (INSP-2).

- [ ] **INSP2-1 : Refonte des rangs en système de divisions**
  - _Action :_ 6 divisions (5=Arbitre de District → 0=Boss de la VAR). Top 30% → promu, Bottom 20% → rétrogradé, milieu 50% → stable. Jamais de rétrogradation de la Division Élite.

- [ ] **INSP2-2 : Migration + logique de bascule mensuelle**
  - _Action 1 :_ `ALTER TABLE profiles ADD COLUMN current_division INT DEFAULT 5, ADD COLUMN division_history JSONB;`
  - _Action 2 :_ Intégrer le calcul promotion/relégation dans la RPC `transition_season()` (Sprint Eco-1).

- [ ] **INSP2-3 : UI division sur le profil**
  - _Action :_ Card de division plus prominente que le chip actuel : logo coloré + "Division 3 · 12 jours avant bascule" + mini-progress bar rang dans la division.

- [ ] **INSP2-4 : Push stratégiques fin de mois**
  - _Action :_ J-3 avant fin de mois → push aux utilisateurs en zone relégation : "⚠️ Plus que 3 jours pour sauver ta division ! Tu es 38e/50." et aux proches de la promotion : "🚀 Top 15 = promu ! Tu es 16e/50."

---

### 🏟️ Sprint FRICTION-FK3 : MODE STADE CAPACITOR — "L'app reste éveillée"

> **Pré-requis : Capacitor déployé.** À faire en septembre 2026. Voir `FRICTION_REDUCTION_v2.md` (FRICTION-3).

- [ ] **FK3-1 : Wake Lock API pour PWA**
  - _Action :_ Dans `LiveRoom.tsx`, quand match status = `live`, appeler `navigator.wakeLock.request('screen')`. Relâcher à la fin ou au démontage.

- [ ] **FK3-2 : Live Activity iOS (Dynamic Island)**
  - _Pré-requis :_ Plugin Capacitor Live Activities (iOS 16.1+).
  - _Action :_ Créer une Live Activity affichant score live + timer VAR si market ouvert. Tap → LiveRoom.

- [ ] **FK3-3 : Indicateur "Mode Stade actif" dans la BottomNav**
  - _Action :_ Point rouge clignotant + texte "EN DIRECT" sur l'onglet Stade quand Mode Stade actif.

---

## 💡 Rappel des Commandes pour l'IA

- `npm run ai:check` : Formate, vérifie le typage (TS) et les règles de code (ESLint). **A faire à chaque fin de tâche.**
- `npm run ai:verify` : Fait tout ce qui est ci-dessus + lance les tests End-to-End Playwright.
