# 🛤️ TRAJECTOIRE — VAR TIME

> Document stratégique de pilotage du projet.
> Définit les paliers de croissance, les investissements infra associés, les milestones de succès, et les conditions d'arrêt.
> À relire chaque mois et à jour si nécessaire.
>
> **Dernière mise à jour : 8 mai 2026 (J-34 CDM)**

---

## 📍 État actuel (8 mai 2026)

- **Bêta privée** : 6-8 testeurs actifs
- **Stack** : PWA Next.js 16 / React 19 / Supabase / API-Football
- **Infra coût** : ~0$/mois (Free tiers partout)
- **Features** : ~95% complètes pour le MVP CDM (cf. TASKS_v2.md)
- **Prochain jalon majeur** : 11 juin 2026 — premier match Coupe du Monde 2026

---

## 🎯 Vision long terme

VAR TIME aspire à devenir **l'app de référence du pari VAR communautaire** entre amis, en France d'abord, puis dans les pays francophones et hispanophones (post-i18n).

**Ce qui nous différencie** : tu ne risques aucun argent réel, tu ne peux pas en gagner. Le frisson du pari sans le danger du gambling. Un produit éthique pour les fans de foot qui veulent partager le match avec leurs potes.

**Horizon ambition réaliste** : 100 000 MAU stables en 2 ans, ~1M€ de revenu annualisé brut, équipe de 3-4 personnes.

**Horizon ambition optimiste** : 500 000+ MAU sur le pic CDM 2026 + euro 2028, ~5-7M€ de revenu annualisé, exit ou levée de fonds possible.

---

## 📊 Paliers de croissance et investissement infra

La règle d'or : **tu n'upgrades une brique infra que quand un signal mesurable te le demande**. Pas avant, pas par anticipation excessive, pas par confort.

### Palier 1 — Bêta privée : 0 à 1 000 MAU

**Phase actuelle.**

| Service          | Plan | Coût        |
| ---------------- | ---- | ----------- |
| Vercel           | Free | 0$          |
| Supabase prod    | Free | 0$          |
| Supabase staging | Free | 0$          |
| PostHog          | Free | 0$          |
| Sentry           | Free | 0$          |
| cron-job.org     | Free | 0$          |
| **TOTAL**        |      | **0$/mois** |

**Risque accepté** : pas de backup auto Supabase. Mitigation : `pg_dump` manuel hebdomadaire le dimanche soir.

**Trigger pour passer au Palier 2** : annonce publique de la bêta CDM (newsletter, posts sociaux), OU dépassement des 100 utilisateurs réels (hors bêtas testeurs personnels).

---

### Palier 2 — Lancement CDM : 1 000 à 10 000 MAU

**Cible attendue : juin-juillet 2026.**

| Service           | Plan    | Coût          |
| ----------------- | ------- | ------------- |
| Vercel            | Free    | 0$            |
| **Supabase prod** | **Pro** | **25$**       |
| Supabase staging  | Free    | 0$            |
| PostHog           | Free    | 0$            |
| Sentry            | Free    | 0$            |
| cron-job.org      | Free    | 0$            |
| **TOTAL**         |         | **~25$/mois** |

**Pourquoi cet upgrade** : à partir du moment où tu as de vrais utilisateurs (pas tes potes), perdre la DB sans backup est inacceptable. Supabase Pro apporte les backups quotidiens auto, 8 GB de DB et Realtime sans plafond de connexions.

**Triggers de surveillance hebdomadaire** :

- DB size approche 6 GB (sur 8 GB Pro) → anticiper Palier 3
- Vercel function executions approche 70k/mois (sur 100k Free) → anticiper Vercel Pro
- Realtime peak connections approche 80% du plafond → anticiper

---

### Palier 3 — Croissance confirmée : 10 000 à 50 000 MAU

**Cible attendue : automne 2026 si la rétention CDM tient.**

| Service          | Plan                       | Coût              |
| ---------------- | -------------------------- | ----------------- |
| **Vercel**       | **Pro**                    | **20$**           |
| Supabase prod    | Pro                        | 25$               |
| Supabase staging | Free                       | 0$                |
| PostHog          | Free ou Pro                | 0-50$             |
| **Sentry**       | **Team**                   | **26$**           |
| cron-job.org     | Free                       | 0$                |
| Stripe           | Commission par transaction | ~3% revenu        |
| **TOTAL fixe**   |                            | **~70-120$/mois** |

**Triggers d'upgrade vers ce palier** :

- Tu commences à monétiser (CGU Vercel Hobby interdit l'usage commercial)
- Tu dépasses 100k function executions/mois sur Vercel
- Tu veux les feature flags PostHog pour A/B tester

---

### Palier 4 — Vrai business : 50 000 à 200 000 MAU

**Cible attendue : 2027 si l'app a tenu post-CDM et capitalisé sur l'Euro 2028.**

| Service              | Plan                      | Coût               |
| -------------------- | ------------------------- | ------------------ |
| Vercel               | Pro                       | 20$                |
| Supabase prod        | Pro ou Team selon DB size | 25-599$            |
| **Supabase staging** | **Pro**                   | **25$**            |
| PostHog              | Pro                       | 50-150$            |
| Sentry               | Business                  | 80$                |
| AppLovin MAX / AdMob | Free + commission pub     | 0$                 |
| **TOTAL fixe**       |                           | **~150-300$/mois** |

**Triggers d'upgrade vers ce palier** :

- DB Supabase dépasse 8 GB → Team Plan
- Plus de 2 personnes touchent au staging → staging Pro
- Volume d'erreurs ou de events dépasse les plafonds Free/Team

---

### Palier 5 — Scaling sérieux : 200 000+ MAU

**Si on y arrive, on a eu un coup de chance ou un coup de génie.** À ce stade, on remet à plat la stack et on évalue la migration vers AWS/GCP/Cloudflare Workers selon les besoins. Coût infra entre 500$ et 5 000$/mois selon volume.

---

## 🚦 Comment décider d'upgrader : la règle 70%

Une fois par semaine (ritualisé le dimanche soir), tu regardes 3 dashboards :

1. **Supabase Settings → Usage** : DB size, Realtime concurrent, Auth MAU, Bandwidth
2. **Vercel Dashboard → Usage** : Function invocations, Bandwidth, Cron jobs
3. **PostHog** : DAU/MAU, événements totaux

**Règle simple** : dès qu'une metric atteint **70% du plafond actuel**, tu upgrades dans la semaine.

Ça te laisse le temps de planifier sans te faire surprendre par une coupure ou une dégradation pendant un pic d'usage.

---

## 🎯 Milestones — Décider de continuer ou d'arrêter

Cette section est la plus importante du document. **Elle existe pour te protéger de toi-même** quand tu seras émotionnellement engagé dans le projet.

Les milestones suivants sont des **points de décision rationnelle**. À chaque milestone, tu prends 2 heures dans un endroit calme, tu regardes les métriques objectivement, et tu décides : **on continue, on pivote, ou on arrête**.

L'arrêt n'est pas un échec. **L'arrêt rationnel d'un projet qui ne décolle pas est une victoire** — il libère ton temps, ton énergie et ton mental pour autre chose. La pire issue d'un side-project, c'est de l'entretenir 5 ans en se voilant la face.

### Milestone 1 — Bilan post-bêta privée (1 juin 2026)

**Date** : 10 jours avant le coup d'envoi CDM.

**Ce que tu mesures** :

- Nombre de bêtas testeurs ayant placé au moins 5 paris VAR : minimum 5
- Nombre de bugs critiques restants ouverts : maximum 2
- Sentry erreurs critiques sur 7 jours glissants : moins de 10
- Tes propres tests manuels sur les flows critiques : tous passent

**Décision** :

- ✅ **Si tous les indicateurs sont au vert** → on lance la com publique CDM le 5 juin, on pousse fort.
- ⚠️ **Si 1-2 indicateurs sont rouges** → on retarde la com publique d'une semaine, on fixe en urgence.
- ❌ **Si 3+ indicateurs sont rouges** → la CDM arrive trop tôt. On reste en bêta privée pendant la CDM, on se prépare pour l'Euro 2028 avec un produit plus solide. Pas de drame, juste de la lucidité.

---

### Milestone 2 — Bilan demi-CDM (28 juin 2026)

**Date** : 17 jours après le coup d'envoi, soit ~à mi-parcours de la phase de groupes (la CDM 2026 dure jusqu'au 19 juillet).

**Ce que tu mesures** :

| Indicateur                   | 🔴 Échec                 | 🟡 Tiède  | 🟢 Succès                |
| ---------------------------- | ------------------------ | --------- | ------------------------ |
| Inscriptions cumulées        | < 500                    | 500-2 000 | > 2 000                  |
| MAU au jour J                | < 200                    | 200-1 000 | > 1 000                  |
| DAU/MAU ratio                | < 10%                    | 10-20%    | > 20%                    |
| Rétention J7 (cohorte CDM-1) | < 15%                    | 15-30%    | > 30%                    |
| Notes/feedbacks utilisateurs | majoritairement négatifs | mixtes    | majoritairement positifs |
| Tes nuits de sommeil         | 4-5h                     | 6h        | 7h+                      |

**Décision** :

- ✅ **3+ indicateurs en vert** → tu es sur la bonne trajectoire. Tu continues à fond, tu pousses la communication, tu fixes les frictions identifiées. Tu peux commencer à investir dans la pub payante (Twitter/Meta ads, ~200€/jour à tester).

- 🟡 **Mix vert/jaune sans rouge** → ça démarre lentement mais ça démarre. Tu gardes le cap, tu doubles l'effort marketing organique (réseaux sociaux, contact d'influenceurs foot mid-tier), tu attends la fin de la CDM avant de réévaluer.

- ⚠️ **Mix avec 2-3 rouges** → l'app n'attrape pas le moment CDM. Tu as 3 semaines restantes pour redresser. Tu identifies LA friction principale (probablement onboarding ou première session) et tu la fixes avec une mise à jour majeure dans la semaine. Tu reévalues à la fin de la phase de groupes.

- ❌ **4+ rouges** → la CDM ne te donnera plus le coup de boost attendu. Tu réduis les investissements (downgrade à Free tier sauf Supabase Pro), tu termines proprement la CDM avec ce qui marche, tu prépares un bilan post-CDM honnête au milestone 3.

---

### Milestone 3 — Bilan post-CDM (1 août 2026)

**Date** : 12 jours après la finale CDM (19 juillet).

C'est le **milestone le plus important** du projet. La CDM a été ton unique grosse fenêtre d'acquisition. Ce qui se passe maintenant détermine si tu as un projet de long terme ou un projet à court horizon.

**Ce que tu mesures** :

| Indicateur                                       | 🔴 Échec                        | 🟡 Tiède            | 🟢 Succès             |
| ------------------------------------------------ | ------------------------------- | ------------------- | --------------------- |
| Pic MAU pendant CDM                              | < 1 000                         | 1 000-5 000         | > 5 000               |
| MAU 2 semaines post-CDM                          | < 30% du pic                    | 30-50%              | > 50%                 |
| Rétention J30 cohorte CDM                        | < 10%                           | 10-20%              | > 20%                 |
| Pourcentage utilisateurs ayant placé 10+ paris   | < 5%                            | 5-15%               | > 15%                 |
| Pourcentage utilisateurs ayant rejoint une ligue | < 20%                           | 20-40%              | > 40%                 |
| Bugs critiques accumulés et non résolus          | > 20                            | 5-20                | < 5                   |
| Ton énergie personnelle                          | épuisé, ne veut plus voir l'app | fatigué mais motivé | excité, plein d'idées |

**Décision** :

- ✅ **5+ indicateurs en vert** → tu as un produit qui marche. Tu peux investir sérieusement : Capacitor pour iOS/Android (Sprint Cap), introduction de la pub, packs Sifflets via Stripe, équipe qui s'agrandit éventuellement. La maison à 600k devient un horizon réaliste à 3-5 ans.

- 🟡 **Mix sans rouge dominant** → tu as un produit niche. Pas un raz-de-marée mais une base d'utilisateurs fidèles. Décision rationnelle : maintenir avec un effort modéré (1-2 jours/semaine), monétiser progressivement, viser l'Euro 2028 comme prochaine grosse fenêtre. Coûts infra à l'équilibre du palier 2-3 (~50-100$/mois).

- ⚠️ **3+ rouges, mais ton énergie personnelle est verte** → le marché ne valide pas l'idée mais tu y crois encore. Tu peux tenter UN PIVOT MAJEUR (changement de cible, changement d'angle, changement de plateforme) avant l'Euro 2028. Mais tu te fixes un budget temps maximum (3 mois max) et un milestone 4 strict.

- ❌ **3+ rouges ET ton énergie personnelle est rouge** → c'est le moment d'arrêter. Le projet n'a pas trouvé son public, et toi tu n'as plus l'énergie de pivoter. **Pas de honte**. Tu as construit une app entière en quelques semaines, tu as testé une idée, tu as appris énormément. Tu mets l'app en mode maintenance pure (pas de nouvelles features), tu laisses tourner tant que les coûts infra sont absorbables, et tu passes au projet suivant. La maison à 600k viendra peut-être de ce projet d'après.

---

### Milestone 4 — Bilan annuel (1 mai 2027)

**Date** : 1 an après le démarrage CDM 2026.

À ce stade, l'app a soit décollé, soit elle vivote, soit tu l'as déjà arrêtée. Si elle vivote encore, ce milestone tranche.

**Ce que tu mesures** :

| Indicateur                               | 🔴 Échec               | 🟡 Tiède     | 🟢 Succès              |
| ---------------------------------------- | ---------------------- | ------------ | ---------------------- |
| MAU stables depuis 3 mois                | < 2 000                | 2 000-15 000 | > 15 000               |
| Revenu mensuel                           | < 200€                 | 200-2 000€   | > 2 000€               |
| Taux de croissance mensuel des MAU       | négatif                | 0-5%         | > 5%                   |
| Coût infra / Revenu (ratio)              | infra > revenu         | équilibré    | revenu > 5x infra      |
| Ton temps consacré au projet par semaine | < 5h (perte d'intérêt) | 5-15h        | > 15h sans frustration |

**Décision** :

- ✅ **L'app est viable économiquement** → tu continues. Tu peux envisager de passer dessus à plein temps si revenu > 3 000€/mois. Tu prépares l'Euro 2028 (juin-juillet 2028) avec 1 an de lead time, c'est ta prochaine grosse fenêtre.

- 🟡 **L'app équilibre ses coûts mais ne te paye pas** → décision personnelle. Soit tu acceptes que c'est un side-project rentable mais pas un job, et tu y consacres 5-10h/semaine sereinement. Soit tu décides que ton temps vaut mieux investi ailleurs, et tu mets en maintenance.

- ❌ **L'app coûte plus qu'elle ne rapporte ET ne grossit plus** → arrêt. Tu mets en lecture seule, tu communiques honnêtement à tes utilisateurs (mode maintenance, pas de nouvelle feature), tu laisses tourner 6 mois pour pas brutaliser ceux qui jouent encore, puis tu fermes proprement. Tu as appris une tonne, tu passes à autre chose.

---

## 🛡️ Conditions d'arrêt anticipé (à tout moment)

Indépendamment des milestones, **tu arrêtes immédiatement** si une de ces conditions est remplie :

- **Ta santé mentale ou physique se dégrade significativement** à cause du projet (perte de sommeil chronique > 3 semaines, anxiété, isolement social, conflits famille/couple liés au temps passé)
- **Ton entourage proche te dit clairement et plusieurs fois** que tu donnes trop sans retour
- **Tu réalises que tu travailles sur le projet uniquement par culpabilité** ("j'ai mis trop de temps pour arrêter") et plus par envie
- **Tu reçois une opportunité professionnelle majeure** (offre d'embauche, autre projet) qui demanderait que tu arrêtes
- **Un changement réglementaire majeur** (durcissement loi ANJ sur les jeux sociaux, fin de la PWA Apple, etc.) rend le modèle non-viable

L'arrêt dans ces conditions n'est jamais un échec. C'est de la **lucidité**, et la lucidité est le plus précieux des actifs d'entrepreneur.

---

## 🧠 Principes de pilotage continus

Indépendamment des milestones, voici les règles que je m'engage à suivre tant que le projet vit :

1. **Mesurer avant de décider** : aucune décision majeure (upgrade infra, pivot, recrutement) sans data objective.

2. **Frugalité par défaut** : on ne dépense pas avant que la metric ne le force. Free tier d'abord, Pro quand le 70% est atteint.

3. **Rétention > Acquisition** : avant la CDM, je ne dépense pas un euro en pub payante. La rétention est mon vrai KPI.

4. **Production stable > Features brillantes** : à partir du Palier 2, chaque sprint inclut au moins 1 tâche de stabilité (test, monitoring, fix bug critique).

5. **Lucidité sur l'énergie personnelle** : si je sens que je décroche, je prends 1 semaine off du projet sans culpabilité. Le projet survivra. Moi aussi.

6. **Documentation continue** : ce fichier `TRAJECTOIRE.md` est mis à jour à chaque milestone. Le `PROJECT_STATE.md` est mis à jour à chaque sprint majeur. La cohérence documentaire est non-négociable.

7. **Communication honnête** : avec les utilisateurs (pas de promesses qu'on ne peut tenir), avec moi-même (pas de mythe sur l'avancement), avec les outils (pas de bullshit dans les commits).

---

## 📅 Prochaine relecture de ce document

**1 juin 2026** (Milestone 1 — Bilan post-bêta privée)

À cette date, je relis ce document, je vérifie que les paliers et milestones sont toujours cohérents avec la réalité, et j'ajuste si nécessaire.

---

_Ce document est un outil de pilotage rationnel. Il existe pour te protéger des biais cognitifs (sunk cost fallacy, escalation of commitment, optimism bias) qui touchent tous les fondateurs. Relis-le quand tu doutes. Relis-le quand tu surchauffes. Relis-le quand l'enthousiasme te fait perdre la mesure._
