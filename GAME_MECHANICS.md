# VAR Time — Mécaniques de jeu complètes

> Rapport technique destiné à l'équipe produit. Décrit le fonctionnement exact des alertes VAR, des paris, des pronos, des notifications et de l'économie du jeu.

---

## Table des matières

1. [Économie — Les monnaies](#1-économie--les-monnaies)
2. [Système de Pronos](#2-système-de-pronos)
3. [Alertes VAR — Comment ça marche](#3-alertes-var--comment-ça-marche)
4. [Types de marchés VAR et résolution](#4-types-de-marchés-var-et-résolution)
5. [Paris VAR — Placement et validation](#5-paris-var--placement-et-validation)
6. [Distribution des gains (parimutuel)](#6-distribution-des-gains-parimutuel)
7. [Système de notifications — Inventaire complet](#7-système-de-notifications--inventaire-complet)
8. [Ligues & Squads](#8-ligues--squads)

---

## 1. Économie — Les monnaies

| Monnaie         | Rôle                              | Modifiable par le joueur                  |
| --------------- | --------------------------------- | ----------------------------------------- |
| **Sifflets 🪙** | Monnaie de pari VAR (dépensable)  | Non — reçus via jeu et récompenses        |
| **Points 🏆**   | Score de saison, classement ligue | Non — gagnés sur pronos et paris gagnants |
| **XP**          | Rang global permanent             | Non — progressif                          |

### Solde de départ

- Nouveau profil : solde initial défini par trigger Supabase à la création du compte.
- Mise VAR par défaut : **50 Sifflets** (`default_var_bet_amount` en profil).

### Gain quotidien (Login Streak)

```
bonus_quotidien = 50 × min(login_streak, 7)
```

- Jour 1 → +50 🪙 | Jour 7+ → +350 🪙 (maximum)
- Une seule réclamation par jour UTC (via `/api/claim-daily-streak`)
- En cas de streak brisé : un **Streak Freeze** (item consommable) peut être utilisé automatiquement pour préserver la série sans pénalité

---

## 2. Système de Pronos

### 2.1 Types de pronos

| Type            | Description                                  | Odds par défaut               |
| --------------- | -------------------------------------------- | ----------------------------- |
| **1N2**         | Victoire domicile / Nul / Victoire extérieur | Cote de marché (ex : 2.1×)    |
| **Score exact** | Prédire le score final                       | Dynamique (voir formule)      |
| **Buteur**      | Prédire un buteur + sa position              | Position-based (voir tableau) |

### 2.2 Cotes et Points — Score exact

**Calcul de la récompense base** depuis les cotes 1N2 du match (stockées à la pose du prono) :

```
odd_1N2    = cote du résultat impliqué par le score pronostiqué (H/D/A)
base_pts   = max(10, arrondi(220 × (1 - 1/odd_1N2)))
fallback   = 50 pts si pas de cotes API
```

**Résolution — 3 cas :**

| Cas                   | Points crédités               |
| --------------------- | ----------------------------- |
| 1N2 correct seulement | `base_pts`                    |
| Score exact correct   | `base_pts × 2 + bonus_rareté` |
| 1N2 incorrect         | 0 (perdu)                     |

**Bonus rareté (score exact)** — calculé parmi les joueurs ayant le bon 1N2 :

| % ayant trouvé l'exact score | Bonus        | Label      |
| ---------------------------- | ------------ | ---------- |
| > 30 %                       | **+20 pts**  | Évident    |
| 20 – 30 %                    | **+30 pts**  | Rare       |
| 5 – 20 %                     | **+50 pts**  | Très rare  |
| 0.5 – 5 %                    | **+70 pts**  | Méga rare  |
| < 0.5 %                      | **+100 pts** | Ultra rare |

> Seuil minimum 5 joueurs avec le bon 1N2 pour activer le calcul de rareté. En-dessous : bonus par défaut **+20 pts**.

### 2.3 Cotes Buteur

Les cotes buteur sont récupérées depuis **API-Football** (`player_odds.odd_anytime`) via le cron `sync-player-odds` (quotidien, J-1 avant le match).

**Formule** :

```
pts = max(10, arrondi(150 × (1 - 1/odd_anytime)))
```

**Fallback si pas d'odds API** (par position dans les compositions) :

| Position          | Cote fallback | Points ~    |
| ----------------- | ------------- | ----------- |
| **Attaquant (A)** | ×3.5          | ~107 pts    |
| **Milieu (M)**    | ×7.0          | ~129 pts    |
| **Défenseur (D)** | ×15.0         | ~140 pts    |
| **Gardien (G)**   | ×25.0         | ~144 pts    |
| **CSC**           | ×25.0 (fixe)  | **144 pts** |

**CSC (Contre Son Camp)** : l'utilisateur peut pronostiquer un but contre son camp adverse au lieu d'un joueur nominatif. La cote fixe ×25.0 reflète la rareté de l'événement. À la résolution, le système compte les buts `is_own_goal = true` de l'équipe adverse dans la timeline.

- Points buteur cumulables sur plusieurs buteurs et plusieurs buts
- Plafond technique : ~144 pts par but (cote ×25.0)

### 2.4 Résolution des pronos

**Deux chemins de résolution :**

| Chemin                                          | Résout pronos DB | Push résultats | Badges | Messages sociaux |
| ----------------------------------------------- | ---------------- | -------------- | ------ | ---------------- |
| `POST /api/admin/finish-match`                  | ✅               | ✅             | ✅     | ✅               |
| Cron `match-monitor` → FT auto via API-Football | ✅               | ❌             | ❌     | ❌               |

> ⚠️ Quand la fin de match est détectée automatiquement par le cron (statut API-Football `FT`/`AET`/`PEN`), les pronos sont résolus en base mais les notifications push, badges et messages de squad **ne sont pas envoyés**. Il faut déclencher `finish-match` manuellement après le match pour le layer social.

Déclenchée via `POST /api/admin/finish-match` (passage du match en `finished`) :

1. Appel RPC `resolve_match_pronos` — calcule les gagnants et met à jour `bets.status`
2. Push personnalisé à chaque parieur avec son gain
3. Déverrouillage de badges (`checkAndUnlockBadges`)
4. Message système dans les squads pour les scores exacts
5. Détection des dépassements entre amis dans les ligues → push "🔥 Dépassé !"
6. Synchronisation stats hub ligue

**Message score exact dans les squads :**

> 🎯 **{username}** avait prédit le score exact **{score}** sur {match} — Respect. 👏

---

## 3. Alertes VAR — Comment ça marche

### 3.1 Déclenchement communautaire (`POST /api/alert`)

Un utilisateur appuie sur un bouton VAR dans le LiveRoom → signal enregistré dans `alert_signals`.

**Conditions pour qu'un signal soit pris en compte :**

| Condition                  | Valeur                                        |
| -------------------------- | --------------------------------------------- |
| Trust score minimum        | 50 (`MIN_TRUST_ALERT_SCORE`)                  |
| Rate limit utilisateur     | Max 5 alertes / 60 secondes (fail silencieux) |
| Cooldown match (même type) | 5 minutes (`COOLDOWN_MINUTES`)                |

**Seuil dynamique** (anti-spam adaptatif, calculé sur l'audience active des 5 dernières minutes) :

| Audience active     | Signaux requis |
| ------------------- | -------------- |
| ≤ 5 utilisateurs    | 1 signal       |
| 6–20 utilisateurs   | 2 signaux      |
| 21–100 utilisateurs | 3 signaux      |
| > 100 utilisateurs  | 5 signaux      |

- Fenêtre d'agrégation des signaux : **30 secondes** (`ALERT_WINDOW_SECONDS`)
- Les signaux doivent venir d'utilisateurs **distincts**

### 3.2 Ouverture automatique via API-Football (cron)

Le cron `match-monitor` (toutes les ~1 min) appelle `syncMatchEvents` → `applyApiFootballSignalsToMarkets` qui analyse les événements live de l'API-Football et ouvre/résout les marchés automatiquement sans intervention communautaire.

### 3.3 Marchés stoppage-time

Ouverts automatiquement par le cron à :

- **Minute 41+** de la 1ère mi-temps → marché `stoppage_ht`
- **Minute 86+** de la 2ème mi-temps → marché `stoppage_ft`

Résolus quand le match passe en `HT` (mi-temps) ou `FT` (fin de match).

---

## 4. Types de marchés VAR et résolution

### 4.1 Tableau complet

| Type              | Label                             | Déclencheur                                       | Résolution                                                  |
| ----------------- | --------------------------------- | ------------------------------------------------- | ----------------------------------------------------------- |
| `var_goal`        | But sous VAR                      | Signal communautaire ou API-Football (VAR review) | Verdict API ou fallback 3 min                               |
| `penalty_check`   | Penalty en discussion             | Signal communautaire ou API-Football              | Verdict API ou fallback 3 min → **Effet Domino** si OUI     |
| `penalty_outcome` | Résultat penalty                  | **Automatique** après `penalty_check = OUI`       | Goal penalty = OUI, penalty raté/arrêté = NON               |
| `red_card`        | Carton rouge                      | Signal communautaire ou API-Football              | Carton rouge API dans la fenêtre = OUI                      |
| `free_kick`       | Coup franc dangereux              | Signal communautaire                              | Goal dans les 3 min = OUI, sinon NON                        |
| `corner`          | Corner                            | Signal communautaire                              | Goal dans les 3 min = OUI, sinon NON                        |
| `stoppage_ht`     | Arrêts de jeu mi-temps            | Cron automatique (min 41+)                        | Calculé depuis les données API-Football au sifflet mi-temps |
| `stoppage_ft`     | Arrêts de jeu temps réglementaire | Cron automatique (min 86+)                        | Calculé depuis les données API-Football au sifflet final    |

### 4.2 Fenêtre de vote

- Durée : **90 secondes** à partir de l'ouverture du marché (`LIVE_BETTING_WINDOW_SECONDS`)
- Après 90s : marché passe en `closed` (plus de nouveaux paris, résolution en attente)

### 4.3 Effet Domino

Quand `penalty_check` est résolu **OUI**, un nouveau marché `penalty_outcome` s'ouvre automatiquement (si aucun n'est déjà ouvert sur ce match).

```
penalty_check = OUI → ouvre penalty_outcome
```

### 4.4 Fallback temporel (API-Football)

Si l'API-Football ne donne pas de verdict explicite dans les 3 minutes :

- `var_goal`, `penalty_check`, `red_card` : cherche un event positif dans la fenêtre → si rien, résout **NON**
- `corner`, `free_kick` : goal dans les 3 min → OUI, sinon NON via le cron de clôture

### 4.5 Chemins de résolution

| Chemin                                         | Qui appelle              | Notifications bettors                            |
| ---------------------------------------------- | ------------------------ | ------------------------------------------------ |
| `POST /api/admin/resolve-event`                | Admin manuel             | ✅ `notifyVarBetResults`                         |
| `POST /api/verify-event`                       | UI (bouton "Vérifier")   | ✅ `notifyVarBetResults`                         |
| Cron `match-monitor` → `syncMatchEvents`       | Automatique API-Football | ✅ `notifyVarBetResults` (depuis fix 2026-05-10) |
| Cron `match-monitor` → `resolveStoppageMarket` | Automatique stoppage     | ✅ `notifyVarBetResults` (depuis fix 2026-05-10) |

---

## 5. Paris VAR — Placement et validation

### 5.1 Règles de mise

| Règle                               | Valeur                         |
| ----------------------------------- | ------------------------------ |
| Mise minimum                        | **10 Sifflets**                |
| Un seul pari par user/event         | Contrainte UNIQUE en DB        |
| Rate limit                          | Max 10 paris / 60 secondes     |
| Tolérance de slippage sur les cotes | ±3% (`IMPLIED_ODDS_TOLERANCE`) |

### 5.2 Flux de placement (`POST /api/bet`)

1. Vérification authentification
2. Récupération des cotes courantes via RPC `get_event_odds`
3. Validation : cote choisie ≤ cote implicite + 3%
4. Appel atomique `place_bet` RPC (débit solde + insert pari avec verrou de ligne)
5. Le RPC rejette si : solde insuffisant, pari en double, mise < minimum

### 5.3 Boosters

Des boosters consommables peuvent modifier les odds ou révéler les votes des amis (Vision). Ils sont sélectionnables dans la VotingModal avant de valider le pari.

---

## 6. Distribution des gains (parimutuel)

### 6.0 Speed bonus VAR

Le reward parimutuel est multiplié selon la rapidité du pari (temps entre l'ouverture du marché et le placement) :

| Délai     | Multiplicateur | Label    |
| --------- | -------------- | -------- |
| 0 – 15 s  | **× 1.25**     | ⚡ Flash |
| 16 – 45 s | **× 1.00**     | Normal   |
| 46 s et + | **× 0.90**     | Tardif   |

> Le speed bonus s'applique sur le reward parimutuel individuel, pas sur le braquage squad.

### 6.1 Modèle parimutuel

VAR Time utilise un **modèle parimutuel** : la mise totale est redistribuée aux gagnants proportionnellement à leur mise.

La résolution appelle la RPC Supabase `resolve_event_parimutuel(p_event_id, p_result)` qui :

1. Marque l'event en `resolved` avec le résultat
2. Identifie les bettors gagnants (ceux qui ont parié le bon côté)
3. Calcule le `potential_reward` pour chaque gagnant (prorata de la pool)
4. Met à jour `bets.status` → `won` ou `lost`
5. Crédite les `sifflets_balance` des gagnants
6. Retourne : `{ winners, total_paid, multiplier, braquage_squads }`

### 6.2 Reset du cooldown VAR

Après chaque résolution, le cooldown VAR du match est réinitialisé (`alert_cooldown_until = null`) pour permettre une nouvelle alerte immédiate.

### 6.3 Bonus squad (braquage)

En mode **braquage** (1v1 entre squads), des bonus supplémentaires sont distribués aux squads via `braquage_squads` (logique gérée côté RPC).

### 6.4 Notifications de gains

Après résolution, `notifyVarBetResults` envoie :

- Push personnalisé à chaque bettor non-opted-out (préférence `notif_var_results`)
- Format gagnant : `"{verdict} +{potential_reward} 🪙 gagnés 🔥"`
- Format perdant : `"{verdict} {amount_staked} 🪙 perdus."`
- Message système dans les squads pour les gros gains (**≥ 200 Sifflets**)

---

## 7. Système de notifications — Inventaire complet

### 7.1 Notifications VAR (temps réel)

| Déclencheur                          | Destinataires                                                     | Titre                     | URL           |
| ------------------------------------ | ----------------------------------------------------------------- | ------------------------- | ------------- |
| Ouverture marché VAR (seuil atteint) | Abonnés du match (`match_subscriptions`, non-mutes)               | `VAR Time 🟨`             | `/match/{id}` |
| Ouverture marché VAR                 | Joueurs en présence active (15 min) avec `notif_var_results=true` | `⚡ VAR en cours !`       | `/match/{id}` |
| Résolution VAR (gagnant)             | Bettor concerné                                                   | `⚡ VAR Résolue — {type}` | `/match/{id}` |
| Résolution VAR (perdant)             | Bettor concerné                                                   | `⚡ VAR Résolue — {type}` | `/match/{id}` |

**Paramètres push pour les alertes d'ouverture** : `urgency: high`, `TTL: 60s`, `requireInteraction: true`, boutons d'action OUI/NON (Android/desktop uniquement).

> ⚠️ **iOS Budget** : Apple limite les notifications "high urgency" pour les PWA. Le budget démarre bas et augmente à chaque interaction. En cas de quota épuisé, les push sont droppés silencieusement.

> ℹ️ **Smart Mute** : Si l'app est visible à l'écran, le service worker supprime la notification (le LiveRoom gère le feedback via Realtime). Les push ne sont affichés que quand l'app est en arrière-plan ou écran verrouillé.

### 7.2 Notifications Pronos (crons programmés)

| Cron                | Timing                | Titre                                   | URL de deep-link |
| ------------------- | --------------------- | --------------------------------------- | ---------------- |
| `match-reminder-2h` | 2h avant coup d'envoi | `⚽ {domicile} – {extérieur} dans 2h !` | `/match/{id}`    |
| `prono-reminders`   | 50–70 min avant       | `⏰ {domicile} – {extérieur} dans 1h`   | `/match/{id}`    |
| `match-imminent`    | 5–8 min avant         | `🔴 Match imminent !`                   | `/match/{id}`    |

> Seuls les utilisateurs **sans prono** sur ce match sont notifiés (filtrage côté cron).

### 7.3 Notifications Résultats

| Déclencheur                     | Destinataires       | Titre                             | URL            |
| ------------------------------- | ------------------- | --------------------------------- | -------------- |
| Fin de match (prono fait)       | Parieurs du match   | `⏱ Match terminé !` + score + pts | `/match/{id}`  |
| Fin de match (pas de prono)     | Abonnés du match    | `⏱ Match terminé !` + score       | `/match/{id}`  |
| Ami dépassé au classement ligue | Utilisateur dépassé | `🔥 Dépassé !`                    | `/ligues`      |
| Bilan quotidien                 | Tous (opt-in)       | `📊 Bilan du jour — VAR TIME`     | `/profile`     |
| Fin de saison                   | Tous                | `🏆 {saison} terminée !`          | `/leaderboard` |

### 7.4 Notifications Sociales

| Déclencheur                  | Destinataires                                | Titre                                  | URL                   |
| ---------------------------- | -------------------------------------------- | -------------------------------------- | --------------------- |
| Message dans le chat squad   | Membres du squad (opt-in `notif_squad_chat`) | `💬 {pseudo} dans {squad}`             | `/ligues/{squad_id}`  |
| Nouveau membre rejoint squad | Owner du squad                               | `🎉 Nouveau membre !`                  | `/ligues/{squad_id}`  |
| Nudge squad                  | Membres sans prono                           | `VAR Time — Pronos en attente 🎯`      | `/pronos`             |
| Sirène VAR (squad)           | Membres du squad                             | `🚨 Sirène VAR — {pseudo} t'appelle !` | `/match/{id}`         |
| Message direct (DM)          | Destinataire                                 | `💬 {pseudo}`                          | `/messages/{user_id}` |

### 7.5 Notifications Lifecycle

| Déclencheur                        | Timing                   | Titre                                        | URL       |
| ---------------------------------- | ------------------------ | -------------------------------------------- | --------- |
| Utilisateur inactif (J+1)          | 23–25h après inscription | `Tu es là pour parier ou pour regarder ? 👀` | `/pronos` |
| Utilisateur actif sans ligue (J+3) | 71–73h après inscription | `🏟️ Joue avec tes potes !`                   | `/ligues` |

### 7.6 Préférences utilisateur (opt-out)

Chaque utilisateur peut désactiver indépendamment dans **Paramètres > Notifications** :

| Clé DB                 | Description            |
| ---------------------- | ---------------------- |
| `notif_var_results`    | Résultats et gains VAR |
| `notif_prono_results`  | Résultats des pronos   |
| `notif_pre_match_2h`   | Rappel prono 2h avant  |
| `notif_pre_match_5min` | Alerte match imminent  |
| `notif_daily_digest`   | Bilan quotidien        |
| `notif_squad_chat`     | Messages du chat ligue |

### 7.7 Conditions pour recevoir un push

1. **Abonnement push actif** : endpoint valide dans `push_subscriptions` (nettoyage auto des 410)
2. **Préférence activée** : flag `notif_*` correspondant = `true` dans `profiles`
3. **Pour les alertes VAR ouverture** : avoir cliqué la cloche (entrée `match_subscriptions` avec `smart_mute=false`) OU être en présence active sur le match (< 15 min)
4. **App en arrière-plan** : le Smart Mute masque les push si l'app est visible

---

## 8. Ligues & Squads

### 8.1 Modes de jeu

| Mode         | Description                                               |
| ------------ | --------------------------------------------------------- |
| **Classic**  | Classement collectif des membres sur la saison            |
| **Braquage** | Oppositions 1v1 entre squads avec bonus sur les gains VAR |

### 8.2 Pot commun

Chaque squad affiche un `pot_commun` = somme des `sifflets_balance` de tous ses membres.

### 8.3 Invitation

Les ligues privées utilisent un code d'invitation à 6 caractères (charset `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, sans I/O/1/0 pour éviter la confusion).

### 8.4 Badges

`checkAndUnlockBadges(userId)` est appelé après chaque résolution (VAR + prono). Les critères de déverrouillage sont définis côté Supabase (RPC ou triggers).

---

_Généré le 2026-05-10 — à mettre à jour à chaque évolution des règles._
