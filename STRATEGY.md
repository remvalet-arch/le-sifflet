# STRATEGY.md — VAR TIME

> **Document maître stratégique. À poser à la racine du repo. Sert de référence permanente pour toutes les décisions produit, marketing, GTM, et technique stratégique.**
>
> **Date d'établissement : 7 mai 2026.**
> **Horizon couvert : Coupe du Monde 2026 (11 juin → 19 juillet) + post-CDM jusqu'à septembre 2026.**
> **À mettre à jour : tous les 15 jours pendant la CDM, mensuellement après.**

---

## 📋 Table des matières

1. [Vision & positionnement](#1-vision--positionnement)
2. [Audit produit & UX](#2-audit-produit--ux)
3. [Challenges produit majeurs](#3-challenges-produit-majeurs)
4. [Économie des Sifflets](#4-économie-des-sifflets)
5. [Calendrier GTM 35 jours](#5-calendrier-gtm-35-jours)
6. [Roadmap des sprints (49 tâches)](#6-roadmap-des-sprints-49-tâches)
7. [Stratégie de viralité](#7-stratégie-de-viralité)
8. [Wording anti-rejet Apple](#8-wording-anti-rejet-apple)
9. [Domaine & infrastructure](#9-domaine--infrastructure)
10. [KPIs à surveiller](#10-kpis-à-surveiller)
11. [Plans B & contingences](#11-plans-b--contingences)
12. [Annexes](#12-annexes)

---

## 1. Vision & positionnement

### Vision en une phrase

**VAR TIME, c'est l'app que tu sors quand tu regardes un match. Pour parier en direct sur la VAR, chambrer tes potes, et vibrer avec la communauté.**

### Le pivot stratégique fondamental

VAR TIME **n'est pas** une app de pronos avec en bonus des paris VAR. C'est une **app sociale du foot live** qui se sert des pronos comme épine dorsale entre les matchs.

| Mauvaise approche                                      | Bonne approche                                                      |
| ------------------------------------------------------ | ------------------------------------------------------------------- |
| Pitch externe : "App de pronos avec paris VAR en plus" | Pitch externe : "App pour vibrer pendant les matchs avec tes potes" |
| Hero shot landing : Hub Pronos                         | Hero shot : VotingModal en pleine action ou Live Room               |
| Premier onglet BottomNav : Pronos                      | Premier onglet : Stade (live/imminent)                              |
| Onboarding : "FAIS TES PRONOS"                         | Onboarding : "Le match commence dans 1h. Réveille tes potes"        |
| Viralité : "Invite tes amis sur la ligue"              | Viralité : "Le match commence dans 1h, préviens tes potes"          |

### Pourquoi ce positionnement gagne

**MPP est asynchrone (pré-match). VAR TIME est synchrone (pendant le match).** C'est un marché distinct, non occupé, et MPP ne peut pas te copier facilement parce que :

- Leur infra n'est pas pensée pour le real-time
- Leur audience est habituée au pré-match
- Cannibalisation : s'ils lancent du live, ils flinguent leurs pubs pré-match

### Pitchs prêts à utiliser

**Pitch ascenseur (15s) :**

> « VAR TIME, c'est l'app que tu sors quand tu regardes un match. Pour parier en direct sur la VAR, chambrer tes potes, et vibrer avec la communauté. »

**Pitch landing/store (1 paragraphe) :**

> « Le 11 juin, regarde la Coupe du Monde autrement. VAR TIME transforme chaque match en arène collective : signale les actions litigieuses avec la communauté, parie sur le verdict de la VAR avant la TV, défie tes potes en ligue privée, et vis le match comme jamais. Pronos avant le coup d'envoi, paris en direct, classements saisonniers. Sifflets virtuels — aucun argent réel. »

**Pitch dossier de presse (1 page) :** voir Annexe A.

### Le piège à éviter

**Ne dis JAMAIS "L'app de paris foot" en présentation publique.** Le mot "paris" déclenche immédiatement chez l'interlocuteur :

- Confusion avec Winamax/Betclic (catégorie crowded, régulée, repoussante pour les médias mainstream)
- Méfiance éthique
- Filtres de modération réseaux (TikTok bloque)

Préfère : _"L'app du match en direct"_, _"L'app sociale du foot live"_, _"L'arène collective du foot"_.

---

## 2. Audit produit & UX

### Verdict global

L'app a un vrai parti pris esthétique : palette pitch/whistle, typographie capitales, hiérarchie respectée. C'est cohérent et reconnaissable, mieux que 80% des apps de pronos françaises. Le ton MPG-like est bien tenu.

Mais à l'usage, plusieurs frictions sérieuses méritent d'être corrigées avant un lancement public.

### Problèmes bloquants identifiés (décisions prises)

| #   | Problème                                                       | Décision                                                         | Sprint        |
| --- | -------------------------------------------------------------- | ---------------------------------------------------------------- | ------------- |
| 1   | Empty states punitifs ("La VAR dort", "Entrée sur le terrain") | À refondre dans le Sprint UX dédié                               | UX5 (à créer) |
| 2   | DateSlider Pronos masque l'action principale + stats à 0%      | Cacher stats si <10 votes, simplifier hiérarchie                 | UX5 (à créer) |
| 3   | Onglet Stade > Classement Ligue 1 dilue la prop' de valeur     | À évaluer à l'usage. Garder pour CDM (utile pendant compétition) | À mesurer     |
| 4   | Historique profil sans feedback gain/perte                     | Inverser tri : matchs résolus d'abord                            | UX5 (à créer) |
| 5   | Modale "Modifier profil" : 20 avatars sans gating              | Gate avatars par rang d'arbitre                                  | Eco-2         |
| 6   | Hero du Profil lourd visuellement (40% écran)                  | Hero collapse au scroll sur Historique/Badges                    | UX5 (à créer) |
| 7   | Couleurs leaderboard ligue confuses (bronze=orange)            | Or/Argent/Bronze stricts                                         | UX5 (à créer) |
| 8   | "XP total : 2383 Pts" ambigu                                   | Renommer "Pot commun ligue"                                      | UX5 (à créer) |
| 9   | Chip "Arbitre Élite" trompeur sur profil                       | Préfixer "Vise : Arbitre Élite"                                  | UX5 (à créer) |
| 10  | Solde "955 pts" écrasé en header                               | Plus gros, plus contrasté, cliquable                             | UX5 (à créer) |
| 11  | Pas de filtre par compétition sur Pronos                       | **Sprint P déjà ticketé**                                        | Sprint P      |
| 12  | Tab "HISTORIQUE 35" badge gris peu visible                     | Pastille jaune whistle                                           | UX5           |
| 13  | Cards de matchs Stade > Résultats fantômes                     | Compte à rebours pour matchs futurs                              | UX5           |
| 14  | Pas de 5e onglet "🔴 LIVE" pendant matchs                      | Mode urgence dans BottomNav                                      | UX5           |
| 15  | Boutons "Quitter" trop visibles sur ligues                     | Mettre en mode discret                                           | UX5           |

### Bonnes décisions UX déjà prises (à conserver)

- ✅ Marque "VAR TIME" unifiée sur landing
- ✅ Section "Progression des rangs" en position 2 (hook rétention)
- ✅ Gradient fade sur tabs scrollables
- ✅ Inputs score pronos avec placeholder "?" et fontSize 16px (anti-zoom iOS)
- ✅ Confirmation avant quitter une ligue
- ✅ Logos compétitions sur fond blanc rounded-lg
- ✅ Code de ligue en `font-mono`

---

## 3. Challenges produit majeurs

### Challenge #1 — Le quorum Waze (RÉSOLU stratégiquement)

**Problème identifié :** Le seuil fixe de signalements communautaires ne fonctionne que sur les gros matchs. Sur 95% des matchs (audience faible), aucun market ne s'ouvre → l'utilisateur voit "La VAR dort", part, ne revient pas.

**Contrainte technique aggravante :** API-Football remonte les events avec ~1min de délai. Donc ne peut PAS être utilisée comme déclencheur principal — le mode communautaire reste le SEUL moyen d'ouvrir des markets en temps utile.

**Décision stratégique :** Architecture à 3 étages.

| Étage                                              | Mécanique                                                                            | Quand                       |
| -------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------- |
| **1 — Seuil dynamique scalant**                    | 1-5 utilisateurs → 1 signal suffit ; 6-20 → 2 ; 21-100 → 3 ; 100+ → 5                | Sprint Q (priorité absolue) |
| **2 — Markets secondaires sur events instantanés** | Corner, carton préparé, faute dans surface = fenêtre exploitable même avec délai API | Post-CDM                    |
| **3 — Auto-VAR pour la résolution**                | API-Football confirme/infirme le verdict 1min après. Déjà en place.                  | Existant                    |

**Reframing positif :** Le délai API n'est pas un problème, c'est ton MOAT. Si l'API était instantanée, n'importe qui pourrait copier ton produit avec un cron. Le délai t'oblige à avoir un signal communautaire — qui devient ton vrai différenciant. Pitch : **"Sur VAR TIME, vous voyez la VAR AVANT la TV."**

### Challenge #2 — L'inflation des Sifflets (RÉSOLU)

**Problème :** Sources de gain multiples (streak +50/jour, prono +50, score exact +100, paris VAR variables) sans aucun puits. Inflation galopante → solde >50k pts à 6 mois → la monnaie n'a plus de valeur perçue.

**Décision :** 4 puits implémentés en Sprints Eco-1 à Eco-4.

| Sprint    | Puits                   | Logique                                                                                                                     |
| --------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Eco-1** | Saisons mensuelles      | 90% du solde reset le 1er du mois, 10% reporté. Trophées saisonniers archivés. Lifetime points jamais reset (Hall of Fame). |
| **Eco-2** | Boutique cosmétique     | Avatars premium, bordures animées, effets de pari (500-3000 pts). Double porte : achat OU déblocage par rang.               |
| **Eco-3** | Boosters consommables   | Double XP (300), Cote+ (200), Filet (500), Vision (100). Max 1 par pari.                                                    |
| **Eco-4** | Mises minimum scalantes | Solde > 5k → min 50 pts ; > 50k → min 1000 pts. Force les "riches" à brûler.                                                |

### Challenge #3 — Sous-exploitation des ligues (RÉSOLU)

**Problème :** Tu as la donnée, tu n'exploites pas le storytelling.

**Décisions :**

1. ✅ Notif "X t'a dépassé au classement" → Sprint V4
2. ✅ Pronos des amis visibles sur chaque match → Sprint V3
3. ⚠️ Stories de ligue (récap auto chaque dimanche) → backlog post-CDM
4. ⚠️ Écran "Mon adversaire de la semaine" Braquage → backlog post-CDM
5. ⚠️ Chat de ligue plus exposé → backlog UX5

### Challenge #4 — Friction d'invitation (RÉSOLU)

**Problème :** 6 étapes pour rejoindre une ligue → 80% de perte d'invités.

**Décision :** Deep links Universal Links → Sprint V1. Réduction à 2 étapes.

### Challenge #5 — Pas de moment de gloire shareable (RÉSOLU)

**Problème :** Quand un user gagne un gros pari, juste un toast et solde qui monte. Aucune image partageable.

**Décision :** VictoryShareCard générée par `@vercel/og` au format Story Instagram (1080×1920). Sprint V2.

---

## 4. Économie des Sifflets

### Cycle de vie d'un Sifflet

```
GAINS (sources)              ↓
- Streak quotidien        +50 × min(streak, 7)
- Pari VAR gagné          variable parimutuel
- Prono 1N2 réussi        +50
- Contre-Pied (score exact rare)  +10/30/60/100
- Récompense match        +reward_amount
- RSA filet de sécurité   +50 si solde < 10
- Bonus boosters          ×2 / +20% / etc.

                              ↓
                          [SOLDE]
                              ↓
DÉPENSES (puits)              ↓
- Mise dans pari VAR      variable
- Achat avatar premium    1500-3000 pts
- Achat bordure animée    3000-5000 pts
- Achat effet de pari     500 pts
- Achat booster           100-500 pts
- Mise minimum scalante   force la dépense

                              ↓
EXPIRATION                    ↓
- Reset saisonnier mensuel (90% effacés, 10% reportés)
- lifetime_points_earned : JAMAIS reset (Hall of Fame)
- season_points : reset chaque 1er du mois
```

### Trois variables à distinguer

1. **`sifflets_balance`** = solde dépensable (mise dans paris, achats boutique)
2. **`season_points`** = score saisonnier (classement mensuel, reset)
3. **`lifetime_points_earned`** = total cumulé (Hall of Fame, jamais reset)

### Règles d'or de l'économie

1. **Aucun achat avec de l'argent réel.** Sifflets gagnés en jouant uniquement. Sine qua non Apple.
2. **Aucun retrait possible.** Pas de cashout. Sifflets purement ludiques.
3. **Jamais de pay-to-win.** Boosters affectent les récompenses, pas les résultats.
4. **Toujours un filet.** RSA du Parieur si solde < 10. Personne ne reste à zéro.
5. **Saison = événement.** Reset mensuel = communication push + pic d'engagement.

---

## 5. Calendrier GTM 35 jours

### Décision stratégique fondamentale

**PWA-only le 11 juin.** Capacitor (App Store + Google Play) en septembre 2026. Tentative TestFlight (bêta iOS) pendant la CDM, soumission Play Store mi-CDM (vers le 8 juillet) si stabilité confirmée.

Rationale : tu évites le rejet Apple à la dernière minute, tu peux itérer en continu (push de bugfix instantané), tu testes le PMF en conditions réelles avant les coûts/délais des stores.

### Calendrier semaine par semaine

```
SEMAINE 1 (J-35 → J-29)  | DETTE TECHNIQUE & FONDATIONS
─────────────────────────────────────────────────────────
🌐 Sprint D (Migration domaine vartime.app)
🔧 Sprint Q (Quorum dynamique)
🔧 Sprint Eco-1 (Saisons mensuelles)
🔧 Sprint Push-1 (Push post-résolution)
🔧 Migrations 0062→0077 appliquées en prod
🔧 Nettoyage des 22 fichiers orphelins
✅ Fin de semaine : code stable, économie saine, domaine OK

SEMAINE 2 (J-28 → J-22)  | VIRALITÉ & SOCIAL
─────────────────────────────────────────────────────────
🚀 Sprint P (Filtres compétitions par préférences)
🚀 Sprint V (Deep links + VictoryShareCard + Pronos amis + Notif dépassement)
🚀 Sprint L (Landing v2 + /discover store-friendly)
✅ Fin de semaine : produit prêt à être propagé

SEMAINE 3 (J-21 → J-15)  | CONTENU & ACQUISITION
─────────────────────────────────────────────────────────
📸 Production des 8 vidéos courtes (TikTok/Reels)
🎤 Recrutement 5-10 ambassadeurs micro-influenceurs
📝 Page presse / dossier de presse (1-pager)
✉️ Newsletter de pré-lancement (waitlist déjà en place)
🛒 Sprint Eco-2 (Boutique cosmétique)
✅ Fin de semaine : moteurs de croissance armés

SEMAINE 4 (J-14 → J-8)   | BÊTA PUBLIQUE & RODAGE
─────────────────────────────────────────────────────────
🌍 Bêta publique ouverte (suppression invitations)
🎯 Test sur les phases de barrage / amicaux préparatoires
🔥 Sprint Eco-4 (Mises scalantes)
🐛 Hotfixes en continu sur retours bêta
📣 Pré-teasers sur les réseaux (post J-7 matchs préparatoires)
✅ Fin de semaine : produit stress-testé en conditions live

SEMAINE 5 (J-7 → J0)     | LAUNCH WEEK
─────────────────────────────────────────────────────────
🎬 Vidéos virales déployées sur TikTok/Reels (J-7, J-5, J-3, J-1)
📰 Pitch presse (LeMonde Tech, Numerama, Frandroid, BFM Sport)
🤝 Activation des ambassadeurs (posts coordonnés)
🟢 Bouton "Activer les notifs" agressif sur la home
🎉 11 JUIN — Live coverage du match d'ouverture sur tous les canaux
─────────────────────────────────────────────────────────

PENDANT LA CDM (J0 → J+38, 11 juin → 19 juillet)
─────────────────────────────────────────────────────────
🔁 Itérations hebdo selon retours utilisateurs
📊 Mesure quotidienne des KPIs (DAU, taux pari/match, viralité)
⚡ Sprint Eco-3 (Boosters) déployé en milieu de tournoi (J+15)
📱 Démarrage Sprint Capacitor en parallèle (pour App Store post-CDM)
🍎 Soumission TestFlight (bêta iOS) le 1er juillet
🤖 Soumission Play Store le 8 juillet (avant la finale)

POST-CDM (J+39 et au-delà)
─────────────────────────────────────────────────────────
📱 Sprint Capacitor complet (apps natives publiques mi-août)
🌍 Sprint i18n (FR/EN/ES/DE/IT)
📊 Bilan PMF & roadmap V2
```

---

## 6. Roadmap des sprints (49 tâches)

### Vue synthétique

| Sprint     | Nom                                         | Tâches | Effort     | Statut     | Priorité         |
| ---------- | ------------------------------------------- | ------ | ---------- | ---------- | ---------------- |
| **D**      | Migration domaine vartime.app               | 10     | 1j + 30min | ⏳ À faire | 🔴 Bloquant      |
| **Q**      | Quorum dynamique                            | 4      | ~1j        | ⏳ À faire | 🔴 Critique      |
| **Eco-1**  | Saisons mensuelles                          | 5      | ~2j        | ⏳ À faire | 🔴 Critique      |
| **Push-1** | Push post-résolution                        | 5      | ~3j        | ⏳ À faire | 🔴 Critique      |
| **L**      | Landing v2 + /discover                      | 6      | ~3j        | ⏳ À faire | 🚀 Vitrine       |
| **V**      | Viralité (deep links + share + pronos amis) | 4      | ~5j        | ⏳ À faire | 🚀 Critique      |
| **P**      | Filtres compétitions                        | 8      | ~2j        | ⏳ À faire | ⭐ Forte         |
| **Eco-2**  | Boutique cosmétique                         | 5      | ~2-3j      | ⏳ À faire | ⭐ Forte         |
| **Eco-3**  | Boosters consommables                       | 5      | ~2-3j      | ⏳ À faire | ⭐ Post-CDM J+15 |
| **Eco-4**  | Mises scalantes                             | 4      | ~1j        | ⏳ À faire | ✅ Saine         |

**Total : 56 tâches techniques, ~22-25 jours Claude Code.**

> _Note :_ La liste détaillée des sous-tâches est dans `TASKS.md` (le V-Coding source de vérité). Ce STRATEGY.md référence les sprints, pas leur détail.

### Ordre d'exécution recommandé

```
1. Sprint D    (migration domaine — bloque tout le reste)
2. Sprint Q    (quorum — débloque le mode communautaire)
3. Sprint Eco-1 (saisons — vital éco)
4. Sprint Push-1 (push résolution — frein rétention #1)
5. Sprint L    (landing v2 — vitrine pour J-7)
6. Sprint V    (viralité — moteur d'acquisition)
7. Sprint P    (filtres compétitions — friction réduite)
8. Sprint Eco-2 (boutique — engagement post-lancement)
9. Sprint Eco-4 (mises scalantes — quick win)
10. Sprint Eco-3 (boosters — peut être lancé post-CDM)
```

---

## 7. Stratégie de viralité

### Top 5 leviers (par ROI estimé)

| #   | Levier                                            | Impact estimé                         | Effort              | Sprint    |
| --- | ------------------------------------------------- | ------------------------------------- | ------------------- | --------- |
| 1   | Deep links d'invitation ligue                     | +250% acceptation invitations         | 1j                  | V1        |
| 2   | VictoryShareCard (Insta/WhatsApp)                 | 3-4 nouveaux users / 100 paris gagnés | 2j                  | V2        |
| 3   | Squad pre-game (push J-2h)                        | +40% DAU les soirs de matchs          | 1j                  | Push1-4   |
| 4   | Vidéos virales TikTok/Reels (8 capsules)          | 100k vues = 500-2000 inscrits par hit | 3j prod + diffusion | Marketing |
| 5   | Ambassadeurs micro-influenceurs (5-50k followers) | 50-300 inscrits par activation        | 5j outreach         | Marketing |

### Détail levier #4 — Idées de vidéos courtes

1. **"POV : tu regardes le match avec VAR TIME"** — 30s, gros plan smartphone, action live de pari pendant un vrai match
2. **"Vu la VAR avant la TV"** — montage rapide, screen split (TV / app), démo du timing
3. **"Ma squad VS la sienne"** — dramatisation de la rivalité ligue
4. **"3 conseils pour gagner ton braquage"** — tutoriel ludique
5. **"Quand t'as pas pronostiqué et le match commence"** — meme format
6. **"La règle VAR la plus chère que personne ne connaît"** — éducatif, lien avec page Lois IFAB
7. **"Test : le rang Boss de la VAR existe-t-il ?"** — gamification mise en scène
8. **Récap CDM J1** — à tourner le 11 juin au soir, réactif

**Production :** smartphone + iMovie/CapCut. Budget zéro. 3 jours d'effort total.

**Distribution :** 1 vidéo tous les 2 jours pendant la phase de lancement, hashtags #VARTIME #CDM2026 #MonPetitProno.

### Détail levier #5 — Cibles ambassadeurs

- Comptes Insta de fan zones (PSG, OM, OL, ASSE) — comptes de supporters, pas officiels
- TikTokers foot 5-50k (#footfrance, #ligue1)
- Streamers Twitch foot tier 3 (50-500 viewers, audience hardcore)
- Communautés Discord pronos / fantasy
- Blogueurs foot indépendants

**Offre standard :**

- "Rejoins en avant-première, on te crée un avatar exclusif à ton effigie"
- "Si tu ramènes 100+ inscrits, on lance une ligue à ton nom avec une cagnotte spéciale"
- Co-création : événement "Ligue Officielle [Pseudo] pour la CDM"

---

## 8. Wording anti-rejet Apple

### Principe

Apple rejette ~30% des apps "gambling-adjacent" même sans argent réel. Leurs modérateurs jugent sur les **mots-clés et l'UX visuelle**, pas la mécanique. Décision : **double-copy**.

| Surface                                  | Tonalité                                       | Public cible                                |
| ---------------------------------------- | ---------------------------------------------- | ------------------------------------------- |
| **`vartime.app`** (landing main)         | MPG décontracté ("braquage", "parie", "miser") | Utilisateurs FR, viralité organique         |
| **`vartime.app/discover`** (landing alt) | Neutralisée ("défi", "championnat", "engager") | Modérateurs Apple/Google, presse mainstream |
| **App native (post-Capacitor)**          | Neutralisée dans toutes les surfaces visibles  | App Store / Play Store                      |

### Substitutions à appliquer (sur version store-friendly)

| Bannir               | Remplacer par                                   |
| -------------------- | ----------------------------------------------- |
| Pari / Betting / Bet | Pronostic, défi, prédiction, alerte             |
| Parier               | Pronostiquer, prédire, défier, alerter          |
| Cote / Odds          | Récompense potentielle, multiplicateur          |
| Mise                 | Engagement, contribution, participation         |
| Solde / Wallet       | Compteur de Sifflets, score                     |
| Cashout / Retrait    | (N'utilise jamais — n'est pas dans ton produit) |
| Bookmaker            | (Idem)                                          |
| Gain / Winnings      | Récompense, points gagnés                       |
| Jackpot              | Cagnotte, bonus                                 |
| Casino / Roulette    | (Aucun lien sémantique avec ces univers)        |

### Métadonnées App Store optimisées (FR)

```
Titre : VAR TIME — Vis le foot en direct
Sous-titre : Pronostics, alertes VAR & ligues entre amis
Catégorie principale : Sports (PAS Casino, PAS Lifestyle)
```

**Mots-clés (100 caractères) :**

```
foot,football,coupe du monde,pronos,pronostic,prediction,VAR,ligue,fantasy,score,compo,classement
```

**À ne JAMAIS mettre dans les keywords :** "betting", "pari", "parier", "bet", "odds", "wager" (déclencheurs de modération automatique Apple).

### Justification écrite à fournir à l'App Review Team

```
VAR TIME is a social football prediction game with strictly virtual
currency ("Sifflets"). Key compliance points:

1. NO real money is ever involved. Sifflets cannot be purchased,
   exchanged, or withdrawn. They are earned exclusively through
   gameplay (daily login, predictions, social activity).

2. NO in-app purchases of any kind. The app is fully free to play.

3. NO third-party gambling integration, no affiliations with betting
   operators.

4. The "Alertes VAR" feature is a social prediction game where users
   collectively guess the outcome of referee decisions during live
   matches — analogous to a trivia game, not a wager.

5. Users below 18 are welcome (PEGI 3 / 4+) — no gambling content,
   no chance-based mechanics, only sports predictions.

6. Privacy policy and Terms of Service explicitly state the absence
   of real-money mechanics: [link]

Comparable apps approved on the App Store: Mon Petit Gazon, Sorare,
Strikr, Onefootball.
```

---

## 9. Domaine & infrastructure

### Choix domaine : `vartime.app`

**Coût :** ~14$/an chez Cloudflare Registrar (prix coûtant).

**Justification :**

- Aligné positionnement "L'app du match en direct"
- Pas de signaux gambling dans l'URL
- HTTPS forcé par Google sur tous les `.app` (signal de sérieux)
- Évolutif (FR + international)

### Configuration recommandée

| Service         | Choix                                  | Coût                                |
| --------------- | -------------------------------------- | ----------------------------------- |
| Registrar       | Cloudflare Registrar                   | ~14$/an                             |
| DNS             | Cloudflare DNS (gratuit)               | 0€                                  |
| Hébergement app | Vercel (existant)                      | Plan Pro recommandé                 |
| Database        | Supabase (existant)                    | Plan actuel                         |
| Email           | Cloudflare Email Routing → Gmail perso | 0€ (à upgrader Workspace plus tard) |
| Analytics       | Vercel Analytics + PostHog (EU-hosted) | Gratuit jusqu'à 1M events           |

### URLs critiques

- `https://vartime.app` → landing principale (ton MPG)
- `https://vartime.app/discover` → landing store-friendly (`noindex`)
- `https://vartime.app/join/{code}` → deep links invitation ligue
- `https://vartime.app/og-image.png` → image Open Graph
- `https://vartime.app/manifest.webmanifest` → PWA manifest
- `https://le-sifflet.vercel.app/*` → 301 redirect vers `vartime.app/*` pendant 6 mois

### Variables d'environnement clés

Source de vérité unique : `NEXT_PUBLIC_APP_URL=https://vartime.app`. Toute URL absolue dans le code dérive de cette variable, jamais hardcodée.

---

## 10. KPIs à surveiller

### KPIs business (cibles CDM)

| KPI                                                | Cible J+7 (post 11 juin)   | Cible J+38 (fin CDM) | Outil                  |
| -------------------------------------------------- | -------------------------- | -------------------- | ---------------------- |
| **DAU**                                            | 500                        | 5 000                | Vercel + PostHog       |
| **DAU/MAU ratio** (engagement)                     | >35%                       | >50%                 | PostHog                |
| **Taux de pari par match live**                    | 30% des présents           | 60%                  | Query Supabase custom  |
| **Taux d'invitation acceptée** (deep link)         | >40%                       | >55%                 | PostHog event tracking |
| **D7 retention**                                   | >25%                       | >40%                 | PostHog                |
| **Taux de complétion pronos** (sur ligues suivies) | >50%                       | >70%                 | Query Supabase         |
| **Notifications opt-in rate**                      | >60%                       | >75%                 | Supabase + push_logs   |
| **Taux de partage de victoire** (VictoryShareCard) | >15% des victoires >200pts | >25%                 | event `victory_shared` |

### KPIs produit (alertes)

| Métrique                  | Seuil d'alerte      | Action si déclenchée           |
| ------------------------- | ------------------- | ------------------------------ |
| Markets ouverts par match | <2/match en moyenne | Revoir seuil quorum dynamique  |
| Push delivery rate        | <85%                | Audit `push_logs`, debug VAPID |
| Crash rate                | >0.5%               | Hotfix prioritaire             |
| Temps moyen page Lobby    | >2.5s               | Audit perf, parallel queries   |
| Taux d'opt-out push       | >5%/semaine         | Réduire fréquence digest       |

### KPIs économie (santé)

| Métrique                                                          | Sain         | Alerte                                                         | Critique  |
| ----------------------------------------------------------------- | ------------ | -------------------------------------------------------------- | --------- |
| Solde médian utilisateur actif                                    | 500-2000 pts | 2000-5000 pts                                                  | >5000 pts |
| Ratio gains/dépenses (gain de Sifflets vs achat boutique+booster) | 1.2-1.8      | 1.8-2.5                                                        | >2.5      |
| % d'utilisateurs "riches" (>10k pts)                              | <5%          | 5-15%                                                          | >15%      |
| % de déclenchement RSA du Parieur                                 | 5-15%        | <5% (pas assez de joueurs en risque) ou >15% (économie cassée) | extrême   |

### Cadence de mesure

- **Quotidien** : DAU, taux pari/match, crash rate (dashboard Vercel + PostHog)
- **Hebdomadaire (dimanche soir)** : Query SQL custom Supabase sur l'ensemble des KPIs
- **Mensuel** : Bilan complet + ajustement éventuel des seuils économiques

---

## 11. Plans B & contingences

### Si DAU < 200 à J+10 (lancement raté)

Pas la fin du monde. 3 leviers d'urgence :

**1. Renforcer la viralité d'amorçage**

- Bonus de 1000 Sifflets pour chaque ami invité qui s'inscrit ET fait son 1er pronostic
- Cagnotte mensuelle "Top inviteur" avec un avatar légendaire à la clé

**2. Pivot du mode communautaire vers du "social anyway"**

- Si le quorum communautaire ne se déclenche jamais malgré le seuil dynamique, ouvrir des markets sur les events les plus probables d'un match (penalty potentiel sur xG > 1, carton attendu si historique violent) en pseudo-aléatoire — l'app n'a JAMAIS d'écran vide
- Quitte à perdre un peu de pureté communautaire pour gagner de la rétention

**3. Pivot tactique vers les petits matchs / squads only**

- Plutôt que de courir après les gros matchs, capitaliser sur le mode ligue privée entre potes comme produit principal
- Communiquer : "VAR TIME = l'app de TES MATCHS, pas l'app des matchs des autres"
- Les soirs de petits matchs deviennent des "soirées de squad"

### Si rejet App Store (post-CDM)

1. **Première soumission rejetée** : c'est NORMAL pour les apps gambling-adjacent. Lire le motif de refus, ajuster (souvent : wording trop explicite, ou copie privacy à clarifier), resoumettre.
2. **Multiples rejets** : envisager la **landing /discover en URL principale** soumise à la review (le wording est déjà neutralisé), conserver `vartime.app` pour le marketing organique.
3. **Échec persistant** : la PWA reste disponible et fonctionnelle. Ajouter un guide "Installer sur iPhone" avec instructions visuelles ("Safari → Partager → Sur l'écran d'accueil"). Le revenu n'est pas dépendant des stores, c'est un canal d'acquisition supplémentaire seulement.

### Si conflit marque INPI

Si la recherche INPI révèle un conflit en classe 9 ou 41 :

1. Évaluer si la marque conflictuelle est active (utilisée commercialement) ou dormante
2. Si active : pivoter de nom (suggestions : VAR'IT, VARYET, KOPLIVE, SIFFLET LIVE, MATCH POCKET)
3. Si dormante : envisager une procédure de déchéance INPI (~500€, 1 an de procédure) ou cohabiter sous un nom voisin

### Si la PWA pose problème pendant la CDM (audience massive)

- Vercel scale automatiquement, peu de risque sur ce plan
- Goulot probable : **quota API-Football**. Le cron `match-monitor` doit être adapté pour batcher 20 fixtures par appel (déjà OK selon `PROJECT_STATE.md`). Surveiller en cas de 64 matchs simultanés (phase de groupes CDM).
- Plan B : passer temporairement à un plan API-Football supérieur le temps du tournoi (~150€ pour le mois)

---

## 12. Annexes

### Annexe A — Pitch dossier de presse complet

```
VAR TIME — L'app du match en direct

PROBLÈME
Pendant qu'un match est diffusé, 18 millions de Français regardent la télé,
téléphone à la main. Ils consultent leurs notifs WhatsApp, scrollent X,
googlent les stats. Mais aucune app ne leur permet de VIVRE le match :
pas de pari instantané, pas de débat communautaire, pas de défi avec leurs
potes.

Mon Petit Prono règne sur le pré-match. Sorare règne sur la fantasy.
Le marché du LIVE est vide.

NOTRE INSIGHT
La VAR est un moment de friction unique : 60 à 90 secondes d'attente où
tout le monde se demande "pénalty ou pas ?". C'est le seul moment du
football moderne où les supporters peuvent ANTICIPER ensemble, à grande
échelle, en temps réel, le verdict d'un événement.

NOTRE PRODUIT
- Mécanique communautaire type Waze : la communauté signale les actions
  litigieuses, ouvre des marchés de paris en 90s, vote sur le verdict.
- Pronos pré-match (score exact, buteurs) avec moteur Contre-Pied
  récompensant la rareté.
- Ligues privées entre amis : mode classique ou braquage 1v1 (mise
  commune, redistribution).
- Saisons mensuelles avec reset compétitif et trophées archivés.
- Monnaie virtuelle (Sifflets) — strictement aucun argent réel.

LE MOMENT
La Coupe du Monde 2026 (11 juin – 19 juillet) est le plus grand événement
sportif de l'histoire : 48 équipes, 104 matches, 5 milliards de
téléspectateurs cumulés. Chaque match est un Super Bowl.

C'est notre moment de naissance.

TRACTION
[À compléter selon les chiffres réels au moment de l'envoi]

ÉQUIPE
[Cafoutch] — Founder, ex-[ton background], v-coder
[+ tes éventuels co-fondateurs / mentors]

DÉMO
https://vartime.app
```

### Annexe B — Termes glossaire

| Terme                | Définition                                                              |
| -------------------- | ----------------------------------------------------------------------- |
| **VAR**              | Video Assistant Referee — assistance vidéo de l'arbitre                 |
| **Sifflets / Pts**   | Monnaie virtuelle interne, gagnée en jouant uniquement                  |
| **Market event**     | Événement à parier (penalty ?, but refusé ?, carton ?)                  |
| **Quorum dynamique** | Seuil de signalements communautaires qui s'adapte à l'audience du match |
| **Squad / Ligue**    | Groupe privé d'amis qui joue ensemble (code d'invitation)               |
| **Braquage**         | Mode 1vs1 hebdomadaire intra-squad, mise commune redistribuée           |
| **Contre-Pied**      | Bonus pour score exact rare (ex: 0-3 sur PSG vs petit club)             |
| **PWA**              | Progressive Web App, installable sans App Store                         |
| **VAPID**            | Standard de Web Push notifications                                      |
| **Trust Score**      | Score de fiabilité d'un user sur ses signalements VAR                   |
| **Saison**           | Cycle mensuel avec reset des points (1er → 1er)                         |
| **Hall of Fame**     | Classement perpétuel basé sur lifetime_points_earned                    |

### Annexe C — Questions ouvertes / décisions en suspens

| Question                                                         | Statut      | Décision target           |
| ---------------------------------------------------------------- | ----------- | ------------------------- |
| Faut-il déposer la marque "VAR TIME" à l'INPI ?                  | Pas urgent  | Post-CDM si PMF confirmé  |
| Faut-il un plan Vercel Pro pour gérer le pic CDM ?               | À évaluer   | Avant J-7                 |
| Faut-il acheter `vartime.fr` en complément ?                     | Optionnel   | Si SEO FR critique        |
| Faut-il un partenariat presse avant le 11 juin ?                 | À tenter    | Pitch en S3-S4            |
| Faut-il une stratégie de modération communautaire (chat ligue) ? | À anticiper | Avant >100 ligues actives |
| Faut-il monter une vraie société (SASU vs auto-entrepreneur) ?   | Pas urgent  | Post-CDM si revenue       |

### Annexe D — Liens utiles

- Repo GitHub : [à compléter]
- Production : https://vartime.app
- Bêta : https://vartime.app (idem, plus de différenciation post-migration)
- Supabase : [dashboard URL]
- Vercel : [dashboard URL]
- Recherche INPI : https://data.inpi.fr/recherche_avancee/marques
- Documentation API-Football : https://www.api-football.com/documentation-v3
- Documentation Vercel OG : https://vercel.com/docs/functions/og-image-generation

---

## 🎬 Méta — Comment utiliser ce document

1. **Lecture initiale** : 30 min pour absorber l'ensemble. À faire au calme.
2. **Référence quotidienne** : checker les sections 5 (calendrier) et 10 (KPIs) chaque matin.
3. **Référence hebdomadaire** : revoir section 11 (plans B) chaque dimanche soir, ajuster.
4. **Référence avant chaque décision majeure** : section 1 (vision) pour rester aligné.
5. **Mise à jour** : après chaque sprint terminé, mettre à jour section 6 (statuts).

**Si en doute, le critère final est toujours :**

> "Est-ce que cette décision rapproche VAR TIME de l'objectif **'l'app que tu sors quand tu regardes un match'** ?"

Si oui → fais. Si non → reporte.

---

_Document maintenu par le Directeur Technique du projet._
_Dernière mise à jour : 7 mai 2026._
_Prochaine révision prévue : 21 mai 2026 (après Sprint S2)._
