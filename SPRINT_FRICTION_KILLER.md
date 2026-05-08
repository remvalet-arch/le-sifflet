# SPRINT_FRICTION_KILLER.md — Réduire la friction du pari VAR live

> **Contexte critique :** Lors de la session du 9 mai, tu as identifié la friction comme le risque #1 de VAR TIME — la différence avec Twitch Predictions (intégré à un stream actif) vs VAR TIME (qui demande d'ouvrir l'app). Ton dogfooding personnel sur 1 semaine confirme ce diagnostic.
>
> **Trois constats critiques à acter :**
>
> 1. Tes notifs push ne fonctionnent pas correctement post-migration domaine (BUG-0 prioritaire absolu)
> 2. Le parimutuel ne fonctionne pas avec <10 utilisateurs simultanés (mécanique économique cassée à faible volume)
> 3. La friction d'ouverture de l'app est réelle même pour toi (founder qui dogfood)
>
> **Philosophie de ce sprint :** "L'app vient à toi, tu n'ouvres pas l'app." On bascule d'un modèle pull (l'utilisateur ouvre) à un modèle push (l'app interrompt au bon moment, à la bonne dose).
>
> **Anti-pattern à éviter absolument :** spam de notifications. Chaque push doit être hyper-pertinent ou ne pas exister.

---

## 🚨 PRIORITÉ ABSOLUE — Bug critique pré-requis

### 🐛 BUG-0 : Audit complet du système de notifications push

**Sévérité :** 🔴🔴 BLOQUANT — toute la stratégie de réduction de friction repose sur des push qui fonctionnent. Sans ça, RIEN ne marche.

**Symptôme observé :**
Le founder (Cafoutch) a dogfoodé l'app pendant 1 semaine post-migration domaine. Les notifications push ne fonctionnent pas correctement.

**Diagnostic à mener (avant tout autre sprint friction-killer) :**

- [ ] **BUG0-1 : Audit du subsystem push end-to-end**
  - _Action 1 :_ Vérifier les VAPID keys :
    - Variables d'env Vercel : `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
    - Doivent être identiques en prod et dans le code client
    - Si elles ont été régénérées lors de la migration → toutes les subscriptions existantes sont mortes
  - _Action 2 :_ Vérifier le Service Worker :
    - `public/sw.js` (ou équivalent) : URLs de cache pointent-elles vers vartime.app ?
    - Le SW est-il bien enregistré au démarrage de l'app ?
    - Console navigateur : `navigator.serviceWorker.getRegistration()` → doit retourner un SW actif
  - _Action 3 :_ Vérifier la table `push_subscriptions` :
    - Combien de rows actives ? (`SELECT COUNT(*) FROM push_subscriptions WHERE active = true`)
    - Les `endpoint` URL pointent-ils vers Apple/Google push services valides ?
    - Y a-t-il des rows avec `endpoint` contenant `le-sifflet.vercel.app` ? Si oui, à supprimer
  - _Action 4 :_ Test manuel d'envoi :
    - Outil de debug : créer une route `/api/admin/test-push` qui envoie un push à un user_id donné
    - Tester sur ton propre device (Cafoutch)
    - Capturer les logs : succès, erreur, code retour de FCM/APNS

- [ ] **BUG0-2 : Reset des subscriptions et re-onboarding**
  - _Action 1 :_ Si les VAPID keys ont changé : créer une route `/api/admin/invalidate-push-subscriptions` qui marque toutes les rows existantes en `active = false`
  - _Action 2 :_ Au prochain login de chaque user : re-demander la permission push automatiquement (avec un onboarding visible : "🔔 Active les notifications pour ne rater aucune VAR")
  - _Action 3 :_ Tracker via Vercel Analytics : `push_permission_granted`, `push_permission_denied`, `push_permission_default`

- [ ] **BUG0-3 : Validation utilisateur**
  - _Action 1 :_ Communiquer aux 6 bêta-testeurs actuels : "On a fixé un bug push. Tu peux désinstaller la PWA et la réinstaller depuis vartime.app, puis accepter les notifs ?"
  - _Action 2 :_ Test E2E manuel : envoyer un push de test à chacun, vérifier qu'il arrive en moins de 5 secondes
  - _Action 3 :_ Si un device ne reçoit toujours rien : checker iOS PWA limitations (la PWA iOS doit être en mode standalone, ajoutée à l'écran d'accueil, pas juste un bookmark Safari)

**Critère de validation finale :** 6/6 bêta-testeurs reçoivent un push de test en moins de 5 secondes. Sans ça, NE PAS lancer le Sprint FRICTION-1 ci-dessous.

---

## 🎯 Sprint FRICTION-1 : PUSH PRÉ-MATCH AGRESSIF — "Réveille tes utilisateurs au bon moment"

> **Inspiration :** Solution 1 du roadmap friction. Le push 5 min avant le match, pas 2h. Latence courte = pertinence maximale.
>
> **Logique :** Si l'utilisateur reçoit un push 5 min avant PSG-OM, il a son tel à portée pendant les 90 minutes suivantes. Quand un market VAR s'ouvre, il est déjà alerté. La friction d'ouverture de l'app est déplacée du moment critique vers un moment calme.
>
> **Effort :** 1-2 jours Claude Code. Faisable avant la CDM.

- [ ] **FRICTION1-1 : Cron de push pré-match court terme**
  - _Action 1 :_ Étendre le cron `match-imminent` (du Sprint Push-1, route `/api/cron/match-imminent`) pour ajouter une **2e fenêtre de notification** :
    - Fenêtre A (existant) : 2h avant le match → "Préparation" (pronos, invite tes potes)
    - Fenêtre B (nouveau) : **5-7 minutes avant le coup d'envoi** → "Mode Stade" (l'utilisateur doit ouvrir l'app maintenant)
  - _Action 2 :_ Cron tourne toutes les 5 minutes
  - _Action 3 :_ Logique : pour chaque match avec `start_time` entre `now + 5 min` et `now + 8 min`, et compétition ∈ `preferred_competitions` du user, ET le user a ses notifs push activées :
    - Push payload : "🔴 PSG-OM dans 5 min ! Mode Stade activé pour ne rater aucune VAR."
    - Le tap ouvre **directement la LiveRoom** du match (pas la home)
    - Tracker `pre_match_push_sent` et `pre_match_push_clicked`
  - _Action 4 :_ Cooldown : 1 seul push pré-match (fenêtre B) par user par match. Anti-doublon strict.

- [ ] **FRICTION1-2 : Toggle utilisateur granulaire**
  - _Action 1 :_ Sur la page `Notifications` (Sprint Push-1), ajouter un toggle "🔔 Rappel 5 min avant les matchs de mes ligues" (par défaut ON)
  - _Action 2 :_ Stocker dans `profiles.notif_pre_match_5min BOOLEAN DEFAULT TRUE`
  - _Action 3 :_ Onboarding la 1ère fois : modale persuasive "Active ce rappel pour ne plus rater une VAR. Désactivable n'importe quand."

- [ ] **FRICTION1-3 : Smart notification budget anti-spam**
  - _Action 1 :_ Créer une fonction `canSendPushToUser(userId, type)` qui vérifie :
    - Combien de push l'utilisateur a déjà reçu aujourd'hui (table `push_logs` du Sprint Push-1)
    - Type de push (priorité interne : VAR alert > pre_match_5min > resolution > digest > nudge)
    - Budget journalier : max 3 push critiques (VAR alert + pre_match_5min) + 1 digest = 4/jour MAX
    - Si budget dépassé : skip le push (sauf VAR alert critique qui passe toujours)
  - _Action 2 :_ Logger les skips pour analyse : `[BUDGET SKIP] User X, type Y, count today: Z`
  - _Action 3 :_ Stats hebdo dans un endpoint admin : combien de pushes envoyés vs skippés par type

**Critère de validation finale :** un utilisateur reçoit le push 5-7 min avant un match L1, le tap ouvre directement la LiveRoom du bon match. Le smart budget évite tout spam : max 4 push/jour observable sur 1 semaine.

---

## ⚡ Sprint FRICTION-2 : WEB PUSH AVEC ACTIONS DIRECTES — "Parier sans ouvrir l'app"

> **Inspiration :** Solution 3 du roadmap friction. La Web Push API supporte les "action buttons" depuis 2018. L'utilisateur peut interagir directement depuis la notification, sans ouvrir l'app.
>
> **C'est probablement le sprint le plus impactant du fichier.** Il transforme l'expérience : la notif arrive, vibre, l'utilisateur tape "OUI" ou "NON" directement dessus, le pari est posé. **Latence : 2 secondes.**
>
> **Effort :** 2-3 jours Claude Code. Faisable avant la CDM.

- [ ] **FRICTION2-1 : Notifications avec action buttons**
  - _Action 1 :_ Modifier le payload des push de type "VAR alert" :
    ```js
    {
      title: "⚡ PENALTY ? PSG vs OM, 67e min",
      body: "Vote en 90s ! 43 dans le stade.",
      icon: "/icons/var-alert.png",
      badge: "/icons/badge.png",
      vibrate: [200, 100, 200, 100, 400], // pattern long pour urgence
      actions: [
        { action: "bet_yes", title: "✅ OUI" },
        { action: "bet_no", title: "❌ NON" }
      ],
      data: {
        marketEventId: "uuid-...",
        matchId: "uuid-...",
        type: "var_alert"
      },
      requireInteraction: true, // ne disparaît pas auto
      tag: `var-${marketEventId}` // anti-doublon
    }
    ```
  - _Action 2 :_ Côté Service Worker (`public/sw.js`), ajouter un listener `notificationclick` :

    ```js
    self.addEventListener("notificationclick", (event) => {
      const action = event.action; // "bet_yes" ou "bet_no" ou "" (clic sur la notif)
      const marketEventId = event.notification.data.marketEventId;

      if (action === "bet_yes" || action === "bet_no") {
        // Appel API pour poser le pari avec la mise minimum par défaut
        event.waitUntil(
          fetch("/api/var-bets/quick-bet", {
            method: "POST",
            body: JSON.stringify({ marketEventId, vote: action }),
            credentials: "include",
          }),
        );
      } else {
        // Clic sur la notif elle-même : ouvre la LiveRoom
        event.waitUntil(
          clients.openWindow(`/match/${event.notification.data.matchId}`),
        );
      }
      event.notification.close();
    });
    ```

- [ ] **FRICTION2-2 : Endpoint de pari rapide depuis notif**
  - _Action 1 :_ Créer la route `POST /api/var-bets/quick-bet` :
    - Payload : `{ marketEventId, vote: "yes" | "no" }`
    - Logique :
      1. Authentifie l'utilisateur via cookie session
      2. Vérifie que le market est encore ouvert (timer non écoulé)
      3. Pose le pari avec la **mise par défaut** (configurée par l'utilisateur dans ses settings)
      4. Retourne success/failure
  - _Action 2 :_ Ajouter dans `profiles` une colonne `default_var_bet_amount INT DEFAULT 50` (la mise par défaut quand on parie depuis une notif). Modifiable dans les settings.
  - _Action 3 :_ Toast de confirmation côté Service Worker : afficher une nouvelle notif "✅ Pari posé : OUI sur Penalty PSG-OM"
  - _Action 4 :_ Si l'utilisateur a déjà parié sur ce market : retourner erreur claire "Tu as déjà parié sur ce market"

- [ ] **FRICTION2-3 : UI de configuration de la mise par défaut**
  - _Action 1 :_ Sur la page Settings ou Profil, ajouter une section "⚡ Pari rapide" :
    - "Mise par défaut quand tu paries depuis une notification"
    - Slider 10-500 pts (avec respect de la mise minimum scalante du Sprint Eco-4)
    - Tooltip explicatif : "Tu pourras toujours ajuster en ouvrant l'app pour parier en mode complet."
  - _Action 2 :_ Sur la modale de premier pari VAR, proposer "Définir comme mise par défaut" (case à cocher)

- [ ] **FRICTION2-4 : Limitations iOS à documenter**
  - _Important :_ La Web Push API avec `actions` ne fonctionne PAS sur iOS Safari (Apple limite volontairement). iOS PWA reçoit la notif mais sans les boutons d'action.
  - _Action 1 :_ Détecter iOS dans le Service Worker et adapter le payload :
    - Sur iOS : pas d'`actions`, juste le clic sur la notif → ouvre la LiveRoom
    - Sur Android/Desktop : actions disponibles → pari direct possible
  - _Action 2 :_ Communiquer aux utilisateurs iOS : "Sur iOS, tap la notif pour ouvrir l'app et parier en 1 seconde."
  - _Action 3 :_ Future : si Apple ouvre les Web Push actions (rumeurs iOS 18+), basculer automatiquement

- [ ] **FRICTION2-5 : Test critique end-to-end**
  - _Action :_ Test obligatoire avant déploiement :
    1. Ouvrir un match avec un market VAR ouvert
    2. Sur Android : la notif arrive, contient les boutons OUI/NON, tap OUI → confirmation, pari posé en BDD
    3. Sur iOS : la notif arrive, tap → ouvre la LiveRoom, pari faisable en 1-2 taps
    4. Latence totale : <5 secondes du déclenchement au pari posé

**Critère de validation finale :** un user Android peut parier sur une VAR en 1 tap depuis sa notification, sans ouvrir l'app. Latence <3 secondes. iOS user peut parier en 2 taps via la notif qui ouvre la LiveRoom directement sur l'écran de pari.

---

## 🛡️ Sprint FRICTION-3 : MODE STADE PERSISTANT — "L'app reste éveillée pendant le match"

> **Inspiration :** Solution 2 du roadmap friction. Apps de delivery (Uber Eats, Deliveroo) maintiennent une Live Activity pendant la livraison. On applique le pattern aux matchs.
>
> **Note :** Sprint plus ambitieux. Nécessite Capacitor (donc post-CDM en pratique). Mais à anticiper dès maintenant.
>
> **Effort :** 4-5 jours Claude Code (en post-CDM, après Capacitor déployé).

- [ ] **FRICTION3-1 : Bouton "Activer le Mode Stade"**
  - _Action 1 :_ Sur la LiveRoom d'un match, ajouter un bouton hero "🏟️ Activer le Mode Stade" en début de match
  - _Action 2 :_ Au tap : déclenche une wake-lock (web) ou une Live Activity (iOS Capacitor)
  - _Action 3 :_ Mode Stade actif = écran restera allumé, app maintient une connexion Realtime active, push instantanés vibrants

- [ ] **FRICTION3-2 : Live Activity iOS (Dynamic Island)**
  - _Pré-requis :_ Capacitor déployé avec extension Live Activity
  - _Action 1 :_ Quand l'utilisateur active le Mode Stade, créer une Live Activity qui affiche en permanence dans la Dynamic Island :
    - Score live : "PSG 2 - 1 OM · 67e"
    - Si market VAR ouvert : passe en mode urgent avec timer "⚡ 0:47"
    - Tap sur la Live Activity → ouvre la LiveRoom directement
  - _Action 2 :_ Live Activity se ferme automatiquement à la fin du match

- [ ] **FRICTION3-3 : Web wake-lock pour PWA**
  - _Pour les utilisateurs PWA-only (avant Capacitor) :_
  - _Action :_ Utiliser `navigator.wakeLock.request('screen')` pour empêcher la mise en veille de l'écran pendant le Mode Stade. Limite : ne marche que si l'app est au premier plan.

- [ ] **FRICTION3-4 : Indicateur visuel persistant dans l'app**
  - _Action :_ Dans la BottomNav, quand le Mode Stade est actif, ajouter un point rouge clignotant + texte "EN DIRECT" sur l'onglet Stade
  - _Effet :_ même si l'utilisateur navigue dans Profil ou Pronos, il sait qu'il rate potentiellement un market VAR. Réduit l'envie de quitter.

**Critère de validation finale :** Mode Stade activé → l'écran reste allumé, les push arrivent instantanément, la Live Activity affiche le score en temps réel sur Dynamic Island, le pari prend <2 secondes.

⚠️ **Dépendance :** ce sprint nécessite que Capacitor soit déployé. Donc **post-CDM en pratique**, sauf si tu accélères Capacitor.

---

## 💰 Sprint FRICTION-4 : ÉCONOMIE PARIMUTUEL ROBUSTE À FAIBLE VOLUME

> **Constat critique :** Tu m'as confirmé que le parimutuel ne fonctionne pas avec <10 utilisateurs simultanés. Les gains sont ridicules, les perdants frustrés.
>
> **Logique :** Sur les premiers 6-12 mois, ton produit sera quasi systématiquement en faible volume. Il faut une économie qui FONCTIONNE dans ce contexte. Sinon ton produit core est cassé pendant la phase de croissance.
>
> **Effort :** 2 jours Claude Code.

- [ ] **FRICTION4-1 : Pot d'amorçage par market**
  - _Action 1 :_ Pour chaque market_event créé, ajouter un "pot d'amorçage" virtuel selon l'audience du match :
    - Audience <10 actifs : pot d'amorçage de 1000 pts (réparti 50/50 entre OUI et NON)
    - Audience 10-50 actifs : pot d'amorçage de 500 pts
    - Audience 50-200 actifs : pot d'amorçage de 200 pts
    - Audience >200 : pas de pot d'amorçage (parimutuel pur)
  - _Action 2 :_ Au moment de la résolution :
    - Le pot d'amorçage du côté gagnant est distribué proportionnellement aux gagnants
    - Effet : un user qui parie 100 pts contre 1 autre user (50 pts perdants) sur un market amorcé à 1000 pts gagne (50 + 1000) × ratio_de_sa_mise = ~700 pts au lieu de 50
  - _Action 3 :_ Le pot d'amorçage est virtuel : il ne sort de la poche de personne. C'est un boost économique pour faire fonctionner la mécanique à faible volume.

- [ ] **FRICTION4-2 : Cote minimum garantie**
  - _Action 1 :_ Pour les markets en faible volume, garantir une cote minimum de 1.5x sur le côté minoritaire. Si moins de 5 paris sur un côté, la cote est plafonnée à minimum 1.5x.
  - _Action 2 :_ Effet : encourage les paris contraires pour équilibrer + récompense les utilisateurs qui prennent des risques contre la majorité.

- [ ] **FRICTION4-3 : Affichage transparent**
  - _Action 1 :_ Dans la VotingModal, afficher clairement :
    - "⚡ Bonus communauté : +1000 pts dans le pot d'amorçage" (en mode faible volume)
    - "📊 Cote actuelle : 2.3x · 5 votants"
  - _Action 2 :_ L'utilisateur comprend qu'il joue dans un système qui fonctionne, même si la communauté est petite

- [ ] **FRICTION4-4 : Mise à jour des règles**
  - _Action :_ Section "💰 Économie des paris VAR" :
    > "Pendant la phase de bêta, on ajoute un bonus d'amorçage à chaque pari pour que les gains restent intéressants même quand peu de personnes parient. C'est temporaire et transparent. Plus la communauté grandit, plus le bonus diminue, et plus le parimutuel pur prend le relais."

**Critère de validation finale :** un user qui parie 100 pts seul (1 vote contre 0) sur un market peut gagner 500-1000 pts au lieu de 0. Test avec 3 utilisateurs sur un match : tous ressentent que les gains valent le coup.

---

## 📺 Sprint FRICTION-5 (LONG TERME) : VISION SMART TV — Apple TV / Android TV

> **Pas pour avant 12-18 mois.** Mais à documenter dès maintenant pour ne pas l'oublier.
>
> **Pourquoi c'est THE long shot :** une app VAR TIME sur Apple TV transformerait radicalement l'expérience. L'utilisateur regarde son match en streaming sur sa TV connectée, l'overlay VAR s'affiche directement à l'écran, il vote avec sa télécommande Apple TV. **C'est exactement Twitch Predictions appliqué au foot.**
>
> **Effort estimé :** 2-3 mois de développement à temps plein. Pas pour aujourd'hui.

### Pré-requis avant d'envisager ce sprint

1. ✅ Validation produit (post-CDM) — au moins 5000 utilisateurs actifs
2. ✅ Co-founder ou advisor technique senior recruté (cf. STRATEGY_v2.md)
3. ✅ Budget développement : compter 15-25k€ ou un dev senior 3 mois
4. ✅ Démo concept fonctionnelle avant tout investissement lourd

### Vision produit

- App tvOS / Android TV en complément de la PWA mobile
- Connexion via QR code affiché sur la TV → scanné par le mobile (link account)
- Interface pensée pour télécommande (gros boutons, navigation simple)
- Overlay paris VAR en bas d'écran pendant le match
- Vote avec les boutons directionnels de la télécommande
- Notification ambient (LED, son) quand un market s'ouvre

### Concurrents à étudier en amont

- **Twitch tvOS** (déjà existant — voir comment ils ont adapté predictions)
- **Plex** (gère les notifs sur TV)
- **Apple Sports** (app Apple récente sur TV)

### Action immédiate (à faire à 0 coût aujourd'hui)

- [ ] **FRICTION5-VISION : Documenter cette vision dans le pitch**
  - _Action 1 :_ Ajouter dans ton dossier de presse / pitch deck une slide "Vision 2027" qui mentionne l'app Smart TV. Ça montre l'ambition long-terme.
  - _Action 2 :_ Si tu rencontres un investisseur ou un co-founder potentiel : c'est un argument de différenciation puissant. "On vise les 3 écrans : mobile (today), tablet, TV (2027)."

---

## 📋 Récap & priorisation absolue

| Sprint                                   | Effort   | Priorité      | Quand                                   |
| ---------------------------------------- | -------- | ------------- | --------------------------------------- |
| **BUG-0 : Audit push**                   | ~1j      | 🔴🔴 BLOQUANT | **Maintenant, avant tout autre sprint** |
| **FRICTION-1 : Push pré-match agressif** | 1-2j     | 🔴 Critique   | Avant CDM                               |
| **FRICTION-2 : Web Push avec actions**   | 2-3j     | 🔴🔴 Critique | Avant CDM (LE sprint le plus impactant) |
| **FRICTION-4 : Pot d'amorçage**          | 2j       | 🔴 Critique   | Avant CDM                               |
| **FRICTION-3 : Mode Stade Capacitor**    | 4-5j     | ⭐ Forte      | Post-CDM (besoin Capacitor)             |
| **FRICTION-5 : Smart TV**                | 2-3 mois | 💎 Vision     | 2027+ si succès                         |

### Mon ordre d'exécution recommandé absolu

1. **BUG-0** (audit push) — sans ça rien ne marche, donc à faire en TOUT premier
2. **FRICTION-4** (pot d'amorçage) — corrige l'économie cassée à faible volume, transformation du ressenti utilisateur
3. **FRICTION-2** (Web Push actions) — réduit la friction à 1-2 secondes, c'est le sprint le plus rentable
4. **FRICTION-1** (push pré-match 5min) — petit raffinement après FRICTION-2
5. **FRICTION-3** (Mode Stade) — post-CDM
6. **FRICTION-5** (Smart TV) — long terme

**Effort total avant CDM :** ~6-7 jours Claude Code (BUG-0 + FRICTION-1 + FRICTION-2 + FRICTION-4).

C'est faisable. Mais ça veut dire **prioriser ces 4 sprints sur les autres choses qu'on a documentées** (Sprint Eco-1, Sprint L, etc.).

---

## 🎯 LA décision stratégique à prendre maintenant

Tu n'as pas le temps de tout faire avant le 11 juin. Voici la nouvelle hiérarchie que je te propose :

### Ce qui est BLOQUANT (à faire absolument)

1. BUG-0 (audit push)
2. BUG-1 + BUG-8 (crons + onglets disparus)
3. FRICTION-2 (Web Push avec actions) — **THE sprint le plus impactant**
4. FRICTION-4 (pot d'amorçage économique)
5. Sprint Q (quorum dynamique)

### Ce qui est IMPORTANT (à faire si temps)

6. FRICTION-1 (push pré-match 5min)
7. Sprint Eco-1 (saisons)
8. Sprint L (landing v2)
9. Sprint V (deep links + VictoryShareCard)

### Ce qui est REPORTABLE (post-CDM)

10. Sprint Push-1 (push résolution) — peut être fait après les frictions
11. MPP-1 (badges narratifs)
12. INSP-1 à INSP-4
13. MPP-2, MPP-3
14. Sprint Eco-2, Eco-3, Eco-4
15. FRICTION-3 (Mode Stade Capacitor)

**Total bloquant : ~10 jours Claude Code.** Faisable d'ici fin mai.
**Total important : ~10 jours additionnels.** Faisable d'ici la CDM si discipline.
**Total reportable : à voir après les premières data utilisateurs.**

---

## 🚨 Le rappel ultime

**Ton problème de friction est plus grave que tu ne l'admettes peut-être.**

Si après ce sprint tes utilisateurs ne parient toujours pas en masse, ce n'est pas un problème de notif ou de wording. C'est un problème de **product-market fit fondamental** : peut-être que les fans de foot ne veulent PAS sortir leur tel pendant un match, point.

Cette hypothèse doit être testée pendant la bêta CDM. Si à la mi-CDM (vers le 25 juin) tu vois que <20% des utilisateurs présents pendant un match phare posent un pari VAR, c'est que la friction n'est pas le seul problème — c'est le concept entier qui mérite réflexion.

**Mais ne préjuge pas. Lance les frictions, mesure, ajuste. Le 25 juin tu sauras.**

---

_Document créé le 9 mai 2026 par le Directeur Technique du projet, suite à l'identification par l'utilisateur du problème de friction comme risque #1 du produit._
