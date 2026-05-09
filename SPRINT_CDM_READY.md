# Sprint CDM-READY — Tout ce qui reste avant la CDM

> **Contexte** : VAR TIME a déjà absorbé 5 gros sprints de qualité (SECURITY, LOGGER, PERF, ARIA, REFACTOR), partiellement complétés. Ce document consolide **tout ce qui reste à faire** avant le lancement public le 11 juin 2026.
>
> **Découpage en 3 sous-sprints distincts**. Chacun doit être complété ET validé (par le script QA et un test manuel utilisateur) **avant de passer au suivant**. Pas de saut.
>
> **Important** : à la fin de chaque sous-sprint, livrer un message clair listant exactement ce qui a été coché ✅ et ce qui ne l'a pas été (avec raison). Pas de résumé optimiste type "all done" — détail par tâche.

---

# SOUS-SPRINT 1 — Combler les gaps critiques (priorité 🔴 et 🟠)

## SEC-1, SEC-2, SEC-3 — Rate limiting routes économiques restantes

Les 3 routes les plus exploitables ne sont toujours pas protégées. C'est le risque #1 avant la CDM.

- [ ] Rate limiting sur `/api/shop/purchase` : **10 req/min/user** via le helper `checkRateLimit` DB-backed déjà utilisé sur les autres routes.
- [ ] Rate limiting sur `/api/boosters/purchase` : **10 req/min/user**, même helper.
- [ ] Rate limiting sur `/api/var-bets/quick-bet` : **15 req/min/user** (un peu plus généreux car appelé via push notification, légitime d'avoir des rafales courtes).
- [ ] **Vérifier l'atomicité des transactions de débit Sifflets** sur les 3 routes :
  - L'opération "vérifier solde + débit + crédit item" doit être dans une **fonction PostgreSQL RPC unique** (`begin/commit`), pas en 2-3 requêtes séparées côté Node.
  - Si actuellement séparée : créer la RPC `purchase_shop_item(user_id, item_id)` ou équivalente et migrer la route pour l'appeler.
  - **C'est plus important que le rate limiting lui-même** : sans atomicité, un attaquant qui passe sous le radar du rate limiter (1 req juste, mais qui exploite une race condition) peut quand même corrompre l'économie.
- [ ] Réponse 429 standardisée :

  ```json
  {
    "error": "rate_limited",
    "message": "Trop de requêtes, réessaie dans quelques secondes.",
    "retryAfter": 30
  }
  ```

  - header HTTP `Retry-After: 30`.

- [ ] Côté frontend : ajouter le toast "Tu cliques trop vite" sur les composants qui appellent ces 3 routes (sans retry automatique).
- [ ] Tester : 100 requêtes parallèles sur shop/purchase doivent acheter 1 item et retourner 99 × 429.

## PERF-1 — ISR sur les pages restantes

Pages encore en `force-dynamic` sans nécessité. Risque de coût DB en CDM.

- [ ] Ajouter `export const revalidate = 300;` sur `/ligues` (5 min).
- [ ] Ajouter `export const revalidate = 3600;` sur `/shop` (1h).
- [ ] Ajouter `export const revalidate = 300;` sur `/profile/[id]` (5 min).
- [ ] **Vérifier qu'aucune de ces pages n'utilise `cookies()` ou `headers()` directement** dans le composant page. Si oui, déplacer cette logique dans un composant client séparé pour permettre l'ISR.
- [ ] Pour `/shop` spécifiquement : le solde Sifflets de l'utilisateur ne doit PAS être inclus dans le rendu ISR. Le charger côté client via fetch.
- [ ] Vérifier sur Vercel preview : `curl -I` deux fois sur ces pages doit montrer `x-vercel-cache: HIT` à la deuxième requête.

## PERF-2 — Conversion `<img>` → `next/image`

7 composants avec des `<img>` bruts qui dégradent le LCP.

- [ ] Modifier `next.config.ts` pour ajouter dans `remotePatterns` :
  ```typescript
  { protocol: 'https', hostname: 'media.api-sports.io' },
  { protocol: 'https', hostname: 'media-1.api-sports.io' },
  { protocol: 'https', hostname: 'media-2.api-sports.io' },
  { protocol: 'https', hostname: 'media-3.api-sports.io' },
  ```
- [ ] Convertir les `<img>` en `<Image>` dans : `MatchCard`, `MatchLobby`, `MatchLineupsPitch`, `MatchLineups`, `MatchStats`, `PolymarketTab`, `Scoreboard`.
- [ ] Pour chaque image, fournir `width` et `height` explicites (pas de fill). Utiliser les dimensions actuelles rendues.
- [ ] Sur les logos d'équipes en haut de la liste des matchs (above the fold), ajouter `priority` (max 2-3 par page).
- [ ] Retirer les commentaires `eslint-disable-next-line @next/next/no-img-element`.
- [ ] Vérifier visuellement que les images s'affichent correctement (pas de layout shift, pas d'images cassées).

## ARIA-1 — Compléter AlertDrawer et ProfileEditModal

- [ ] Ajouter `role="dialog"` sur `AlertDrawer` (en plus de `aria-modal` et `aria-labelledby` déjà présents).
- [ ] Ajouter `useScrollLock` sur `AlertDrawer` (le hook existe depuis le sprint ARIA précédent).
- [ ] Ajouter `aria-labelledby` sur `ProfileEditModal` qui pointe vers le `<h2>` du modal (ajouter un id si manquant).

## ARIA-2 — `aria-live` sur LiveRoom

Pour que les lecteurs d'écran annoncent les mises à jour temps réel (changements de balance Sifflets, ouverture de market VAR).

- [ ] Identifier la zone de LiveRoom où apparaissent les notifications dynamiques (toast inline, balance update, market alerts).
- [ ] Ajouter `aria-live="polite"` sur cette zone (pas `assertive` — sinon ça interrompt la lecture du match).
- [ ] Si certaines notifs sont vraiment urgentes (sirène VAR, market qui s'ouvre), wrapper celles-là dans une zone séparée avec `aria-live="assertive"` + `role="alert"`.

## DB-1 — Indexes manquants

Migration Supabase 0099 (ou prochain numéro disponible).

- [ ] Créer la migration avec :
  ```sql
  CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id);
  CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver_id ON friend_requests(receiver_id);
  CREATE INDEX IF NOT EXISTS idx_push_logs_user_id ON push_logs(user_id);
  CREATE INDEX IF NOT EXISTS idx_user_daily_recaps_user_id ON user_daily_recaps(user_id);
  CREATE INDEX IF NOT EXISTS idx_direct_messages_thread_sent ON direct_messages(thread_id, sent_at DESC);
  CREATE INDEX IF NOT EXISTS idx_tweet_log_match_id ON tweet_log(match_id);
  ```
- [ ] Tester localement avec `supabase db reset` puis `supabase db push`.
- [ ] Vérifier dans Supabase Studio que les indexes sont créés en prod après push.
- [ ] Faire un `EXPLAIN ANALYZE` sur une requête typique de chaque table pour confirmer que l'index est utilisé.

## NOTIF-1 — Push DM

- [ ] Localiser la route qui crée un nouveau DM (probablement `src/app/api/messages/[otherId]/route.ts`).
- [ ] Après l'insert du message, appeler la fonction d'envoi de push existante pour notifier le destinataire.
- [ ] Conditions d'envoi :
  - `notif_dm = true` (ou null = défaut activé) sur le profile du destinataire
  - destinataire ≠ envoyeur
  - smart mute : si destinataire a l'app focus active, ne pas envoyer
- [ ] Format push :
  - title : `<displayName envoyeur>`
  - body : "Nouveau message" (privacy-friendly, pas le contenu)
  - URL : `/messages/<senderId>`
- [ ] Tester : envoyer un DM de A → B avec B offline ou app fermée. B reçoit le push.

## LOG-1, LOG-2 — Migration finale console.\*

Pour boucler le sujet logger.

- [ ] Migrer les `console.*` restants dans `src/services/api-football-sync` et `src/services/sportsdb-sync` vers `log.*`.
- [ ] Migrer les `console.*` dans `src/lib/` server-side : resolve-event, squad-messages, push-sender (si présents).
- [ ] À la fin : `grep -rn "console\." src/services/ src/lib/ src/app/api/` doit retourner 0 résultats (ou uniquement des cas justifiés et documentés).

## Critères d'acceptation Sous-Sprint 1

1. Les 3 routes éco restantes ont rate limiting + transaction atomique vérifiée.
2. ISR appliqué sur `/ligues`, `/shop`, `/profile/[id]`, vérifié via `x-vercel-cache: HIT`.
3. 7 composants `<img>` convertis en `next/image`, plus aucun `eslint-disable @next/next/no-img-element`.
4. AlertDrawer a `role="dialog"`, ProfileEditModal a `aria-labelledby`.
5. LiveRoom a `aria-live` sur les zones temps réel.
6. Migration DB indexes appliquée en prod, vérifiée via Supabase Studio.
7. Push DM fonctionnel testé bout-en-bout.
8. Plus aucun `console.*` dans `src/services/`, `src/lib/`, `src/app/api/`.
9. Le QA script passe sans bloquant nouveau.

**STOP. Avant le sous-sprint 2, lancer le QA, faire un test manuel utilisateur de ~15 min, valider que rien n'est cassé.**

---

# SOUS-SPRINT 2 — Consolidation i18n (préparation traduction)

C'est le gros morceau. 1-2 jours de travail à lui seul.

## I18N-1 — Audit

- [ ] Compter les clés actuelles dans `src/lib/translations.ts` et dans `messages/*.json`.
- [ ] Détecter les conflits (clés dans les deux systèmes avec valeurs différentes).
- [ ] Faire un grep des chaînes hardcodées en français dans `src/`. Lister le top 10 des composants les plus chargés.
- [ ] Produire `I18N_AUDIT.md` avec ces stats.

## I18N-2 — Choix du système et migration de translations.ts

On consolide sur **next-intl uniquement**. `translations.ts` disparaît.

- [ ] Définir la structure de namespacing dans `messages/fr.json` :
  ```json
  {
    "common": { "buttons": {...}, "errors": {...}, "toasts": {...} },
    "auth": {...},
    "lobby": {...},
    "match": {...},
    "voting": {...},
    "profile": {...},
    "shop": {...},
    "league": {...},
    "settings": {...},
    "onboarding": {...},
    "landing": {...}
  }
  ```
- [ ] Migrer toutes les clés de `src/lib/translations.ts` vers `messages/fr.json` selon ce namespacing.
- [ ] Pour chaque conflit, trancher pour la version la plus récente / correcte. Documenter dans le commit.
- [ ] **Supprimer `src/lib/translations.ts`** définitivement.
- [ ] Mettre à jour tous les imports qui l'utilisaient pour pointer vers `useTranslations` de next-intl.

## I18N-3 — Extraction des chaînes hardcodées

C'est la plus longue partie.

- [ ] Pour chaque composant identifié dans le top 10 de I18N-1, extraire les chaînes hardcodées.
- [ ] Workflow par composant :
  1. Identifier toutes les chaînes en français
  2. Choisir un namespace cohérent
  3. Ajouter les clés dans `messages/fr.json` avec un nommage descriptif
  4. Remplacer dans le composant : `<button>Parier</button>` → `<button>{t("voting.actions.bet")}</button>`
  5. Vérifier compilation + rendu
- [ ] **Cas spécial des toasts** : factoriser un helper si pas déjà fait. Tous les `toast.success("...")` doivent passer par `t()`.
- [ ] **Templates dynamiques** :
  ```json
  "wonPoints": "Tu as gagné {points} points !"
  ```
  ```typescript
  toast.success(t("wonPoints", { points }));
  ```
- [ ] **Pluriels via ICU MessageFormat** :
  ```json
  "matchesPlayed": "{count, plural, =0 {Aucun match} =1 {1 match} other {# matchs}}"
  ```
- [ ] **Cas des fichiers utilitaires non-React** : utiliser `getTranslations()` server-side ou passer `t` en argument.
- [ ] **Faire une passe par composant**, du plus chargé au moins chargé. Un commit par composant.
- [ ] Cible : **0 chaîne en français hardcodée** dans `src/components/` et `src/app/`. À vérifier via grep des patterns français.

## I18N-4 — Chaînes en base de données

- [ ] Identifier les tables Supabase avec du texte affiché : `badges`, `cosmetics`, `boosters`, `market_types` (si applicable).
- [ ] **Recommandation** : sortir ces chaînes statiques de la DB et les mettre dans `messages/*.json` avec une clé de référence dans la DB. Exemple : la table `badges` garde un champ `i18n_key = "badges.first_win"`, et `messages/fr.json` contient `badges.first_win.name = "Première victoire"` et `badges.first_win.description = "..."`.
- [ ] Si le volume est trop important pour ce sprint (> 100 entrées), reporter et documenter dans `I18N_AUDIT.md` avec un plan.

## I18N-5 — Configuration locales et routing

- [ ] Confirmer que `["fr", "en", "es", "de", "it"]` est bien la liste des locales supportées (déjà en place selon le TECH_BIBLE).
- [ ] Stratégie de routing : **détection auto via `Accept-Language` + cookie de préférence**. URLs inchangées.
- [ ] Vérifier le sélecteur de langue dans Settings : doit écrire dans le cookie `NEXT_LOCALE` et déclencher `router.refresh()`.
- [ ] Détection auto initiale : à la première visite, si `Accept-Language` commence par `en/es/de/it` → afficher dans cette langue. Sinon FR par défaut.

## I18N-6 — Production du fichier master FR

- [ ] Vérifier que `messages/fr.json` contient 100% des chaînes UI :
  - Aucune chaîne française hardcodée ne reste dans le code (grep exhaustif)
  - Toutes les clés organisées par namespaces clairs
  - Variables et pluriels bien formatés en ICU MessageFormat
- [ ] Générer un rapport `I18N_MASTER_REPORT.md` avec :
  - Nombre total de clés extraites
  - Décomposition par namespace
  - Liste des clés "complexes" (variables, pluriels, > 200 caractères) — à traiter avec attention en traduction
  - Liste des clés marketing/landing — à séparer pour review native speaker
- [ ] **Créer `messages/en.json`, `messages/de.json`, `messages/it.json`, `messages/es.json` vides mais structurés identiquement à `messages/fr.json`** (toutes les clés présentes avec valeurs `""`). Squelettes prêts à remplir.

## I18N-7 — Tests

- [ ] L'app démarre en local en français, tous les écrans s'affichent normalement (vérifier qu'aucune clé n'apparaît en raw type `voting.timer.warning`).
- [ ] Toasts, messages d'erreur, formulaires : tout est traduit.
- [ ] Pluriels fonctionnent (count = 0, 1, 2, 10).
- [ ] Le sélecteur de langue dans Settings bascule entre les 5 langues. Sur EN/DE/IT/ES, l'app affiche les clés brutes ou les fallbacks (normal, pas encore traduit) — pas d'erreur 500.
- [ ] Le QA script passe.

## I18N-8 — Documentation

- [ ] Mettre à jour le TECH_BIBLE :
  - Section i18n : "Système unique next-intl, plus de translations.ts. Couverture 100% des chaînes UI."
- [ ] Créer `docs/I18N_GUIDE.md` :
  - Comment ajouter une nouvelle chaîne (`useTranslations`, namespace, ajouter dans `messages/fr.json`)
  - Comment ajouter une nouvelle langue
  - Comment gérer pluriels et variables

## Critères d'acceptation Sous-Sprint 2

1. `src/lib/translations.ts` est supprimé.
2. `messages/fr.json` contient 100% des chaînes UI, organisées par namespaces.
3. Aucune chaîne française hardcodée dans le code (grep retourne 0 résultats).
4. next-intl est le seul système, configuré pour les 5 langues.
5. Sélecteur de langue fonctionnel dans Settings.
6. `messages/en.json`, `de.json`, `it.json`, `es.json` existent avec mêmes clés que `fr.json` mais valeurs vides.
7. Rapport `I18N_MASTER_REPORT.md` généré.
8. Le QA script passe sans bloquant nouveau.

**STOP. Avant le sous-sprint 3, livrer `messages/fr.json` au founder pour qu'il l'envoie en traduction (à Claude pour EN, à des copywriters natifs pour DE/IT/ES).**

---

# SOUS-SPRINT 3 — Intégration des traductions livrées

À déclencher **uniquement** quand le founder a reçu en retour les fichiers traduits.

## I18N-INT-1 — Intégration des fichiers traduits

- [ ] Recevoir du founder les fichiers : `messages/en.json` (rempli), et potentiellement `messages/de.json`, `messages/it.json`, `messages/es.json` selon ce qui a été traduit.
- [ ] Pour chaque fichier traduit reçu :
  - Vérifier que la structure de clés est identique à `messages/fr.json` (même clés, même hiérarchie de namespaces). Si différence, signaler au founder.
  - Vérifier qu'il n'y a pas de clé manquante (chaque clé de `fr.json` doit avoir un équivalent).
  - Vérifier que les variables sont préservées (`{points}`, `{count}`, etc.).
  - Vérifier que les pluriels ICU sont préservés syntaxiquement.
- [ ] Intégrer les fichiers, push vers stage.

## I18N-INT-2 — Tests par locale

- [ ] Pour chaque langue traduite :
  - Basculer dans Settings sur cette langue
  - Faire un parcours complet : landing → inscription → onboarding → lobby → ouvrir un match → placer un prono → boutique → profile
  - Noter les anomalies visuelles : textes qui débordent, troncatures, layout cassé
  - Noter les chaînes qui semblent encore en français (signe d'une clé hardcodée non extraite)
- [ ] Pour les langues non traduites (qui restent en EN ou en raw keys), c'est OK pour le moment.

## I18N-INT-3 — Ajustements layout multi-langue

L'allemand a tendance à produire des mots longs qui cassent les boutons et titres mobiles.

- [ ] Identifier les composants où le texte allemand déborde (boutons CTA, headers, labels).
- [ ] Solutions possibles :
  - Réduire la taille de police de l'élément concerné en allemand (CSS conditionnel via `data-locale`)
  - Raccourcir la traduction allemande (revenir au copywriter)
  - Utiliser une stratégie de wrap avec `min-width` adaptatif
- [ ] Tester sur iPhone SE (le viewport le plus étroit) en priorité.

## I18N-INT-4 — Détection auto et premier rendu

- [ ] Vérifier en preview que la détection auto fonctionne :
  - Navigateur en `Accept-Language: en-US` → l'app charge en EN
  - Navigateur en `Accept-Language: de-DE` → l'app charge en DE
  - Cookie `NEXT_LOCALE` posé manuellement → prend le dessus sur l'auto-detect

## I18N-INT-5 — SEO et metadata

- [ ] Mettre à jour les balises `<title>` et `<meta description>` de la landing page pour qu'elles soient traduites selon la locale active.
- [ ] Ajouter `<link rel="alternate" hreflang="...">` pour chaque langue supportée, dans le `<head>`.
- [ ] Vérifier que le contenu OpenGraph (image Twitter card, description partage) reflète la langue active.

## Critères d'acceptation Sous-Sprint 3

1. Tous les fichiers de langue reçus sont intégrés sans erreur de structure.
2. Chaque langue traduite a fait l'objet d'un parcours complet de test, anomalies notées.
3. Layout adapté pour les langues longues (allemand notamment).
4. Détection auto fonctionne sur les 5 langues.
5. SEO multilingue minimal en place (titles, meta, hreflang).
6. Le QA script passe.
7. Aucune régression sur le parcours en français.

---

# Règles transversales pour Claude Code

## Discipline de livraison

- **Un sous-sprint à la fois**, pas de saut.
- À la fin de chaque sous-sprint, livrer un message structuré :
  ```
  Sous-sprint X complété :
  - Tâche 1.1 : ✅ done (commit abcd123)
  - Tâche 1.2 : ✅ done (commit efgh456)
  - Tâche 1.3 : ⚠️ partiellement done — voir notes
  - Tâche 1.4 : ❌ non fait — raison : ...
  ```
- **Pas de résumé optimiste type "all done".** La précision compte plus que la rapidité.

## Quand bloquer ou demander

Si une tâche n'est pas claire ou révèle un problème non listé (régression, ambiguïté, dépendance manquante), **NE PAS prendre de décision unilatérale**. Documenter dans le PR et demander au founder.

Exemples typiques :

- Une transaction n'est pas atomique mais la migrer demande une refonte de la table → demander
- Un namespace i18n n'est pas évident pour un composant transverse → demander
- Une chaîne hardcodée est en réalité dynamique générée par le user → demander si elle doit être traduite ou pas

## Tests à la fin de chaque sous-sprint

- Lancer le QA script existant et reporter le résultat
- Faire un build complet (`npm run build`) et confirmer 0 erreur TypeScript
- Tester manuellement les 3-4 parcours utilisateur les plus critiques (placer un prono, faire un achat shop, ouvrir une modale de vote, naviguer entre onglets profile)
- Vérifier les logs Vercel preview après push : aucun nouveau warning ou erreur

## Branche et commits

- Une branche par sous-sprint : `feat/sprint-cdm-ready-1`, `feat/sprint-cdm-ready-2`, `feat/sprint-cdm-ready-3`.
- Commits atomiques dans chaque branche, un par tâche cochée idéalement.
- Merge sur `main` uniquement après QA + tests manuels validés.

---

# Pour le founder

Pendant que Claude Code dépile :

**Pendant Sous-Sprint 1** (~1 jour) :

- Continue le recrutement bêta : liste des 30-50 personnes, premiers messages WhatsApp/DM
- Tableau de suivi Google Sheet à jour

**Pendant Sous-Sprint 2** (~1-2 jours) :

- Continue les inscriptions bêta
- Identifier les 3 copywriters natifs DE/IT/ES (Malt/Fiverr) et les pré-contacter pour évaluer dispo et tarif. Pas encore de contenu envoyé.

**Quand Sous-Sprint 2 est fini** :

- Récupérer `messages/fr.json` du repo
- L'envoyer à Claude (chat) pour traduction EN complète + bases DE/IT/ES
- Recevoir les fichiers traduits
- Envoyer les fichiers DE/IT/ES + screenshots des écrans clés aux copywriters natifs pour review/correction
- Quand tout est revenu, livrer les 4 fichiers JSON à Claude Code pour Sous-Sprint 3

**Pendant Sous-Sprint 3** (~1 jour) :

- Tester chaque langue activement, noter les anomalies visuelles
- Préparer le post Reddit en anglais (utilise les templates fournis)
