# FRICTION_REDUCTION.md (v2) — Attaquer les vraies frictions du produit

> **Contexte :** Document créé le 9 mai 2026 suite à l'identification par l'utilisateur (en dogfooding réel) des frictions majeures de VAR TIME en conditions live.
>
> **Insight critique :** ce document traite **THE problème central du produit**, plus important que les bugs ou la roadmap GTM. Sans résolution de ces frictions, les paris VAR live ne fonctionnent pas en production réelle.
>
> **Les 3 frictions retenues comme actionnables :**
>
> 1. 🚨 **Friction d'ouverture** : ouvrir l'app pendant la VAR est trop lent
> 2. ⚠️ **Friction notifs** : les push existent mais ne semblent pas fonctionner (à auditer)
> 3. ⚠️ **Friction quorum** : déjà adressé par le Sprint Q (quorum dynamique), pas de sprint dédié supplémentaire
>
> **Friction écartée volontairement :** le système parimutuel actuel (mise + part du pot perdant) est mathématiquement sain. Consensus évident = risque faible = gain faible. Logique cohérente. **NE PAS toucher au système de bet existant.**
>
> **Changements vs v1 :** suppression du sprint FRICTION-2 (refonte parimutuel) qui était basé sur une analyse erronée. Le système actuel reste en place.

---

## 🚨 PRIORITÉ ABSOLUE — À FAIRE AVANT TOUT AUTRE SPRINT

### Sprint AUDIT-NOTIF : DIAGNOSTIC DES PUSH NOTIFICATIONS — "Ça marche ou pas ?"

> **Contexte :** L'utilisateur a fait du dogfooding et n'a pas l'impression que les push fonctionnent. Avant d'investir dans plus de notifs (Sprint FRICTION-1), il faut **savoir si l'infra de base est saine**.
>
> **Effort total :** 30 min - 2h max. C'est de l'audit, pas du build.

- [ ] **AUDIT-NOTIF-1 : Test manuel de delivery**
  - _Action 1 :_ Sur ton tel personnel (PWA installée), vérifier dans les paramètres iOS/Android :
    - Les notifs sont-elles autorisées pour vartime.app ?
    - Le mode "Concentration" / "Ne pas déranger" est-il activé ?
    - L'app PWA est-elle bien dans la liste des apps autorisées à notifier ?
  - _Action 2 :_ Faire le test ultime : créer un compte test, demander à un ami (ou Claude Code via curl) d'envoyer une notif via l'API admin → mesurer si elle arrive et combien de temps après
  - _Action 3 :_ Vérifier les logs Vercel : la route `/api/push/send` (ou équivalent) a-t-elle été appelée ? Avec quel résultat ? 200 ? 400 ?

- [ ] **AUDIT-NOTIF-2 : Audit du Service Worker**
  - _Action 1 :_ Ouvrir Chrome DevTools sur ton tel ou desktop, aller dans Application > Service Workers
  - _Action 2 :_ Vérifier que le SW de vartime.app est bien `activated` et `running`
  - _Action 3 :_ Vérifier la version du SW : si c'est l'ancienne version (avant migration domaine), c'est probablement le bug — le SW de `le-sifflet.vercel.app` est resté en cache et n'a pas été mis à jour
  - _Action 4 :_ Forcer un `skipWaiting()` ou demander à tous les utilisateurs de réinstaller la PWA (cf. MigrationBanner du Sprint D9)

- [ ] **AUDIT-NOTIF-3 : Audit de la table push_subscriptions**
  - _Action 1 :_ Query Supabase : `SELECT COUNT(*), MAX(created_at), MIN(created_at) FROM push_subscriptions WHERE active = true;`
  - _Action 2 :_ Si 0 rows ou très peu de rows récentes → personne n'est inscrit aux push, c'est ça le problème
  - _Action 3 :_ Vérifier que l'enregistrement de la subscription se fait bien à l'onboarding (probablement cassé après la migration domaine, car les VAPID keys ou l'origine ont changé)
  - _Action 4 :_ Tester le flow complet d'opt-in : nouvel utilisateur → accepte les notifs → vérifier la row créée en BDD

- [ ] **AUDIT-NOTIF-4 : Audit des VAPID keys**
  - _Action 1 :_ Vérifier les variables d'env Vercel :
    - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
    - `VAPID_PRIVATE_KEY`
    - `VAPID_SUBJECT` (souvent `mailto:hello@vartime.app`)
  - _Action 2 :_ Si le subject est encore `mailto:hello@le-sifflet...` → mettre à jour
  - _Action 3 :_ Vérifier que les VAPID keys n'ont pas été régénérées par erreur lors d'un sprint récent — si oui, **toutes les subscriptions existantes sont invalidées**

- [ ] **AUDIT-NOTIF-5 : Test end-to-end de bout en bout**
  - _Action 1 :_ Créer 2 comptes test (compte A et compte B sur 2 tels différents)
  - _Action 2 :_ Compte A poste un signal VAR → compte B devrait recevoir un push "Sirène VAR"
  - _Action 3 :_ Si non reçu : tracer le flow étape par étape avec console.log + logs Vercel
  - _Action 4 :_ Identifier le maillon faible et le fixer

**Critère de validation finale :** un push envoyé manuellement à ton tel arrive en moins de 5 secondes, avec son, vibration, et badge.

⚠️ **Si ce sprint révèle que TOUT le système push est cassé**, alors le Sprint FRICTION-1 ci-dessous devient encore plus critique. Mais ne construis PAS sur des fondations cassées.

---

## 🚨 PRIORITÉ CRITIQUE — À FAIRE AVANT LA CDM

### Sprint FRICTION-1 : RÉDUIRE LA FRICTION D'OUVERTURE — "L'app qui vient à toi"

> **Contexte :** L'utilisateur ne peut pas ouvrir l'app, naviguer jusqu'à la LiveRoom, signaler l'event, et parier — tout en moins de 60 secondes. C'est physiquement impossible. **Ce sprint réduit ces étapes de 4-5 à 1-2.**
>
> **Stratégie :** push pré-match agressifs + push avec actions directes pendant la VAR.
>
> **Effort total :** ~3-4 jours Claude Code. **À faire AVANT la CDM.**
>
> ⚠️ **Pré-requis :** Sprint AUDIT-NOTIF doit être OK. Sinon, ce sprint n'a aucun effet.

- [ ] **FRICTION1-1 : Push pré-match J-30 minutes**
  - _Action 1 :_ Cron Vercel `match-imminent-30min` qui tourne toutes les 5 minutes
  - _Action 2 :_ Pour chaque match avec `start_time` entre `now+25min` et `now+35min`, et dont la `competition_id` est dans les `preferred_competitions` de l'utilisateur :
    - Push : "🔴 PSG-OM dans 30 min. Active le **Mode Stade** pour ne rater aucune action VAR."
    - Le tap ouvre directement la LiveRoom de ce match (pas le lobby générique)
  - _Action 3 :_ Cooldown : 1 push max par match par user, tracé en BDD
  - _Action 4 :_ Garde-fou : pas de push entre 23h et 8h (sauf matchs de nuit explicitement attendus)

- [ ] **FRICTION1-2 : Push pré-match J-5 minutes (urgence)**
  - _Action 1 :_ Cron `match-imminent-5min` qui tourne toutes les minutes
  - _Action 2 :_ 5 minutes avant le coup d'envoi, push à TOUS les utilisateurs ayant cette compétition en favori :
    - "⚽ PSG-OM dans 5 min ! Ouvre l'app maintenant pour le mode Stade live."
    - Plus urgent dans le ton, plus de chance d'ouvrir l'app **avant** le coup d'envoi
  - _Action 3 :_ Tap = direct LiveRoom du match
  - _Action 4 :_ N'envoyer ce push QUE pour les matchs des compétitions favorites de l'utilisateur (pas spammer Bundesliga à un fan de L1)

- [ ] **FRICTION1-3 : Web Push avec action buttons OUI/NON**
  - _Contexte :_ L'API Web Push supporte les action buttons depuis 2018. Au lieu d'un push qui demande d'ouvrir l'app, **le push lui-même contient les boutons de pari**.
  - _Action 1 :_ Quand un market VAR s'ouvre, le push envoyé contient :
    ```json
    {
      "title": "🚨 VAR sur PSG-OM",
      "body": "Penalty ? Tu as 90s pour parier.",
      "actions": [
        { "action": "bet_yes", "title": "OUI Penalty" },
        { "action": "bet_no", "title": "NON Pas Penalty" }
      ],
      "data": { "marketId": "uuid-du-market" }
    }
    ```
  - _Action 2 :_ Dans le service worker (`public/sw.js`), gérer les clicks sur ces actions :
    - L'action `bet_yes` ou `bet_no` envoie une requête POST à `/api/bet/quick-place`
    - Mise par défaut : 100 pts (configurable en setting utilisateur)
    - L'utilisateur n'a JAMAIS ouvert l'app, juste tapé un bouton dans la notif
  - _Action 3 :_ Toast Sonner (si l'app est ouverte) ou notification de confirmation (si fermée) :
    - "✅ Pari OUI posé avec 100 pts. Verdict dans XX secondes."
  - _Action 4 :_ Setting utilisateur : "Mise rapide depuis les notifs : [50/100/200/500] pts"
  - _Action 5 :_ Garde-fou : si solde insuffisant, push d'erreur "Solde insuffisant pour cette mise rapide"
  - ⚠️ _Note iOS :_ Les action buttons Web Push fonctionnent mieux sur Android que sur iOS. Sur iOS PWA, le tap simple ouvrira la LiveRoom directement, ce qui reste rapide (<2s)

- [ ] **FRICTION1-4 : Wake Lock API pour PWA en avant-plan**
  - _Contexte :_ Quand l'utilisateur a la PWA ouverte au premier plan pendant un match, le téléphone se verrouille au bout de 30s (paramètre OS). Avec le Wake Lock API, on peut empêcher le verrouillage **uniquement pendant un match en direct**.
  - _Action 1 :_ Sur la LiveRoom, quand un match est en direct, demander un Wake Lock :
    ```js
    const wakeLock = await navigator.wakeLock.request("screen");
    ```
  - _Action 2 :_ Relâcher le wake lock à la fin du match ou si l'utilisateur quitte la LiveRoom
  - _Action 3 :_ Afficher une indication subtile à l'utilisateur : "🔓 Écran maintenu actif pendant le match"
  - _Action 4 :_ Toggle dans les settings pour le désactiver (économie de batterie)

- [ ] **FRICTION1-5 : Mise à jour du pitch produit**
  - _Action 1 :_ Sur la landing page (`vartime.app`), changer le sous-titre de "Pronos avant les matchs..." à quelque chose comme "**L'app du second écran qui te tape sur l'épaule au bon moment.**"
  - _Action 2 :_ Ajouter une section "🏟️ Mode Stade" en hero secondaire :
    - Visuel : un smartphone avec une notif active "🚨 Penalty ?" pendant qu'une TV en arrière-plan diffuse un match
    - Texte : "Tu regardes le match. VAR TIME te prévient. 1 tap pour parier. Pas besoin d'ouvrir l'app."
  - _Action 3 :_ Adapter ton pitch presse et tes 3 versions de pitch (cf. STRATEGY_v2.md) pour intégrer ce nouveau positionnement

- [ ] **FRICTION1-6 : Onboarding du Mode Stade**
  - _Action 1 :_ Au premier login, après les notifs autorisées, afficher un mini-onboarding "Mode Stade" :
    - Slide 1 : "Tu regardes les matchs avec ton tel à côté ?"
    - Slide 2 : "VAR TIME te tapera sur l'épaule à chaque action contestée."
    - Slide 3 : "1 tap dans la notif = pari posé. Pas besoin d'ouvrir l'app."
    - Slide 4 : "Quelles compétitions tu veux suivre en Mode Stade ?" → sélection des compétitions favorites
  - _Action 2 :_ Si l'utilisateur saute cet onboarding, le repush 1 fois 7 jours plus tard

**Critère de validation finale :** un utilisateur lambda inscrit aujourd'hui regarde un match ce soir SANS avoir ouvert l'app. Il reçoit le push 30 min avant, le push 5 min avant, et lors d'une VAR, son tel vibre, il voit la notif avec 2 boutons OUI/NON, il tape OUI en 1 seconde, son pari est posé. Il a participé à un pari VAR sans jamais avoir ouvert l'app. **Si ce flow marche, ton produit est viable. Sinon, ton produit ne peut PAS marcher en l'état.**

---

## ⚠️ PRIORITÉ MOYENNE — À FAIRE PENDANT LA CDM (en parallèle des autres sprints)

### Sprint FRICTION-3 : LIVE ACTIVITIES iOS (post-Capacitor)

> **Contexte :** Quand l'utilisateur a son tel à côté de la TV mais l'app fermée, comment lui taper sur l'épaule sans qu'il ait à toucher son tel ? Live Activities (iOS Dynamic Island) permettent un affichage persistant pendant un match en cours.
>
> **Effort :** ~5 jours. Nécessite Capacitor (donc post-CDM, pas avant août 2026).

- [ ] **FRICTION3-1 : Investigation technique Live Activities**
  - _Action 1 :_ Vérifier la faisabilité Live Activities depuis Capacitor (plugins existants en 2026 ?)
  - _Action 2 :_ POC sur 1 match : afficher score live + indicateur "VAR active" dans la Dynamic Island
  - _Action 3 :_ Tap sur la Dynamic Island = ouvre directement la LiveRoom du match
  - _Note :_ À explorer en septembre 2026 avec le sprint Capacitor
  - _Source d'inspiration :_ comment Apple Sports, ESPN, ou Strava utilisent les Live Activities pour le tracking en temps réel

---

## 📅 PRIORITÉ BASSE — POST-CDM, EN MODE EXPLORATION

### Sprint FRICTION-4 : APPLE WATCH APP (long shot)

> **Contexte :** L'expérience ultime de réduction de friction. L'utilisateur regarde son match sur TV, sa montre vibre, il tape OUI ou NON sur l'écran de la montre. Latence : 1 seconde.
>
> **Effort :** Énorme. À explorer si le produit décolle vraiment (PMF confirmé fin 2026).
>
> **Pourquoi c'est différenciant :** aucun concurrent (MPP, OneFootball, SofaScore, Twitch) n'a d'app Watch dédiée au pari live. Tu serais seul sur ce segment.

- [ ] **FRICTION4-1 : Étude de faisabilité Apple Watch**
  - _Action :_ POC, pas avant Q4 2026 (post-validation produit)
  - _Pré-requis :_ avoir un co-founder technique avec compétences Swift/WatchKit, ou avoir le budget pour un freelance senior

---

### Sprint FRICTION-5 : SMART TV INTEGRATION (long shot)

> **Contexte :** Le rêve. App VAR TIME pour Apple TV / Android TV qui pop un overlay sur le stream avec QR code dynamique pour parier rapidement.
>
> **Effort :** Très lourd. Réaliste à 18-24 mois.

- [ ] **FRICTION5-1 : POC Apple TV app**
  - _Action :_ Étude de faisabilité, pas avant Q2 2027
  - _Pré-requis :_ produit installé chez 50k+ utilisateurs minimum pour justifier l'investissement

---

## 📋 Récap & priorisation absolue

| Sprint                                             | Priorité     | Effort   | Quand                                   |
| -------------------------------------------------- | ------------ | -------- | --------------------------------------- |
| **AUDIT-NOTIF**                                    | 🚨 IMMÉDIAT  | 30min-2h | **Ce week-end (sieste)**                |
| **FRICTION-1** (push pré-match + Web Push actions) | 🚨 CRITIQUE  | 3-4j     | **Avant CDM (S1-S2)**                   |
| **FRICTION-3** (Live Activities)                   | ⚠️ MOYENNE   | 5j       | Pendant CDM (post-Capacitor, septembre) |
| **FRICTION-4** (Apple Watch)                       | 📅 PLUS TARD | 10j+     | Q4 2026 si PMF                          |
| **FRICTION-5** (Smart TV)                          | 📅 PLUS TARD | 20j+     | Q2 2027 si succès                       |

---

## 🎯 Reprise du calendrier global

Avec ces nouveaux sprints critiques, ton calendrier mai-juin se réorganise :

### Semaine 1 (12-18 mai) — DIAGNOSTIC + FONDATIONS

- AUDIT-NOTIF (30min-2h, ce week-end)
- BUGS_POST_MIGRATION (BUG-1 + BUG-8)
- Sprint Q (quorum dynamique)
- Début FRICTION-1

### Semaine 2 (19-25 mai) — ATTAQUE FRICTION

- Fin FRICTION-1
- Début Sprint Eco-1 (saisons)
- Premières interviews JTBD (cf. INTERVIEWS.md)

### Semaine 3 (26 mai - 1 juin) — POLISH + LANDING

- Fin Sprint Eco-1
- Sprint L (landing v2 avec NOUVEAU pitch "L'app qui vient à toi")
- Sprint INSP-4 (polish VotingModal Twitch)
- Suite des interviews JTBD

### Semaine 4 (2-8 juin) — VIRALITÉ + PRÉ-LANCEMENT

- Sprint V (deep links + VictoryShareCard)
- Sprint Push-1 (push résolution, à coupler avec FRICTION-1)
- Tests E2E complets
- Synthèse interviews JTBD → décision Go/No-Go bêta CDM

### Semaine 5 (9-15 juin) — LAUNCH WEEK

- 11 juin : bêta publique CDM
- Monitoring intensif des KPIs FRICTION (combien de paris posés via push direct vs app ouverte ?)

---

## 💡 Le pitch produit refondu

**Avant (Sprint L initial) :**

> "VAR TIME, l'app du match en direct. Pronos avant les matchs, paris VAR en direct..."

**Après (post-FRICTION) :**

> "VAR TIME, l'app qui te tape sur l'épaule pendant le match. Tu regardes la TV, ton tel vibre, 1 tap pour parier sur la VAR avant l'arbitre. Pas besoin d'ouvrir l'app. Mode Stade activé."

**La différence est massive :**

- L'utilisateur passe de "actif" (doit ouvrir l'app) à "**réactif**" (tape sur une notif)
- Le coût psychologique passe de 4-5 étapes à 1 tap
- Tu te rapproches de Twitch Predictions sans avoir besoin d'être dans le stream

**À mettre à jour partout :** landing, métadonnées App Store (post-Capacitor), pitch presse, descriptions des badges, etc.

---

## 📊 KPIs à tracker post-FRICTION-1

Une fois le sprint déployé, ces métriques deviennent cruciales pour valider l'efficacité de la mécanique :

| KPI                                                   | Cible mi-CDM | Cible fin CDM |
| ----------------------------------------------------- | ------------ | ------------- |
| Taux d'opt-in push notifications                      | >65%         | >75%          |
| % de paris VAR posés via push action (vs app ouverte) | >20%         | >40%          |
| Temps moyen entre ouverture market et premier pari    | <30s         | <20s          |
| Taux d'engagement avec push pré-match J-30            | >25%         | >35%          |
| Taux d'engagement avec push pré-match J-5             | >40%         | >50%          |
| % d'utilisateurs ayant activé "Mode Stade"            | >50%         | >70%          |

**Si après 2 semaines de bêta CDM, le KPI #2 (% paris via push) est <10%, ça veut dire que la friction d'ouverture n'est pas vraiment résolue.** Alors revenir creuser avec les utilisateurs (interviews) pour comprendre pourquoi.

---

## 🎤 Le mot de la fin

L'utilisateur a identifié en 24h ce qui prend à beaucoup de founders 6 mois et 50k€ d'investissement raté : **les vraies frictions du produit n'apparaissent qu'en conditions réelles**.

Le dogfooding rigoureux est le meilleur investissement temps qu'un PM puisse faire. Tu en as fait. Maintenant tu sais où concentrer tes efforts.

**Tout le reste est secondaire vs ces 2 sprints (AUDIT-NOTIF + FRICTION-1).** Si tu n'avais que 10 jours pour livrer quelque chose, tu ferais ces 2 et rien d'autre.

---

## 🔄 Note sur le système parimutuel (volontairement non-touché)

Lors de la rédaction de la v1 de ce document, un sprint "FRICTION-2" avait été imaginé pour refondre le système parimutuel. Après réflexion et discussion, ce sprint a été **annulé** car basé sur une analyse erronée.

**Le système actuel est sain :**

- Mise + part du pot perdant = jamais de perte pour un gagnant
- Consensus évident = risque faible = gain faible (logique économique cohérente)
- Pas de surprise mathématique pour l'utilisateur

**Règle d'or appliquée :** "Si ça marche, n'y touche pas."

Si à terme une vraie friction se révèle dans les interviews utilisateurs (ex: "j'ai gagné mais le bonus était ridicule"), des solutions plus douces seront envisagées :

- Affichage du gain potentiel en live façon Twitch (transparence)
- Récompenses sur axes additionnels (XP, Trust Score) pour ne pas dépendre uniquement des Sifflets
- Bonus contre-courant pour récompenser l'audace

Mais aucune action immédiate. Le système actuel reste tel quel.

---

_Document créé le 9 mai 2026 par le Directeur Technique du projet._
_Version 2 : suppression du sprint FRICTION-2 (refonte parimutuel) suite à correction du PM._
_À utiliser en parallèle de STRATEGY_v2.md, BUGS_POST_MIGRATION.md, INTERVIEWS.md._
