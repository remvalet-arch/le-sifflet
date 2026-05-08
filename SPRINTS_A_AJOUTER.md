---

### 🎯 Sprint Q : QUORUM DYNAMIQUE — "Réveiller le mode communautaire"

> **Contexte stratégique :** Le seuil fixe `MIN_SIGNALS_TO_TRIGGER` actuel ne fonctionne que sur les gros matchs. Sur 95% des matchs (audience faible), aucun market ne s'ouvre → l'utilisateur se connecte, voit "La VAR dort", part. Cette dette tue silencieusement la rétention. L'API-Football remontant les events avec ~1min de délai, on ne peut PAS l'utiliser comme déclencheur principal — le mode communautaire reste donc le SEUL moyen d'ouvrir des markets en temps utile. Solution : adapter le seuil à l'audience réelle du match.

- [ ] **Q1 : Compteur d'audience temps réel par match**
  - _Action 1 :_ Créer la migration `supabase/migrations/0078_match_active_users.sql`. Ajouter une table `match_presence` (`match_id UUID`, `user_id UUID`, `last_seen_at TIMESTAMPTZ DEFAULT now()`, PRIMARY KEY (`match_id`, `user_id`)). RLS ouverte en SELECT (la donnée est publique, c'est juste un compteur), INSERT/UPDATE limité à `auth.uid() = user_id`. Index sur (`match_id`, `last_seen_at DESC`).
  - _Action 2 :_ Créer une fonction RPC `count_active_users_on_match(p_match_id UUID, p_window_minutes INT DEFAULT 5)` qui retourne le nombre d'users avec `last_seen_at > now() - p_window_minutes minutes`. SECURITY DEFINER, accessible par l'`anon` client.
  - _Action 3 :_ Côté client, dans `LiveRoom.tsx`, créer un hook `useMatchPresence(matchId)` qui ping un upsert `match_presence` toutes les 60s tant que la salle est ouverte (cleanup au démontage).
  - _Action 4 :_ Cron `supabase/migrations/0078_match_active_users.sql` : ajouter aussi un cron Postgres (ou via Vercel cron) qui purge les rows `last_seen_at < now() - 1 hour` pour éviter le ballonnement.

- [ ] **Q2 : Constante de seuil dynamique**
  - _Action 1 :_ Dans `src/lib/constants/alert.ts`, remplacer la constante fixe `MIN_SIGNALS_TO_TRIGGER` par une fonction `getRequiredSignals(activeUsersCount: number): number` :
    ```ts
    if (activeUsersCount <= 5)   return 1;  // Mode "amorçage" — un seul signal suffit
    if (activeUsersCount <= 20)  return 2;
    if (activeUsersCount <= 100) return 3;
    return 5;                              // Anti-spam sur les très gros matchs
    ```
  - _Action 2 :_ Dans `src/app/api/alert/route.ts`, après la réception d'un signal, appeler `count_active_users_on_match(matchId)` puis `getRequiredSignals(count)` AVANT de comparer avec le total des signaux courants (et non plus la constante figée).
  - _Action 3 :_ Logger en console (et idéalement en table `alert_logs` si elle existe déjà, sinon `console.info`) : `[ALERT] Match ${matchId} — audience: ${count}, seuil: ${required}, signals: ${current}`. Sera utile pour tuner après le lancement.

- [ ] **Q3 : Affichage de l'audience dans la LiveRoom**
  - _Action 1 :_ Dans `LiveRoom.tsx`, afficher dans le header du match un petit badge "👁️ {count} dans le stade" (rafraîchi toutes les 30s via Realtime ou polling). Ce badge a une vertu psychologique forte : sentir qu'on est plusieurs déclenche le réflexe de signaler.
  - _Action 2 :_ Si `count >= 5`, badge en jaune `whistle` ; si `< 5`, badge en gris discret avec "Sois le premier à alerter ⚡" en infobulle au tap.
  - _Action 3 :_ Quand l'utilisateur signale une action (action drawer), afficher "Signal envoyé — {current_signals}/{required_signals} pour ouvrir le pari" pour rendre le mécanisme transparent.

- [ ] **Q4 : Mise à jour de la page Règles et de la landing**
  - _Action 1 :_ Dans `src/app/(app)/rules/page.tsx`, mettre à jour la section "Comment fonctionnent les paris VAR" pour expliquer le seuil dynamique : "Plus il y a de monde sur le match, plus il faut de signaux pour ouvrir un pari (anti-spam). Sur les petits matchs, un seul signalement suffit pour réveiller la communauté."
  - _Action 2 :_ Dans la landing `src/app/page.tsx`, dans la section "Comment ça marche" ou équivalente, renforcer le pitch communautaire avec une nouvelle accroche du type : "Tu vois la VAR avant la TV. Toi et la communauté décidez, ensemble, en direct."
  - _Action 3 :_ Vérifier qu'aucune mention de seuil fixe (genre "il faut 3 signalements") ne traîne dans le contenu marketing.

---

### 💰 Sprint Eco-1 : SAISONS MENSUELLES — "Reset, fresh start, hype mensuel"

> **Contexte stratégique :** Sans saisons, l'économie des Sifflets s'inflate sans contrôle (les vieux comptes deviennent intouchables, les nouveaux n'ont aucune chance). Le reset mensuel crée un événement de ré-engagement régulier ("Saison VAR de Mai", "Champion d'avril archivé"), donne une chance à tous, et permet de communiquer chaque 1er du mois (newsletter, push, social). C'est la base de toute économie virtuelle saine (cf. MPG, Fortnite, Sorare).

- [ ] **Eco1-1 : Modèle de saison en base**
  - _Action 1 :_ Créer `supabase/migrations/0079_seasons.sql`. Ajouter une table `seasons` (`id UUID PK`, `slug TEXT UNIQUE` ex: `2026-05`, `label TEXT` ex: `Saison de Mai 2026`, `starts_at TIMESTAMPTZ`, `ends_at TIMESTAMPTZ`, `is_current BOOLEAN`, `created_at`).
  - _Action 2 :_ Ajouter sur `profiles` les colonnes `season_points INT DEFAULT 0` (points de la saison courante, reset chaque mois) et `current_season_id UUID REFERENCES seasons(id)`.
  - _Action 3 :_ Ajouter une table `season_archives` (`user_id UUID`, `season_id UUID`, `final_rank INT`, `final_points INT`, `final_rank_label TEXT` ex: "Champion", "Top 10", `archived_at TIMESTAMPTZ`, PK (`user_id`, `season_id`)). Cette table conserve l'historique pour toujours.
  - _Action 4 :_ Insérer la saison courante en seed : `('2026-05', 'Saison de Mai 2026', '2026-05-01 00:00 Europe/Paris', '2026-05-31 23:59 Europe/Paris', true)`.

- [ ] **Eco1-2 : RPC de bascule de saison**
  - _Action 1 :_ Créer la RPC `transition_season()` (SECURITY DEFINER, `service_role` only) qui :
    1. Identifie la saison courante (`is_current = true`)
    2. Snapshot tous les profils dans `season_archives` (rank par `season_points`, label "Champion" pour le 1er, "Top 3" pour 2-3, "Top 10" pour 4-10, "Participant" sinon)
    3. **Reporte 10% des `season_points` arrondis vers le bas** dans le nouveau `season_points` (l'utilisateur ne perd pas tout, juste 90%)
    4. Marque l'ancienne saison `is_current = false`, crée la nouvelle saison du mois suivant avec `is_current = true`
    5. Update tous les profils avec le nouveau `current_season_id`
  - _Action 2 :_ Adapter la logique de gain de points existante (RPCs `resolve_event_parimutuel`, `resolve_match_pronos`, `claim_daily_streak`) pour incrémenter À LA FOIS `lifetime_points_earned` (immuable) ET `season_points` (saisonnier). `sifflets_balance` reste indépendant — c'est le solde dépensable, pas le ranking.
  - _Important :_ `lifetime_points_earned` ne se reset JAMAIS (leaderboard global = "Hall of Fame"). Le ranking saisonnier utilise `season_points`.

- [ ] **Eco1-3 : Cron mensuel**
  - _Action 1 :_ Créer `src/app/api/cron/transition-season/route.ts` qui appelle la RPC `transition_season()`. Protéger avec `CRON_SECRET`.
  - _Action 2 :_ Ajouter dans `vercel.json` (ou la config cron Vercel équivalente) un job `cron: "0 0 1 * *"` (1er du mois à 00:00 UTC) pointant vers cette route. Note : Vercel fait du UTC — comme ton "jour Paris" est UTC-4h (cf. `paris-day.ts`), la bascule sera donc à 02:00 Paris le 1er. Acceptable.
  - _Action 3 :_ Logger l'exécution dans une table `cron_logs` (si elle n'existe pas, la créer) pour audit.

- [ ] **Eco1-4 : UI de la saison courante**
  - _Action 1 :_ Créer un composant `SeasonBadge.tsx` qui affiche en haut du Profil et du Leaderboard : "🏆 Saison de Mai 2026 — J-X jours". Calcule les jours restants côté client.
  - _Action 2 :_ Adapter `LeaderboardClient.tsx` (Stade > Classement global) : le leaderboard "actuel" trie par `season_points`, un onglet "Hall of Fame" trie par `lifetime_points_earned` (le classement perpétuel).
  - _Action 3 :_ Adapter `SquadLeaderboard.tsx` : le filtre "Général" devient "Saison courante" (tri par `season_points`), conserver "Mois" et "Semaine" comme avant.
  - _Action 4 :_ Sur la page Profil, ajouter une section "🏅 Mes saisons" affichant les `season_archives` de l'utilisateur (3 dernières par défaut, "Voir tout" pour la suite). Un trophée d'or si `final_rank == 1`, argent si Top 3, bronze si Top 10.

- [ ] **Eco1-5 : Communication de la bascule**
  - _Action 1 :_ Le 1er du mois, déclencher un push notification à tous les utilisateurs ayant `season_points > 0` sur la saison écoulée : "🏆 La Saison de Mai est terminée ! Tu finis {final_rank_label} avec {final_points} pts. La Saison de Juin commence MAINTENANT."
  - _Action 2 :_ Sur le **3 derniers jours** de chaque saison, afficher une bannière permanente sur la home : "⏰ La saison se termine dans X jours — donne tout pour ton classement final !"
  - _Action 3 :_ **Mise à jour de la page Règles** (`src/app/(app)/rules/page.tsx`) : ajouter une section "🗓️ Saisons" expliquant : "Tous les 1ers du mois, le classement saisonnier est figé et archivé. Les Sifflets gagnés sont reportés à 10% pour donner à tous une chance de briller chaque mois. Ton total de points cumulés, lui, n'est jamais effacé — il alimente ton 'Hall of Fame' personnel."
  - _Action 4 :_ **Mise à jour de la landing** (`src/app/page.tsx`) : ajouter dans la section "Progression des rangs" (déjà en position 2 depuis UX1-4) un bloc "🗓️ Saisons mensuelles — Chaque mois, un nouveau champion couronné. Tu démarres avec une vraie chance, peu importe quand tu rejoins."

---

### 🛒 Sprint Eco-2 : BOUTIQUE COSMÉTIQUE — "Le premier puits"

> **Contexte stratégique :** Sans puits réel, les Sifflets s'accumulent et perdent leur valeur perçue. Une boutique de cosmétiques crée la première rareté désirable, brûle des Sifflets en circulation, et fait jouer le **collection effect** (moteur de rétention prouvé). Aucun achat avec de l'argent réel — uniquement des Sifflets. Cosmétique pur, pay-to-win impossible.

- [ ] **Eco2-1 : Modèle de boutique en base**
  - _Action 1 :_ Créer `supabase/migrations/0080_shop.sql`. Tables :
    - `shop_items` (`id UUID PK`, `slug TEXT UNIQUE`, `category TEXT CHECK IN ('avatar','border','effect')`, `name TEXT`, `description TEXT`, `price_pts INT`, `unlock_rank TEXT NULLABLE` (ex: 'arbitre_elite' — alternative gratuite), `asset_url TEXT`, `is_active BOOLEAN`)
    - `user_shop_inventory` (`user_id UUID`, `shop_item_id UUID`, `purchased_at`, `is_equipped BOOLEAN`, PK (`user_id`, `shop_item_id`))
  - _Action 2 :_ Ajouter sur `profiles` : `equipped_avatar_id UUID NULLABLE`, `equipped_border_id UUID NULLABLE`, `equipped_effect_id UUID NULLABLE` (FKs vers `shop_items`).
  - _Action 3 :_ Seed initial : 8 avatars (4 standards déblocables par rang, 4 premium achetables 1500-3000 pts), 4 bordures animées (3000-5000 pts), 3 effets de pari (500 pts/usage — voir Eco-3 pour la consommation).

- [ ] **Eco2-2 : RPC d'achat**
  - _Action 1 :_ RPC `purchase_shop_item(p_item_id UUID)` SECURITY DEFINER :
    1. Vérifie que l'item est actif et que l'utilisateur n'est pas déjà propriétaire
    2. Vérifie que `sifflets_balance >= price_pts`
    3. Débite atomiquement `sifflets_balance` et insère la ligne dans `user_shop_inventory`
    4. Retourne `{ ok: true, new_balance, item: {...} }` ou erreur structurée
  - _Action 2 :_ RPC `equip_shop_item(p_item_id UUID)` qui met à jour la colonne `equipped_*_id` correspondante sur `profiles` (un seul item équipé par catégorie à la fois). Vérifie la propriété.
  - _Action 3 :_ Routes API associées : `POST /api/shop/purchase`, `POST /api/shop/equip` — wrap des RPCs avec response `{ ok, data | error }`.

- [ ] **Eco2-3 : UI Boutique**
  - _Action 1 :_ Nouveau path `src/app/(app)/shop/page.tsx` accessible depuis le menu burger ("🛒 Boutique"). Pas dans la BottomNav (priorités).
  - _Action 2 :_ 3 onglets : Avatars / Bordures / Effets. Chaque item = card avec preview visuelle, prix en pts, bouton "Acheter" (ou "Équipé ✓" si possédé et équipé, ou "Équiper" si possédé non équipé).
  - _Action 3 :_ Sur les avatars **déblocables par rang ET achetables**, double affichage : "🔓 Débloqué automatiquement à Arbitre Élite — OU 1500 pts". L'utilisateur choisit sa porte.
  - _Action 4 :_ Animation "🎉 +Avatar débloqué" + toast confettis lors d'un achat.
  - _Action 5 :_ Section "Aperçu" en haut de la boutique qui montre le profil de l'utilisateur en live avec l'item survolé/sélectionné — feedback visuel immédiat.

- [ ] **Eco2-4 : Application des cosmétiques équipés**
  - _Action 1 :_ Dans `ProfileHeader.tsx`, lire `equipped_avatar_id`, `equipped_border_id`, charger les assets correspondants. Fallback sur l'avatar emoji par défaut si rien d'équipé.
  - _Action 2 :_ Dans le leaderboard et les chats de ligue, afficher les bordures animées des autres utilisateurs (status flex visible socialement).
  - _Action 3 :_ Pour les effets de pari (consommables) : voir Sprint Eco-3 (utilisation lors d'un pari).

- [ ] **Eco2-5 : Pages Règles + Landing**
  - _Action 1 :_ **Mise à jour Règles** : ajouter une section "🛒 Boutique" : "Dépense tes Sifflets pour personnaliser ton arbitre — avatars premium, bordures animées, effets de pari visibles par tous. Aucun achat avec de l'argent réel, jamais. Les Sifflets se gagnent uniquement en jouant."
  - _Action 2 :_ **Mise à jour Landing** : ajouter dans la section progression / hero un visuel d'avatars premium ("Affiche ton style — collectionne avatars, bordures et effets exclusifs en jouant"). Conserver la mention "monnaie virtuelle, aucun argent réel" pour Apple.

---

### ⚡ Sprint Eco-3 : BOOSTERS CONSOMMABLES — "Power-ups stratégiques"

> **Contexte stratégique :** Deuxième puits, mais aussi mécanique de jeu. Les boosters introduisent du choix tactique (« est-ce que je dépense mon double-XP sur ce match risqué ? »), brûlent des Sifflets, et créent du **moment de gloire shareable** quand un booster fait basculer un gain. Strict garde-fou : 1 booster max par pari, jamais d'achat en argent réel, jamais de booster qui modifie le résultat (uniquement la récompense).

- [ ] **Eco3-1 : Modèle de boosters**
  - _Action 1 :_ Créer `supabase/migrations/0081_boosters.sql`. Tables :
    - `boosters_catalog` (`id UUID PK`, `slug TEXT UNIQUE`, `name TEXT`, `description TEXT`, `price_pts INT`, `effect_type TEXT CHECK IN ('double_xp','cote_plus','safety_net','vision')`, `effect_value JSONB`, `is_active BOOLEAN`)
    - `user_boosters_inventory` (`id UUID PK`, `user_id UUID`, `booster_id UUID`, `acquired_at`, `consumed_at NULLABLE`, `consumed_on_event_id UUID NULLABLE`, `consumed_on_prono_id UUID NULLABLE`)
  - _Action 2 :_ Ajouter sur `bets` et `pronos` : colonne `applied_booster_id UUID NULLABLE` pour traçabilité.
  - _Action 3 :_ Seed initial :
    - **Double XP** (300 pts) : prochain pari/prono gagnant → +100% sur les points
    - **Cote+** (200 pts) : ta récompense potentielle est +20% (visible avant le pari)
    - **Filet** (500 pts) : si tu perds, tu récupères 50% de la mise
    - **Vision** (100 pts/match) : voir les pronos détaillés des amis sur ce match (sinon masqués cf. anti-triche)

- [ ] **Eco3-2 : RPC d'achat et de consommation**
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

- [ ] **Eco3-3 : UI de sélection du booster**
  - _Action 1 :_ Dans `VotingModal.tsx` (paris VAR), ajouter sous le slider de mise une section "⚡ Utiliser un booster ?" avec une rangée horizontale de chips représentant les boosters possédés. Tap = sélection (un seul à la fois). État neutre = aucun booster.
  - _Action 2 :_ Idem dans le composant de saisie de prono (`MatchPronoSheet` ou équivalent). Le booster s'applique au prono entier (1N2 + score exact).
  - _Action 3 :_ Si l'inventaire est vide → CTA "Acheter des boosters" qui deep-link vers la boutique avec scroll sur l'onglet Boosters.
  - _Action 4 :_ Affichage clair de l'effet anticipé : "Avec Double XP : tu gagnes potentiellement {x2} pts sur ce pari".

- [ ] **Eco3-4 : Feedback de victoire boostée**
  - _Action 1 :_ Lors de la résolution, si `applied_booster_id` était posé et que le pari/prono est gagné, déclencher un toast Sonner spécial : "💥 Booster {nom} activé — tu gagnes {x_amount} pts au lieu de {base_amount} !" avec une animation plus marquée (gradient pulse).
  - _Action 2 :_ Stocker dans une table `booster_highlights` les 10 plus gros gains boostés du mois → exploités plus tard (sprint social) pour générer des stories de ligue type "💥 Cafoutch a explosé son booster Double XP : +1200 pts sur PSG-OM".

- [ ] **Eco3-5 : Pages Règles + Landing**
  - _Action 1 :_ **Mise à jour Règles** : nouvelle section "⚡ Boosters" listant les 4 boosters avec coût et effet en clair. Insister sur : "1 seul booster par pari maximum. Les boosters ne modifient PAS le résultat, seulement ta récompense. Aucun pay-to-win."
  - _Action 2 :_ **Mise à jour Landing** : NE PAS mettre les boosters en avant sur la landing publique (risque de mauvaise perception "ils essaient de me faire payer"). Plutôt mentionner discrètement dans la section "Comment ça marche" : "Personnalise ta stratégie avec des boosters tactiques débloqués en jouant".

---

### 🎚️ Sprint Eco-4 : MISES MINIMUM SCALANTES — "Les riches doivent risquer"

> **Contexte stratégique :** Sans mise minimum scalante, un utilisateur avec 50 000 Sifflets peut miser 5 pts par pari pour pas en perdre. Conséquence : les Sifflets s'accumulent, les paris perdent du sens, l'app devient ennuyeuse. La mise min scalante force les "riches" à brûler proportionnellement, sans punir les nouveaux. C'est aussi un signal de status (« mise min affichée = ton rang d'ancienneté »).

- [ ] **Eco4-1 : Logique de mise min**
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

- [ ] **Eco4-2 : UI dans la VotingModal**
  - _Action 1 :_ Dans `VotingModal.tsx`, lire le solde courant et calculer la mise min via `getMinBetForBalance`. Afficher en sous-texte de la mise : "Mise minimum sur ton solde : {X} pts" (chalk subtil).
  - _Action 2 :_ Le slider de mise commence à `getMinBetForBalance` (pas à 0). Les preset chips (rapides) doivent tous être ≥ ce min.
  - _Action 3 :_ Si l'utilisateur tente de soumettre en dessous (cas edge, ne devrait pas arriver), toast d'erreur clair : "Sur ton solde, mise minimum : {X} pts."

- [ ] **Eco4-3 : Communication transparente**
  - _Action 1 :_ Sur la page Profil, dans la section Vestiaire, afficher discrètement "🎚️ Ta mise minimum : {X} pts" comme un trait de status (pas une punition).
  - _Action 2 :_ Quand un utilisateur passe un palier (ex: solde de 4 800 → 5 100), déclencher un push notif gentil : "🎚️ Tu viens de passer un palier ! Ta mise minimum monte à 50 pts. Plus de risque, plus de gloire."

- [ ] **Eco4-4 : Pages Règles + Landing**
  - _Action 1 :_ **Mise à jour Règles** : nouvelle sous-section dans "Économie des Sifflets" : "🎚️ Mises minimum — Plus tu accumules, plus tes mises minimums montent. C'est un trait de status : les meilleurs prennent les plus gros risques. Liste des paliers : [tableau]."
  - _Action 2 :_ Ne **PAS** mettre sur la landing (sujet trop technique pour un nouveau visiteur, et négatif présenté hors contexte).

---
