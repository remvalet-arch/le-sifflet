# MPP_INSPIRATIONS.md — Sprints inspirés de l'audit compétitif Mon Petit Prono

> **Contexte :** Audit compétitif réalisé le 9 mai 2026 à partir de 15 captures d'écran de l'app MPP fournies par l'utilisateur.
>
> **Philosophie :** On ne copie PAS MPP feature par feature (ce serait du suicide stratégique). On vole leurs **patterns d'engagement éprouvés sur 8 ans**, et on les applique à notre ADN différenciant (VAR live + braquage 1vs1 + ligues entre potes).
>
> **Position assumée :** VAR TIME est un challenger qui gagne sur l'angle "live", pas sur la profondeur produit. Ces sprints permettent de monter le niveau de polish sans renier l'ADN.

---

## 🎯 Sprint MPP-1 : BADGES NARRATIFS — "Réécrire l'âme des badges"

> **Inspiration MPP :** Chaque badge MPP a une description ludique avec storytelling émotionnel ("NON MAIS SÉRIEUX ???", "C'est ton 1/4h de gloire"). Visuels illustrés dédiés (pas d'emojis).
>
> **Constat sur VAR TIME :** Les noms de badges sont bons (Œil de Faucon, Pierluigi Collina, Le Chat Noir, Nostradamus, Goleador, Fidèle au Poste). Mais les descriptions sont sèches et fonctionnelles. Manque l'âme MPG.
>
> **Effort total :** ~2-3h de copy-writing humain (toi-même) + ~1h Claude Code pour intégration. **Pas de production graphique** sur ce sprint, on garde les visuels actuels.

- [ ] **MPP1-1 : Audit complet des badges existants**
  - _Action 1 :_ Faire la liste exhaustive des badges actuellement en BDD. Requête : `SELECT id, slug, name, description, category FROM badges ORDER BY category, name;`
  - _Action 2 :_ Exporter en CSV ou tableau pour pouvoir éditer hors-app.
  - _Action 3 :_ Pour chaque badge, capturer dans une colonne supplémentaire :
    - Le ton actuel (sec / OK / bon)
    - L'idée narrative à retravailler

- [ ] **MPP1-2 : Réécriture des descriptions (tâche manuelle, PAS Claude Code)**
  - _Action :_ Réécrire chaque description en respectant ces 4 règles :
    1. **Tutoiement** systématique (déjà cohérent avec ton existant)
    2. **Hook émotionnel** en début de phrase ("NON MAIS SÉRIEUX", "Le maître", "Personne n'aime jouer contre toi", "C'est ton 1/4h de gloire")
    3. **Punchline finale** qui chambre ou flatte ("La VAR n'a aucun secret pour toi", "C'est statistique, ça", "La pause va devenir suspecte")
    4. **Maximum 2 phrases courtes** — pas de pavé
  - _Exemples concrets de réécriture (à valider/ajuster) :_

| Badge             | Avant (actuel)                          | Après (proposé)                                                                                           |
| ----------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Œil de Faucon     | "Gagner 3 paris VAR d'affilée"          | "Tu sens l'arnaque avant tout le monde. 3 paris VAR gagnés d'affilée. La VAR n'a aucun secret pour toi."  |
| Pierluigi Collina | "Tous les paris VAR du match : juste"   | "Le maître. Tous les paris VAR du match résolus correctement. La VAR officielle peut prendre des leçons." |
| Le Chat Noir      | "Perdre 5 paris VAR dans le même match" | "Personne n'aime jouer contre toi. 5 paris VAR perdus dans le même match. C'est statistique, ça."         |
| Nostradamus       | "Score exact rare trouvé"               | "Tu as vu venir un score que personne n'a mis. Encore une journée de prophétie réussie."                  |
| Goleador          | "Trouver un buteur correct"             | "Le bon nom au bon moment. T'as senti qui allait planter avant le coup d'envoi."                          |
| Fidèle au Poste   | "Se connecter 3 jours de suite"         | "3 jours de suite à l'appel. La pause va devenir suspecte."                                               |

- _Action bonus :_ Les badges "rares" type Contre-Pied méritent un ton encore plus festif ("LÉGENDAIRE", "MYTHIQUE", emojis 🔥💎 dans le copy).

- [ ] **MPP1-3 : Migration SQL pour mettre à jour les descriptions**
  - _Action 1 :_ Créer `supabase/migrations/0XXX_update_badge_descriptions.sql` (numéro à déterminer selon état du repo)
  - _Action 2 :_ `UPDATE badges SET description = '...' WHERE slug = '...';` pour chacun des badges réécrits
  - _Action 3 :_ Idempotent : check si description déjà mise à jour avant écraser
  - _Action 4 :_ Tester sur un environnement local AVANT de pousser en prod

- [ ] **MPP1-4 : Audit visuel des badges**
  - _Action 1 :_ Sur la page Badges du Profil, vérifier que TOUS les badges affichent leur visuel correctement (les emojis actuels avec lock 🔒 quand bloqué)
  - _Action 2 :_ Tester l'affichage en modal "Détails Badge" : nom + visuel + description doivent être lisibles et alignés
  - _Action 3 :_ Si un badge a une image (pas un emoji), vérifier qu'elle est responsive et qualité Retina

- [ ] **MPP1-5 : Test complet et publication**
  - _Action 1 :_ Smoke test sur la page Profil > Badges : tous les badges affichent leur nouveau wording
  - _Action 2 :_ Tap sur 5 badges aléatoires : les modales détails affichent le bon storytelling
  - _Action 3 :_ Pas de débordement texte sur viewport 360px (iPhone SE)

**Critère de validation finale :** un utilisateur lambda lit 3 descriptions de badges et sourit ou dit "ah c'est cool". Si descriptions toujours plates, repasser sur le copy.

---

## 🏆 Sprint MPP-2 : "C'EST L'HEURE DU BILAN" — Récap post-journée immersif

> **Inspiration MPP :** Page fullscreen post-journée matchs avec : récap pronos (X bons / Y exacts / Z pts), classements (rang général + per club), background animé, CTA explorer. Crée un **moment rituel quotidien** dans l'app.
>
> **Constat sur VAR TIME :** Aujourd'hui, après une journée de matchs, l'utilisateur reçoit un toast et un push (ou rien). Pas de moment de vérité immersif. **Manque LE retour rituel quotidien**.
>
> **Différenciant à ajouter :** Notre récap doit inclure les **paris VAR** en plus des pronos. C'est notre angle.
>
> **Effort total :** ~2-3 jours Claude Code + 30 min de copy.

- [ ] **MPP2-1 : Modèle de données — Snapshot quotidien**
  - _Action 1 :_ Créer `supabase/migrations/0XXX_daily_recaps.sql`. Table `user_daily_recaps` :
    - `id UUID PK`
    - `user_id UUID REFERENCES profiles(id)`
    - `recap_date DATE` (le jour des matchs concernés, en heure Paris)
    - `pronos_total INT`
    - `pronos_correct INT`
    - `pronos_exact INT`
    - `var_bets_total INT`
    - `var_bets_won INT`
    - `points_earned INT`
    - `rank_general INT NULL` (rang dans le classement saisonnier global)
    - `rank_general_total INT NULL` (nombre total d'utilisateurs)
    - `rank_squad_primary INT NULL` (rang dans la ligue principale)
    - `rank_club_supporters INT NULL` (rang parmi les supporters du club préféré, optionnel)
    - `dismissed_at TIMESTAMPTZ NULL` (l'utilisateur a fermé la popup ou pas)
    - `created_at TIMESTAMPTZ DEFAULT now()`
    - PK composite : (`user_id`, `recap_date`)
  - _Action 2 :_ Index sur `(user_id, dismissed_at)` pour requête rapide "récap pas encore vu"
  - _Action 3 :_ RLS : SELECT/UPDATE limité à `auth.uid() = user_id`

- [ ] **MPP2-2 : Cron de génération des recaps**
  - _Action 1 :_ Étendre le cron `daily-digest` existant (ou créer `daily-recap` séparé) qui tourne chaque matin à 09:00 Paris
  - _Action 2 :_ Logique : pour chaque utilisateur ayant eu ≥1 pronostic ou ≥1 pari VAR la veille (J-1), générer une row dans `user_daily_recaps` :
    - Agrège les pronos résolus dans les dernières 24h
    - Agrège les paris VAR résolus dans les dernières 24h
    - Calcule le rang général en utilisant `season_points` et un ranking SQL
    - Calcule le rang dans la ligue principale (la première squad du user)
    - Calcule le rang parmi les supporters du club préféré (optionnel, si `favorite_team_id` non null)
  - _Action 3 :_ Idempotent : si une row existe déjà pour (`user_id`, `recap_date`), skip

- [ ] **MPP2-3 : Composant `MatchdayRecapModal.tsx`**
  - _Action 1 :_ Créer la modale fullscreen avec :
    - Background : gradient pitch + whistle ou image stade flou (style cohérent VAR TIME, pas la copie MPP avec violet/CL)
    - Titre : "C'EST L'HEURE DU BILAN !" en typo bold, capitales
    - Sous-titre : "Tes pronos · J.[journée_active]" ou "Ton bilan d'hier"
    - 3 cards horizontales :
      - **Pronos** : "X / Y bons" avec icône cible
      - **Exacts** : "Z" avec icône précision
      - **Total Pts** : "+W" en gros, couleur whistle si positif
    - **Bonus VAR TIME** : 4e card "Paris VAR" : "A / B gagnés"
    - Section "Mes classements" :
      - Card grand "Général" : "X 234e — Top Y%"
      - Card grand "[Nom ligue principale]" : "3e / 8"
      - Card optionnelle "[Club préféré]" : "12 608e Paris SG"
    - Footer : 2 boutons "Fermer" et "Tous mes pronos →"
  - _Action 2 :_ Animations subtiles : les chiffres comptent en s'incrémentant à l'apparition (count-up animation, librairie `react-countup` ou custom)
  - _Action 3 :_ Tracker via Vercel Analytics events : `recap_modal_opened`, `recap_cta_pronos_clicked`, `recap_dismissed`

- [ ] **MPP2-4 : Déclencheur d'affichage de la modale**
  - _Action 1 :_ Hook `useDailyRecapPopup()` qui :
    1. À l'ouverture de l'app, query `user_daily_recaps WHERE user_id = X AND dismissed_at IS NULL ORDER BY recap_date DESC LIMIT 1`
    2. Si une row existe, déclenche l'affichage de la modale
    3. Au "Fermer" de la modale, UPDATE `dismissed_at = now()`
  - _Action 2 :_ Comportement :
    - Affiche au premier accès du jour, pas à chaque navigation
    - Si l'utilisateur ferme et rouvre l'app dans la même session, ne réaffiche PAS
    - Le lendemain matin, après le cron, une nouvelle row est créée → la modale réapparaît
  - _Action 3 :_ Skip l'affichage si l'utilisateur n'a fait aucun pronostic la veille (rien à raconter)

- [ ] **MPP2-5 : Push notification du matin**
  - _Action 1 :_ Étendre le cron `daily-digest` pour qu'après la génération des recaps, il envoie un push à chaque utilisateur ayant un nouveau recap :
    > "🏆 C'est l'heure du bilan ! Tu as gagné +XXX pts hier. Découvre ton classement →"
  - _Action 2 :_ Le tap sur le push ouvre directement la modale recap (deep link)
  - _Action 3 :_ Respect du toggle `notif_daily_digest` du profil utilisateur (Sprint Push-1 P1-5)

- [ ] **MPP2-6 : Mise à jour des règles**
  - _Action :_ Sur la page Règles (`src/app/(app)/rules/page.tsx`), ajouter une mini-section "🏆 Le bilan quotidien" expliquant le nouveau rituel :
    > "Chaque matin à partir de 9h, retrouve ton bilan de la veille : pronos validés, paris VAR gagnés, points engrangés et rangs actualisés. C'est ta dose quotidienne de gloire (ou de remise en question)."

**Critère de validation finale :** un utilisateur a 5 pronos résolus la veille → le matin suivant à 9h05, il reçoit un push, ouvre l'app, la modale se déclenche automatiquement, il voit son bilan, ses rangs, et il peut explorer.

---

## 📊 Sprint MPP-3 : STATS PER CLUB PRÉFÉRÉ — Ancrage long-terme

> **Inspiration MPP :** Onglet Stats du profil avec filtre saison + filtre club + filtre compétition. Crée un sentiment d'**héritage personnel** ("Mes 3 saisons de PSG sur l'app") qui pousse à rester engagé long-terme.
>
> **Constat sur VAR TIME :** Le profil affiche des stats globales (win rate, points gagnés, séries). Pas de filtre par club/compétition. Manque l'ancrage identitaire fort.
>
> **Différenciant à ajouter :** Inclure aussi les stats VAR per club (combien de VAR sur PSG j'ai bien deviné) — c'est notre angle.
>
> **Effort total :** ~2 jours Claude Code.

- [ ] **MPP3-1 : Vue / RPC pour les stats agrégées**
  - _Action 1 :_ Créer une RPC `get_user_stats(p_user_id UUID, p_competition_id UUID NULL, p_team_id UUID NULL, p_season_id UUID NULL)` qui retourne :
    - `pronos_total`, `pronos_correct`, `pronos_exact`
    - `var_bets_total`, `var_bets_won`
    - `points_total`, `points_pronos`, `points_var`
    - `streak_max`, `streak_current`
    - `best_score_exact_count`, `worst_match_lost`
  - _Action 2 :_ La RPC doit gérer les filtres optionnels (un, plusieurs, ou aucun) en composant les WHERE clauses dynamiquement
  - _Action 3 :_ SECURITY DEFINER, RLS : un user peut consulter ses propres stats uniquement (vérification `auth.uid() = p_user_id`)
  - _Action 4 :_ Performances : ajouter index sur `(user_id, match_id)` sur les tables `pronos` et `bets` si pas déjà là

- [ ] **MPP3-2 : Composant `StatsFiltersBar.tsx`**
  - _Action 1 :_ Créer une rangée de filtres horizontale au-dessus des stats du profil :
    - **Saison** : dropdown avec 2025-2026 (par défaut), 2024-2025 (si data existe), Toutes
    - **Compétition** : chips Toutes / Ligue 1 / UCL / PL / Liga / Serie A / Bundesliga
    - **Club** : chip "[Mon club préféré]" si `favorite_team_id` existe (par défaut OFF, pas pré-sélectionné)
  - _Action 2 :_ Tap sur un filtre déclenche un re-fetch via la RPC `get_user_stats`
  - _Action 3 :_ Skeleton loader pendant le fetch
  - _Action 4 :_ Filtres mémorisés en localStorage (l'utilisateur retrouve ses derniers filtres au retour sur la page)

- [ ] **MPP3-3 : Composants de stats enrichies**
  - _Action 1 :_ Refacto le composant `ProfileStats.tsx` (ou équivalent) pour utiliser la RPC paramétrée
  - _Action 2 :_ Ajouter une section "📊 Mes stats VAR" séparée des pronos :
    - "Sur les paris VAR de [filtre actif] : X gagnés / Y total"
    - "Win rate VAR : Z%"
    - "Plus gros gain : +XXX pts sur [match]"
  - _Action 3 :_ Si filtre "Club préféré" actif : afficher en hero "**Sur les matchs PSG : X pronos joués, Y bons (+ZZZ pts)**" — engagement émotionnel fort

- [ ] **MPP3-4 : Empty states intelligents**
  - _Action 1 :_ Si filtre actif et 0 résultat (ex: filtre Bundesliga + saison 2023 = pas de data) :
    - Empty state "Aucune stat sur cette combinaison. Élargis tes filtres ou viens jouer plus de matchs Bundesliga !"
    - CTA "Voir les pronos Bundesliga à venir →"
  - _Action 2 :_ Si user totalement nouveau (0 pronos) → empty state général "Tu n'as pas encore joué. Lance ton premier prono !"

- [ ] **MPP3-5 : Bonus — Ranking per club préféré**
  - _Action 1 :_ Pour les utilisateurs avec `favorite_team_id` défini, calculer un classement parmi les supporters du même club
  - _Action 2 :_ Afficher en section dédiée : "**Tu es le 142e supporter PSG sur VAR TIME**"
  - _Action 3 :_ Cliquable pour voir le top 10 des supporters du même club (mini-leaderboard)
  - _Action 4 :_ Tracker `club_ranking_viewed` pour mesurer l'engagement de cette feature

**Critère de validation finale :** un utilisateur PSG fan ouvre son profil > stats, sélectionne le filtre "Mon club PSG", et voit immédiatement son histoire personnelle de prono PSG sur la saison. L'effet recherché : "ah ouais, j'ai vraiment construit une histoire ici."

---

## 📋 Récap & priorisation

| Sprint                       | Effort              | Impact business                         | Quand               |
| ---------------------------- | ------------------- | --------------------------------------- | ------------------- |
| **MPP-1 : Badges narratifs** | 2-3h copy + 1h code | 🔥 Élevé (perception qualité +30%)      | Cette semaine       |
| **MPP-2 : Bilan quotidien**  | ~3 jours code       | 🔥🔥 Très élevé (rétention +20% estimé) | Pendant la bêta CDM |
| **MPP-3 : Stats per club**   | ~2 jours code       | 🔥 Élevé (engagement long-terme)        | Post-CDM            |

**Ordre recommandé :**

1. **MPP-1** maintenant (rapide, gros impact perçu, te sort de la routine technique pour faire du copy fun)
2. **MPP-2** dès que les bugs critiques (`BUGS_POST_MIGRATION.md`) sont fixés et le Sprint Eco-1 (saisons) déployé
3. **MPP-3** post-CDM dans la phase "Refacto été" du STRATEGY_v2.md

---

## 🎯 Philosophie qui sous-tend ces 3 sprints

Tu pars en **challenger** vs une app installée depuis 8 ans. Tu ne peux PAS gagner sur la profondeur produit. Tu peux gagner sur :

1. **L'angle différenciant** (live VAR) — déjà acquis, c'est ton ADN
2. **La cohérence visuelle** (palette pitch+whistle, ton MPG-mais-foot) — déjà acquise
3. **Les patterns d'engagement éprouvés** que tu copies/adaptes — c'est ce que ces 3 sprints ajoutent

**Ces 3 sprints ne sont pas critiques pour le lancement** — ils sont critiques pour la **rétention long-terme** et la **perception de qualité**. Sans eux, tu lances un produit fonctionnel. Avec eux, tu lances un produit qui se compare honorablement à MPP.

**Ne les fais PAS au détriment des bugs critiques ou des sprints fondateurs (Q, Eco-1, L, V, Push-1).** Les bugs d'abord, l'innovation ensuite.

---

_Document créé le 9 mai 2026 par le Directeur Technique du projet, sur la base d'un audit compétitif MPP réalisé par l'utilisateur._
