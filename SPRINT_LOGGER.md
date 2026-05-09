# Sprint LOGGER — Observabilité complète

> **Contexte produit** : pendant la CDM, l'app va prendre du trafic réel et inévitablement des bugs en prod. Si un user signale "j'ai pas reçu mes Sifflets après le claim quotidien", on doit pouvoir reconstruire ce qui s'est passé en lisant les logs Vercel. Aujourd'hui, c'est partiellement possible (logger créé, partiellement adopté) mais 17 fichiers utilisent encore `console.log/error/warn` directement, ce qui pollue les logs Vercel et empêche tout filtrage propre.
>
> **Problème actuel** :
>
> 1. **17 fichiers** route utilisent encore `console.*` direct. Logs illisibles en prod.
> 2. **6 indexes DB manquants** sur des tables très lues (badges, friend_requests, push_logs, recaps, DMs, tweet_log). Requêtes lentes au scaling.
> 3. **Push DM manquant** : la colonne de préférence existe mais le push n'est jamais envoyé. Feature incomplète.
>
> **Pourquoi c'est urgent avant la CDM** : sans logs propres, impossible de débugger en prod sous stress. Sans indexes, certaines requêtes vont devenir lentes à 5k+ users et faire ramer toute l'app. Le push DM manquant est plus mineur mais facile à fixer dans le même sprint puisqu'on touche à l'infra notifs.
>
> **Périmètre** : migration des 17 fichiers vers le logger central, ajout des 6 indexes DB, implémentation du push DM. Aucune modification de logique métier.

---

## LOGGER-1 — Audit du logger existant

Le TECH_BIBLE indique que `src/lib/logger.ts` existe déjà avec `log.info/warn/error(service, msg, data?)`. Vérifier son état avant de migrer.

- [ ] Ouvrir `src/lib/logger.ts` et confirmer la signature.
- [ ] Vérifier ce que fait le logger en interne :
  - En dev : probablement `console.log` formaté joliment.
  - En prod : `console.log` JSON structuré pour que Vercel l'agrège, ou intégration Sentry / un service externe ?
- [ ] Si l'output en prod n'est pas structuré (JSON par ligne), **améliorer le logger** pour qu'il sorte du JSON :
  ```typescript
  log.info("cron-match-monitor", "Match started", {
    matchId: 123,
    status: "LIVE",
  });
  // Output prod : {"level":"info","service":"cron-match-monitor","msg":"Match started","matchId":123,"status":"LIVE","ts":"2026-..."}
  ```
- [ ] Le JSON structuré permet de filtrer dans Vercel par `service`, `level`, ou n'importe quel champ custom. Sans ça, les logs sont illisibles en volume.
- [ ] Documenter dans le PR : "Logger inspecté. Output prod : `<JSON structuré / console plain>`. Modifié : oui / non."

---

## LOGGER-2 — Migration des 17 fichiers `console.*` → `log.*`

Liste précise extraite du TECH_BIBLE :

```
admin/finish-match/route.ts
admin/invalidate-push-subscriptions/route.ts
admin/resolve-league-round/route.ts
claim-rsa/route.ts
cron/community-listener/route.ts
cron/j3-inactive/route.ts
cron/j7-churn/route.ts
cron/match-monitor/route.ts (nombreux)
cron/reset-monthly-points/route.ts
cron/twitter-live/route.ts
match-subscription/route.ts
push/subscribe/route.ts
squads/join/route.ts
squads/leave/route.ts
squads/route.ts
squads/[squadId]/route.ts
webhooks/new-profile/route.ts
```

- [ ] Pour chaque fichier, faire la migration :
  - `console.log(...)` → `log.info('<service-name>', '<msg>', { ...data })`
  - `console.warn(...)` → `log.warn(...)`
  - `console.error(err)` → `log.error('<service-name>', '<msg>', { error: err.message, stack: err.stack })`
- [ ] **Le `service-name`** doit être stable et descriptif :
  - `cron/match-monitor/route.ts` → service = `'cron-match-monitor'`
  - `claim-rsa/route.ts` → service = `'claim-rsa'`
  - `squads/join/route.ts` → service = `'squads-join'`
- [ ] **Préserver le contexte** : si un `console.log` actuel logge un objet, le passer en data plutôt qu'en string :
  ```typescript
  // Avant
  console.log("User", userId, "claimed RSA", amount);
  // Après
  log.info("claim-rsa", "RSA claimed", { userId, amount });
  ```
- [ ] **Cas spécial cron/match-monitor** (le TECH_BIBLE note "nombreux" `console.log`) : prévoir 30 min juste pour ce fichier. Probablement >20 logs à migrer.
- [ ] Vérifier après migration qu'**il ne reste plus aucun `console.log/warn/error` dans `src/app/api/`** sauf cas justifié documenté.
- [ ] Lancer un grep final : `grep -rn "console\." src/app/api/` doit retourner 0 résultat (ou uniquement des cas justifiés).

---

## LOGGER-3 — Niveaux de log corrects

Lors de la migration, pas tout en `log.info`. Distinguer :

- [ ] **`log.info`** : événements normaux (claim réussi, match résolu, user inscrit, cron démarré/terminé).
- [ ] **`log.warn`** : situations anormales mais récupérables (rate limit déclenché, retry sur API externe, race condition détectée et résolue).
- [ ] **`log.error`** : vraies erreurs (exception attrapée, requête DB échouée, état inconsistant). Ce niveau doit déclencher Sentry si Sentry est branché (sinon préparer pour quand il le sera).
- [ ] Relire les fichiers migrés pour réajuster les niveaux. Souvent un `console.error` actuel devrait être `log.warn` (cas attendu, ex : "user déjà claim aujourd'hui") ou inversement un `console.log` devrait être `log.error` (cas inattendu silencieux).

---

## LOGGER-4 — Indexes DB manquants

Du TECH_BIBLE §5.8, 6 indexes manquants sur des tables très lues :

| Table               | Colonne(s)                  | Migration                                                                                   |
| ------------------- | --------------------------- | ------------------------------------------------------------------------------------------- |
| `user_badges`       | `badge_id`                  | `CREATE INDEX idx_user_badges_badge_id ON user_badges(badge_id);`                           |
| `friend_requests`   | `receiver_id`               | `CREATE INDEX idx_friend_requests_receiver_id ON friend_requests(receiver_id);`             |
| `push_logs`         | `user_id`                   | `CREATE INDEX idx_push_logs_user_id ON push_logs(user_id);`                                 |
| `user_daily_recaps` | `user_id`                   | `CREATE INDEX idx_user_daily_recaps_user_id ON user_daily_recaps(user_id);`                 |
| `direct_messages`   | `(thread_id, sent_at DESC)` | `CREATE INDEX idx_direct_messages_thread_sent ON direct_messages(thread_id, sent_at DESC);` |
| `tweet_log`         | `match_id`                  | `CREATE INDEX idx_tweet_log_match_id ON tweet_log(match_id);`                               |

- [ ] Créer une nouvelle migration Supabase (numéro 0098 ou suivant selon ton état) : `<numero>_add_missing_indexes.sql`
- [ ] Inclure les 6 indexes ci-dessus avec `CREATE INDEX IF NOT EXISTS` (idempotent).
- [ ] Pour `direct_messages`, l'index composite `(thread_id, sent_at DESC)` est important parce que la requête typique est "donne-moi les 50 derniers messages de ce thread, du plus récent au plus ancien". Un index simple sur `thread_id` ne suffit pas.
- [ ] **Avant d'appliquer en prod** : vérifier la taille des tables. Sur des tables de quelques milliers de lignes, l'index est créé instantanément. Sur 100k+ lignes, prévoir `CREATE INDEX CONCURRENTLY` pour ne pas locker la table (mais Supabase / PostgreSQL exige que ça soit hors transaction — à gérer).
- [ ] Tester la migration localement (Supabase CLI : `supabase db reset` puis `supabase db push`).
- [ ] Une fois en prod, vérifier dans Supabase Studio que les indexes sont bien créés (`SELECT * FROM pg_indexes WHERE schemaname = 'public' AND tablename IN (...)`).

---

## LOGGER-5 — Vérification de l'impact des indexes

Avant et après création des indexes, mesurer l'impact sur les requêtes typiques.

- [ ] Pour chaque table indexée, identifier la requête typique qui en bénéficie. Exemple `user_badges` :
  ```sql
  SELECT * FROM user_badges WHERE badge_id = 'xxx' LIMIT 100;
  ```
- [ ] Faire un `EXPLAIN ANALYZE` avant/après. Avant : probablement `Seq Scan`. Après : `Index Scan using idx_...`.
- [ ] Documenter le gain dans le PR (ex : "Avant : 120ms, après : 3ms sur user_badges avec 50k lignes").
- [ ] Si une requête n'utilise pas l'index alors qu'elle le devrait, vérifier qu'elle est bien formée (parfois un `WHERE col::text = ...` empêche l'index de s'appliquer).

---

## LOGGER-6 — Implémentation du push DM manquant

Le TECH_BIBLE mentionne : "Push DM (`notif_dm`) — colonne existe, push manquant".

- [ ] Localiser la colonne `notif_dm` dans la table `profiles` (ou `user_preferences`). C'est probablement un boolean qui contrôle si l'user reçoit un push pour les nouveaux DMs.
- [ ] Localiser la route ou la fonction qui crée un nouveau DM (probablement `src/app/api/messages/[otherId]/route.ts` ou similaire).
- [ ] Après l'insert du message, appeler la fonction d'envoi de push existante (probablement `sendPushToUser(userId, ...)`) pour notifier le destinataire.
- [ ] **Vérifier les conditions** :
  - Le destinataire a `notif_dm = true` (ou `null` = défaut activé selon ta convention).
  - Le destinataire n'est PAS l'envoyeur (pas de self-push).
  - Le destinataire n'a pas l'app actuellement focus (utiliser le smart mute qui existe déjà cf. PROJECT_STATE).
- [ ] **Format du push** :
  - Title : `<displayName de l'envoyeur>`
  - Body : `<message tronqué à 100 caractères>` (par respect de la vie privée, on peut aussi mettre "Nouveau message" sans le contenu — à toi de décider)
  - URL : ouvre directement la conversation `/messages/<senderId>`
- [ ] Tester : envoyer un DM depuis le compte A vers B alors que B est offline → B doit recevoir le push.

---

## LOGGER-7 — Préparation à Sentry (sans le brancher encore)

Sentry n'est pas dans le scope de ce sprint mais on doit préparer le terrain.

- [ ] Dans `src/lib/logger.ts`, ajouter un commentaire clair :
  ```typescript
  // TODO: when Sentry is integrated, route log.error to Sentry.captureException
  ```
- [ ] S'assurer que tous les `log.error` ont bien un objet `{ error, stack, ...context }` en data, pour que Sentry puisse capturer le stack quand il sera branché.
- [ ] Ne PAS installer `@sentry/nextjs` dans ce sprint. C'est un choix produit (Sentry Free tier vs PostHog vs autre) qui sera fait à part.

---

## LOGGER-8 — Tests et validation

- [ ] Pour chaque fichier migré, vérifier qu'il compile et qu'il n'y a pas d'erreur TypeScript.
- [ ] Vérifier sur un déploiement Vercel preview que les logs apparaissent bien dans le dashboard Vercel et qu'ils sont **filtrables par `service`** si l'output est en JSON structuré.
- [ ] Faire un déploiement sur la branche, vérifier les logs d'un cron (le plus verbeux : `cron/match-monitor`) et confirmer qu'il sort en JSON propre.
- [ ] Vérifier que les indexes DB sont bien appliqués (Supabase Studio).
- [ ] Tester l'envoi d'un DM avec push reçu côté destinataire.

---

## Hors scope

- ❌ Branchement Sentry effectif — sprint séparé.
- ❌ Branchement PostHog ou analytics produit — sprint séparé.
- ❌ Refonte du logger pour intégrer un buffer / batch — pas nécessaire à ce stade.
- ❌ Indexes additionnels que l'audit pourrait révéler — rester sur la liste fournie pour ce sprint.

---

## Critères d'acceptation

1. `grep -rn "console\." src/app/api/` retourne 0 résultat (ou uniquement cas documentés).
2. Le logger sort en JSON structuré en production.
3. Les 6 indexes DB listés sont créés en prod via une migration.
4. `EXPLAIN ANALYZE` confirme l'utilisation des indexes sur les requêtes typiques.
5. Push DM fonctionnel : envoi A → B offline → B reçoit le push.
6. Aucune régression sur les fichiers migrés (tests manuels des routes critiques : claim-rsa, squads/join, etc.).

---
