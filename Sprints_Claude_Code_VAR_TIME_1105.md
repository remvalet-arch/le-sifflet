# 🏗️ Plan de Sprints — Claude Code · VAR TIME

> Plan d'exécution complet pour corriger les bugs et améliorer l'UX/UI de l'application VAR TIME, basé sur le rapport d'audit du 10 mai 2026.
>
> **Légende priorité :** 🔴 Critique · 🟠 Important · 🟡 Optimisation · 🟢 Long terme

---

## 🎯 Vue d'ensemble — 15 Sprints

| #    | Sprint                                                         | Priorité | Durée estimée | Type    |
| ---- | -------------------------------------------------------------- | -------- | ------------- | ------- |
| 1    | Bugs critiques d'état                                          | 🔴       | 1-2 j         | Hotfix  |
| 1bis | Bugs UX rapides (PWA toast, badges, redirections, pronos clic) | 🔴       | 1-2 j         | Hotfix  |
| 2    | États vides & pièges de navigation                             | 🔴       | 2-3 j         | UX Fix  |
| 3    | Onboarding & pseudo utilisateur                                | 🔴       | 3-4 j         | Feature |
| 4    | Design System — Tokens & composants                            | 🟠       | 4-5 j         | Refonte |
| 5    | Standardisation navigation & headers                           | 🟠       | 2-3 j         | Refacto |
| 6    | Partage de ligue & viralité                                    | 🟠       | 1-2 j         | Feature |
| 7    | Séparation back-office modérateur                              | 🟠       | 4-5 j         | Archi   |
| 7bis | **Refonte du système de notifications**                        | 🔴       | 4-5 j         | Feature |
| 7ter | **Enrichissement KOP & Vestiaire (live in-match)**             | 🟠       | 3-4 j         | Feature |
| 8    | Inventaire boutique & possessions                              | 🟡       | 3-4 j         | Feature |
| 9    | Gamification visuelle (progress, countdown)                    | 🟡       | 2-3 j         | UX+     |
| 10   | Accessibilité WCAG AA                                          | 🟡       | 3-4 j         | A11y    |
| 11   | Messagerie enrichie                                            | 🟢       | 4-5 j         | Feature |
| 12   | Onboarding interactif & light mode                             | 🟢       | 5-7 j         | Feature |

---

# 🔴 PHASE 1 — Corrections immédiates (bugs)

## Sprint 1 — Bugs critiques d'état de l'interface

**Objectif :** Corriger les bugs bloquants identifiés en audit.

### 1.1 — Bouton "Amis" bloqué en "Chargement…" sur profils tiers ✅ DONE

- **Bug :** Sur la page d'un profil tiers, le bouton d'action "Amis" reste indéfiniment en état `loading`.
- **Fix :** `src/components/profile/FriendButton.tsx` — ajout try/catch/finally dans `loadStatus()`, déplacement de `createClient()` dans l'effet pour éliminer la dépendance instable.
- **Critère d'acceptation :** Le bouton affiche un état final (`Ajouter`, `Demande envoyée`, `Retirer`, ou `Réessayer`) en moins de 3 s.

### 1.2 — État vide "Mon Club" dans Classement (écran noir) ✅ DONE

- **Bug :** L'onglet `Classement > Mon Club` charge sans données et n'affiche aucun message.
- **Fix :** `src/app/(app)/leaderboard/page.tsx` — 2 empty states distincts : sans club (`noClubSet` + CTA `/profile?section=club`) vs club défini sans joueurs (`noClubMembers`).
- **Critère d'acceptation :** Aucun écran noir possible, un message est toujours affiché.

### 1.3 — Wizard création de ligue sans bouton Fermer ✅ DONE

- **Bug :** Aucun moyen évident de quitter le wizard en cours.
- **Fix :** `src/components/ligues/CreateLeagueWizard.tsx` — bouton `×` en haut à droite sur toutes les étapes. Étapes 2 et 3 : modale de confirmation inline "Abandonner la création ?". Étape 4 (célébration) : fermeture directe. Traductions en 5 langues.
- **Critère d'acceptation :** L'utilisateur peut quitter le wizard en 1 tap depuis n'importe quelle étape.

**Livrables Sprint 1 :**

- 3 PRs séparées (1 par bug)
- Tests E2E (Playwright/Cypress) sur les 3 scénarios

---

## Sprint 1bis — Bugs UX rapides (hotfixes ciblés)

**Objectif :** Corriger une série de petits bugs UX qui créent de la friction quotidienne. Sprint court, gains immédiats sur la satisfaction.

### 1bis.1 — Suppression définitive du toast "Nouvelle PWA installée" ✅ DONE

- **Bug :** Le toast de mise à jour PWA apparaît à chaque session, devenu intrusif.
- **Fix :** `src/components/pwa/InstallPrompt.tsx` — suppression du toast et de toute la logique d'affichage. Le SW continue de fonctionner silencieusement. L'événement `beforeinstallprompt` est toujours capturé pour un usage futur.
- **Critère d'acceptation :** Plus aucun toast PWA visible en navigation.

### 1bis.2 — Badge "⚡ Premier à pronostiquer" doit disparaître dès qu'un prono existe ✅ DONE

- **Bug :** Le badge reste affiché alors qu'un joueur (parfois l'utilisateur lui-même) a déjà pronostiqué.
- **Fix :** `src/components/pronos/MatchPronoCard.tsx:632` — seuil `< 10` → `=== 0`. Le badge n'apparaît que si aucun prono n'existe sur ce match.
- **Critère d'acceptation :** Le badge reflète strictement l'état "0 prono sur ce match", recalculé en temps réel.

### 1bis.3 — Bug redirection "Mon Club" → édition du club de cœur ✅ DONE

- **Bug :** Sur `Classement > Mon Club`, le CTA "Ajouter un club de cœur" redirige vers `/profil` au lieu d'ouvrir le sélecteur de club.
- **Fix :** CTA pointe vers `/profile?section=club`. `src/components/profile/ProfileHeader.tsx` — `useSearchParams` ouvre automatiquement `ProfileEditModal` si `?section=club` est présent.
- **Critère d'acceptation :** En 1 tap depuis "Mon Club", l'utilisateur arrive sur le sélecteur de club ouvert.

### 1bis.4 — Page Pronos : zone de clic mal délimitée (frustration majeure) ✅ DONE

- **Bug :** Sur `/pronos`, le header de compétition (Link `flex-1`) occupe toute la largeur et redirige vers le lobby au lieu d'ouvrir la section.
- **Fix :** `src/components/pronos/PronosticsHubClient.tsx` — le `Link` perd `flex-1` (taille sur son contenu logo+texte), le bouton toggle gagne `flex-1 justify-end` pour occuper l'espace restant. Tap sur logo/nom = navigation lobby, tap partout ailleurs = expand/collapse.
- **Critère d'acceptation :** L'utilisateur peut saisir un prono sans jamais être redirigé par erreur.

**Livrables Sprint 1bis :**

- 4 PRs séparées
- Tests E2E ciblés sur les 4 scénarios
- Validation manuelle sur mobile (iOS + Android) — les zones de tap doivent être confortables

---

## Sprint 2 — États vides systématiques & filets de sécurité ✅ DONE

**Objectif :** Garantir qu'aucune page n'affiche jamais un écran vide non explicite.

### 2.1 — Composant `<EmptyState>` global ✅

- `src/components/shared/EmptyState.tsx` — props: `variant`, `emoji`, `title`, `description`, `cta`
- 5 variantes : `no-data`, `no-results`, `no-permission`, `error`, `offline`
- Remplace le composant local dans `ProfileHistorique.tsx` et `ProfileBadges.tsx`

### 2.2 — Audit & application sur toutes les pages ✅

- Stade ✅ (empty state déjà présent)
- Pronos ✅ (empty state déjà présent)
- Ligues ✅ (empty state déjà présent)
- Profil > Historique ✅ (migré vers global)
- Profil > Badges ✅ (migré vers global)
- Profil > Amis ✅ (présent, AmisContent)
- Classement > Mon Club ✅ (traité en 1.2)
- Messages ✅ (présent, MessagesPage)
- **Boutique ✅ FIX** : empty state ajouté dans `ShopClient.tsx` pour les onglets vides

### 2.3 — Gestion d'erreur réseau / offline ✅

- `src/components/shared/OfflineBanner.tsx` — bannière persistante, détection `navigator.onLine` + events `online`/`offline`
- Intégrée dans `src/app/(app)/layout.tsx` → visible sur toutes les pages protégées

---

# 🔴 PHASE 2 — Onboarding & identité

## Sprint 3 — Pseudo personnalisé dès l'inscription ✅ DONE

**Objectif :** Supprimer les noms auto-générés type `Jean_Baptiste_Berthe_00b913ab`.

### 3.1 — Migration du flow d'inscription ✅

- `UsernameSetupModal` : bottom sheet avec check debounced, suggestions, skip/save
- Montée dans le lobby via `UsernameSetupPrompt` (détection `/_[0-9a-f]{8}$/i`)
- Suggestions basées sur l'email, validation regex + mots réservés

### 3.2 — Migration des comptes existants ✅

- Bannière "Personnalise ton pseudo" dans `ProfileHeader` si username auto-généré
- Au premier chargement du lobby, modale non-bloquante (skip → localStorage)

### 3.3 — Backend ✅

- `POST /api/users/check-username` : validation regex, mots réservés, unicité DB
- `PATCH /api/profile` : rate-limit 30 j via `username_last_changed_at`
- Migration `0115_username_last_changed_at.sql` + typage `database.ts`

**Critère d'acceptation :** Un nouveau compte ne peut pas être créé sans pseudo lisible.

---

# 🟠 PHASE 3 — Cohérence du Design System

## Sprint 4 — Tokens, composants & harmonisation visuelle ✅ DONE

**Objectif :** Unifier tous les composants disparates identifiés dans le rapport.

### 4.1 — Audit & extraction des tokens ✅

- `globals.css` : tokens `--radius-sm/md/lg/card/sheet/pill` dans `@theme inline`
- Couleur d'accent unique : `whistle` (#facc15) — toutes les instances `amber-500` sur CTAs remplacées

### 4.2 — Composants standardisés ✅

- `ui/FilterPill` : pill de filtre unifié avec états actif/inactif, `rounded-pill`
- `CompetitionFilter` migré sur `FilterPill`
- `ui/BottomSheet` + `ui/Modal` : wrappers avec overlay, animations CSS, titre optionnel
- `ui/Toggle` : switch binaire accessible (`role=switch`, `aria-checked`, focus ring whistle)
- CTAs harmonisés : `LiguesPageClient`, `CreateLeagueWizard`, `OnboardingTour`, `NewSeasonOverlay`, `LeaguePronosList` → `bg-whistle text-zinc-950`

### 4.3 — Storybook ⏭️ hors scope (infrastructure à setup séparément)

**Critère d'acceptation :** Audit visuel cross-page = 0 incohérence de teinte sur CTAs primaires.

---

## Sprint 5 — Standardisation navigation & headers ✅ DONE

**Objectif :** Régler les redondances et incohérences de navigation.

### 5.1 — Casse des titres de page ✅

- `uppercase tracking-wide` ajouté sur les h1 des pages `ligues` et `messages` (cohérence avec settings/rules/laws)
- Amber résiduel corrigé : tabs actifs leaderboard + CTAs empty-state + badge IFAB → `whistle`

### 5.2 — Redondances bottom nav ↔ hamburger ✅ déjà conforme

- BottomNav : Stade, Pronos, Ligues, Profil (4 items uniquement)
- Hamburger : Classement, Boutique, Règles, IFAB, Paramètres — aucun doublon

### 5.3 — Accès Messages ✅

- Lien Messages supprimé du hamburger — icône header avec badge = point d'entrée unique

### 5.4 — Fil d'Ariane ✅

- `ui/Breadcrumb` : composant avec liens cliquables + séparateur ChevronRight
- Utilisé dans `settings/notifications` (remplace le bouton retour manuel)

**Critère d'acceptation :** Chaque destination a 1-2 chemins d'accès clairs, pas 3+. ✅

---

## Sprint 6 — Partage de ligue & viralité

**Objectif :** Augmenter l'acquisition virale par les codes de ligue.

### 6.1 — Bouton partage natif

- Utiliser l'API `navigator.share()` (Web Share API) avec fallback
- Pré-rempli avec : nom de la ligue + code + lien deep link (`vartime://league/<code>` ou URL web)
- Boutons fallback : WhatsApp, SMS, copier
- Composant `<ShareButton>` réutilisable

### 6.2 — Page d'accueil via lien

- Route `/join/<code>` : aperçu de la ligue (nom, emblème, nombre de membres)
- CTA "Rejoindre" (avec gating : connexion requise)
- Si déjà membre : redirection vers la ligue

### 6.3 — Récap visuel en fin de wizard de création

- Étape finale 4/4 : récapitulatif (nom + emblème + mode + code généré) + bouton "Partager maintenant"
- Barre de progression visuelle en haut du wizard

**Critère d'acceptation :** L'utilisateur peut partager sa ligue en 2 taps depuis n'importe où.

---

## Sprint 7 — Séparation du back-office modérateur

**Objectif :** Sortir le panneau modérateur de l'interface joueur.

### 7.1 — Audit du DOM actuel

- Identifier tous les composants visibles uniquement par les modérateurs
- Vérifier qu'aucune route/donnée sensible n'est exposée côté client pour les non-modérateurs

### 7.2 — Dashboard modérateur séparé

- Nouvelle route `/admin/match/<id>` accessible uniquement aux modérateurs
- Onglets : Alertes / Feuille de match / Contrôle
- Lien d'accès rapide depuis la page match (uniquement visible pour modérateurs)
- Conservation du contexte (le match courant)

### 7.3 — Permissions strictes

- Middleware côté API : refuser les actions de modération si rôle ≠ `moderator`
- Audit des routes : `POST /api/matches/<id>/event`, `PATCH /api/matches/<id>/status`, etc.
- Côté client : tree-shaking conditionnel pour ne pas livrer le code admin aux joueurs

### 7.4 — Migration douce

- Maintenir l'ancien panneau pendant 2 semaines avec banner "Bientôt déplacé vers /admin"
- Communication aux modérateurs actifs

**Critère d'acceptation :** Un joueur lambda ne télécharge ni n'affiche aucun composant de modération.

---

## Sprint 7bis — Refonte du système de notifications 🔴

**Objectif :** Corriger les pratiques actuelles qui spamment ou ciblent mal les joueurs. Garantir que chaque notif est utile, groupée et envoyée au bon public.

### 7bis.1 — Groupement des notifications de rappel pré-match

- **Problème actuel :** Si plusieurs matchs se jouent sur le même créneau (ex. samedi 17h pour Ligue 1 + Premier League), l'utilisateur reçoit jusqu'à 20 notifications en quelques minutes.
- **Solution — Bucketing intelligent :**
  - Créer un **scheduler côté backend** qui agrège les rappels par fenêtre de 5-10 minutes par utilisateur
  - Au lieu de N notifs séparées : 1 seule notif groupée
    - Si 1 match : `⚡ Coup d'envoi dans 1h : OM vs PSG — pense à ton prono`
    - Si N matchs : `⚡ 5 matchs commencent dans 1h — 3 pronos à compléter (Ligue 1, PL, La Liga)`
  - Au tap : ouvrir la page `/pronos` filtrée sur les matchs concernés (deep link avec params)
- **Architecture technique :**
  - Job CRON / worker (BullMQ ou équivalent) qui scanne les matchs à venir toutes les 5 min
  - Pour chaque utilisateur : agréger ses matchs "à pronostiquer + à venir dans la fenêtre"
  - Stocker l'agrégat dans une table `notification_buckets` pour éviter les doublons
  - Utiliser le **collapse_key** Firebase / **tag** Apple Push pour remplacer les notifs précédentes
- **Côté client (PWA) :**
  - Le service worker doit gérer `notificationclick` et router vers le bon écran
  - Les notifs groupées doivent utiliser `tag` pour se remplacer entre elles
- **Critère d'acceptation :** Un utilisateur ayant 5 pronos en attente sur le même créneau reçoit **1 seule notif**, pas 5.

### 7bis.2 — Notification "Le match commence dans 5 minutes" — ciblage corrigé

- **Bug actuel :** Cette notif n'est envoyée qu'aux joueurs qui **n'ont pas** fait leur prono d'avant-match. C'est l'inverse de la logique attendue.
- **Comportement attendu :**
  - **Tous les abonnés** au match doivent recevoir cette notif (qu'ils aient pronostiqué ou non), car :
    - Ceux qui ont pronostiqué : envie de suivre le live
    - Ceux qui n'ont pas pronostiqué : dernière chance + invitation à parier sur la VAR
  - Définition de "abonné" :
    - Joueurs ayant activé `S'abonner au match` sur la page match
    - Joueurs appartenant à une ligue qui suit cette compétition
    - Joueurs ayant pronostiqué ce match
    - Joueurs ayant cette compétition dans leurs ligues préférées (filtre notifs)
- **À faire :**
  - Refondre la requête de ciblage : `SELECT users WHERE subscribed_to_match OR predicted_this_match OR (favorite_leagues INCLUDES match.league)`
  - Adapter le contenu de la notif selon le statut :
    - Si pronostiqué : `🔥 5 min avant OM-PSG — Ton prono : 2-1. Bonne chance !`
    - Si pas pronostiqué : `⏱️ 5 min avant OM-PSG — Dernière chance de pronostiquer !`
  - Respecter les toggles utilisateur (`Notifications > Pré-match`)
- **Critère d'acceptation :** 100 % des abonnés au match reçoivent la notif T-5 min, avec contenu adapté.

### 7bis.3 — Notification "Demande d'ami reçue"

- **Manque actuel :** Aucune notif quand quelqu'un envoie une demande d'ami.
- **À faire :**
  - **Notif push** : `👥 {pseudo} t'a ajouté en ami` → ouvre `/profil/{pseudo}` ou panneau Amis
  - **Notif in-app** (cf. Sprint 11 / bell icon) : entrée dans le centre de notifications
  - **Email optionnel** (toggle Paramètres) si l'utilisateur est inactif depuis > 7 jours
  - Toggle dédié dans Paramètres > Notifications : `Demandes d'ami`
- **Backend :**
  - Hook sur `POST /api/friends/request` qui crée l'event de notification
  - Stockage en DB (table `notifications`) pour le centre in-app
- **Critère d'acceptation :** Toute demande d'ami génère une notif push + in-app dans les 30 s.

### 7bis.4 — Notification "Nouveau message reçu"

- **Manque actuel :** Aucune notif quand un message privé est reçu.
- **À faire :**
  - **Notif push** : `💬 {pseudo} : {preview message tronqué à 80 char}` → ouvre la conversation
  - **Notif in-app** : badge sur l'icône Messages du header (compteur de messages non lus)
  - **Groupement** : si plusieurs messages du même contact en moins de 5 min → notif unique mise à jour (`💬 {pseudo} (3 nouveaux messages)`)
  - Toggle dédié dans Paramètres > Notifications : `Messages privés`
  - Respect du "Ne pas déranger" si défini par l'utilisateur (à prévoir si pas déjà en place)
- **Backend :**
  - Hook sur `POST /api/messages` qui crée l'event
  - Utiliser `collapse_key = msg:{conversation_id}` pour grouper
- **Critère d'acceptation :** Tout nouveau message génère une notif (sauf si l'utilisateur est actif sur la conversation à ce moment).

### 7bis.5 — Centre de notifications in-app (bell icon)

- Préparer le terrain pour le Sprint 11 :
  - Composant `<NotificationBell>` dans le header
  - Badge compteur de non-lues
  - Dropdown avec liste paginée des 30 dernières notifs
  - Types couverts : VAR alertes, pronos, pré-match, demandes d'ami, messages, événements ligue
  - Actions : marquer comme lu, marquer tout comme lu, supprimer
- À synchroniser temps réel via WebSocket avec la table `notifications`

**Livrables Sprint 7bis :**

- Schéma backend `notifications` + `notification_buckets`
- Worker de bucketing (jobs CRON)
- Refonte du service worker PWA pour `tag` / `collapse_key`
- 4 nouveaux toggles dans Paramètres > Notifications
- Tests : envoi simultané de 10 matchs → 1 seule notif reçue
- Documentation des stratégies de groupement

---

## Sprint 7ter — Enrichissement KOP & Vestiaire (live in-match)

**Objectif :** Apporter du fun et de la profondeur sociale aux deux onglets phares pendant un match. Renforcer la signature éditoriale "VAR TIME".

### 7ter.1 — Vestiaire : visualisation des % de prédictions

- **Idée :** Sur l'onglet Vestiaire (pendant et avant un match), afficher la **répartition des pronos** des joueurs de mes ligues sous forme de barre 1/N/2.
- **À faire :**
  - Composant `<PredictionDistribution>` : barre horizontale segmentée
    - Segment vert : `% joueurs qui ont pronostiqué Victoire Domicile (1)`
    - Segment gris : `% Match Nul (N)`
    - Segment rouge : `% Victoire Extérieur (2)`
  - Affichage du score moyen attendu si on a la donnée : `Score moyen pronostiqué : 2.1 - 1.4`
  - Variantes d'affichage :
    - Vue **toutes mes ligues** (agrégat)
    - Vue **par ligue** (sélecteur déroulant)
    - Vue **globale VAR TIME** (tendance générale, en bonus)
  - Mise à jour temps réel via WebSocket à mesure que de nouveaux pronos arrivent
  - Empty state : "Aucun joueur n'a encore pronostiqué dans tes ligues — sois le premier"
- **Données nécessaires :**
  - Endpoint API : `GET /api/matches/<id>/predictions/distribution?scope=my-leagues|league/<id>|global`
  - Retourne : `{ home_win_pct, draw_pct, away_win_pct, avg_home_score, avg_away_score, total_predictions }`
- **Bonus :**
  - Highlight de **ma propre prédiction** dans la barre (petit marqueur ⚡)
  - Animation au chargement (les segments se remplissent progressivement)
- **Critère d'acceptation :** L'utilisateur voit en un coup d'œil "comment pensent ses ligues" avant et pendant le match.

### 7ter.2 — KOP : enrichissement éditorial des événements

- **Idée :** Habiller les événements (but, carton jaune, carton rouge, remplacement, penalty, etc.) avec des messages **fun et éditorialisés**, dans le ton VAR TIME. Différencier nettement l'app des frises factuelles classiques.
- **Principes éditoriaux (à valider avec le copywriting interne) :**
  - Ton : impertinent, fan de foot, complicité comptoir, jamais insultant
  - Localisation : prévoir des variantes par langue (FR/EN/ES/DE/IT) — éviter les expressions intraduisibles ou les charger côté FR uniquement dans un premier temps
  - Diversité : 5-10 variantes par type d'événement pour éviter la répétition
- **Structure technique :**
  - Créer un **catalogue de messages** côté backend : table `event_flavor_texts`
    - Colonnes : `event_type` (goal / yellow_card / red_card / sub / penalty / own_goal / var_review / extra_time / kickoff / halftime / fulltime), `locale`, `text`, `tone` (neutre / chambrage / dramatique / ironique), `weight`
  - Sélection aléatoire pondérée à chaque événement (`weight` permet de privilégier certains messages)
  - Variables interpolables : `{player}`, `{team}`, `{minute}`, `{score}` → ex. `"{player} vient de prendre une biscotte à la {minute}ᵉ — ça commence à sentir la douche froide"` (à reformuler dans le ton choisi)
- **Affichage côté KOP :**
  - Sous chaque événement de la timeline, ajouter une **seconde ligne** : la flavor text
  - Style typographique distinct : italique, couleur secondaire, taille plus petite que l'event lui-même
  - Optionnel : icône emoji thématique en plus de l'icône de l'event
- **Catégories d'événements à habiller :**
  - ⚽ But (différencier : but classique / penalty / coup-franc / tête / lob / volée)
  - 🟨 Carton jaune (différencier : faute tactique / contestation / antijeu / simulation)
  - 🟥 Carton rouge (direct / 2ᵉ jaune)
  - 🔄 Remplacement
  - 🥅 Penalty obtenu / raté / arrêté
  - 🤕 Blessure / temps additionnel
  - 📺 VAR consultée (intervention / non-intervention)
  - 🏁 Coup d'envoi / mi-temps / fin du match
  - ⚽💥 But contre son camp (CSC)
- **Outil interne (admin / modérateur) :**
  - Page d'admin pour ajouter, éditer, désactiver des flavor texts
  - Possibilité de marquer des textes comme "saisonniers" (ex. spécial derby, spécial finale)
- **À faire pour ce sprint (MVP) :**
  - Catalogue initial de **80-100 textes en FR** (8-10 par type d'événement)
  - Brief copywriting à rédiger (ton, do/don't, exemples)
  - Affichage côté KOP avec animation d'apparition douce (fade-in 200ms)
  - Toggle Paramètres : `Commentaires fun dans le KOP` (par défaut : activé)
- **Critère d'acceptation :** Aucun événement n'apparaît "nu" — chaque event a sa ligne éditoriale, et l'utilisateur peut désactiver la feature s'il préfère le mode sobre.

### 7ter.3 — Bonus cohérence : flavor texts dans les notifications VAR

- Réutiliser le même catalogue (ou un dérivé) pour habiller les notifs push d'actions VAR
- Ex. notif `🚨 VAR PÉNO ?` → corps de notif personnalisé avec un texte du catalogue

**Livrables Sprint 7ter :**

- Schéma DB `event_flavor_texts`
- 80-100 textes initiaux FR validés
- Endpoint API `GET /api/matches/<id>/events` enrichi avec `flavor_text`
- Composant `<PredictionDistribution>` (barre 1/N/2)
- Endpoint API `GET /api/matches/<id>/predictions/distribution`
- Toggle Paramètres `Commentaires fun dans le KOP`
- Documentation copywriting (do/don't, exemples par type)

---

# 🟡 PHASE 4 — Optimisations UX

## Sprint 8 — Inventaire boutique

**Objectif :** L'utilisateur doit voir clairement ce qu'il possède.

### 8.1 — Nouvelle section "Mes items"

- 5ᵉ onglet dans la Boutique : `Mes items`
- Sous-sections : Avatars / Bordures / Effets / Boosters (mêmes 4 catégories)
- Indicateur visuel sur chaque item : `Possédé`, `Équipé`, `Non possédé`
- CTA "Équiper" / "Désequiper" sur chaque item possédé

### 8.2 — Badges sur les cartes d'items

- Pastille `✓` sur les items déjà possédés dans la vue boutique principale
- Filtre rapide : `Tout` / `Disponible` / `Possédé`

### 8.3 — Page "Avatar équipé"

- Aperçu de l'avatar complet (bordure + effet + avatar) en haut de la boutique
- Édition rapide depuis là sans aller dans le profil

**Critère d'acceptation :** L'utilisateur sait en 2 s ce qu'il possède.

---

## Sprint 9 — Gamification visuelle

**Objectif :** Renforcer les feedbacks visuels de progression.

### 9.1 — Barre de progression des pronos

- Remplacer "12 pronostiqués · 10 restants" par une barre visuelle
- Composant `<ProgressBar>` avec animation au remplissage
- Couleur : jaune-or si > 50 %, gris sinon

### 9.2 — Countdown animé sur matchs à venir

- Sur la page match en mode "À VENIR", animation du compte à rebours (jours/heures/minutes)
- Ajout d'un module **Head-to-Head** : dernières confrontations entre les 2 équipes (5 derniers matchs)
- API à connecter (TheSportsDB ou équivalent)

### 9.3 — Bouton "S'abonner au match" mis en avant

- Augmenter la taille de l'icône notification dans le header de match
- Texte explicatif au tap : "Sois notifié au coup d'envoi et sur les actions VAR"

### 9.4 — Standardisation des loaders

- Tous les loaders → **skeleton loaders** (cohérence avec KOP)
- Supprimer les "Chargement des matchs…" texte + barre indéterminée (page Passeurs notamment)
- Composant `<SkeletonCard>` réutilisable par type de carte

**Critère d'acceptation :** Tous les loaders sont des skeletons, la progression des pronos est visuelle.

---

## Sprint 10 — Accessibilité WCAG AA

**Objectif :** Atteindre la conformité WCAG 2.1 niveau AA.

### 10.1 — Audit contrastes

- Lancer un audit Lighthouse + axe-core sur toutes les pages
- Liste des textes à corriger (notamment labels gris sur fond zinc-950)
- Ajuster les tokens : `--color-text-secondary` doit être au minimum `#A1A1AA` (zinc-400) pour ratio 4.5:1 sur zinc-950

### 10.2 — Focus management

- Audit clavier : navigation `Tab` sur toutes les pages principales
- Focus trap sur les modales (`react-focus-lock` ou équivalent)
- Focus trap sur les bottom sheets
- Focus visible : outline jaune-or 2 px sur tous les éléments interactifs

### 10.3 — Labels & rôles ARIA

- Audit des emojis utilisés comme icônes : ajouter `role="img"` et `aria-label` contextuel
  - `🏆` → `aria-label="trophée"` ou meilleur, contextuel (`aria-label="Badge débloqué"`)
- Vérifier tous les `aria-label` des boutons et icônes du header / bottom nav

### 10.4 — Ordre de lecture

- Réordonner le DOM du panneau modérateur (cf. Sprint 7) pour qu'il ne perturbe pas l'ordre de lecture
- Tester avec NVDA / VoiceOver sur la page match

### 10.5 — Reduced motion

- Respecter `prefers-reduced-motion` pour toutes les animations (countdown, skeleton, transitions)

**Critère d'acceptation :** Score Lighthouse Accessibility ≥ 95, audit axe-core 0 violations critiques.

---

# 🟢 PHASE 5 — Long terme

## Sprint 11 — Messagerie enrichie

**Objectif :** Rapprocher la messagerie du standard WhatsApp light.

### 11.1 — Indicateurs de lecture

- Statuts : envoyé / livré / lu (simple coche / double coche)
- Synchronisation en temps réel (WebSocket)

### 11.2 — Indicateur "en train d'écrire…"

- Event `typing` via WebSocket avec debounce 2 s

### 11.3 — Recherche & groupes

- Barre de recherche dans la liste de conversations
- Groupes de discussion (pour les ligues notamment, lien avec le vestiaire)

### 11.4 — Notifications in-app

- Bell icon dans le header avec dropdown
- Liste des notifications (VAR alertes, messages, événements ligue)
- Marquer comme lu

**Critère d'acceptation :** Parité de fonctionnalités avec une messagerie sociale standard.

---

## Sprint 12 — Onboarding interactif & Light Mode

**Objectif :** Réduire le temps de prise en main pour les nouveaux + offrir un mode clair.

### 12.1 — Tutoriel interactif (onboarding)

- 4-5 étapes guidées au premier login :
  1. Présentation du concept (VAR + pronos)
  2. Démo d'un prono inline (simulation)
  3. Démo d'un pari VAR (bottom sheet)
  4. Tour des sections principales (Stade, Pronos, Ligues, Profil)
  5. Invitation à rejoindre/créer une ligue
- Composant `<Tour>` avec overlays + tooltips
- Skip possible à tout moment
- Replay accessible depuis Paramètres

### 12.2 — Light mode

- Créer un set de tokens `--theme-light-*` en parallèle du dark
- Toggle dans Paramètres + détection `prefers-color-scheme`
- Audit visuel page par page
- Adapter les emojis sombres si besoin (filtres CSS)

### 12.3 — Mode haut contraste (a11y)

- Tokens dédiés WCAG AAA
- Toggle dédié dans Paramètres > Accessibilité

**Critère d'acceptation :** Onboarding complété par 80 % des nouveaux comptes, light mode disponible et testé.

---

# 📊 Récapitulatif & dépendances

```
Sprint 1 (bugs critiques) ──┐
Sprint 1bis (bugs UX rapides)┤
                             ├──> Sprint 2 (états vides)
Sprint 3 (pseudo) ───────────┘
                              │
Sprint 4 (DS tokens) ─────────┼──> Sprint 5 (nav) ──> Sprint 6 (partage)
                              │
Sprint 7 (back-office) ───────┘

Sprint 7bis (notifications) ── peut démarrer en parallèle dès S1 (backend lourd)
Sprint 7ter (KOP/Vestiaire) ── dépend de Sprint 4 (DS) + copywriting

Sprint 8 (inventaire) ─ indépendant
Sprint 9 (gamif) ────── dépend de Sprint 4
Sprint 10 (a11y) ────── dépend de Sprint 4

Sprint 11 (messagerie) ─ dépend de Sprints 5 + 7bis (centre de notifs)
Sprint 12 (onboarding) ─ dépend de Sprints 3, 4, 5
```

## Ordre d'exécution recommandé (révisé)

1. **Semaine 1 :** Sprints 1 + 1bis (hotfixes parallélisables) + démarrage backend 7bis
2. **Semaine 2-3 :** Sprint 2 + Sprint 3 + suite Sprint 7bis (notifications)
3. **Semaine 4-5 :** Sprint 4 (DS) + fin Sprint 7bis
4. **Semaine 6-7 :** Sprints 5, 6 + démarrage Sprint 7ter (KOP)
5. **Semaine 8-9 :** Sprint 7 (back-office) + fin Sprint 7ter
6. **Semaine 10-11 :** Sprints 8, 9, 10 (parallélisables)
7. **Semaine 12+ :** Sprints 11, 12

## Métriques de succès globales

- 0 écran noir / état vide non géré
- 0 incohérence de design system (audit visuel)
- Lighthouse Accessibility ≥ 95
- Taux de complétion onboarding ≥ 80 %
- Taux de partage de ligue x2
- **Réduction du volume de notifs pré-match : -70 %** (grâce au groupement)
- **Taux d'engagement KOP : +30 %** (flavor texts + distributions de pronos)
- **0 plainte "trop de notifs"** dans les retours utilisateurs

---

_Document généré le 11 mai 2026 — basé sur le rapport UX/UI VAR TIME du 10 mai 2026_
_Mis à jour le 11 mai 2026 avec les bugs et features additionnels remontés par le produit_
