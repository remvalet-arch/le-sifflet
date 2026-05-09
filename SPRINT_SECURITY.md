# Sprint SECURITY — Rate limiting des routes économiques

> **Contexte produit** : VAR TIME utilise une monnaie fictive interne (Sifflets) qui sert à miser sur les paris VAR live et à acheter des cosmétiques + boosters. Cette monnaie n'est jamais convertible en argent réel, mais sa rareté et son équilibrage font la valeur du jeu. Si un utilisateur peut spammer une route économique (claim quotidien, achat boutique, mise rapide) via un script, **il casse l'équilibre du jeu pour tous les autres** : il accumule des Sifflets sans effort, monte le classement, achète tous les cosmétiques, vide les boosters limités.
>
> **Problème actuel** : 5 routes économiques critiques n'ont **aucun rate limiting**. À l'inverse, `/api/bet`, `/api/alert` et `/api/messages/[otherId]` en ont déjà — donc l'infrastructure de rate limiting existe et fonctionne dans le projet, il faut juste l'étendre aux 5 routes manquantes.
>
> **Pourquoi c'est urgent avant la CDM** : à 1k+ utilisateurs simultanés sur un match, un seul utilisateur malveillant peut faire 1000 requêtes/minute sur `/api/var-bets/quick-bet` ou `/api/shop/purchase` et soit corrompre l'économie soit mettre la DB à genoux. L'impact réputationnel d'un "exploit Sifflets" qui circule sur Twitter pendant un match France-Brésil serait catastrophique.
>
> **Périmètre** : ajouter du rate limiting sur 5 routes API. Aucune modification du métier, aucune modification de l'UX. Le rate limiting doit être **transparent pour les utilisateurs légitimes** et **bloquant pour les abuseurs**.

---

## SECURITY-1 — Audit de l'infrastructure rate limiting existante

Avant tout changement, comprendre comment le rate limiting est déjà implémenté dans le projet.

- [ ] Localiser le module ou utilitaire de rate limiting utilisé par `/api/bet`, `/api/alert`, `/api/messages/[otherId]`. Probable : `src/lib/rate-limit.ts`, `src/lib/rateLimiter.ts` ou helper Supabase.
- [ ] Identifier le mécanisme : in-memory (Map / LRU), Redis/Upstash, ou table Supabase ?
- [ ] Lire les 3 routes existantes qui ont du rate limiting et comprendre le pattern utilisé : import, appel, gestion de l'erreur (probablement un retour `429 Too Many Requests`).
- [ ] Vérifier la clé de rate limiting utilisée : `userId` (depuis la session Supabase), IP, ou les deux ? Pour des routes économiques authentifiées, **`userId` est la bonne clé** (pas l'IP — un utilisateur derrière un CGNAT mobile partage son IP avec d'autres).
- [ ] Documenter dans le PR : "Pattern existant identifié : `<chemin>`. Clé utilisée : `userId`. Backend : `<in-memory / Upstash / DB>`."

---

## SECURITY-2 — Rate limiting sur `/api/claim-daily-streak`

Cette route permet à l'utilisateur de réclamer son bonus quotidien de Sifflets pour avoir maintenu sa série de jours consécutifs. La logique métier autorise **1 claim par 24h**, mais sans rate limiting réseau, un script peut spammer la route et **profiter d'une race condition** entre la vérification "déjà claim aujourd'hui ?" et l'écriture du claim.

- [ ] Vérifier l'état actuel de la route : `src/app/api/claim-daily-streak/route.ts` (ou chemin équivalent).
- [ ] Ajouter un rate limiting **double** :
  1. **Niveau réseau** : 5 requêtes / 60s / userId. C'est généreux pour un utilisateur légitime (qui ne devrait cliquer qu'une fois) mais bloque le spam.
  2. **Niveau métier (déjà existant probablement)** : 1 claim valide / 24h / userId, vérifié en DB. Conserver tel quel.
- [ ] Si la route fait actuellement la vérification "déjà claim aujourd'hui ?" en plusieurs étapes (SELECT puis INSERT), **passer à une opération atomique** : soit un `UPSERT` avec contrainte unique sur `(user_id, date)`, soit un `INSERT ... ON CONFLICT DO NOTHING` qui retourne le nombre de lignes affectées. Le rate limiting réseau seul ne suffit pas si la race condition est exploitable.
- [ ] Tester avec un script simple : 100 requêtes parallèles → doit créditer Sifflets une seule fois et retourner 429 sur les requêtes excédentaires.

---

## SECURITY-3 — Rate limiting sur `/api/shop/purchase`

Cette route déclenche un achat de cosmétique avec débit Sifflets. **Vector d'abus principal** : un script qui tente d'acheter le même item 1000× en parallèle peut, si la vérification du solde n'est pas atomique, débiter une seule fois mais créditer 1000 items.

- [ ] Vérifier `src/app/api/shop/purchase/route.ts`.
- [ ] Ajouter rate limiting : **10 requêtes / 60s / userId**. Un utilisateur légitime qui clique sur "Acheter" achète ~1-3 items en succession, jamais 10/min.
- [ ] **Vérification critique** : la transaction de débit Sifflets + crédit item est-elle dans une transaction Supabase RPC atomique (`begin/commit`) ou en deux requêtes séparées ? Si séparée, **c'est un bug critique indépendant du rate limiting** qui doit être corrigé en priorité (encapsuler dans une fonction PostgreSQL `purchase_item(user_id, item_id)` qui fait tout en une transaction).
- [ ] Documenter dans le PR si la transaction était déjà atomique ou si elle a dû être migrée vers une RPC.

---

## SECURITY-4 — Rate limiting sur `/api/boosters/purchase`

Même logique que SECURITY-3 pour les boosters. Les boosters peuvent être plus impactants gameplay (ex : multiplicateur de gains) donc l'abus est plus grave.

- [ ] Vérifier `src/app/api/boosters/purchase/route.ts`.
- [ ] Rate limiting : **10 requêtes / 60s / userId**.
- [ ] Vérifier l'atomicité de la transaction (cf. SECURITY-3).
- [ ] Vérifier également la **limite métier** : y a-t-il une limite de boosters actifs simultanément par utilisateur ? Si oui, elle doit être appliquée **avant** le débit, pas après. Si non, c'est un sujet métier à part qui n'est pas dans ce sprint mais qui mérite une issue (un user qui empile 50 boosters multiplicateur fausse les classements).

---

## SECURITY-5 — Rate limiting sur `/api/var-bets/quick-bet`

Route critique : c'est la route appelée par les actions push (FRICTION-FK2 — bouton OUI/NON dans la notification web push). Elle est conçue pour être rapide, donc forcément attaquable rapidement.

- [ ] Vérifier `src/app/api/var-bets/quick-bet/route.ts`.
- [ ] Rate limiting : **15 requêtes / 60s / userId**. Un peu plus généreux que les routes shop parce qu'un utilisateur très actif sur plusieurs matchs simultanés peut légitimement parier rapidement.
- [ ] Vérifier que la route refuse de prendre 2 paris du même userId sur le même `market_event_id` (contrainte unique en DB ou check applicatif).
- [ ] Vérifier que la fenêtre de pari (90s d'après ton produit) est bien validée côté serveur, pas côté client uniquement. Un script qui parie après la fermeture du market doit être rejeté.

---

## SECURITY-6 — Rate limiting sur `/api/claim-rsa` et `/api/refill`

`/api/claim-rsa` (Revenu de Solidarité Active — solde minimum garanti) et `/api/refill` (recharge automatique probablement). Logique métier identique au claim quotidien : 1 claim par 24h en théorie.

- [ ] Vérifier `src/app/api/claim-rsa/route.ts` et `src/app/api/refill/route.ts` (si ce dernier existe — sinon ignorer).
- [ ] Rate limiting réseau : **5 requêtes / 60s / userId**.
- [ ] Vérifier l'atomicité de la vérification "déjà claim aujourd'hui ?" (cf. SECURITY-2).
- [ ] **Cas particulier RSA** : si la condition de claim est "solde < seuil", vérifier que le seuil est bien checké côté serveur après le rate limiting. Sinon un user peut maintenir son solde artificiellement bas et claim en boucle.

---

## SECURITY-7 — Réponse standardisée 429 et UX côté client

Quand le rate limit est dépassé, l'API doit retourner une réponse **claire et cohérente** pour que le frontend puisse afficher un message utile.

- [ ] Standardiser la réponse 429 sur toutes les routes économiques avec rate limiting :
  ```json
  {
    "error": "rate_limited",
    "message": "Trop de requêtes, réessaie dans quelques secondes.",
    "retryAfter": 30
  }
  ```
- [ ] Inclure le header HTTP standard `Retry-After: <secondes>` dans la réponse 429.
- [ ] Côté client (dans les composants qui appellent ces routes), gérer le cas 429 : afficher un toast "Tu cliques trop vite, attends quelques secondes" plutôt qu'une erreur générique. **Ne pas implémenter de retry automatique** — un utilisateur rate-limited doit le ressentir, sinon c'est une fausse sécurité.
- [ ] Vérifier que les 429 ne déclenchent pas Sentry (cf. sprint LOGGER) — c'est du comportement normal, pas une erreur applicative.

---

## SECURITY-8 — Tests manuels et validation

Avant de merger :

- [ ] Pour chaque route modifiée, faire un test manuel avec `curl` ou un script Node simple qui envoie 100 requêtes en parallèle. Vérifier :
  - Les premières N passent (où N = limite configurée)
  - Les suivantes retournent 429 avec le bon body et le header `Retry-After`
  - Après expiration du window, les requêtes repassent
- [ ] Vérifier qu'**aucun utilisateur légitime ne peut être bloqué accidentellement** : un user qui clique vite mais raisonnablement (5 clics en 10s) ne doit jamais voir un 429.
- [ ] Vérifier que les routes qui n'ont **pas** été modifiées dans ce sprint (ex: `/api/bet`, `/api/alert`) fonctionnent toujours (pas de régression sur l'infrastructure rate limiting si elle est centralisée).
- [ ] Captures d'écran ou logs des tests dans le PR.

---

## SECURITY-9 — Monitoring post-déploiement

Une fois en prod, surveiller pendant 48h :

- [ ] Logger (via `log.warn`, cf. sprint LOGGER) chaque 429 avec : `userId`, route, timestamp, IP. Pas en `log.error` pour ne pas polluer Sentry.
- [ ] Si tu utilises PostHog ou un équivalent, créer un dashboard simple "Rate limits triggered" pour voir si une route est trop restrictive (taux de 429 anormal sur des users légitimes) ou si une attaque est en cours (1 user, 1000 × 429 en 5 min).
- [ ] Documenter les seuils choisis dans un fichier dédié `src/lib/constants/rate-limits.ts` pour les ajuster facilement plus tard sans relire le code.

---

## Hors scope (à NE PAS faire dans ce sprint)

- ❌ Rate limiting sur les routes de lecture (GET) — moins critique, sera fait plus tard si nécessaire.
- ❌ Validation Zod des bodies des routes — sprint séparé (TECH_BIBLE le mentionne en 🟡).
- ❌ Refonte du système de monnaie ou des transactions — purement défensif ici.
- ❌ Captcha ou défi anti-bot — overkill pour le moment, à envisager seulement si on voit des attaques sophistiquées.

---

## Critères d'acceptation du sprint

1. Les 5 routes économiques listées dans le TECH_BIBLE (annexe 5.2) ont chacune un rate limiting configuré.
2. Les transactions critiques (achat shop, achat booster, claim quotidien, claim RSA) sont atomiques (RPC PostgreSQL ou contraintes unique + UPSERT).
3. Les réponses 429 sont standardisées avec body JSON cohérent + header `Retry-After`.
4. Les composants frontend qui appellent ces routes affichent un toast utile en cas de 429.
5. Les tests manuels (100 req/s par user) montrent un comportement de blocage correct.
6. Un fichier `src/lib/constants/rate-limits.ts` centralise les seuils pour ajustement facile.

---

## Pour Claude Code

- Branche : `feat/security-rate-limiting-eco`.
- Un commit par tâche SECURITY-X pour faciliter la review.
- Si tu identifies une race condition non listée ici en cours d'audit (ex: une autre route économique non mentionnée), **documente-la dans le PR mais ne la fixe pas dans ce sprint** — sauf si elle est trivialement contournable, auquel cas dis-le explicitement avant.
- Si l'infrastructure existante de rate limiting est in-memory (Map JS) et que le projet est déployé sur Vercel (multi-instance), **signale-le** : un rate limiting in-memory est inefficace en multi-instance car chaque serverless function a sa propre Map. Dans ce cas, recommander Upstash Ratelimit (gratuit jusqu'à 10k req/jour) et attendre validation avant de migrer.
