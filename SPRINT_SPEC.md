# SPRINT SPEC — AUTO-1 : Welcome & Onboarding

> Produit par PM Agent — 2026-05-09
> Source : TASKS_AUTOMATISATION.md
> Statut : **EN ATTENTE DE VALIDATION HUMAINE**

---

## Objectif en 1 phrase

Transformer chaque nouveau signup en utilisateur engagé via une séquence email+push automatisée (J0 → J7), ciblant directement la rétention J7.

---

## ⚠️ Prérequis & Risques avant de démarrer

| # | Prérequis | Type | Bloquant ? |
|---|-----------|------|-----------|
| P1 | **Sprint OBSERV (Sentry + PostHog)** non fait — on automatise "dans le noir" | Produit (TASKS_v2.md) | ⚠️ Recommandé mais non bloquant si on accepte de logger dans la console pour l'instant |
| P2 | **Compte Resend créé** (resend.com, gratuit jusqu'à 100 emails/jour) + `RESEND_API_KEY` | Action humaine | ✅ Bloquant pour AUTO-1.1 / 1.3 / 1.4 |
| P3 | **Lien Typeform ou Tally** pour le formulaire feedback J+7 | Action humaine | ✅ Bloquant pour AUTO-1.4 uniquement |
| P4 | **Domaine d'envoi Resend** vérifié (`no-reply@vartime.app`) | Action humaine | ✅ Bloquant pour tous les emails |

**État existant favorable découvert :**
- Infrastructure cron déjà en place (`/api/cron/*` avec pattern `timingSafeEqual` + `CRON_SECRET`) ✅
- `sendPushToUsers()` déjà opérationnel (`src/lib/push-sender.ts`) ✅
- `user_daily_recaps` table déjà créée (migration 0087) ✅
- **Resend non installé** — `npm install resend` requis

---

## Tâches atomiques

### AUTO-1.1 — Email de bienvenue personnalisé (J0) `L`

**Critères d'acceptation (DoD) :**
- [ ] Package `resend` installé et `RESEND_API_KEY` en env Vercel + `.env.local`
- [ ] Utility `src/lib/email.ts` — client Resend réutilisable, fonction `sendEmail({ to, subject, html })`
- [ ] Template email HTML : tutoiement, 3 CTAs ("Fais ton premier prono", "Crée ta ligue", "Active les notifs"), lien deep link vers `/pronos`, `/lobby`, `/settings/notifications`
- [ ] Route handler `POST /api/webhooks/new-profile` — vérifie `x-webhook-secret` header (variable `SUPABASE_WEBHOOK_SECRET` dans env), envoie le mail de bienvenue au `email` de l'auth user correspondant au `profiles.id` reçu
- [ ] Database Webhook configuré dans Supabase : INSERT sur `profiles` → `https://vartime.app/api/webhooks/new-profile`
- [ ] Si Resend échoue → `console.error` (+ Sentry quand disponible, cf. OBSERV)

**Fichiers à créer/modifier :**
- `src/lib/email.ts` (nouveau)
- `src/app/api/webhooks/new-profile/route.ts` (nouveau)
- `.env.local` + Vercel env vars : `RESEND_API_KEY`, `SUPABASE_WEBHOOK_SECRET`

**Action humaine requise :** configurer le webhook dans Supabase Dashboard > Database > Webhooks

---

### AUTO-1.2 — Push notification J+1 si inactif `M`

**Critères d'acceptation (DoD) :**
- [ ] Cron route `GET /api/cron/j1-inactive` — vérifie `CRON_SECRET` via `timingSafeEqual` (même pattern que les crons existants)
- [ ] Requête admin : `profiles` créés entre NOW()-25h et NOW()-23h, n'ayant aucune ligne dans `pronos` ni dans `bets`
- [ ] Push envoyé via `sendPushToUsers()` : titre "Tu es là pour parier ou pour regarder ? 👀", body "4 matchs t'attendent sur VAR TIME", deep link `/pronos`
- [ ] Schedule ajoutée dans `vercel.json` : `{ "path": "/api/cron/j1-inactive", "schedule": "0 8 * * *" }` (8h00 UTC)
- [ ] Log du nombre de users ciblés et de pushes envoyés

**Fichiers à créer/modifier :**
- `src/app/api/cron/j1-inactive/route.ts` (nouveau)
- `vercel.json` (ajout entrée `crons`)

---

### AUTO-1.3 — Email J+3 si toujours inactif `S`

**Critères d'acceptation (DoD) :**
- [ ] Cron route `GET /api/cron/j3-inactive` — même pattern CRON_SECRET
- [ ] Requête admin : `profiles` créés entre NOW()-73h et NOW()-71h, sans prono ni bet
- [ ] Email via `sendEmail()` : objet "On a réservé une place dans la ligue Bêta CDM 🏆", corps court avec sentiment d'urgence honnête + lien `/lobby`
- [ ] Schedule dans `vercel.json` : `0 9 * * *` (9h00 UTC)

**Fichiers à créer/modifier :**
- `src/app/api/cron/j3-inactive/route.ts` (nouveau)
- `vercel.json` (ajout entrée `crons`)

---

### AUTO-1.4 — Email J+7 feedback ou churn `S`

**Critères d'acceptation (DoD) :**
- [ ] Cron route `GET /api/cron/j7-churn` — même pattern CRON_SECRET
- [ ] Requête admin : `profiles` créés entre NOW()-169h et NOW()-167h, sans prono ni bet depuis J+3
- [ ] Email court : "Avant de partir, dis-nous ce qui t'a freiné" + lien Typeform/Tally
- [ ] Schedule dans `vercel.json` : `0 10 * * *` (10h00 UTC)
- [ ] `TALLY_FEEDBACK_URL` en variable d'env (pour pouvoir changer sans redéployer)

**Fichiers à créer/modifier :**
- `src/app/api/cron/j7-churn/route.ts` (nouveau)
- `vercel.json` (ajout entrée `crons`)
- `.env.local` + Vercel : `TALLY_FEEDBACK_URL`

---

## Migrations SQL requises

**Aucune migration SQL nécessaire** pour ce sprint. La table `profiles` et l'infrastructure push/cron existantes sont suffisantes.

---

## Ordre d'exécution recommandé pour le Dev Agent

1. `npm install resend` + créer `src/lib/email.ts`
2. AUTO-1.1 (le webhook bienvenue — livrable le plus visible)
3. AUTO-1.2 (cron J+1 push — le plus rapide car push déjà dispo)
4. AUTO-1.3 + AUTO-1.4 (email J+3 / J+7 — même pattern, rapides)
5. Mettre à jour `vercel.json` pour tous les crons en une fois
6. `npm run ai:check` — 0 erreur avant commit

---

## Complexité globale

**Effort estimé :** 2-3 jours (aligné TASKS_AUTOMATISATION.md)
**Coût infra :** 0€ (Resend free tier : 100 emails/jour, Vercel Cron inclus)

---

## KPI de succès (à mesurer semaine 3)

- Taux d'ouverture email bienvenue (cible > 40%)
- % users actifs à J7 parmi ceux ayant reçu la séquence vs ceux sans (cohorte témoin)
- Taux de réponse Typeform J+7 (cible > 5%)

---

## Ce que tu verras de différent après ce sprint

Chaque nouveau signup recevra automatiquement un email de bienvenue dans les minutes suivant l'inscription, puis des relances ciblées J+1/J+3/J+7 s'ils restent inactifs — sans aucune intervention manuelle.
