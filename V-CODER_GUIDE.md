# 👑 Guide du Directeur Technique — VAR TIME

> Tu n'es pas développeur, tu es **Directeur Technique**. L'IA code, tu décides et tu valides.
> Ce guide est ta référence. Il est mis à jour automatiquement à chaque sprint.

---

## 1. 🤖 Comment travailler avec l'IA ? (Le Workflow)

### La chaîne d'agents (nouveau workflow)

Le travail se fait en 4 étapes. Tu n'interviens qu'à l'étape 2.

```
/pm   →   tu valides la spec   →   "go implémente"   →   /qa   →   npm run sprint:ship
 ↑                ↑                                          ↑               ↑
IA planifie    TOI tu dis OK              IA code          IA relit      IA pousse en prod
                                                                         + t'envoie un email
```

**En pratique :**

1. Tape `/pm` → l'IA lit le backlog et te produit une spec de sprint
2. Lis la spec, dis **"go"** si ça te convient (ou demande des ajustements)
3. L'IA implémente toute seule
4. Tape `/qa` → l'IA fait une revue de code
5. Si tout est OK : tape `npm run sprint:ship` → le code part en prod et tu reçois un email récap

### L'ancienne méthode (toujours valable pour les petites tâches)

Pour une correction rapide ou une petite fonctionnalité :

> _"Fixe le bug X dans le fichier Y"_ ou _"Ajoute un bouton pour faire Z"_

L'IA s'en occupe, toi tu valides avec `/qa` avant de shipper.

---

## 2. 🎮 Tes Commandes (Ce que tu peux taper)

### Dans le chat avec l'IA

| Commande          | À quoi ça sert                                                                |
| :---------------- | :---------------------------------------------------------------------------- |
| `/pm`             | L'IA planifie le prochain sprint (produit une spec à valider)                 |
| `/qa`             | L'IA relit le code du sprint et donne un verdict APPROVED / CHANGES REQUESTED |
| `"go implémente"` | Lance l'implémentation après validation de la spec                            |
| `"git push"`      | L'IA push le code sur la branche `stage`                                      |

### Dans ton terminal

| Commande               | À quoi ça sert                                                                    |
| :--------------------- | :-------------------------------------------------------------------------------- |
| `npm run dev`          | Lance le site en local → `http://localhost:3000`                                  |
| `npm run sprint:ship`  | **Pousse en prod** (merge stage→main + email récap) — seulement après QA APPROVED |
| `npm run sprint:recap` | Envoie l'email récap seul (pour tester)                                           |
| `npm run ai:check`     | Vérifie que le code est propre (lint + types)                                     |

### Le flux Git (règle absolue)

```
stage   ←   tout le travail se passe ici
  ↓
npm run sprint:ship   ←   seulement après /qa APPROVED
  ↓
main   ←   production uniquement, jamais de commit direct
```

---

## 3. 🚨 Actions Manuelles — Ce que l'IA ne peut PAS faire à ta place

> Ces actions demandent un accès humain à des interfaces externes. L'IA te prévient quand une nouvelle action est nécessaire.

---

### ✅ Actions déjà faites

- Google OAuth configuré (Supabase + Vercel)
- Domaine `vartime.app` sur Vercel
- Web Push VAPID configuré
- `RESEND_API_KEY` dans Vercel + `.env.local`
- Domaine `vartime.app` vérifié sur Resend ✅

---

### 🔴 Actions en attente — À faire maintenant

#### A. Migration Supabase 0098 — Messagerie Privée

**Où :** [supabase.com](https://supabase.com) → ton projet → **SQL Editor**

**Pourquoi :** Active la messagerie privée entre amis (tables `direct_message_threads` + `direct_messages`)

**Comment :**

1. Ouvre `supabase/migrations/0098_direct_messages.sql` dans ton éditeur de code
2. Copie tout le contenu
3. Dans Supabase → SQL Editor → colle → clique **Run**
4. Si ça dit "Success" → c'est bon ✅

---

#### B. Webhook Supabase — Email de bienvenue automatique

**Où :** [supabase.com](https://supabase.com) → ton projet → **Database** → **Webhooks**

**Pourquoi :** Déclenche un email de bienvenue automatiquement quand quelqu'un s'inscrit

**Comment :**

1. Clique **Create a new webhook**
2. **Name :** `new-profile-welcome`
3. **Table :** `profiles`
4. **Events :** coche seulement `INSERT`
5. **URL :** `https://vartime.app/api/webhooks/new-profile`
6. **HTTP Headers** → Add header :
   - Key : `x-webhook-secret`
   - Value : invente une clé secrète longue (ex: génère 32 caractères aléatoires sur [random.org](https://www.random.org/strings/))
7. Clique **Create**
8. Copie cette même clé secrète → va dans **Vercel** → Settings → Environment Variables → ajoute :
   - `SUPABASE_WEBHOOK_SECRET` = ta clé secrète
9. **Redéploie** sur Vercel (un nouveau push suffira)

---

#### C. Créer les 5 crons sur cron-job.org

**Où :** [cron-job.org](https://cron-job.org) (gratuit) — c'est le service qu'on utilise déjà pour les autres crons

**Pourquoi :** Les crons automatiques ne tournent PAS tout seuls — il faut un service externe qui les appelle à heure fixe (Vercel ne gère ça qu'en plan payant)

**Comment (à répéter pour chaque ligne du tableau) :**

1. Connecte-toi → clique **Create cronjob**
2. **Title :** (voir tableau ci-dessous)
3. **URL :** (voir tableau ci-dessous)
4. **Schedule :** jour et heure indiqués (Every day ou Every week)
5. **Request method :** GET
6. **Headers** → Add header :
   - `Authorization` = `Bearer VALEUR_DE_TON_CRON_SECRET` ← trouve cette valeur dans Vercel → Settings → Environment Variables → `CRON_SECRET`
7. Clique **Create**

| #   | Title                  | URL                                              | Schedule              |
| --- | ---------------------- | ------------------------------------------------ | --------------------- |
| 1   | `j1-inactive-push`     | `https://vartime.app/api/cron/j1-inactive`       | Every day · 8h00 UTC  |
| 2   | `j3-inactive-email`    | `https://vartime.app/api/cron/j3-inactive`       | Every day · 9h00 UTC  |
| 3   | `j7-churn-email`       | `https://vartime.app/api/cron/j7-churn`          | Every day · 10h00 UTC |
| 4   | `daily-digest`         | `https://vartime.app/api/cron/daily-digest`      | Every day · 9h00 UTC  |
| 5   | `weekly-recap-dimanche`| `https://vartime.app/api/cron/weekly-recap`      | Every Sunday · 11h00 UTC |

---

#### D. Formulaire Feedback — Email J+7 churners

**Où :** [tally.so](https://tally.so) (gratuit) ou [typeform.com](https://typeform.com)

**Pourquoi :** Les utilisateurs inactifs après 7 jours reçoivent un email avec un lien vers ce formulaire

**Comment (Tally — recommandé) :**

1. Crée un compte gratuit sur tally.so
2. **New form** → titre : "Qu'est-ce qui t'a freiné sur VAR TIME ?"
3. Ajoute 2-3 questions courtes (ex: "Qu'est-ce qui t'a manqué ?", "Tu reviendrais si... ?")
4. Publie le formulaire → copie l'URL (ex: `https://tally.so/r/xxxxxxx`)
5. Dans **Vercel** → Settings → Environment Variables → ajoute :
   - `TALLY_FEEDBACK_URL` = l'URL copiée
6. Redéploie (un nouveau push suffira)

---

### 🟡 Actions à faire avant la CDM

#### D. Créer le compte Twitter @VARTimeApp (pour AUTO-3)

Pas encore implémenté côté code, mais à préparer dès maintenant :

1. Crée le compte `@VARTimeApp` sur X/Twitter
2. Écris 10-15 tweets manuels pour "humaniser" le compte avant l'automatisation
3. Préviens l'IA quand c'est fait → elle pourra implémenter AUTO-3

---

## 4. 🔑 Variables d'Environnement (Inventaire complet)

### Vercel (Settings → Environment Variables)

| Variable                        |       Obligatoire        | À quoi ça sert                  |
| :------------------------------ | :----------------------: | :------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      |            ✅            | Connexion Supabase              |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` |            ✅            | Clé publique Supabase           |
| `SUPABASE_SERVICE_ROLE_KEY`     |            ✅            | Clé admin (routes sécurisées)   |
| `RESEND_API_KEY`                |            ✅            | Emails automatiques             |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`  |            ✅            | Push notifications              |
| `VAPID_PRIVATE_KEY`             |            ✅            | Push notifications              |
| `CRON_SECRET`                   |            ✅            | Sécurise les crons automatiques |
| `API_FOOTBALL_KEY`              |            ✅            | Données de matchs live          |
| `SUPABASE_WEBHOOK_SECRET`       |       🔴 À ajouter       | Sécurise le webhook bienvenue   |
| `TALLY_FEEDBACK_URL`            | 🔴 À ajouter dans Vercel | `https://tally.so/r/Zjv6QV`     |

### `.env.local` (sur ton ordinateur)

Même liste que Vercel. Si une variable manque localement, l'app plante en `npm run dev`.

---

## 5. 📂 L'Architecture Invisible (Pour comprendre sans coder)

Ces fichiers sont gérés par l'IA. Tu n'as pas besoin d'y toucher, mais c'est utile de savoir ce qu'ils font :

| Fichier/Dossier            | Rôle                                                                                                   |
| :------------------------- | :----------------------------------------------------------------------------------------------------- |
| `.skills/`                 | Le "centre de formation" de l'IA. Elle lit ces fichiers avant de coder pour respecter tes conventions. |
| `TASKS_v2.md`              | Le backlog produit. L'IA le lit quand tu tapes `/pm`.                                                  |
| `TASKS_AUTOMATISATION.md`  | Le backlog des agents d'automatisation marketing.                                                      |
| `AI_LEARNINGS.md`          | Le journal des pièges techniques. L'IA l'écrit, elle le relit.                                         |
| `PROJECT_STATE.md`         | La mémoire de l'architecture. Mise à jour après chaque sprint.                                         |
| `SPRINT_SPEC.md`           | La spec du sprint en cours. Produite par `/pm`, supprimée après ship.                                  |
| `scripts/sprint-recap.mjs` | Le script qui t'envoie l'email récap après `sprint:ship`.                                              |

---

## 6. 🚀 Le Déploiement (Comment le code arrive en prod)

```
Tu tapes une commande dans le chat
        ↓
L'IA code sur la branche "stage"
        ↓
/qa → revue de code automatique
        ↓
npm run sprint:ship
        ↓
Le code est fusionné sur "main"
        ↓
Vercel détecte le push → build automatique (~2 min)
        ↓
vartime.app est à jour ✅
        ↓
Tu reçois un email récap
```

**Si le build Vercel est rouge :**

- Copie les logs d'erreur → colle-les dans le chat → l'IA diagnostique et corrige

---

## 7. 📊 Tableau de Bord des Agents d'Automatisation

| Agent                        |           Status            | Ce qu'il fait                                           |
| :--------------------------- | :-------------------------: | :------------------------------------------------------ |
| AUTO-1.1 — Email bienvenue   | 🟡 Attente webhook Supabase | Email dès qu'un user s'inscrit                          |
| AUTO-1.2 — Push J+1 inactif  |   🔴 Attente cron-job.org   | Push si pas de prono après 24h                          |
| AUTO-1.3 — Email J+3 inactif |   🔴 Attente cron-job.org   | Email "ligue CDM réservée"                              |
| AUTO-1.4 — Email J+7 churn   |   🔴 Attente cron-job.org   | Email feedback (Tally ✅ → `https://tally.so/r/Zjv6QV`) |
| AUTO-2.1 — Daily Recap push + email | 🔴 Attente cron-job.org | Push + email bilan du jour aux actifs |
| AUTO-2.3 — Weekly Recap email       | 🔴 Attente cron-job.org | Email récap 7 jours (dimanche 11h UTC) |
| AUTO-3 — Twitter Live        |    ⏳ Planifié semaine 3    | Tweets auto pendant les matchs                          |

---

_Ce guide est mis à jour par l'IA à chaque sprint. Dernière mise à jour : 2026-05-09._
