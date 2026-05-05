# 🧠 Agentic Memory (AI_LEARNINGS.md)

> **Pour l'IA (AI Agent) :**
> Ce fichier recense les "cicatrices" du projet (pièges, bugs fréquents, quirks techniques liés à notre stack exacte).
> **LIS CECI AVANT DE CODER.** Si tu résous un bug difficile ou que tu découvres une particularité de ce projet, tu AS L'OBLIGATION d'ajouter une puce ici pour tes futures itérations.

---

## ⚡ Next.js 16 & React 19 (App Router)

- **Erreur de Pureté (`react-hooks/purity`) :** Le linter de React 19 est ultra-strict. Ne jamais appeler `Date.now()` ou `new Date()` directement dans le scope principal d'un composant serveur ou d'un composant de rendu. L'encapsuler dans un `useEffect` ou un `useState` côté client, ou ajouter un commentaire `// eslint-disable-next-line react-hooks/purity` si le comportement non-déterministe est voulu et contrôlé.
- **InstallPrompt / PWA :** Les états comme `window.navigator` ne doivent jamais modifier un état de façon synchrone dans un `useEffect` (erreur `react-hooks/set-state-in-effect`). Toujours différer la mise à jour (ex: `setTimeout(..., 0)`).

## 🗄️ Supabase & RPC (PostgreSQL)

- **Le piège du JSONB dans les RPC :** Si une fonction PostgreSQL (RPC) attend un argument typé `JSONB` (ex: `p_scorers_json JSONB`), **NE PAS** faire de `JSON.stringify(objet)` côté TypeScript avant de l'envoyer. Passe l'objet JavaScript brut. Le client Supabase se charge de la sérialisation en JSONB. Si tu stringifies, Supabase renverra une erreur silencieuse de cast.
- **Filtrage des relations (Players / Teams) :** Ne jamais utiliser de comparaison de chaînes de caractères (ex: `ilike("team_name")`) pour réconcilier les joueurs avec leurs équipes. Utiliser systématiquement la clé étrangère stricte `.in("team_id", teamIds)` pour éviter les faux-positifs ou les limitations massives de requêtes.

## 🎨 UI & Tailwind

- ... (Placeholders pour futures leçons)
