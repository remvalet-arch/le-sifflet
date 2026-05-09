# Sprint VAR-PUSH — Push notification pour les Paris VAR hors-app

> **Objectif :** Quand un marché VAR s'ouvre sur un match, envoyer une push notification aux joueurs actifs absents de l'app, pour qu'ils puissent parier sans être sur le LiveRoom.
>
> **Priorité :** 🔴 CDM-Ready — à faire AVANT le 11 juin 2026.
>
> **Contexte :** Aujourd'hui, le LiveRoom détecte l'ouverture d'un `market_event` via Realtime **seulement si l'utilisateur est connecté et sur la page**. Un joueur avec app fermée ou écran verrouillé rate le marché. La fenêtre de vote dure 90 secondes — c'est ultra court. La push doit arriver en < 3s après l'ouverture.

---

## Tâches

### 1. Identifier les bénéficiaires de la push VAR — S

**Fichier :** `/src/app/api/alert/route.ts` (là où le `market_event` est créé)

**Logique :**
Juste après le `INSERT` du `market_event`, récupérer les user IDs qui répondent à **toutes** ces conditions :

1. `notif_var_results = true` sur leur profil (ou `null` → défaut activé)
2. Ont une push subscription active dans `push_subscriptions`
3. Ont consulté ce match dans les 15 dernières minutes (`match_presence.last_seen_at > now() - interval '15 min'`)

```sql
-- Query cible (à adapter en Supabase TS)
SELECT DISTINCT pp.user_id
FROM push_subscriptions pp
JOIN profiles pr ON pr.id = pp.user_id
JOIN match_presence mp ON mp.user_id = pp.user_id AND mp.match_id = $matchId
WHERE (pr.notif_var_results IS NULL OR pr.notif_var_results = true)
  AND mp.last_seen_at > NOW() - INTERVAL '15 minutes';
```

**DoD :** La requête retourne les bons user IDs en test manuel (créer 2 users fictifs, l'un avec presence récente, l'autre non).

---

### 2. Câbler l'envoi push dans /api/alert — M

**Fichier :** `/src/app/api/alert/route.ts`

**Après le bloc qui crée le `market_event`** (juste avant le `return successResponse`), ajouter :

```typescript
// Fire-and-forget push VAR
void (async () => {
  const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data: presenceUsers } = await admin
    .from("match_presence")
    .select("user_id")
    .eq("match_id", matchId)
    .gte("last_seen_at", since);

  const candidateIds = (presenceUsers ?? []).map((r) => r.user_id);
  if (candidateIds.length === 0) return;

  // Filter by notif_var_results + push subscription
  const { data: eligible } = await admin
    .from("profiles")
    .select("id")
    .in("id", candidateIds)
    .or("notif_var_results.is.null,notif_var_results.eq.true");

  const userIds = (eligible ?? []).map((r) => r.id);
  if (userIds.length === 0) return;

  const homeTeam = matchRow?.team_home ?? "Match";
  const awayTeam = matchRow?.team_away ?? "";

  await sendPushToUsers(userIds, {
    title: "⚡ VAR en cours !",
    body: `L'arbitre consulte la VAR sur ${homeTeam}–${awayTeam} — parie maintenant !`,
    url: `/match/${matchId}`,
  });
})();
```

**Note :** `matchRow` est déjà dans le scope du handler (ou à récupérer depuis la DB).

**DoD :**

- Ouvrir un marché depuis l'admin → les utilisateurs avec `match_presence` récente reçoivent la push
- Les utilisateurs sans presence récente ne reçoivent rien
- La push arrive en < 5s après l'ouverture du marché
- Aucun log d'erreur dans Vercel

---

### 3. Tester le bon format de la push — S

**Vérifier :**

- `title` : "⚡ VAR en cours !"
- `body` : contient les noms des équipes
- `url` : `/match/[matchId]` → clique dessus → ouvre le LiveRoom

**Test :**

1. Sur mobile avec app en arrière-plan → notification visible dans le centre de notifs
2. Sur mobile avec écran verrouillé → notification visible sur l'écran de verrouillage
3. Cliquer sur la notif → ouvre l'app et navigue vers `/match/[matchId]`

---

### 4. Éviter le spam : déduplications — S

**Problème :** Si plusieurs alertes se déclenchent sur le même match en < 5 min, le joueur pourrait recevoir plusieurs push pour le même marché (ou plusieurs marchés successifs).

**Fix :** Avant d'envoyer, vérifier qu'aucune push VAR n'a été envoyée à cet user pour ce match dans les 5 dernières minutes :

```typescript
// Simple check via push_logs (table existante)
const { count } = await admin
  .from("push_logs")
  .select("id", { count: "exact", head: true })
  .in("user_id", userIds)
  .eq("type", "var_open") // à ajouter comme type
  .eq("match_id", matchId)
  .gte("sent_at", new Date(Date.now() - 5 * 60 * 1000).toISOString());

if ((count ?? 0) > 0) return; // Déjà pushé récemment
```

**Alternative plus simple :** Utiliser le cooldown existant du match (`alert_cooldown_until`) — si le cooldown est actif, un marché vient juste d'être ouvert et la push a déjà été envoyée.

**DoD :** 2 alertes en < 5 min sur le même match → 1 seule push reçue.

---

### 5. Update TECH_BIBLE + V-CODER_GUIDE — S

- Documenter dans TECH_BIBLE.md (Pilier 5.9 / NOTIF) que les marchés VAR pushent vers les utilisateurs en `match_presence` active
- Si migration ajoutée (nouveau type de push_logs), l'ajouter dans V-CODER_GUIDE.md "Actions en attente"

---

## Critères d'acceptation globaux

1. Ouvrir manuellement un marché VAR via `/admin/resolve` → les joueurs avec presence active sur le match et notifs activées reçoivent la push en < 5s
2. 0 push envoyée si aucun joueur en presence active
3. Pas de doublon push si 2 marchés ouverts en < 5 min
4. `npm run ai:check` passe sans erreur
5. `npm run build` passe sans erreur

## Risques

| Risque                                                 | Mitigation                                                                             |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Table `match_presence` non peuplée en dehors des tests | Vérifier que le composant LiveRoom ping bien la table (déjà en place selon TECH_BIBLE) |
| Push vers trop d'utilisateurs (CDM = 1000+ users)      | Limiter à 500 user IDs max par envoi avec chunk de 100 dans `sendPushToUsers`          |
| `push_logs` manque de colonne `match_id`               | Vérifier le schéma — si absent, utiliser le cooldown match comme protection            |

## Fichiers à modifier

- `src/app/api/alert/route.ts` — câbler l'envoi push après création du market_event
- `src/lib/push-sender.ts` — vérifier que le chunking des envois est en place (déjà ?)
- `TECH_BIBLE.md` — documenter le flux
- `V-CODER_GUIDE.md` — si migration push_logs nécessaire

## Complexité estimée : M (45–60 min)
