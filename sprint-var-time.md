## 📅 Sprint 1 — Semaine 1 (P0 + P1)

### 🔴 TICKET 1.2 — Noms d'équipes tronqués (P1)

**Problème** : Sur la page Pronos en mobile, les noms d'équipes sont coupés en "Manchester..", "Crystal...", rendant Man City et Man United indiscernables.

**Tâche** :

- Localiser le composant qui affiche les noms d'équipes (probablement `<MatchCard />` ou similaire dans `components/pronos/`)
- Implémenter une stratégie en cascade :
  1. Créer un mapping `TEAM_SHORT_NAMES` avec les abréviations res (MCI, MUN, CRY, NFO, etc.) — fichier `lib/teams/shortNames.ts`
  2. Sur mobile (`< sm:`), afficher l'abréviation officielle + logoofficielles à 3 lettres (MCI, MUN, CRY, NFO, etc.) — fichier `lib/teams/shortNames.ts`
  3. Sur mobile (`< sm:`), afficher l'abréviation officielle + logo
  4. Sur desktop, afficher le nom complet
  5. Fallback si pas dans le mapping : `truncate` avec `max-width` calculé
- Optionnel : afficher le nom complet sur tap/hover (tooltip ou modal)

**Critères d'acceptation** :

- À 390px de large, deux équipes "Manchester X" différentes sont visuellement distinctes
- Pas de troncature sur les noms courts (Lyon, Lille, Monaco)
- Cohérence : même rendu sur la home (Stade), Pronos, classements

---

### 🔴 TICKET 1.3 — Page Stade vide "La VAR dort..." (P1)

**Problème** : Quand aucun match n'est en direct, la moitié inférieure de l'écran Stade est vide. Mauvaise première impression.

**Tâche** :

- Remplacer l'état vide par un écran d'engagement avec sections empilées :
  1. **Bloc actuel** "La VAR dort 😴" — conserver mais réduire à 1/3 de l'écran
  2. **Prochains matchs (24h)** : liste des 3 prochains matchs avec heure de coup d'envoi et CTA "Faire mon prono"
  3. **Tes pronos du jour** : si l'utilisateur a déjà des pronos en attente, les afficher
  4. **Top performers de la semaine** : top 3 du classement global (preview, CTA "Voir le classement")
  5. **Fil d'actualité** (optionnel) : derniers résultats VAR clôturés
- Composant : `<StadeIdleState />` dans `components/stade/`
- Lazy-load les sections 4 et 5 si données pas dispo (skeleton screens)

**Critères d'acceptation** :

- Plus aucune zone noire vide en bas d'écran
- Chaque bloc a un CTA clair menant vers la section concernée
- Loading states présents pendant le fetch

---

### 🟠 TICKET 1.5 — Modal "Bilan d'hier" conditionnelle (P1)

**Problème** : La modale s'ouvre toujours au démarrage avec des valeurs à 0 quand l'utilisateur n'a pas joué la veille. Friction inutile.

**Tâche** :

- Localiser le composant `<DailyRecapModal />` ou équivalent
- Ajouter une condition d'affichage : `if (yesterdayActivity.totalPronos > 0 || yesterdayActivity.varBets > 0) showModal()`
- Si pas d'activité, soit :
  - Ne rien afficher
  - Afficher un petit toast non-bloquant "Reprends là où tu t'es arrêté" avec CTA vers Pronos
- Côté API : s'assurer que `/api/user/yesterday-recap` retourne un flag `hasActivity` clair
- Ajouter une localStorage key `lastRecapShown` pour éviter de re-afficher dans la même journée

**Critères d'acceptation** :

- Sans activité la veille → pas de modale
- Avec activité → modale s'affiche comme avant
- Re-ouverture de l'app dans la journée → pas de re-affichage

---

### 🟠 TICKET 1.6 — Indicateur de scroll horizontal sur filtres ligues (P1)

**Problème** : La barre de filtres de ligues sur la page Stade scrolle horizontalement sans aucun affordance visuelle.

**Tâche** :

- Composant ciblé : barre `<LeagueFilters />` sur `/stade`
- Ajouter un dégradé de masque sur le bord droit (et gauche si scrollé) :
  ```tsx
  <div className="relative">
    <div className="overflow-x-auto scrollbar-hide flex gap-2">{filters}</div>
    <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-black to-transparent" />
  </div>
  ```
- Ajouter une détection JS pour masquer le dégradé quand on est en fin de scroll (optionnel mais propre)
- Appliquer le même pattern partout où il y a des filtres scrollables (Pronos, Boutique, etc.)

**Critères d'acceptation** :

- Le fade droit est visible dès qu'il y a du contenu hors écran
- Le fade gauche apparaît dès qu'on commence à scroller
- Cohérence visuelle sur tous les écrans avec filtres scrollables

---

## 📅 Sprint 2 — Semaine 2 (P2)

### 🟠 TICKET 2.1 — Badge notification "Ligues" persistant

**Problème** : Le badge rouge sur "Ligues" en bottom nav reste actif même après consultation.

**Tâche** :

- Localiser la logique du badge dans `<BottomNav />`
- Vérifier la condition d'affichage : doit dépendre d'un `unreadCount` côté state global (Zustand/Redux/Context)
- À chaque visite de `/ligues` (et `/ligues/[id]`), appeler `markLeaguesAsRead()` qui :
  - Met le compteur local à 0
  - Appelle `POST /api/notifications/mark-read?scope=leagues`
- Persister le timestamp de dernière visite côté serveur pour éviter le reset au reload

**Critères d'acceptation** :

- Le badge disparaît immédiatement après ouverture de Ligues
- Il réapparaît si un nouveau message arrive
- Aucune persistance fantôme après reload

---

### 🟠 TICKET 2.2 — État vide "Ma Ligue" dans le classement

**Problème** : L'onglet "Ma ligue" du classement est complètement vide sans contexte.

**Tâche** :

- Détecter dans le composant `<MyLeagueRanking />` les cas :
  - Utilisateur sans ligue → afficher EmptyState 1
  - Ligue existante mais 1 seul membre → afficher EmptyState 2
- **EmptyState 1** :
  ```
  🏆 Tu n'as pas encore de ligue privée
  Crée ta ligue ou rejoins celle de tes potes pour comparer vos pronos.
  [CTA: Créer une ligue]  [CTA secondaire: Rejoindre une ligue]
  ```
- **EmptyState 2** :
  ```
  👥 Tu es seul dans ta ligue
  Invite tes potes avec ton code "ABC123" pour démarrer la compétition.
  [CTA: Partager le code]
  ```
- Composant réutilisable : `<EmptyState illustration title description ctas />`

**Critères d'acceptation** :

- Plus aucun écran blanc/noir sans message
- CTA fonctionnels et trackés
- Variantes selon les cas testées

---

### 🟠 TICKET 2.3 — Descriptions complètes des badges

**Problème** : Les descriptions des badges verrouillés sont tronquées sans accès au texte complet.

**Tâche** :

- Sur la page profil, onglet Badges : ajouter un `onClick` sur chaque badge
- Au tap, ouvrir une modale `<BadgeDetailModal />` avec :
  - Visuel du badge (état actuel : verrouillé/débloqué)
  - Nom complet
  - Description complète (sans troncature)
  - **Conditions de déblocage explicites** : ex. "Trouve le buteur exact sur 5 matchs"
  - Si débloqué : date d'obtention
  - Progression si applicable (ex. "3/5 buteurs trouvés")
- Côté data : enrichir le modèle Badge avec `unlockConditions: string[]`, `progress: { current: number, target: number }`

**Critères d'acceptation** :

- Tap sur n'importe quel badge ouvre la modale
- Toutes les conditions de déblocage sont lisibles
- Animation d'ouverture fluide (slide-up)

---

### 🟡 TICKET 2.4 — Cohérence CTA (Streak Freeze)

**Problème** : Le bouton "Acheter un Streak Freeze" est bleu sombre, incohérent avec les autres CTA jaunes.

**Tâche** :

- Audit rapide de tous les CTA d'achat dans l'app
- Créer/utiliser un composant unifié `<PrimaryCTA />` :
  ```tsx
  // Variante "buy" : fond jaune, texte noir, icône 🟡
  // Variante "secondary" : fond gris-900, texte blanc
  // Variante "danger" : fond rouge, texte blanc
  ```
- Appliquer la variante "buy" sur Streak Freeze
- Vérifier toute la section Paramètres et Boutique pour la cohérence

**Critères d'acceptation** :

- Tous les CTA d'achat sont visuellement identifiables comme tels
- Plus de mélange de couleurs sur des actions de même nature
- Documentation du DS : composant `<PrimaryCTA />` documenté avec variants

---

### 🟡 TICKET 2.5 — Onboarding : navigation bidirectionnelle

**Problème** : Impossible de revenir en arrière dans le flow d'onboarding.

**Tâche** :

- Ajouter dans `<OnboardingFlow />` :
  - Bouton "← Précédent" en haut à gauche (sauf slide 1)
  - Support du swipe horizontal (left/right) — utiliser `framer-motion` si déjà présent, sinon `react-swipeable`
  - Dots de pagination cliquables pour sauter à une slide précédente uniquement (pas en avant)
- Conserver l'état des inputs si l'utilisateur revient en arrière puis repart

**Critères d'acceptation** :

- Swipe right → slide précédente
- Tap sur un dot précédent → navigation directe
- Pas de perte de données saisies

---

### 🟡 TICKET 2.6 — Cohérence majuscules dans l'onboarding

**Problème** : Boutons alternent entre `C'EST PARTI →` et `C'est parti →`.

**Tâche** :

- Définir une règle dans le DS : **tous les CTA primaires d'onboarding en uppercase**
- Implémenter via CSS `text-transform: uppercase` sur le composant `<OnboardingCTA />` ou via une utility Tailwind `uppercase`
- Pas changer le texte source (garder la casse normale en strings), juste la display
- Audit de tous les CTA du flow

**Critères d'acceptation** :

- Tous les CTA d'onboarding sont en uppercase visuellement
- Le texte source reste lisible en code (i18n-friendly)

---

### 🟡 TICKET 2.8 — Cohérence avatars verrouillés

**Problème** : Modal d'édition de profil n'affiche pas le prix/condition des avatars verrouillés, contrairement à `/shop`.

**Tâche** :

- Composant partagé `<AvatarTile />` réutilisé entre `/profile/edit` et `/shop`
- Props :
  ```ts
  type Props = {
    avatar: Avatar;
    unlockType: "rank" | "price" | "event";
    unlockValue: string | number;
    isUnlocked: boolean;
  };
  ```
- Afficher systématiquement :
  - Si verrouillé par prix : "1000 🟡"
  - Si verrouillé par rang : "Rang Or requis"
  - Si verrouillé par event : "Saison terminée"
- Sur tap d'un avatar verrouillé → modale avec détails + CTA débloquer

**Critères d'acceptation** :

- Comportement identique entre profil edit et shop
- Aucun cadenas "muet" sans info

---

## 📅 Sprint 3 — Semaine 3 (P3 + polish)

### 🟢 TICKET 3.1 — Preview du niveau XP suivant

**Tâche** :

- Sous la barre de progression XP, ajouter un mini-bloc "Prochain palier" :
  - Icône du rang suivant (Silver, Gold, etc.)
  - 2-3 récompenses débloquées (avatars, badges, fonctionnalités)
  - Texte : "Plus que 1490 XP pour débloquer le rang Argent et 3 nouveaux avatars"
- Composant : `<NextRankPreview currentRank nextRank xpRemaining rewards />`

---

### 🟢 TICKET 3.2 — Styling du Streak Freeze

Voir Ticket 2.4 (à grouper).

---

### 🟢 TICKET 3.4 — Pull to refresh

**Tâche** :

- Implémenter sur `/stade` et `/pronos`
- Utiliser `react-pull-to-refresh` ou native CSS si compatible Safari iOS
- Spinner cohérent avec le DS (jaune sur fond noir)
- Re-fetch les queries React Query / SWR concernées

---

### 🟢 TICKET 3.5 — Placeholder engageant dans le vestiaire

**Tâche** :

- Remplacer `placeholder="Écris un message..."` par des variations rotatives :
  - "Brague tes potes 😏"
  - "Balance ton prono de la semaine 🎯"
  - "Ton avis sur le match d'hier ?"
- Composant `<RotatingPlaceholder messages={[...]} />`
- Rotation toutes les 4 secondes ou à chaque focus

---

### 🟢 TICKET 3.7 — Tooltips et infobulles

**Tâche** :

- Composant `<InfoTooltip>` réutilisable (Radix UI ou custom)
- Ajouter sur :
  - "Mise minimum" dans les paramètres
  - "Sifflets" (qu'est-ce que c'est ? comment en gagner ?)
  - "Win Rate" sur la page profil
- Icône (i) à côté du label, tap pour ouvrir tooltip

---

### 🟢 TICKET 3.8 — Pseudos longs tronqués proprement

**Tâche** :

- Dans les classements, limiter l'affichage des pseudos à 14 caractères + ellipsis
- Sur tap → modale ou tooltip avec le pseudo complet
- Utility : `<UserName fullName={...} maxLength={14} />`

---

### 🟢 TICKET 3.9 — Audit i18n

**Tâche** :

- Vérifier que les pseudos auto-générés et descriptions d'avatars sont traduits dans les 5 langues (fr/en/es/de/it)
- Identifier les chaînes hardcodées non passées par le système i18n
- Lister dans un rapport `i18n-audit.md`

---

### 🟢 TICKET 3.10 — Contraste des labels en mode profil compact

**Tâche** :

- Auditer le contraste de "Sifflet de Bronze" et "Paris SG" en mode compact
- Si < WCAG AA (4.5:1) : éclaircir le texte ou assombrir/uniformiser le fond
- Tester avec Lighthouse / axe DevTools

---

## ✅ Definition of Done globale

Pour chaque ticket fermé, vérifier :

- [ ] Code committé avec message conventionnel (`fix(ux): ...`, `feat(ux): ...`)
- [ ] Testé sur mobile (390px) et desktop (1280px+)
- [ ] Pas de régression visuelle sur les écrans adjacents
- [ ] Composants typés (TypeScript strict)
- [ ] Aucun warning console
- [ ] Lighthouse a11y score ≥ 90 sur les pages touchées
- [ ] Capture avant/après dans la PR

# Sprint 4 VAR TIME — Bugs critiques, données live & cohérence éditoriale

**Stack** : Next.js + Tailwind CSS
**Durée** : 1 semaine
**Destinataire** : Claude Code
**Source** : Retours produit du 12/05/2026 (complément à l'audit UX/UI)
**Prérequis** : Sprints 1-3 terminés (ou en parallèle si équipe le permet)

## 📅 Sprint 4 — Détail des tickets

### 🔴 TICKET 4.1 — Bug : page "profil d'un ami" cassée (P0)

**Problème** : L'affichage de la page profil d'un autre utilisateur semble cassé. Symptômes à confirmer (overlay manquant, layout brisé, data missing).

**Phase 1 — Investigation (obligatoire)** :

- Reproduire en cliquant depuis : classement global, classement ligue, vestiaire de ligue, messages privés
- Identifier la route concernée (`/profile/[userId]` ou `/u/[username]`)
- Comparer le rendu avec la page de profil personnel (`/profile`)
- Documenter dans la PR :
  - Capture d'écran du bug
  - Logs console + network
  - Hypothèses sur la cause (props manquantes, route mal nommée, composant partagé avec props conditionnelles)

**Phase 2 — Correction probable** :

- Causes typiques à vérifier :
  1. Le composant `<ProfileView />` reçoit-il bien le bon `userId` en props ?
  2. Y a-t-il un fallback quand `userId !== currentUser.id` ?
  3. Les sections sensibles (édition, paramètres) sont-elles bien masquées sur un profil tiers ?
  4. Les données privées (sifflets, paramètres VAR) sont-elles correctement filtrées côté API ?
- Refactor possible : séparer `<OwnProfileView />` et `<PublicProfileView />` si la logique conditionnelle est trop dense

**Critères d'acceptation** :

- La page profil d'un ami s'affiche sans erreur visuelle
- Aucune donnée privée n'est exposée (bilan personnel, paramètres, etc.)
- Le bandeau "Accès Modérateur" (cf. audit initial) reste masqué sur un profil tiers sauf si l'utilisateur courant est mod
- Tests sur 3+ profils différents (ami, joueur random du classement, mod)

---

### 🔴 TICKET 4.2 — Bug : résolution des paris avec mauvaises côtes (P0)

**Problème suspecté** : Lors de la résolution des paris (pronos + buteurs), le système utilise des côtes en dur (anciennes valeurs codées) au lieu de la côte **calculée et affichée au moment où le joueur a fait son prono**.

**Impact business** : Les utilisateurs gagnent moins (ou plus) que ce qui leur a été promis au moment du prono. Bug de confiance critique.

**Phase 1 — Audit (obligatoire avant tout fix)** :

- Localiser :
  1. Le **calculateur de côtes** côté front (au moment où le joueur place son prono) — probablement dans `lib/odds/` ou `hooks/useOdds`
  2. Le **résolveur de paris** côté backend (cron/job ou endpoint déclenché à la fin du match) — probablement dans `api/cron/resolve-bets` ou `lib/bets/resolver`
- Documenter dans la PR :
  - Schéma du flux actuel : calcul côte → affichage → enregistrement prono → résolution
  - Identifier **où la côte se perd ou se recalcule à tort**

**Phase 2 — Correction** :

- **Principe directeur** : la côte affichée au joueur **doit être figée** à l'instant du prono
- Vérifier le schéma de la table `pronos` / `bets` :
  - Existe-t-il un champ `oddsAtSubmit` (decimal) ?
  - Sinon, **l'ajouter via migration** et le populer au moment du `POST /api/pronos`
- Au moment de la résolution :

  ```ts
  // ❌ Ancien (probable)
  const payout = bet.stake * HARDCODED_ODDS[bet.type];

  // ✅ Nouveau
  const payout = bet.stake * bet.oddsAtSubmit;
  ```

- Migration des paris existants : décision produit nécessaire (recalculer rétroactivement ? laisser tel quel et fixer pour le futur uniquement ?)

**Critères d'acceptation** :

- Un test e2e : faire un prono à 2.5x → forcer un résultat → vérifier que le payout = stake × 2.5
- Aucune référence à des côtes hardcodées dans le résolveur (rechercher dans le code `2.0`, `3.0`, `ODDS_` constants)
- Logs serveur ajoutés : `[resolve-bet] betId=X oddsAtSubmit=Y stake=Z payout=W`
- Tests unitaires sur le résolveur couvrant les cas : pronos simples, paris buteurs, paris combinés

---

### 🔴 TICKET 4.3 — Bug : alertes VAR en attente sur matchs clôturés (P0)

**Problème suspecté** : Des alertes VAR déclenchées **pile à la limite de fin de match** restent en statut "en attente" indéfiniment, alors que le match est clôturé.

**Impact** : Paris VAR jamais résolus, utilisateurs ne récupèrent ni gain ni mise.

**Phase 1 — Audit (obligatoire)** :

- Identifier dans la DB toutes les alertes VAR avec `status = 'pending'` et `match.status = 'finished'`
- Compter combien sont concernées (requête SQL à fournir dans la PR)
- Comprendre le timing :
  - À quel instant est marqué `match.endedAt` ?
  - À quel instant est créée l'alerte VAR ?
  - Y a-t-il une **race condition** entre `match.endedAt` et la création de l'alerte ?

**Phase 2 — Correction (en deux temps)** :

**A. Fix du bug** :

- Définir une **fenêtre de tolérance** post-match (ex. 5 minutes) pendant laquelle une alerte VAR peut encore être créée et résolue
- Au moment de la création d'une alerte VAR :
  ```ts
  if (now > match.endedAt + TOLERANCE_WINDOW) {
    throw new Error("VAR_WINDOW_CLOSED");
  }
  ```
- Au moment où le match passe en `finished` :
  - Forcer la résolution de toutes les alertes VAR `pending` (soit valides, soit annulées avec remboursement)

**B. Rattrapage des paris orphelins existants** :

- Script de migration `scripts/resolve-orphan-var-alerts.ts` :
  - Lister toutes les alertes en `pending` sur matchs `finished` depuis > 1h
  - Tenter une résolution via l'historique du match (si on a l'info)
  - Sinon : annuler et rembourser les mises
- Logger chaque action pour audit

**Critères d'acceptation** :

- Plus aucune alerte VAR `pending` sur match `finished` après le job de rattrapage
- Le script de rattrapage est idempotent (peut tourner plusieurs fois sans bug)
- Test e2e : créer une alerte VAR à T-30s de la fin, forcer la fin → l'alerte est résolue ou annulée, jamais laissée pending
- Monitoring : alerte Sentry/Datadog si un `pending > 30min sur match finished` réapparaît

---

### 🟠 TICKET 4.4 — Feature : rubrique "Head to Head" avant-match (P1)

**Problème / Besoin** : Enrichir l'onglet Statistiques avant le coup d'envoi avec un historique Head to Head entre les deux équipes.

**Source data** : API Football (https://www.api-football.com/) — endpoint `/fixtures/headtohead`

**Tâche** :

**A. Intégration API** :

- Vérifier si une clé API Football est déjà présente dans `.env` (sinon créer la requête côté ops)
- Créer un wrapper `lib/apiFootball/headToHead.ts` :
  ```ts
  export async function getHeadToHead(
    team1Id: number,
    team2Id: number,
    limit = 10,
  ) {
    // GET https://v3.football.api-sports.io/fixtures/headtohead?h2h={team1}-{team2}&last={limit}
    // Cache 24h en Redis (key: h2h:{team1}:{team2})
  }
  ```
- Gérer le mapping `internalTeamId ↔ apiFootballTeamId` (table `team_external_mappings` si pas déjà existante)

**B. Composant UI** :

- `<HeadToHeadStats matchId={...} />` dans `components/match/stats/`
- Affichage :
  - Stat globale : "Sur les 10 derniers matchs, City a gagné 6 fois, Liverpool 3 fois, 1 nul"
  - Liste compacte des 5 derniers H2H (date, score, lieu)
  - Graphique en barres horizontales ou pie chart (victoires/nuls/défaites)
- États : loading (skeleton), error (fallback "Données indisponibles"), empty (équipes qui ne se sont jamais affrontées)

**C. Intégration** :

- Ajouter un onglet "Head to Head" ou une section dans l'onglet "Statistiques" existant de la page match
- Ne s'affiche que **avant le coup d'envoi** (pas en direct, pas après le match)

**Critères d'acceptation** :

- Section visible et fonctionnelle sur 5+ matchs à venir testés
- Cache 24h respecté (pas de spam API)
- Composant responsive 390px
- Fallback élégant si API down

---

### 🟠 TICKET 4.5 — Feature : refresh automatique des classements en fin de match (P1)

**Problème / Besoin** : Les classements des équipes (par ligue), buteurs et passeurs doivent être à jour **après chaque fin de match**.

**Tâche** :

**A. Architecture** :

- Identifier le **trigger** : webhook API Football quand un match passe `finished` OU polling toutes les X minutes pour détecter les transitions `live → finished`
- Créer un job/cron `jobs/refreshLeagueStandings.ts` :
  ```ts
  // Déclenché à chaque match.status: 'live' → 'finished'
  async function onMatchFinished(matchId: string) {
    const match = await getMatch(matchId);
    await Promise.all([
      refreshLeagueStandings(match.leagueId),
      refreshTopScorers(match.leagueId),
      refreshTopAssists(match.leagueId),
    ]);
    await invalidateCache([
      `standings:${match.leagueId}`,
      `topScorers:${match.leagueId}`,
      `topAssists:${match.leagueId}`,
    ]);
  }
  ```

**B. Sources data** :

- API Football endpoints :
  - `/standings?league={id}&season={year}`
  - `/players/topscorers?league={id}&season={year}`
  - `/players/topassists?league={id}&season={year}`
- Stocker en DB (tables `league_standings`, `top_scorers`, `top_assists`) avec timestamp `updatedAt`

**C. Côté front** :

- Afficher `updatedAt` sous le classement : "Mis à jour il y a 3 min"
- Bouton refresh manuel (optionnel) avec rate limit côté serveur
- React Query / SWR : `staleTime: 5 min`, `revalidateOnFocus: true`

**D. Edge cases** :

- Si 2 matchs finissent en même temps dans la même ligue → debounce de 30s avant refresh
- Si l'API Football est down → réessayer avec backoff (3 tentatives max), logger l'erreur, garder l'ancien classement affiché

**Critères d'acceptation** :

- Test e2e : forcer un match à `finished` → classement mis à jour dans les 60s
- Pas de doublon de refresh si plusieurs matchs finissent en simultané
- Timestamp visible côté UI
- Logs structurés : `[standings-refresh] leagueId=X duration=Yms`

---

### 🟠 TICKET 4.6 — Filtrage des journées dans les ligues (P1)

**Problème** : Sur les pages de ligues (matchs passés), les filtres affichent à tort "Quart", "Demie", "Finale" sur les ligues domestiques. Ces étiquettes ne doivent apparaître **que pour la section Europe** (UCL, Europa League, etc.).

**Tâche** :

**A. Logique de filtrage** :

- Identifier le composant `<LeagueMatchdaysFilter />` ou similaire
- Définir une constante :
  ```ts
  const KNOCKOUT_LEAGUES = ["UCL", "UEL", "UECL", "WORLD_CUP", "EURO"];
  // Ces ligues acceptent les étiquettes éliminatoires
  ```
- Logique :
  ```ts
  function getMatchdayLabels(leagueCode: string, season: Season) {
    if (KNOCKOUT_LEAGUES.includes(leagueCode)) {
      return [...regularMatchdays, ...knockoutRounds];
      // Knockouts: 'Barrages', '8es', 'Quarts', 'Demies', 'Finale'
    }
    return regularMatchdays; // J1 à J38 (ou J34 pour Bundesliga, etc.)
  }
  ```

**B. Mapping des journées par ligue** :

- Créer `lib/leagues/matchdayConfig.ts` :
  ```ts
  export const MATCHDAY_CONFIG = {
    L1: { totalDays: 34, hasKnockout: false },
    PL: { totalDays: 38, hasKnockout: false },
    LIGA: { totalDays: 38, hasKnockout: false },
    BUNDESLIGA: { totalDays: 34, hasKnockout: false },
    SERIE_A: { totalDays: 38, hasKnockout: false },
    UCL: {
      groupStage: { totalDays: 8 }, // Format ligue 2024+
      hasKnockout: true,
      knockoutRounds: ["Barrages", "8es", "Quarts", "Demies", "Finale"],
    },
    // ...
  };
  ```

**C. UI** :

- Sur les ligues domestiques : filtre "J1, J2, ..., J38"
- Sur les compétitions européennes : filtre "Phase de ligue (J1-J8) | 8es | Quarts | Demies | Finale"
- Test sur toutes les ligues listées dans l'app

**Critères d'acceptation** :

- Aucune mention de "Quart/Demie/Finale" sur L1, PL, Liga, Bundesliga, Serie A
- Affichage correct des phases éliminatoires sur UCL, EL, ECL
- Pas de régression sur l'affichage des matchs en cours/à venir

---

### 🟡 TICKET 4.7 — Audit éditorial des textes d'onboarding (P2)

**Problème / Besoin** : Revoir l'ensemble des textes des modales d'onboarding pour assurer cohérence éditoriale (ton, voix, terminologie, ponctuation).

**Tâche** :

**A. Phase d'audit (sans modification)** :

- Lister **tous les textes** présents dans le flow d'onboarding (5 étapes minimum d'après l'audit)
- Produire un document `onboarding-copy-audit.md` avec colonnes :
  | Slide | Élément | Texte actuel | Problème identifié | Suggestion |
  |---|---|---|---|---|
  | 1 | Titre H1 | "Bienvenue sur VAR TIME" | OK | - |
  | 1 | CTA | "C'EST PARTI →" | Incohérent casse | Voir ticket 2.6 |
  | 2 | Sous-titre | "..." | Tutoiement / vouvoiement ? | Choisir une voix |

- Critères à auditer :
  - **Voix** : tutoiement systématique (cohérent avec l'identité "potes / vestiaire")
  - **Casse des CTA** : tous en UPPERCASE (cf. ticket 2.6)
  - **Ponctuation** : pas de point final sur les titres courts, points sur les phrases complètes
  - **Émojis** : utilisation cohérente (présent uniquement sur certaines slides ? règle à définir)
  - **Longueur** : aucune phrase > 12 mots sur les slides
  - **Terminologie** : "prono" vs "pronostic" vs "pari" vs "tip" — choisir et appliquer
  - **Inclusivité** : éviter formulations genrées si possible

**B. Phase d'application (après validation produit)** :

- Centraliser **tous les textes** dans `locales/fr/onboarding.json` (et autres langues si i18n actif)
- Refactor des composants `<OnboardingSlide />` pour consommer les clés i18n
- Pas de hardcode de texte dans les `.tsx`

**C. Livrables** :

1. Document `onboarding-copy-audit.md` (en preview pour validation)
2. PR avec refactor i18n et nouveaux textes appliqués

**Critères d'acceptation** :

- Audit exhaustif documenté
- Validation produit reçue avant application
- 100% des textes onboarding en i18n
- Tests visuels : aucun overflow ou troncature après changement de textes
- Vérifier autres langues si i18n actif (longueur de chaîne peut varier)

---

## ✅ Definition of Done globale

Pour chaque ticket fermé :

- [ ] Code committé avec message conventionnel (`fix(bug):...`, `feat(api):...`, `refactor(copy):...`)
- [ ] Pour les bugs (4.1, 4.2, 4.3) : phase d'investigation documentée dans la PR
- [ ] Tests unitaires sur la logique métier modifiée
- [ ] Logs serveur structurés pour les jobs/cron
- [ ] Pas de régression visuelle sur les écrans adjacents
- [ ] Capture avant/après dans la PR
- [ ] Monitoring/alerting en place pour les jobs backend (4.2, 4.3, 4.5)
