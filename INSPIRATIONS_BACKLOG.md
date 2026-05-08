# INSPIRATIONS_BACKLOG.md — 4 idées à voler intelligemment

> **Contexte :** Audit d'inspirations multi-produits réalisé le 9 mai 2026. Sélection de 4 idées concrètes à intégrer à VAR TIME, en respectant la règle absolue : **chaque idée volée doit soutenir la mécanique core (paris VAR live communautaires), pas la diluer**.
>
> **Sources d'inspiration :**
>
> - **Twitch Predictions** (concurrent indirect — c'est l'inspiration originelle de VAR TIME)
> - **Strava** (référence ultime du social-sportif)
> - **Duolingo** (référence ultime de la rétention quotidienne)
>
> **Position dans la roadmap :** Backlog stratégique. NE PAS implémenter avant la fin du Sprint Q (quorum dynamique) et la validation des KPIs Phase 1 (bêta CDM).

---

## 🥇 Sprint INSP-1 : STREAK FREEZE — "Protéger ses utilisateurs contre eux-mêmes"

> **Inspiration directe :** Duolingo — le système de "Streak Freeze" achetable qui protège ton streak en cas de jour manqué.
>
> **Pourquoi c'est crucial pour toi :** Les streaks sont un excellent moteur de rétention quotidienne MAIS ils sont aussi **anxiogènes**. Un utilisateur qui rate UN seul jour (vie de famille, voyage, maladie) perd 30 jours de streak → il abandonne par frustration. Le Streak Freeze évite cette mortalité utilisateur silencieuse.
>
> **Différenciant VAR TIME :** au lieu d'être achetable en argent réel comme Duolingo, le tien est **achetable uniquement avec des Sifflets virtuels** (cohérent avec ton ADN no-real-money). Et c'est aussi un puits supplémentaire pour ton économie.
>
> **Effort total :** ~1-2 jours Claude Code.

- [ ] **INSP1-1 : Modèle de données**
  - _Action 1 :_ Créer migration `supabase/migrations/0XXX_streak_freezes.sql`. Ajouter sur `profiles` :
    - `streak_freezes_owned INT DEFAULT 0` (combien de freezes l'utilisateur possède)
    - `streak_freezes_used_count INT DEFAULT 0` (combien il en a utilisés total — pour stats)
    - `last_freeze_used_at TIMESTAMPTZ NULL` (anti-abuse)
  - _Action 2 :_ Table `streak_freeze_purchases` pour traçabilité :
    - `id UUID PK`, `user_id UUID`, `purchased_at`, `cost_pts INT`
  - _Action 3 :_ Constraint : un utilisateur ne peut pas posséder plus de 3 freezes simultanément (anti-stockpiling)

- [ ] **INSP1-2 : RPC d'achat et logique d'application automatique**
  - _Action 1 :_ RPC `purchase_streak_freeze()` SECURITY DEFINER :
    - Coût : 500 pts (à ajuster selon économie)
    - Vérifie solde + check du max 3 owned
    - Débite `sifflets_balance`, incrémente `streak_freezes_owned`
    - Insert dans `streak_freeze_purchases`
  - _Action 2 :_ Modifier la RPC ou cron de calcul du streak (probablement dans `claim_daily_streak`) :
    - Si l'utilisateur n'a pas check-in aujourd'hui MAIS a `streak_freezes_owned > 0`
    - Consomme automatiquement 1 freeze (decrement owned, increment used)
    - Conserve le `current_streak`
    - Update `last_freeze_used_at = now()`
    - Logger cet event pour audit

- [ ] **INSP1-3 : UI Boutique + Profile**
  - _Action 1 :_ Dans le menu burger (boutique cosmétique du Sprint Eco-2 si déjà fait), ajouter une nouvelle section "🛡️ Streak Freeze" en haut, avant les avatars :
    - Visuel : un bouclier doré ou un flocon de glace (cohérent visuel)
    - Description : "Protège ton streak en cas de jour manqué. Activation automatique."
    - Bouton "Acheter — 500 pts" (greyé si déjà 3 owned)
  - _Action 2 :_ Sur le profil, afficher le compteur de freezes possédés à côté du streak :
    - "🔥 12 jours · 🛡️ x2" (streak + nombre de freezes en stock)
  - _Action 3 :_ Notification push quand un freeze est utilisé automatiquement :
    - "🛡️ Streak sauvé ! Un Streak Freeze a été utilisé. Reviens demain pour continuer."
    - Crée un sentiment de gratitude qui ramène l'utilisateur

- [ ] **INSP1-4 : Mise à jour des règles**
  - _Action :_ Sur la page Règles, dans la section "🔥 Streaks" (à créer si inexistante) :
    > "Ton streak quotidien est sacré : chaque jour de connexion consécutif te donne un bonus de Sifflets. Mais la vie arrive parfois — un voyage, un imprévu. Le **Streak Freeze** (500 pts à la boutique) protège automatiquement ton streak un jour manqué. Tu peux en stocker jusqu'à 3."

**Critère de validation finale :** un utilisateur a un streak de 15 jours, possède 1 freeze, ne se connecte pas un jour. Le lendemain matin, il reçoit un push "Streak sauvé !", son streak affiche toujours 15 jours, il a 0 freeze restant.

---

## 🥈 Sprint INSP-2 : LIGUES COMPÉTITIVES À PROMOTION/RELÉGATION — "Bronze → Argent → Or"

> **Inspiration directe :** Duolingo — les ligues hebdomadaires Bronze/Argent/Or/Saphir/Rubis/etc. avec promotions et relégations selon ta performance de la semaine.
>
> **Pourquoi c'est génial pour toi :** Ton système de **rangs d'arbitre** actuel (Arbitre de District → Sifflet de Bronze → Sifflet d'Argent → Boss de la VAR) est **statique**. Tu progresses, jamais tu ne régresses. Du coup, après 6 mois, tout le monde est "Boss de la VAR" et le rang ne signifie plus rien. **Tu as construit un ascenseur, pas une compétition.**
>
> **Le fix :** transformer les rangs en **ligues hebdomadaires/mensuelles** où on peut être promu OU rétrogradé selon sa performance. Ça maintient l'enjeu compétitif vivant à long terme.
>
> **Différenciant VAR TIME :** au lieu de promotions hebdo (Duolingo), tu fais des **promotions mensuelles** synchronisées avec tes saisons (Sprint Eco-1). Un cycle plus respirant, plus cohérent avec un produit foot.
>
> **Effort total :** ~3-4 jours Claude Code, à coupler avec le Sprint Eco-1 (saisons).

- [ ] **INSP2-1 : Refonte conceptuelle des rangs**
  - _Action 1 :_ Décider de la nouvelle hiérarchie. Proposition :
    - Division 5 — Arbitre de District (entry level)
    - Division 4 — Sifflet de Bronze
    - Division 3 — Sifflet d'Argent
    - Division 2 — Sifflet d'Or
    - Division 1 — Maître VAR
    - Élite — Boss de la VAR (top 1% mondial)
  - _Action 2 :_ Définir les règles de promotion/relégation :
    - Top 30% de ta division en fin de mois → promu à la division supérieure
    - Bottom 20% → rétrogradé à la division inférieure
    - Milieu 50% → reste
  - _Action 3 :_ Validation : tu ne peux JAMAIS descendre de la division Élite (protection prestige)

- [ ] **INSP2-2 : Migration et logique back-end**
  - _Action 1 :_ Créer migration `supabase/migrations/0XXX_division_system.sql`. Ajouter sur `profiles` :
    - `current_division INT DEFAULT 5` (5 = Arbitre de District, 1 = Maître VAR, 0 = Boss de la VAR)
    - `division_history JSONB` (historique des divisions avec date d'entrée/sortie)
  - _Action 2 :_ Modifier la RPC `transition_season()` (du Sprint Eco-1) pour, après le snapshot des ranks saisonniers :
    - Pour chaque utilisateur, calculer son rang DANS SA DIVISION (pas global)
    - Appliquer les règles promotion/relégation
    - Update `current_division` et logger dans `division_history`
  - _Action 3 :_ Edge case : un nouvel utilisateur démarre toujours en Division 5

- [ ] **INSP2-3 : UI — Affichage de la division**
  - _Action 1 :_ Sur le profil, remplacer le chip "Arbitre de District" actuel par une **card de division** plus prominente :
    - Logo coloré de la division (visuel à designer ou Midjourney)
    - Nom : "Sifflet d'Argent"
    - Sous-texte : "Division 3 · 12 jours avant la prochaine bascule"
    - Mini-progress bar : "Tu es 8e / 50 dans ta division. Top 15 = promu, Bottom 10 = rétrogradé."
  - _Action 2 :_ Nouveau classement dans le Stade : "Mon classement de division" (entre Général et Ligue 1)
  - _Action 3 :_ Animation post-saison quand promu/rétrogradé :
    - Promu : modale full-screen "🎉 PROMOTION ! Bienvenue en Sifflet d'Or" + push notif
    - Rétrogradé : modale plus douce "Division 4 · Reviens en force le mois prochain"

- [ ] **INSP2-4 : Notifications stratégiques fin de mois**
  - _Action 1 :_ J-3 avant fin de mois, push aux utilisateurs en zone de relégation :
    - "⚠️ Plus que 3 jours pour sauver ta division. Tu es 38e / 50 — Bottom 10 = rétrogradé. Joue !"
  - _Action 2 :_ J-3 avant fin de mois, push aux utilisateurs proches de la promotion :
    - "🚀 Plus que 3 jours pour atteindre Sifflet d'Or ! Tu es 16e / 50 — Top 15 = promu."
  - _Action 3 :_ Ces push sont **les plus puissants de l'app** (urgence + enjeu) — ne pas spam, max 1/mois par user

- [ ] **INSP2-5 : Mise à jour des règles**
  - _Action :_ Section dédiée "🏆 Système de divisions" :
    > "Chaque mois, tu joues dans une division avec environ 50 autres arbitres de ton niveau. À la fin du mois : Top 30% promus, Bottom 20% rétrogradés. Grimpe jusqu'à devenir Boss de la VAR — l'élite mondiale du sifflet."

**Critère de validation finale :** un utilisateur D5 finit Top 10 de son mois → promu D4. Un utilisateur D2 finit Bottom 5 → rétrogradé D3. Notifications adéquates envoyées. Le profil reflète immédiatement la nouvelle division.

⚠️ **Attention dépendance :** ce sprint suppose que le Sprint Eco-1 (saisons mensuelles) est livré ET que tu as **au moins 200 utilisateurs actifs** par division pour que ça ait du sens. Sans masse critique, tu auras des divisions à 3 personnes = ridicule. **À déployer post-CDM uniquement.**

---

## 🥉 Sprint INSP-3 : VICTORYSHARECARD — Le partage de gloire automatique

> **Inspiration directe :** Strava — chaque activité génère une carte Instagram-ready partageable. **Multiplicateur viral massif gratuit.**
>
> **Note importante :** ce sprint EXISTE DÉJÀ dans `SPRINTS_LANDING_VIRALITE_PUSH.md` (Sprint V2). Je le rappelle ici parce que c'est ta **plus grosse opportunité de viralité organique** et qu'il faut le faire vraiment bien, pas juste cocher la case.
>
> **Ce que je rajoute par rapport au Sprint V2 :** des inspirations Strava précises pour faire passer ta VictoryShareCard de "fonctionnelle" à "instagrammable".
>
> **Effort additionnel :** ~1 jour de polish design en plus du Sprint V2.

- [ ] **INSP3-1 : Étudier les Strava Stories en détail (1h, hors code)**
  - _Action 1 :_ Installer Strava sur ton téléphone, faire 2-3 activités factices (marche 5 min ça suffit)
  - _Action 2 :_ Aller sur "Partager" sur l'activité, observer :
    - Le format vertical 9:16 (Story Insta)
    - Le branding Strava omniprésent mais pas écrasant
    - L'animation subtile
    - La hiérarchie visuelle : KPI principal énorme, KPI secondaires en bas
    - La photo de fond dynamique selon l'activité
  - _Action 3 :_ Capture 5-6 cards Strava partagées par des amis sur Insta Story (ou cherche `#strava` sur Insta)
  - _Action 4 :_ Lister 3 patterns visuels que tu veux reproduire

- [ ] **INSP3-2 : Variations visuelles selon le type de victoire**
  - _Contexte :_ Le Sprint V2 prévoit UNE carte universelle. Strava en a 5+ : run, vélo, marche, swim, hike. Chacune a son ambiance.
  - _Action :_ Définir 4 variations de VictoryShareCard pour VAR TIME :
    1. **Pari VAR gagné** : background pitch + flame + chiffre du gain énorme. "🔥 +500 pts sur la VAR de PSG-OM"
    2. **Score exact (Contre-Pied)** : background or/violet + emoji éclair. "⚡ J'ai vu 3-1 PSG vs Bayern (15% de la communauté). RARE."
    3. **Promotion de division** : background gradient or + "🏆 PROMU EN SIFFLET D'OR"
    4. **Champion mensuel** : background trophée animé + "🏆 Champion de la Saison Mai 2026"
  - _Effort :_ ~1 jour Claude Code (templates `@vercel/og` paramétrés par type)

- [ ] **INSP3-3 : Branding cohérent**
  - _Action 1 :_ Toutes les cards portent un watermark "VAR TIME" discret dans un coin
  - _Action 2 :_ Toutes les cards ont un **QR code en bas pointant vers `vartime.app/join/[code-tracking]`** — chaque utilisateur a son code unique pour tracker la viralité (combien de gens se sont inscrits via ses partages = leaderboard d'inviteurs caché)
  - _Action 3 :_ Le pseudo de l'utilisateur est **bien visible** : c'est lui le héros de la card, pas VAR TIME

- [ ] **INSP3-4 : CTA de partage agressif mais pas relou**
  - _Action 1 :_ Modale post-victoire avec preview animée de la card :
    - "🏆 Tu viens de claquer +500 pts. Partage ta gloire ?"
    - Boutons : "📲 Partager sur WhatsApp" / "📷 Story Instagram" / "X (Twitter)" / "Pas maintenant"
    - **Astuce Strava** : le bouton principal est pré-sélectionné selon la dernière action de partage de l'utilisateur (apprentissage du comportement)
  - _Action 2 :_ Si l'utilisateur partage 3 fois en 1 semaine, lui décerner un badge spécial "🌟 Ambassadeur" (gamification de la viralité)
  - _Action 3 :_ Toggle "Ne plus me proposer" pour les rabat-joie. Respect.

**Critère de validation finale :** un utilisateur gagne un gros pari → modale s'affiche dans les 2 secondes → il partage en 3 taps sur Instagram → la story rendue est belle, brandée VAR TIME, partagée naturellement → 1-3 de ses followers cliquent et arrivent sur la landing.

---

## 🏆 Sprint INSP-4 : POLISHING DE LA MÉCANIQUE PARI VAR — Apprendre de Twitch Predictions

> **Inspiration directe :** Twitch Predictions — la mécanique qui a inspiré VAR TIME à l'origine. Ils tournent sur des millions d'utilisateurs depuis des années.
>
> **Pourquoi c'est important :** ta mécanique core fonctionne probablement à 70% de son potentiel. Twitch a affiné la sienne sur 5 ans. Tu peux gagner du temps en volant leurs polish points UX précis.
>
> **Effort total :** ~1-2 jours Claude Code (raffinements UI/UX existants).

- [ ] **INSP4-1 : Étudier Twitch Predictions en détail (1h, hors code)**
  - _Action 1 :_ Ouvre Twitch sur mobile et trouve un stream e-sport actif (Valorant, LoL, CS) avec une prédiction ouverte
  - _Action 2 :_ Observer attentivement :
    - Comment la prédiction apparaît à l'écran (overlay, position, couleurs)
    - Le **timer en grand** au centre
    - Les **2 outcomes** présentés (souvent en bleu vs rose)
    - Les **chiffres dynamiques** : combien de Channel Points sont déjà engagés sur chaque côté
    - Les **cotes calculées en temps réel** (X.YY → X.ZZ qui évolue)
    - Le **call-to-action** pour parier en 1 tap
  - _Action 3 :_ Une fois le pari fait, observer :
    - L'animation de confirmation
    - Le compteur "tu as misé X channel points"
    - L'attente collective en temps réel
    - La résolution (animation gagné/perdu)

- [ ] **INSP4-2 : Polishing concret de ta VotingModal**
  - _Action 1 :_ **Cotes dynamiques visibles** : aujourd'hui tu as probablement des cotes statiques. Affiche en temps réel :
    - "OUI : 1.8x · 67% misé" / "NON : 3.2x · 33% misé"
    - Update en live via Realtime à chaque nouveau pari posé
  - _Action 2 :_ **Compteur d'audience visible** : "👁️ 43 dans le stade votent en ce moment"
    - Crée un sentiment de masse, encourage à participer
  - _Action 3 :_ **Timer en TRÈS grand** : aujourd'hui c'est probablement discret. Mets-le en hero, format "0:47" en bold géant
    - Twitch met le timer en énorme parce que **l'urgence est l'addiction**
  - _Action 4 :_ **Animation de tic-tac sur les 10 dernières secondes** : haptic feedback (vibration légère iOS) + couleur du timer qui passe au rouge
    - Crée la pression maximale au moment de basculer

- [ ] **INSP4-3 : Polish post-résolution**
  - _Action 1 :_ Animation de résolution **lente et dramatique** (à la Twitch) :
    - "Le verdict tombe..." avec sablier 2 secondes
    - Puis BAM : "PENALTY ! Tu avais raison ! +500 pts" avec effet confettis ou flame
    - Twitch fait durer la révélation 3-4 secondes pour maximiser la dopamine
  - _Action 2 :_ **Sound design** (optionnel mais énorme) :
    - Petit son léger à chaque tap (pari posé)
    - Son de "ding" gagnant ou "buzz" perdant à la résolution
    - Toggle dans les settings pour les couper
  - _Action 3 :_ **Direct lien vers la VictoryShareCard** (du Sprint INSP-3) si gain >300 pts

- [ ] **INSP4-4 : Top Predictors leaderboard**
  - _Action 1 :_ Sur chaque match, après résolution, afficher un mini-leaderboard "🏆 Top Predictors de PSG-OM" :
    - Top 5 utilisateurs qui ont gagné le plus de points sur ce match
    - Avec leur pseudo + montant
    - Cliquable pour voir leur profil (push à les suivre / inviter en ligue)
  - _Action 2 :_ Push notif aux Top 3 : "🏆 Tu es 2e des prédicteurs de PSG-OM ! +800 pts"
  - _Action 3 :_ Lien depuis le profil "Mes top performances" listant les matchs où l'utilisateur a été dans les Top 5

- [ ] **INSP4-5 : Achievements progressifs sur les paris VAR**
  - _Action :_ En complément des badges existants, ajouter une **série progressive** :
    - "1er pari VAR" → "10 paris VAR" → "100 paris VAR" → "1000 paris VAR"
    - Chaque palier débloque un avatar/bordure exclusif
    - Visible sur le profil comme une vraie progression
  - _Twitch fait ça :_ "Predictions made: 1,247". Donne un sentiment d'investissement long-terme.

**Critère de validation finale :** ouvre ta VotingModal après ce sprint et compare avec Twitch Predictions sur ton tel. Tu dois pouvoir te dire "OK, c'est aussi bien polished, juste appliqué au foot". Si tu n'as pas ce sentiment, retravaille.

---

## 📋 Récap & priorisation

| Sprint                                       | Inspiration        | Effort         | Quand le faire                            |
| -------------------------------------------- | ------------------ | -------------- | ----------------------------------------- |
| **INSP-1 : Streak Freeze**                   | Duolingo           | 1-2j           | Post-Eco1 (saisons), avant CDM            |
| **INSP-2 : Divisions promotion/relégation**  | Duolingo           | 3-4j           | **Post-CDM uniquement** (besoin de masse) |
| **INSP-3 : VictoryShareCard polish**         | Strava             | 1j additionnel | Avec le Sprint V2 (déjà ticketé)          |
| **INSP-4 : Polish VotingModal façon Twitch** | Twitch Predictions | 1-2j           | Avant la bêta CDM (mécanique core)        |

---

## 🎯 Mon conseil d'ordre pour toi

Tu as **trop** de sprints en attente. Je vais te dire la vérité : **ne lance PAS tous ces sprints d'un coup**. Voici l'ordre stratégique.

### Phase 1 — Fondations (mai 2026, avant CDM)

1. Bugs critiques (`BUGS_POST_MIGRATION.md` BUG-1 + BUG-8)
2. Sprint Q (quorum dynamique)
3. **Sprint INSP-4** (polish VotingModal façon Twitch) — c'est ta mécanique core, elle DOIT être parfaite avant la CDM
4. Sprint Eco-1 (saisons)
5. Sprint Push-1 (push résolution)
6. Sprint L (landing v2)

### Phase 2 — Viralité (juin 2026, début CDM)

7. Sprint V (deep links + VictoryShareCard) → en y intégrant les polish **INSP-3** dès le départ
8. Sprint MPP-1 (badges narratifs) — quick win en 2h

### Phase 3 — Engagement long-terme (post-CDM, août+)

9. **Sprint INSP-1** (Streak Freeze)
10. Sprint MPP-2 (Bilan quotidien)
11. Sprint Eco-2 (boutique)

### Phase 4 — Compétitivité avancée (octobre+, post-validation)

12. **Sprint INSP-2** (divisions) — UNIQUEMENT si tu as 200+ users actifs/division
13. Sprint MPP-3 (stats per club)
14. Sprint Eco-3 (boosters)

---

## 🚨 Le rappel discipline

**Tu as maintenant 18+ sprints potentiels documentés.** À 12-16h/semaine de travail sur le projet, ça représente **6 mois minimum** de roadmap.

**Tentation à éviter :** vouloir tout faire avant le 11 juin.

**Réalité à accepter :** tu vas livrer 6 sprints d'ici la CDM, pas 18. Le reste est ton **backlog post-CDM**, pas urgent.

**La règle absolue, encore une fois :** chaque sprint doit passer le test "**est-ce que ça soutient ma mécanique core (paris VAR live) ou est-ce que ça la dilue ?**"

- INSP-1 (Streak Freeze) ✅ → soutient (rétention quotidienne pour ne pas perdre les paris VAR)
- INSP-2 (Divisions) ✅ → soutient (compétition long-terme, motive à parier)
- INSP-3 (VictoryShareCard) ✅ → soutient (partage des gains de paris VAR)
- INSP-4 (Polish VotingModal) ✅ → soutient (c'est LA mécanique core elle-même)

Les 4 idées passent le test. Elles sont bonnes. **Mais pas urgentes toutes les 4.**

---

## 💡 La leçon stratégique cachée

Tu m'as dit "Twitch Predictions m'a donné l'idée". Cette information est **précieuse** pour ton pitch :

> "VAR TIME, c'est Twitch Predictions appliqué au foot mainstream français. Le pattern est validé sur des millions de gamers. Je suis le premier à l'apporter aux fans de Ligue 1."

C'est **un pitch puissant** parce que :

1. ✅ Tu références une mécanique éprouvée (rassurant pour investisseurs/presse)
2. ✅ Tu pointes une opportunité de marché claire (le foot mainstream)
3. ✅ Tu te positionnes comme **premier mover** sur ce segment

**À ajouter dans ton pitch deck quand tu en feras un.** Et dans ton pitch presse en août.

---

_Document créé le 9 mai 2026 par le Directeur Technique du projet._
_À utiliser en parallèle de STRATEGY_v2.md, MPP_INSPIRATIONS.md, et BUGS_POST_MIGRATION.md._
