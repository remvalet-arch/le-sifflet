# 🤖 TASKS — AUTOMATISATION

> Plan d'automatisation marketing, communication et opérations pour VAR TIME.
> Objectif : maximiser l'impact avec un effort humain minimum, en gardant l'authenticité essentielle.
>
> **Principe directeur** : automatiser ce qui peut l'être, garder humain ce qui doit l'être, mesurer obsessionnellement le ROI de chaque agent.
>
> Ce fichier vit en parallèle de `TASKS_v2.md` (roadmap produit) et de `TRAJECTOIRE.md` (stratégie business).
>
> **Dernière mise à jour : 8 mai 2026**

---

## 🎯 Philosophie d'automatisation

Trois règles pour tout ce qui suit :

1. **Pas d'automatisation avant que la prod soit stable**. Un bug critique amplifié par 10 000 emails automatiques, c'est pire que pas d'emails du tout.

2. **Toujours un fallback humain**. Chaque agent doit avoir un mode "validation manuelle" activable d'un clic en cas de doute.

3. **Mesurer le ROI de chaque agent**. Si un agent ne génère pas plus de valeur qu'il n'en coûte (en temps de maintenance + outils + risque de pollution), on le coupe.

---

## 📅 Calendrier d'implémentation recommandé

### Semaine 1 (12-18 mai) — Pas d'automatisation marketing

**Focus** : sprint OBSERV (Sentry, PostHog, environnements). Sans observabilité, on automatise dans le noir.

### Semaine 2 (19-25 mai) — Agents de rétention

**Focus** : impact direct sur ton vrai problème (rétention J7). Les agents marketing externes attendent.

### Semaine 3 (26 mai - 1 juin) — Agents de viralité CDM

**Focus** : préparation de la machine de communication pour la CDM.

### Semaine 4 (2-8 juin) — Tests et fallbacks

**Focus** : tester chaque agent en conditions réelles, préparer les plans B manuels.

### Semaine 5+ (CDM, 11 juin – 19 juillet) — Pilotage

**Focus** : observer, ajuster les prompts quotidiennement, intervenir manuellement sur 20% des cas critiques.

---

## 🤖 Agents à construire

### AUTO-1 — Agent Welcome Onboarding (priorité absolue)

**Mission** : transformer chaque nouveau signup en utilisateur engagé.

**Pourquoi en premier** : la rétention J7 est ton vrai KPI. Si elle est mauvaise, tout le reste est inutile. Cet agent peut faire +10-20% de rétention selon les benchmarks F2P.

- [x] **AUTO-1.1 : Email de bienvenue personnalisé**
  - _Trigger :_ INSERT dans `profiles`
  - _Action :_ Envoi via Resend d'un mail personnalisé (basé sur équipe favorite, langue détectée, source de signup) avec 3 actions claires : "Fais ton premier prono", "Crée ta ligue", "Active les notifs"
  - _Fallback :_ Si l'API Resend échoue, log dans Sentry + notification à toi pour envoi manuel

- [x] **AUTO-1.2 : Push notification J+1 si inactif**
  - _Trigger :_ Cron quotidien qui détecte les `profiles` créés il y a 24h sans aucun prono ni pari
  - _Action :_ Push notification "Tu es là pour parier ou pour regarder ?" avec deep link vers la page Pronos
  - _Fallback :_ Aucun (push non-bloquant)

- [x] **AUTO-1.3 : Email J+3 si toujours inactif**
  - _Trigger :_ Cron quotidien
  - _Action :_ Mail "On a réservé une place pour toi dans la ligue Bêta CDM" avec un faux sentiment d'urgence honnête (c'est vrai, tu as une ligue dédiée)
  - _Fallback :_ Aucun

- [x] **AUTO-1.4 : Email J+7 — feedback ou churn**
  - _Trigger :_ Cron quotidien
  - _Action :_ Mail court "Avant de partir, dis-nous ce qui t'a freiné" avec lien vers Typeform/Tally
  - _Mesure :_ Taux de réponse au feedback = signal très précieux sur les frictions

**Effort :** 2-3 jours
**Coût mensuel :** 0-20€ (Resend free tier suffit pour démarrer)
**KPI :** Rétention J7 par cohorte, taux d'ouverture des emails, taux de réponse Typeform

---

### AUTO-2 — Agent Daily Recap

**Mission** : créer le rituel quotidien qui ramène les utilisateurs.

**Pourquoi maintenant** : c'est le vrai pattern de rétention de MPG, MPP et Sorare. Sans rituel quotidien, l'app sera utilisée pendant la CDM puis oubliée.

- [ ] **AUTO-2.1 : Génération du recap matinal**
  - _Trigger :_ Cron quotidien 9h00 Paris
  - _Action :_ Pour chaque user actif la veille, l'agent génère un mail/push personnalisé via Claude API : "Hier, tu as misé sur X, gagné Y points, position Z dans Les bêtas testeurs. Aujourd'hui, 4 matchs t'attendent."
  - _Source data :_ Tables `pronos`, `bets`, `squad_members` déjà existantes
  - _Fallback :_ Si Claude API down, fallback sur template statique simple

- [ ] **AUTO-2.2 : Push notification soirée**
  - _Trigger :_ Cron quotidien 18h00 si matchs prévus dans la soirée
  - _Action :_ Push de rappel pour les matchs du soir, ciblée selon les `preferred_competitions`
  - _Already partially done :_ cf. Sprint FK1 dans TASKS_v2.md

- [ ] **AUTO-2.3 : Recap hebdomadaire le dimanche**
  - _Trigger :_ Cron dimanche 11h00
  - _Action :_ Mail récapitulatif de la semaine : performance perso, top 3 ligue, badges débloqués, matchs à venir
  - _Format :_ HTML stylé avec data viz (graphique de progression)

**Effort :** 3-4 jours
**Coût mensuel :** Claude API ~10-20€ + Resend ~10€
**KPI :** Taux d'ouverture, CTR vers l'app, rétention J7 et J30

---

### AUTO-3 — Agent Twitter Live Companion (le grand pari CDM)

**Mission** : transformer chaque match en occasion de viralité.

**Pourquoi pendant la CDM** : c'est ton multiplicateur d'audience. Bien fait, ça peut t'amener 1 000-5 000 followers @VARTimeApp sur la durée de la CDM, qui se convertissent à 5-15% en utilisateurs.

- [ ] **AUTO-3.1 : Setup compte Twitter VAR TIME**
  - _Action :_ Créer @VARTimeApp si pas fait, avec bio claire, lien vers app, photo de profil pro
  - _Premiers tweets manuels :_ 10-15 tweets organiques pour humaniser le compte avant l'automation

- [ ] **AUTO-3.2 : Détection des matchs populaires**
  - _Action :_ Définir une liste de matchs "auto-tweet" basée sur la popularité (tous les France, tous les quart+, top 10 affiches CDM)
  - _Stockage :_ Table `social_publication_targets` avec match_id et niveau d'auto-publication

- [ ] **AUTO-3.3 : Génération automatique des tweets d'événement**
  - _Trigger :_ Cron toutes les 30s pendant les matchs ciblés
  - _Détection :_ Nouveaux events dans `match_timeline_events` ou nouveaux `market_events` ouverts/résolus
  - _Action :_ L'agent génère via Claude un tweet contextualisé : "🚨 La VAR vient de checker un possible pénalty pour la France à la 67' ! Sur VAR TIME, 67% misent OUI. Et toi ? [lien]"
  - _Sécurité :_ Limite à 1 tweet/2min pour ne pas spammer

- [ ] **AUTO-3.4 : Mode validation pendant les 5 premiers matchs**
  - _Action :_ Avant publication automatique, le tweet est mis en attente de validation dans une page admin pendant les 5 premiers matchs (pré-CDM tests). Tu valides en 5 secondes par tweet, ce qui sert à :
    - Améliorer les prompts avec tes feedbacks
    - Détecter les hallucinations Claude
    - Apprendre quels formats marchent
  - _Après validation des 5 premiers matchs :_ basculer en mode automatique avec Sentry alert si erreur API

- [ ] **AUTO-3.5 : Récap post-match auto**
  - _Trigger :_ End-of-match (status = FT)
  - _Action :_ Génération automatique d'un thread Twitter récap "Ce que les utilisateurs VAR TIME avaient prédit vs la réalité", avec stats agrégées des pronos
  - _Format :_ 3-5 tweets en thread, avec lien vers l'app

**Effort :** 4-5 jours
**Coût mensuel :** API Twitter (gratuit jusqu'à 1500 tweets/mois), Claude API ~20-40€ pendant CDM
**KPI :** Followers gagnés/jour, impressions par tweet, CTR vers l'app, conversions

**Risque principal :** API Twitter peut être instable, prompts qui produisent du contenu inapproprié. Mitigation : validation manuelle au début + monitoring permanent.

**Plan B si AUTO-3 plante en plein CDM :** tu as Buffer avec 50 tweets pré-écrits programmés en backup. Cf. AUTO-3.6 ci-dessous.

- [ ] **AUTO-3.6 : Backup Buffer manuel**
  - _Action :_ En parallèle d'AUTO-3, écrire 100 tweets génériques (sans event spécifique) sur les thèmes de la CDM, programmés via Buffer pour publication 3-4 fois par jour pendant la CDM. Si AUTO-3 plante, ça maintient une présence minimum.
  - _Effort :_ 1 jour d'écriture (peut être délégué à Claude qui te génère 100 propositions à valider)

---

### AUTO-4 — Agent Press & Influenceur Outreach Assistant

**Mission** : préparer des dossiers presse et influenceurs personnalisés à grande échelle.

**Pourquoi avant CDM** : un article dans Frandroid ou Numerama = 500-2 000 inscriptions immédiates. C'est le ROI le plus élevé de toute ta stratégie d'acquisition.

- [ ] **AUTO-4.1 : Constitution de la liste de cibles**
  - _Action :_ Construire un tableau (Notion/Airtable) avec 50 cibles :
    - 20 médias tech/foot (journalistes individuels avec leurs articles récents)
    - 20 micro-influenceurs Twitter/Instagram foot (5k-50k followers)
    - 10 podcasts foot/tech indépendants
  - _Outils :_ Apollo.io ou Hunter.io pour les emails (~50€/mois 1 mois)

- [ ] **AUTO-4.2 : Génération de mails personnalisés via Claude**
  - _Action :_ Pour chaque cible, l'agent prend en input :
    - URL de leurs articles/posts récents (scraping ou copy-paste manuel)
    - Tes infos produit
  - _Output :_ Un mail d'intro personnalisé qui référence leurs articles, propose un angle adapté à leur ligne éditoriale, et inclut un dossier presse en pièce jointe
  - _Tu valides avant envoi :_ chaque mail prend 2 min de relecture/ajustement vs 30 min de rédaction from scratch

- [ ] **AUTO-4.3 : Génération du dossier presse PDF**
  - _Action :_ Template PDF généré dynamiquement avec :
    - Pitch en 100 mots
    - Screenshots clés de l'app
    - Données de la bêta (nombre d'utilisateurs, retours)
    - Ton bio + photo
    - Liens de download/test
  - _Outils :_ React-PDF ou Puppeteer pour générer le PDF, hébergé sur Vercel

- [ ] **AUTO-4.4 : Envoi étalé sur 2 semaines**
  - _Action :_ Tu envoies 5-10 mails par jour depuis ton mail perso (Gmail/Outlook). Pas d'envoi en masse, ce qui te ferait flagger.
  - _Tracking :_ Tableau Notion avec status (envoyé / réponse / interview / publication)

**Effort :** 3-4 jours
**Coût mensuel :** Apollo/Hunter ~50€ pendant 1 mois, Claude API ~10€
**KPI :** Taux de réponse (cible 10-15%), nombre d'articles publiés (cible 2-5)

---

### AUTO-5 — Agent Community Listener

**Mission** : ne rater aucune conversation importante sur ta marque ou ta niche.

**Pourquoi pendant et après CDM** : permet de réagir aux mentions, de capter les feedbacks publics, d'identifier les opportunités d'engagement chirurgical.

- [ ] **AUTO-5.1 : Veille Twitter/X**
  - _Action :_ Cron quotidien 8h00 qui search Twitter API sur les mots-clés "VAR TIME", "vartime", "#PariVAR", "MPP", "MPG", "pronos foot"
  - _Filtrage :_ L'agent classe via Claude (positif/négatif/neutre/opportunité/spam)
  - _Output :_ Email quotidien avec synthèse + 3-5 tweets prioritaires à traiter

- [ ] **AUTO-5.2 : Veille Reddit**
  - _Action :_ Scraping (poliment, dans les ToS) de r/LigueFR, r/soccer, r/FootballManagerGames, r/sports pour mentions
  - _Output :_ Inclus dans le brief quotidien

- [ ] **AUTO-5.3 : Suggestions de réponses**
  - _Action :_ Pour chaque tweet/post important, l'agent suggère une réponse à valider
  - _Toi tu valides :_ tu copies-colles dans Twitter manuellement (l'authenticité humaine compte)

**Effort :** 2-3 jours
**Coût mensuel :** API Twitter (gratuit), Claude API ~5€
**KPI :** Nombre de conversations engagées par semaine, sentiment moyen des mentions

---

### AUTO-6 — Agent Squad Activation

**Mission** : maximiser le passage de "user solo" à "user en ligue" (le vrai facteur de rétention longue durée).

**Insight clé** : les utilisateurs en ligue restent 5-10x plus longtemps que les utilisateurs solo. Pousser le rejoindre/créer une ligue est le levier de rétention #1.

- [ ] **AUTO-6.1 : Détection des users solo après 3 jours**
  - _Trigger :_ Cron quotidien
  - _Détection :_ Users actifs depuis 3 jours sans `squad_members` actif
  - _Action :_ Notification push + email "Joue avec tes potes ! Voici un code d'invitation à partager : [CODE]"

- [ ] **AUTO-6.2 : Suggestion automatique de ligues publiques**
  - _Action :_ Pour les users solo qui n'ont pas de potes à inviter, créer un système de "Ligues publiques officielles VAR TIME" auto-créées (ex: "Bêta CDM 2026 - Groupe A", "Fans Ligue 1", "Fans Premier League")
  - _Auto-attribution :_ L'utilisateur est automatiquement proposé pour rejoindre une de ces ligues s'il est solo après 7 jours
  - _Note :_ Ces ligues publiques deviennent ensuite le ferment de communauté

- [ ] **AUTO-6.3 : Messages auto dans les chats de ligue**
  - _Lien avec :_ Sprint CHAT-LIVE de TASKS_v2.md
  - _Action :_ Les events importants d'un membre génèrent automatiquement un message système dans le chat ligue
  - _Déjà prévu_ dans CHAT-2

**Effort :** 2-3 jours
**Coût mensuel :** Resend ~10€
**KPI :** % d'utilisateurs en ligue à J7, taille moyenne des ligues, rétention J30 by squad-status

---

### AUTO-7 — Agent Personal Branding (toi en tant que founder)

**Mission** : construire ta présence de fondateur sur Twitter/X pendant les 6 prochaines semaines.

**Important** : cet agent n'écrit JAMAIS de tweets que tu publies. Il te suggère du contenu et tu publies manuellement, parce que ton authenticité est non-automatisable.

- [ ] **AUTO-7.1 : Génération quotidienne de 3 propositions de tweets**
  - _Trigger :_ Cron matinal 7h30
  - _Action :_ Sur la base de tes derniers commits Git, des metrics PostHog de la veille, et des actualités foot du jour, l'agent génère 3 propositions de tweets dans ton style "founder building in public" :
    - Type 1 : update produit ("J7 : j'ai fixé le bug VAR sur les pénalty checks. Voilà avant/après [gif]")
    - Type 2 : insight data ("Stats du jour : sur 230 paris VAR placés hier, 67% ont misé 'OUI' sur les pénalty CDM. La sagesse des foules existe vraiment.")
    - Type 3 : réflexion personnelle ("J-30 avant la CDM. Je suis à la fois excité et terrifié. Voilà ce que j'ai appris cette semaine sur la création de produit en solo.")
  - _Output :_ Email matinal avec 3 propositions, tu choisis ou modifies en 2 min, tu publies depuis ton compte perso

- [ ] **AUTO-7.2 : Détection d'opportunités de threads**
  - _Trigger :_ Cron hebdomadaire dimanche
  - _Action :_ L'agent identifie un thème de la semaine qui mériterait un thread Twitter (ex: "Pourquoi j'ai abandonné Capacitor pour CDM" ou "Comment je gère les paris parimutuel atomiquement avec Postgres")
  - _Output :_ Plan détaillé du thread (10-15 tweets) à reviewer le dimanche soir, à publier le lundi matin

**Effort :** 1-2 jours
**Coût mensuel :** Claude API ~5€
**KPI :** Followers gagnés sur ton compte perso, engagement par tweet, mentions de @VARTimeApp depuis ton perso

---

### AUTO-8 — Agent Bug Triage & Friction Detector

**Mission** : utiliser PostHog + Sentry pour détecter automatiquement les vrais problèmes utilisateurs.

- [ ] **AUTO-8.1 : Analyse quotidienne des erreurs Sentry**
  - _Trigger :_ Cron matinal
  - _Action :_ L'agent récupère les erreurs Sentry des 24h, les classe par criticité, génère un brief : "5 nouvelles erreurs critiques, 12 mineures. Voici les 3 à fixer en priorité"
  - _Output :_ Email matinal de brief

- [ ] **AUTO-8.2 : Analyse PostHog des friction points**
  - _Trigger :_ Cron hebdomadaire
  - _Action :_ L'agent analyse les funnels critiques (signup → premier prono, premier pari VAR → second pari) et identifie où les utilisateurs décrochent
  - _Output :_ Brief hebdomadaire "Cette semaine, 23% des nouveaux utilisateurs ont quitté à l'étape X. Suggestion : améliorer Y."

- [ ] **AUTO-8.3 : Détection des sessions à problèmes via session replay**
  - _Action :_ Une fois par semaine, l'agent identifie les 5 sessions PostHog les plus problématiques (long temps, erreurs, abandons)
  - _Output :_ Liens directs vers les replays vidéo, à regarder en 30 min

**Effort :** 2-3 jours
**Coût mensuel :** PostHog (déjà inclus), Claude API ~5€
**KPI :** Time to fix des bugs critiques, friction reduction sur les funnels mesurés

---

## 📊 Tableau de bord global automation

À mettre en place dans une page Notion ou un dashboard PostHog dédié :

| Agent                     | Status   | Dernière activité | Erreurs 7j | Coût mensuel | ROI estimé    |
| ------------------------- | -------- | ----------------- | ---------- | ------------ | ------------- |
| AUTO-1 Welcome            | 🟢/🟡/🔴 | timestamp         | count      | 20€          | +X% rétention |
| AUTO-2 Daily Recap        |          |                   |            | 30€          |               |
| AUTO-3 Twitter Live       |          |                   |            | 60€          |               |
| AUTO-4 Press Outreach     |          |                   |            | 50€ (1 mois) |               |
| AUTO-5 Community Listener |          |                   |            | 5€           |               |
| AUTO-6 Squad Activation   |          |                   |            | 10€          |               |
| AUTO-7 Personal Branding  |          |                   |            | 5€           |               |
| AUTO-8 Bug Triage         |          |                   |            | 5€           |               |

**Total coût mensuel** : ~140-200€ (acceptable même à 0 revenu pendant 6 mois)

---

## 🚨 Plan B — Si l'automation rate

Pour chaque agent critique, prévoir un fallback manuel **avant** la CDM :

| Agent                    | Plan B humain                                                          |
| ------------------------ | ---------------------------------------------------------------------- |
| AUTO-1 Welcome           | Tu envoies les mails à la main pour les 50 premiers signups            |
| AUTO-2 Daily Recap       | Pas de daily recap, tu te concentres sur le push notif H-1 (déjà fait) |
| AUTO-3 Twitter Live      | Buffer avec 100 tweets pré-écrits programmés (AUTO-3.6)                |
| AUTO-4 Press Outreach    | Tu prépares 10 mails à la main au lieu de 50                           |
| AUTO-5 Listener          | Tu refais des recherches Twitter manuelles 1×/jour                     |
| AUTO-6 Squad Activation  | Tu envoies des messages dans le chat à chaque user solo                |
| AUTO-7 Personal Branding | Tu tweetes ce que tu peux quand tu peux                                |
| AUTO-8 Bug Triage        | Tu regardes Sentry à la main matin et soir                             |

**Le pire scénario** : tous les agents plantent. Tu perds 30-40% d'efficacité mais l'app continue de tourner. Pas de catastrophe.

---

## 🎯 Décision : par où commencer ?

**Mon ordre recommandé pour les 4 prochaines semaines** :

1. **Semaine 2** : AUTO-1 (Welcome) + AUTO-2 (Daily Recap). Impact rétention immédiat.
2. **Semaine 3** : AUTO-3 (Twitter Live, partie 3.1-3.4). Impact viralité CDM.
3. **Semaine 4** : AUTO-4 (Press Outreach) + AUTO-3.6 (Buffer backup). Multiplie l'impact CDM.
4. **CDM** : AUTO-5 (Community Listener) + AUTO-7 (Personal Branding) en parallèle, en mode pilotage.
5. **Post-CDM** : AUTO-6 (Squad Activation) + AUTO-8 (Bug Triage), si traction validée.

**Si tu n'as l'énergie que pour un seul agent** : AUTO-1 (Welcome). C'est l'impact le plus direct sur la rétention, qui est ton vrai KPI.

---

## 💡 Idées d'automation V2 (post-CDM si succès)

Si VAR TIME atteint le palier 3 (10k+ MAU), des automations plus avancées deviennent rentables :

- **Agent SEO Content Generator** : génère 1 article de blog par semaine sur des thèmes foot ("Histoire de la VAR", "Top 10 décisions VAR controversées de la saison"), publie sur un blog VAR TIME
- **Agent Influencer Marketing** : détecte automatiquement les utilisateurs power-users qui pourraient devenir ambassadeurs, leur propose un programme dédié
- **Agent A/B Test Designer** : propose automatiquement des hypothèses de tests à mener (texte CTA, couleurs, layouts), via PostHog feature flags
- **Agent Personalized Notification** : génère des push notifs ultra-ciblées par utilisateur ("Ton match préféré PSG-OM démarre dans 1h, tu n'as pas pronostiqué")
- **Agent Churn Predictor** : ML sur les comportements pour prédire le churn 7 jours à l'avance, déclencher des campagnes de rétention ciblées
- **Agent Multi-language Content** : auto-traduit le contenu marketing dès que l'i18n est branché

---

_Ce fichier évolue avec le projet. À mettre à jour à chaque ajout/retrait/optimisation d'agent._
