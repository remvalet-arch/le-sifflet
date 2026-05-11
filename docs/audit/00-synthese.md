# 00 — Synthèse Audit Global

> VAR TIME — `stage` — 2026-05-11

---

## Top 5 risques P0

| #   | Risque                                                                                                                                                                                                                  | Impact                                                              | Probabilité                                  | Effort remédiation |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------- | ------------------ |
| 1   | **Pas de Sentry / error monitoring** — les erreurs prod (cron échoué, résolution VAR plantée, push non envoyé) sont invisibles sans surveillance manuelle des logs Vercel                                               | Bugs critiques silencieux en prod — paris non résolus, pushs perdus | Haute — le cron `match-monitor` est complexe | S (2j)             |
| 2   | **Webhook `/api/webhooks/new-profile` potentiellement non authentifié** — si la signature Supabase n'est pas vérifiée, n'importe qui peut déclencher l'envoi d'emails de bienvenue                                      | Spam, coût Resend, abus                                             | Moyenne — endpoint peu connu                 | XS (2h)            |
| 3   | **`SPORTSDB_API_KEY=459569` et `TEST_USER_PASSWORD` en clair dans `.env.example` versionné** — fichier public, clés exposées                                                                                            | Compromission credentials de test, clé API tiers                    | Haute — déjà dans l'historique Git           | XS (30min)         |
| 4   | **Aucune durée de rétention ni endpoint suppression de compte** — impossibilité de répondre à une demande RGPD droit à l'effacement                                                                                     | Risque légal CNIL si un utilisateur UE demande la suppression       | Faible à court terme, croissant              | M (1 semaine)      |
| 5   | **Les 17 crons existent dans le code mais pas dans `vercel.json`** — configuration uniquement dans le dashboard Vercel. En cas de migration / recréation du projet Vercel, tous les crons disparaissent silencieusement | Arrêt total du match-monitor, pushs, digests                        | Faible à court terme                         | S (1j)             |

---

## Top 5 quick wins (impact élevé / effort faible)

| #   | Action                                                                                                                          | Impact                                                  | Effort      |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ----------- |
| 1   | **Ajouter Sentry** (`npm i @sentry/nextjs`, DSN en env var)                                                                     | Visibilité erreurs prod immédiate                       | S — 2j      |
| 2   | **Supprimer `SPORTSDB_API_KEY` et `TEST_USER_PASSWORD` de `.env.example`** + rotation si nécessaire                             | Sécurité + hygiène                                      | XS — 30 min |
| 3   | **Ajouter les crons dans `vercel.json`** (section `"crons"`) avec les schedules réels                                           | Infrastructure as Code, crons survivent à une migration | S — 1j      |
| 4   | **Activer la CI sur `stage`** (ajouter `stage` dans `.github/workflows/ci.yml`)                                                 | Tests sur la branche de dev principale                  | XS — 5 min  |
| 5   | **Ajouter un TTL / cron de purge sur `rate_limit_log` et `push_logs`** (`DELETE WHERE created_at < NOW() - INTERVAL '30 days'`) | Prévenir la croissance non bornée des tables            | XS — 1h     |

---

## Cartographie de la santé du projet

```
                Tech & Code  [████████░░] 8/10
                   Sécurité  [██████░░░░] 6/10
                Performance  [███████░░░] 7/10
                      Tests  [██░░░░░░░░] 2/10
             Observabilité   [████░░░░░░] 4/10
                         UX  [████████░░] 8/10
                    Données  [██████░░░░] 6/10
              Documentation  [████████░░] 8/10
```

| Axe           | Note     | Justification                                                                                                                     |
| ------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Tech & Code   | **8/10** | Stack moderne, TypeScript strict, patterns solides, quasi zéro `any`, conventions excellentes                                     |
| Sécurité      | **6/10** | Auth robuste, RBAC complet, CRON_SECRET correct — mais headers manquants, webhook à vérifier, secrets dans .env.example           |
| Performance   | **7/10** | Cache Next.js bien utilisé, RPCs atomiques, rate limiting en place — mais rate limiter Postgres (pas Redis)                       |
| Tests         | **2/10** | 2 fichiers de tests unitaires pour 43 000 lignes — logique métier critique (bet, odds, résolution) non couverte                   |
| Observabilité | **4/10** | Logger JSON structuré, PostHog avec consentement — mais pas de Sentry, pas de monitoring crons, alerting absent                   |
| UX            | **8/10** | Mobile-first exemplaire, safe-area iOS, i18n 5 langues, toasts cohérents — quelques catch silencieux                              |
| Données       | **6/10** | Migrations structurées, contraintes solides, RLS actif — mais no-TTL sur tables qui grandissent, pas de droit à l'effacement RGPD |
| Documentation | **8/10** | CLAUDE.md riche, PRD, RBAC docs, AI_LEARNINGS, sprint summaries — projet bien documenté pour une équipe IA                        |

---

## Recommandation de priorisation — 3 prochains mois

### Mois 1 — Stabilité prod (avant toute croissance)

1. **Sentry** — visibilité erreurs prod (`01-audit-tech.md` T5 monitoring)
2. **Nettoyage `.env.example`** — supprimer `SPORTSDB_API_KEY` et `TEST_USER_PASSWORD`
3. **CI sur `stage`** — 5 minutes de travail, impact immédiat sur la qualité
4. **Crons dans `vercel.json`** — Infrastructure as Code, résilience ops
5. **Vérifier signature webhook `new-profile`** — risque sécurité à confirmer

### Mois 2 — Tests & fiabilité

6. **Tests unitaires sur la logique métier critique** : `resolve_event`, `place_bet` (validation multiplicateur), `odds.ts` — risque financier virtuel si bug
7. **TTL sur `rate_limit_log` et `push_logs`** — migration SQL simple
8. **Headers de sécurité** dans `vercel.json` (CSP, HSTS, X-Frame-Options)

### Mois 3 — RGPD & scalabilité

9. **Endpoint suppression de compte** + cascade correcte — conformité RGPD
10. **Migration crons vers `vercel.json`** avec documentation des schedules
11. **Focus styles** sur les composants interactifs custom (accessibilité clavier)

---

## Sujets nécessitant un échange humain

1. **RGPD** : A-t-on déjà reçu des demandes de suppression de compte ? Quand prévoit-on l'endpoint ?
2. **Twitter/X** : La feature est-elle active en prod ? Avec quels tokens ? Est-elle documentée dans `.env.example` ?
3. **Backups** : Supabase Pro activé ? PITR configuré ? Quelle est la stratégie de restauration testée ?
4. **Schedules crons** : Quels sont les schedules exacts des 17 crons dans Vercel ? Y a-t-il des crons qui se chevauchent sur `match-monitor` ?
5. **Webhook `new-profile`** : La signature Supabase est-elle vérifiée ? Sinon, c'est un P0 à corriger immédiatement.
6. **Tables `rooms`/`room_members`** : Encore utilisées ? Si non, planifier leur suppression ou désactivation RLS.
