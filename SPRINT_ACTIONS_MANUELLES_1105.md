# Actions manuelles — Sprints du 11/05/2026

Ce fichier récapitule toutes les actions à effectuer manuellement dans Supabase, cron-job.org, ou Vercel suite aux sprints déployés aujourd'hui. Les migrations ont déjà été appliquées (tu as confirmé "c'est fait" pour 0116 et 0117).

---

## ✅ Migrations appliquées

| Fichier                             | Sprint      | Statut      |
| ----------------------------------- | ----------- | ----------- |
| `0116_sprint7bis_notifs.sql`        | Sprint 7bis | ✅ Appliqué |
| `0117_sprint7ter_kop_vestiaire.sql` | Sprint 7ter | ✅ Appliqué |

---

## 🕐 Nouveau cron job à configurer — FRICTION-1

**Route :** `GET /api/cron/match-imminent-30min`
**Fréquence :** toutes les **5 minutes**
**Objet :** Envoie un rappel "30 min avant le match" aux joueurs abonnés

### Sur cron-job.org :

1. Créer un nouveau cron job
2. URL : `https://<ton-domaine>/api/cron/match-imminent-30min`
3. Méthode : GET
4. Fréquence : `*/5 * * * *` (toutes les 5 min)
5. En-tête Authorization : `Bearer <valeur de CRON_SECRET>`
6. Cocher "Send notification on failure"

> **Note :** Le `CRON_SECRET` est déjà dans tes variables Vercel (utilisé par les autres crons).

---

## 🔔 Vérifications Supabase post-migration 0116 (Sprint 7bis)

Ces éléments sont créés par la migration mais à vérifier visuellement :

### Table `notifications`

- [ ] Confirme que la table existe dans **Table Editor**
- [ ] Vérifie que **Realtime** est activé dessus (Table Editor → Realtime toggle) — la migration l'active via publication mais le dashboard peut montrer un état différent

### Colonne `notif_friend_request` sur `profiles`

- [ ] Visible dans Table Editor > profiles (valeur par défaut : `true`)

---

## 🔔 Vérifications Supabase post-migration 0117 (Sprint 7ter)

### Table `event_flavor_texts`

- [ ] Confirme que la table existe et contient **86 lignes** (les textes FR initiaux)
- [ ] Pour vérifier : `SELECT COUNT(*) FROM event_flavor_texts;` → doit retourner 86
- [ ] RLS activée, policy `flavor_texts_select` : `SELECT WHERE active = TRUE`

### Colonne `notif_fun_kop` sur `profiles`

- [ ] Visible dans Table Editor > profiles (valeur par défaut : `true`)

---

## 📊 Vérification du catalog flavor texts (optionnel)

Pour voir la distribution des textes par type d'événement :

```sql
SELECT event_type, COUNT(*) as nb
FROM event_flavor_texts
GROUP BY event_type
ORDER BY event_type;
```

Résultat attendu :
| event_type | nb |
|---|---|
| extra_time | 6 |
| fulltime | 6 |
| goal | 10 |
| halftime | 6 |
| kickoff | 6 |
| own_goal | 8 |
| penalty | 10 |
| red_card | 8 |
| substitution | 8 |
| var_review | 8 |
| yellow_card | 10 |

---

## 🔔 Sprint 11 — Realtime à activer dans Supabase

Pour que les read receipts (Sprint 11.1) et le badge notif live (Sprint 11.4) fonctionnent en temps réel, deux tables doivent être ajoutées à la publication Realtime.

**SQL à exécuter dans Supabase SQL Editor :**

```sql
-- Sprint 11.1 : read receipts live (mise à jour du champ user_a/b_read_at)
ALTER TABLE direct_message_threads REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE direct_message_threads;

-- Sprint 11.4 : badge notifications en temps réel
ALTER TABLE notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

> Sans ces lignes, les features se dégradent gracieusement (pas de crash) :
>
> - Read receipts : affichés au chargement de page mais sans mise à jour live
> - Badge notif : ne s'incrémente pas sans rechargement

---

## 🚫 Rien à faire côté Vercel

Aucune nouvelle variable d'environnement n'est requise pour ces sprints.

---

## 📋 Récap des sprints déployés aujourd'hui

| Sprint      | Fonctionnalité                                         | Commit    |
| ----------- | ------------------------------------------------------ | --------- |
| Sprint 7bis | Bucketing notifs pré-match, push ami/DM, cloche in-app | `8b2b6af` |
| FRICTION-1  | Cron J-30min + Wake Lock LiveRoom                      | `cc9e3d8` |
| Sprint 7ter | KOP flavor texts + PredictionDistribution Vestiaire    | `489c450` |
