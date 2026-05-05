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

## 🏃 Sprint "Identité & Rétention" (Profil & Push)

- [x] **Tâche 11 : Personnalisation du Profil Joueur**
  - _Détails :_ Actuellement le profil est en lecture seule (souvent nom complet Google).
  - _Action 1 :_ Bottom sheet "Modifier" dans `ProfileHeader` (modal conditionnel, `PATCH /api/profile`). ✓
  - _Action 2 :_ Sélecteur de 20 emojis avatar + input username (3-25 chars, regex, unicité vérifiée serveur). ✓
  - _Action 3 :_ Recherche de club (debounce 300 ms, filtre `api_football_id NOT NULL`), `favorite_team_id` sur `profiles` (migration `0057`), logo affiché dans le header. ✓

- [x] **Tâche 12 : Infrastructure Web Push Native (VAPID)**
  - _Détails :_ Remplacer l'idée de Firebase par le standard natif VAPID + `web-push` (plus léger pour une PWA).
  - _Action 1 :_ Ajouter la table `push_subscriptions` (`user_id`, `endpoint`, `keys`).
  - _Action 2 :_ Ajouter une modale/toast d'Opt-In au moment où l'utilisateur valide son _tout premier_ pronostic (pour déclencher `Notification.requestPermission()`).
  - _Action 3 :_ Implémenter le stockage de la souscription via Server Action.

- [x] **Tâche 13 : Smart Mute & Alertes Automatiques (Le Cycle du Match)**
  - _Détails :_ Le backend envoie les push, mais le téléphone doit filtrer intelligemment.
  - _Action 1 :_ Smart Mute dans `sw.js` — skip notif si app ouverte en premier plan. ✓
  - _Action 2 :_ Push envoyé aux abonnés du match lors de l'ouverture d'un `market_event` (VAR). ✓
  - _Note :_ Action 3 (notif Club Favori 15min avant coup d'envoi) reportée à Tâche 11 une fois `favorite_team_id` en place.

- [x] **Tâche 14 : Prévoir une croix pour fermer la modale d'invitation au téléchargement PWA**
  - _Détails :_ La modale est insistante, et surtout sur desktop, on ne peut pas la fermer. Croix ajoutée + durée portée à 15 s.

- [x] **Tâche 15 : Le Buzzer Social (Interactions de Ligue)**
  - _Détails :_ Outils pour harceler gentiment ses potes.
  - _Action 1 :_ Route `/api/squads/nudge` — push aux membres sans prono sur matchs à venir (cooldown 30 min). ✓
  - _Action 2 :_ Bouton "Nudge pronos" dans `SquadDetailClient`. ✓
  - _Action 3 :_ Bouton "Sirène VAR" dans `LiveRoom` (onglet Kop, match en direct, cooldown 15 min par user). ✓

- [x] **Tâche 16 : Investigation & Fix : Crash d'affichage Europa/Conference League**
  - _Détails :_ Sur les matchs d'Europa ou Conference League, un problème d'affichage survient. Probablement dû à des équipes non synchronisées en base de données.
  - _Action :_ `LeagueHubBoundary` (Error Boundary React class) ajouté autour de chaque `LeagueHub` dans `MatchLobby` (Top 5 + coupes UEFA). Correction du cast `team_side` null dans `goalsFromTimeline` (filtre + assertion explicite). En cas d'erreur d'affichage, un fallback "Données indisponibles" remplace le crash. ✓

- [x] **Tâche 17 : UX Pronos : Mise à jour en temps réel du compteur sans refresh**
  - _Détails :_ Après la validation d'un pronostic, le compteur (ex: "0/1 matchs pronostiqués") ne s'actualise pas instantanément. L'utilisateur doit rafraîchir la page pour voir "1/1".
  - _Action :_ Ajout d'un état `localSubmittedIds` dans `PronosticsHubClient`. Le callback `onSubmittedChange` met à jour ce set en plus de `submittedCount`, et la fonction `isMatchDone` combine les deux sources pour que tous les compteurs (barre globale, pills de jours, accordéons par compétition) se mettent à jour instantanément.

- [x] **Tâche 18 : Refonte Anti-Triche VAR (Sécurité Backend Parimutuel)**
  - _Détails :_ Le système de vote Waze/VAR est déjà "Optimistic" et bien pensé côté Front, mais il faut blinder les failles IPTV côté Serveur (Postgres/RPC).
  - _Action 1 (Auto-Lock Strict 90s) :_ Déjà implémenté dans `0011_place_bet_v2.sql` — le serveur rejette si `created_at < now() - interval '90 seconds'`. ✓
  - _Action 2 (Status Intermédiaire) :_ Migration `0058` : ajout de `'closed'` au CHECK constraint. Fonction `close_expired_market_events()` appelée à chaque tick du cron. Events passés 90s → `open` → `closed` (en attente verdict). ✓
  - _Action 3 (Le Temps Mort du Juge) :_ `MIN_AGE_SECONDS` porté à 6 min dans `verify-event/route.ts`. ✓
  - _Action 4 (Cooldown Anti-Spam) :_ `COOLDOWN_MINUTES` porté à 5 min dans `alert/route.ts`. ✓

- [x] **Tâche 19 :Multilangue (i18n)**
  - _Détails :_ Le projet a besoin de supporter plusieurs langues.
  - _Action :_ Ajout de ES, DE, IT dans `translations.ts`. Mise à jour du type guard dans `useLocale.ts`. Sélecteur de langue dans `TopBar.tsx` étendu à 5 boutons (FR EN ES DE IT).

- [x] **Tâche 23 : Polish UX & Navigation (Frontend)**
  - _Détails :_ Amélioration de l'expérience utilisateur sur les écrans vides et formatage des données brutes affichées.
  - _Action 1 (Empty State du Lobby) :_ Fait : Ajout de la vue "La VAR dort" et CTA Pronos dans `MatchLobby.tsx`. ✓
  - _Action 2 (Filtre Europe Conditionnel) :_ Fait : Filtrage via `activeCupIds` et rendu sélectif de `cupsToDisplay`. ✓
  - _Action 3 (Formatage JSON Profil) :_ Fait : Extraction propre via la fonction utilitaire `formatPronoValue` implémentée. ✓

- [x] **Amélioration UX de l'Invitation (Viralité type MPG)**
  - _Détails :_ Actuellement, le bouton pour copier le code d'invitation à une ligue copie uniquement le code brut. Nous voulons transformer cela en un message d'invitation complet, chaleureux et engageant, prêt à être collé sur WhatsApp ou SMS.
  - _Action 1 (Modification du presse-papiers) :_ Cibler le composant gérant l'affichage et la copie du code de la ligue (ex: `LeagueHeader.tsx` ou `InviteModal.tsx`). Modifier l'appel à `navigator.clipboard.writeText()`.
  - _Action 2 (Template String Dynamique) :_ Remplacer le code brut par une chaîne de caractères formatée intégrant les variables du joueur et de la ligue. Exemple : `"Hey ! ⚽ [MonPseudo] t'invite à rejoindre sa ligue [Nom de la Ligue] sur VAR TIME. Rentre ce code d'activation pour intégrer le vestiaire : [CODE_INVITATION]"`
  - _Action 3 (Props & Fallback) :_ S'assurer que le composant de copie a bien accès au profil de l'utilisateur courant (pour le pseudo) et au nom de la ligue. Prévoir un fallback sécurisé (ex: `"Un pote t'invite..."`) si le pseudo n'est pas encore chargé.
  - _Action 4 (Feedback Visuel) :_ S'assurer que le petit toast de confirmation affiche bien "Message d'invitation copié !" au lieu de "Code copié".

- [x] **Implémentation du Moteur de Points (Système "Contre-Pied")**
  - _Détails :_ Le calcul des points d'un prono gagnant combine : La cote de base (1N2) + La Prime de "Contre-Pied" (calculée dynamiquement selon les autres joueurs) + Le bonus des buteurs trouvés.
  - _Action 1 (Mise à jour Schema) :_ Dans la table `pronos`, ajouter un champ `points_earned` (int) et `contre_pied_bonus` (int).
  - _Action 2 (Calcul de la Prime de Contre-Pied) :_ Créer une fonction `calculateContrePiedBonus(exactScoreCount, totalCorrectResultCount)`. On calcule le % de joueurs ayant le score exact PARMI ceux ayant trouvé la bonne issue (1N2).
    - Si > 40% = +10 pts (Le Minimum Syndical)
    - Si entre 15% et 40% = +30 pts (Le Joli Coup)
    - Si entre 5% et 15% = +60 pts (Le Visionnaire)
    - Si < 5% = +100 pts (Le Braquage)
    - (Fallback : si `totalCorrectResultCount` < 5 joueurs, appliquer un bonus par défaut de +30 pts pour éviter des stats faussées au lancement).
  - _Action 3 (Le Script de Résolution) :_ Écrire la fonction `resolveMatchPronos(matchId)` déclenchée à la fin du match.
    - 1. Déterminer l'issue réelle (1, N ou 2) et le score réel.
    - 2. Récupérer tous les pronos du match. Compter ceux avec le bon 1N2 et ceux avec le score exact.
    - 3. Boucler sur les pronos pour attribuer les points : `Points = (Bonne Issue ? 50 pts de base) + Prime de Contre-Pied + (Points Buteurs)`.
  - _Action 4 (Affichage UX) :_ Dans la page Profil ou Vestiaire, si le joueur a touché le bonus max (< 5%), afficher un badge stylisé : "💎 Le Braquage (+100 pts)".
  - [x] **Mise à jour du Moteur de Cotes (Formule Asymptotique)**
  - _Détails :_ Le calcul des points se fera via une fonction mathématique qui plafonne les gains maximums pour préserver l'économie du jeu, tout en restant indexé sur les vraies cotes de l'API.
  - _Action 1 (Mise à jour de la fonction) :_ Remplacer la logique dans `convertOddToPoints(odd: number)`.
    - Utiliser la formule : `Math.round(MAX_POINTS * (1 - (1 / odd)))`
    - Pour les paris 1N2, définir `MAX_POINTS = 220`.
    - Pour les Buteurs, définir un plafond plus bas (car on peut en cumuler plusieurs), ex: `MAX_POINTS = 150`.
  - _Action 2 (Gestion des cas extrêmes) :_ Ajouter un plancher de sécurité. Si la formule donne un résultat `< 10`, forcer le retour à `10` points minimum. Si `odd` est manquant ou inférieur à 1, retourner un fallback de `50` points.
  - _Action 3 (UI et Affichage) :_ Côté front-end, s'assurer que ces points sont bien affichés partout où le joueur fait un choix (boutons de score, modale des buteurs) pour qu'il connaisse son gain potentiel avant de valider.

  - [x] **Création de la page "Règles du Jeu" & Menu Burger**
  - _Détails :_ Ajouter une page explicative avec un design propre et aéré (typographie lisible, icônes) pour expliquer comment gagner des points via les pronos et les paris Live.
  - _Action 1 (Création de la page) :_ Créer le fichier `src/app/(app)/rules/page.tsx` (ou `regles`).
  - _Action 2 (Intégration du contenu) :_ Coder l'UI de la page en divisant le contenu en deux grandes sections (cartes ou accordéons) : "🎯 Les Pronos (Score & Buteurs)" et "🚨 La LiveRoom (Paris VAR)". Utiliser le système de "Prime de Contre-Pied" et expliquer le pari mutuel.
  - _Action 3 (Lien dans le Menu Burger) :_ Cibler le composant du Menu Burger (ex: `Sidebar.tsx` ou `BurgerMenu.tsx`). Ajouter une entrée de menu avec une icône (ex: `BookOpen` ou `Info`) intitulée "Règles du jeu" qui pointe vers la nouvelle route.
  - _Action 4 (Accessibilité) :_ S'assurer que la page dispose d'un bouton "Retour" propre dans le header (Mobile-First) pour revenir au Lobby ou fermer la page facilement.

- [x] **Suite moteur de côtes**
      j'ai ajouté manuellement les colonnes `odds_home`, `odds_draw` et `odds_away` à ma table `matches` dans Supabase.

Nous devons maintenant créer le script qui va peupler ces colonnes.

- [x] **Création du Script de Sync des Cotes**
  - _Action 1 :_ Crée un fichier `scripts/sync-odds.ts` (ou ajoute la logique à notre script d'import existant).
  - _Action 2 :_ Le script doit chercher dans Supabase les matchs à venir (statut non commencé) dont `odds_home` est `NULL`.
  - _Action 3 :_ Pour ces matchs, fais un appel à l'endpoint `/odds` d'API-Football.
  - _Action 4 :_ Récupère les cotes du marché "Match Winner" (1N2) et mets à jour les colonnes `odds_home`, `odds_draw`, `odds_away` dans Supabase.
  - _Action 5 :_ Assure-toi que l'interface et le système de calcul de points (`src/lib/odds.ts`) utilisent bien ces colonnes si elles sont présentes, avant de basculer sur le fallback des postes.

[x] **Mise à jours de la landing page**
nous devons mettre à jour notre page d'accueil (`src/app/page.tsx`), mais en conservant absolument son excellente structure actuelle, son copywriting (notamment l'accroche des 55%) et ses composants UI (GamePanel, KopRankStep).

L'objectif est de remplacer les éléments factices par nos vraies captures d'écran et d'intégrer nos nouvelles mécaniques de jeu. Agis en tant que Lead Frontend.

- [x] **Étape 1 : Remplacement du Mockup par de vraies images**
  - _Détails :_ Dans la Hero Section, retire le composant custom `<PhoneMockup />`.
  - _Action :_ `PhoneMockup` conservé mais refondu : affiche désormais un lobby (onglets L1/PL/UCL/ESP, liste de 3 matchs dont 1 LIVE) à la place de l'interface de pari.

- [x] **Étape 2 : Intégration du concept de "Contre-Pied"**
  - _Détails :_ Nous avons un nouveau système de cotes dynamiques inspiré du pari mutuel, appelé le "Contre-Pied".
  - _Action :_ Panel "Bunker" → "Le Contre-Pied" avec icon `Shuffle` et nouveau body.

- [x] **Étape 3 : Mise à jour visuelle de la section "Pas qu'un excité du direct"**
  - _Détails :_ Cette section parle des pronos d'avant-match.
  - _Action :_ Icônes `Target`/`Calendar` remplacées par deux mini-cartes CSS (lobby + profil) superposées avec rotation, sans dépendance à des screenshots réels.

- [x] **Étape 4 : Ajustement du Copywriting des Sifflets**
  - _Détails :_ Dans la section "Trois étapes", ajuste légèrement le texte du panel "Sifflets".
  - _Action :_ Texte mis à jour : "Les points gagnés (Sifflets) s'adaptent dynamiquement aux vraies cotes des matchs. C'est ton trésor de guerre pour miser quand la VAR s'ouvre."
  
 
 - [ ] **Refonte du flux de connexion Google (Sign-in with id_token)**
  - _Détails :_ Le frontend doit récupérer l'ID Token depuis Google directement, puis l'envoyer à Supabase via `signInWithIdToken`.
  - _Action 1 (Installation) :_ Si besoin, installe la librairie `@react-oauth/google` pour faciliter l'intégration du bouton Google côté client dans Next.js, ou utilise le SDK natif Google Identity.
  - _Action 2 (Provider) :_ Entoure l'application (ou la page de login) avec le `GoogleOAuthProvider` en utilisant la variable d'environnement `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
  - _Action 3 (Refonte du Bouton) :_ Dans le composant d'authentification (ex: `AuthModal` ou `LoginPage`), remplace l'appel actuel `supabase.auth.signInWithOAuth(...)` par le composant Google.
  - _Action 4 (Connexion Supabase) :_ Dans le callback `onSuccess` de Google, récupère le `credential` (l'id_token) et envoie-le à Supabase avec la méthode : 
    `await supabase.auth.signInWithIdToken({ provider: 'google', token: credential })`
  - _Action 5 (Redirection) :_ Une fois la promesse Supabase résolue avec succès, redirige l'utilisateur vers la page `/lobby`.
  
[ ] **Affichage des Gains Potentiels (Match Card)**
  - _Détails :_ Afficher dynamiquement les points à gagner en fonction du score saisi par l'utilisateur, en tenant compte de notre formule asymptotique pour le 1N2 et de notre prime mystère "Contre-Pied" pour le score exact.
  - _Action 1 (Détection du 1N2) :_ Dans le composant où l'utilisateur saisit son score, crée un état dérivé. Si Score Domicile > Score Extérieur, c'est un "1". Si Égalité, c'est "N". Sinon, c'est "2".
  - _Action 2 (Calcul UI des points de base) :_ Récupère les vraies cotes du match (`odds_home`, `odds_draw`, `odds_away`) passées en props. Utilise notre fonction utilitaire `convertOddToPoints(odd)` pour afficher le gain potentiel de l'issue choisie.
  - _Action 3 (Design du Feedback) :_ Sous les inputs de score, affiche une petite zone de feedback dynamique. 
    - Exemple de rendu : `Gain de base : 29 pts (Victoire Domicile)`
  - _Action 4 (Badge "Contre-Pied") :_ À côté ou en dessous du gain de base, ajoute un petit badge stylisé (ex: texte doré ou bordure brillante) mentionnant : `+ Jusqu'à 100 pts (Prime Contre-Pied)`.
  - _Action 5 (Fallback) :_ Si les cotes de l'API ne sont pas encore disponibles pour ce match (`odds_home` est `NULL`), affiche des gains génériques (ex: 50 pts) avec un petit texte "Cotes en attente".

## 🧊 Backlog (À faire plus tard)

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
