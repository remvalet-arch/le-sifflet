# 🧠 Agentic Memory (AI_LEARNINGS.md)

> **Pour l'IA (AI Agent) :**
> Ce fichier recense les "cicatrices" du projet (pièges, bugs fréquents, quirks techniques liés à notre stack exacte).
> **LIS CECI AVANT DE CODER.** Si tu résous un bug difficile ou que tu découvres une particularité de ce projet, tu AS L'OBLIGATION d'ajouter une puce ici pour tes futures itérations.

---

## ⚡ Next.js 16 & React 19 (App Router)

- **Erreur de Pureté (`react-hooks/purity`) :** Le linter de React 19 est ultra-strict. Ne jamais appeler `Date.now()` ou `new Date()` directement dans le scope principal d'un composant serveur ou d'un composant de rendu. L'encapsuler dans un `useEffect` ou un `useState` côté client, ou ajouter un commentaire `// eslint-disable-next-line react-hooks/purity` si le comportement non-déterministe est voulu et contrôlé.
- **InstallPrompt / PWA :** Les états comme `window.navigator` ne doivent jamais modifier un état de façon synchrone dans un `useEffect` (erreur `react-hooks/set-state-in-effect`). Toujours différer la mise à jour (ex: `setTimeout(..., 0)`).

## 🗄️ Supabase & RPC (PostgreSQL)

- **Calcul de points entre joueurs & RLS :** Les tables comme `bets` ou `pronos` ont des politiques RLS restrictives (ex: `USING (user_id = auth.uid())`). Lorsqu'on doit agréger ou afficher les scores/points d'une ligue (Squad) pour tous les membres dans une route API, il **faut impérativement utiliser le client Supabase `admin` (service_role)** via `createAdminClient()`. Sinon, la requête filtrera silencieusement et ne renverra que les données de l'utilisateur courant, donnant l'impression que tous les autres joueurs sont à 0 points.
- **Le piège du JSONB dans les RPC :** Si une fonction PostgreSQL (RPC) attend un argument typé `JSONB` (ex: `p_scorers_json JSONB`), **NE PAS** faire de `JSON.stringify(objet)` côté TypeScript avant de l'envoyer. Passe l'objet JavaScript brut. Le client Supabase se charge de la sérialisation en JSONB. Si tu stringifies, Supabase renverra une erreur silencieuse de cast.
- **Filtrage des relations (Players / Teams) :** Ne jamais utiliser de comparaison de chaînes de caractères (ex: `ilike("team_name")`) pour réconcilier les joueurs avec leurs équipes. Utiliser systématiquement la clé étrangère stricte `.in("team_id", teamIds)` pour éviter les faux-positifs ou les limitations massives de requêtes.

## 🎨 UI & Tailwind

- **Prop interface cassée sur les pages publiques :** Quand on rewrite les props d'un composant partagé (ex: `ProfileClient`), penser à vérifier toutes les pages qui l'utilisent — pas seulement `/profile/page.tsx` mais aussi `/profile/[id]/page.tsx`. Un rename/suppression de prop génère une erreur TypeScript sur la page oubliée.
- **Props optionnels pour rétro-compat :** Si une prop n'est plus affichée dans le nouveau design (ex: `karma` dans `ProfileHeader`) mais est encore passée depuis certaines pages, rendre la prop `optional` (`karma?`) plutôt que de la supprimer. Cela évite les erreurs TS sans casser les call-sites.

## 🔑 TypeScript & Supabase Update typé

- **Clé dynamique sur `.update({})` Supabase (TS2345) :** Le client Supabase génère des types stricts pour les objets passés à `.update()`. Un objet construit avec une clé dynamique (`{ [dynamicKey]: value }`) a le type `{ [x: string]: string }` que TS refuse d'assigner à l'interface `Update` typée. **Toujours utiliser un if/else explicite :**

  ```typescript
  // ❌ Refuse à la compilation
  const field = userId < otherId ? "user_a_read_at" : "user_b_read_at";
  await supabase.from("direct_message_threads").update({ [field]: now });

  // ✅ Correct
  if (userId < otherId) {
    await supabase
      .from("direct_message_threads")
      .update({ user_a_read_at: now });
  } else {
    await supabase
      .from("direct_message_threads")
      .update({ user_b_read_at: now });
  }
  ```

  Ce pattern s'applique partout où on choisit dynamiquement entre deux colonnes (ex: thread read_at selon quel côté du thread on est).

## 📦 `npm install` sans commit de `package.json` / `package-lock.json`

- **Toujours inclure `package.json` ET `package-lock.json` dans le commit après un `npm install`.** Si on commit uniquement les fichiers source (`git add src/...`) sans ajouter les fichiers de dépendances, le build Vercel échoue avec "Module not found" même si le package fonctionne en local. Pattern à suivre après tout `npm install` : `git add package.json package-lock.json`.

## 🔔 Colonnes `notif_*` sur `profiles` — nommage réel vs documenté

- **PROJECT_STATE.md (et les descriptions de migration) ne sont pas la source de vérité pour les noms de colonnes.** La migration 0084 est documentée avec `notif_nudge`, `notif_match_start`, `notif_var_result` (singulier) mais les colonnes réellement en base sont `notif_pre_match_5min`, `notif_pre_match_2h`, `notif_var_results` (pluriel). **Toujours vérifier dans `src/types/database.ts`** avant d'utiliser une colonne `notif_*` — c'est la seule source de vérité fiable.

## 🤖 Anthropic API — Réponses JSON avec fences markdown

- **Claude enveloppe parfois sa réponse JSON dans des backticks markdown** (` ```json ... ``` `), même quand le system prompt dit "Réponds en JSON uniquement". `JSON.parse()` échoue silencieusement. Toujours stripper les fences avant de parser : `raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim()`.
- **L'`ANTHROPIC_API_KEY` est distincte de l'abonnement Claude.ai/Claude Code** — c'est une clé API pay-per-use à créer sur console.anthropic.com. Les variables d'environnement Vercel ne prennent effet qu'après un redéploiement.

## 📦 skills.sh (npx skills add)

- **Les noms de skills ne correspondent pas aux noms courts "évidents" :** La CLI `npx skills add vercel-labs/agent-skills@<nom>` exige le nom exact du fichier skill. Exemples de noms contre-intuitifs : `vercel-react-best-practices` (pas `react-best-practices`), `vercel-composition-patterns` (pas `composition-patterns`). Toujours vérifier avec `npx skills search <mot-clé>` ou consulter le README du repo avant d'essayer d'installer.
