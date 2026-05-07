# 👑 Guide de Survie du V-Coder (Le Sifflet)

Bienvenue dans le "Cockpit". Puisque tu codes via l'IA, tu n'es plus un développeur, tu es le **Directeur Technique** de ton projet. Ce fichier récapitule tout ce qu'on a mis en place pour te faciliter la vie.

---

## 1. 🤖 Comment parler à l'IA ? (Le Workflow)

Ne perds plus de temps à faire de longs prompts sur le chat.
**Ton unique espace de travail est le fichier `TASKS.md`.**

1. Ouvre `TASKS.md`.
2. Ajoute une ligne avec ce que tu veux : `- [ ] Créer la page de profil avec un avatar`.
3. Retourne sur ton interface IA (Cursor, Roo, ou le terminal Claude) et écris simplement :
   > _"Fais la prochaine tâche dans TASKS.md"_

L'IA s'occupera du reste. Elle codera, testera ses erreurs, documentera, et cochera la case toute seule.

---

## 2. 🎮 Tes Commandes Magiques (Pour tester ton app)

Ces commandes sont à taper dans ton terminal classique si tu as besoin de voir ce qui se passe.

| Commande               | À quoi ça sert ?                                                                                                                                        |
| :--------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run dev`          | Lance ton site en local pour que tu puisses le voir sur `http://localhost:3000`.                                                                        |
| `npm run test:unit`    | **Tests unitaires instantanés.** Lance les 17 tests Vitest sur les fonctions de calcul (scorer, stoppage…). Aucun serveur nécessaire, résultat en < 1s. |
| `npm run test:backend` | **Le Simulateur de Match !** Ça lance de faux événements en arrière-plan pendant que tu regardes ton app, pour tester la sensation du "Temps Réel".     |
| `npm run ai:check`     | Lint + TypeScript — ce que l'IA lance avant chaque commit. Aucun prérequis.                                                                             |
| `npm run ai:verify`    | `ai:check` + tests E2E Playwright (nécessite l'app en cours + Supabase connecté).                                                                       |

---

## 3. 🏗️ Actions Humaines — Ce que l'IA ne peut pas faire à ta place

> Ces actions ne s'automatisent pas. Lis cette section après chaque gros sprint.

### Migrations Supabase

Quand l'IA crée un fichier dans `supabase/migrations/`, **tu dois l'appliquer manuellement** :

1. Ouvre le **Supabase SQL Editor** (supabase.com → ton projet → SQL Editor)
2. Copie-colle le contenu du fichier `.sql` concerné
3. Clique **Run**

**Migrations en attente à ce jour :**

- `0062_fix_match_community_stats.sql`
- `0063_friends.sql`
- `0064_league_mode.sql`

> Vérifie avec `ls supabase/migrations/` — tout fichier non appliqué casse les fonctionnalités associées.

### Variables d'environnement

Ton `.env.local` doit toujours contenir :

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...      ← requis pour les routes admin (/api/alert, resolve-event)
```

Sur Vercel : Settings → Environment Variables → vérifier que les 3 sont présentes.

### Tests E2E (Playwright)

Pour lancer `npm run ai:verify` ou `npm run test:e2e`, il faut :

1. App démarrée : `npm run dev` dans un terminal séparé
2. Variable `PLAYWRIGHT_BASE_URL=http://localhost:3000` dans `.env.local`
3. `TEST_AUTH_SECRET` configuré (voir `tests/e2e/global-setup.ts`)

Sans ça, les tests E2E échouent — `npm run ai:check` (sans verify) reste toujours safe.

### Secrets GitHub Actions

Pour que le CI GitHub fonctionne complètement, ajoute dans **GitHub → Settings → Secrets → Actions** :

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Sans eux, les tests E2E du CI échouent (mais lint + types + unit tests passent quand même).

### Pages légales — Contenu à personnaliser

Les pages `/cgu`, `/mentions-legales`, `/privacy` ont été créées avec un contenu générique.
**Avant de soumettre sur l'App Store**, lis et adapte le contenu (notamment l'adresse de l'éditeur si elle change).

---

## 4. 📂 Comprendre l'Architecture "Cachée"

On a mis en place des fichiers spéciaux que l'IA utilise pour être intelligente. **Tu n'as pas besoin d'y toucher**, mais c'est bien de savoir qu'ils sont là :

- **Le dossier `.skills/` :** C'est le centre de formation de l'IA. Si elle doit faire un bouton, elle lit `<ui-mobile.xml>`. Si elle doit faire une modale de pari, elle lit `<betting-engine.xml>`. Ça évite qu'elle n'invente du code qui ne correspond pas à ton style "MPG".
- **`PROJECT_STATE.md` :** C'est la **Mémoire** du projet. À chaque fois que l'IA finit une tâche, elle vient écrire ici ce qu'elle a fait. Ainsi, même dans 6 mois, une nouvelle IA saura exactement comment est codé "Le Sifflet".
- **`CLAUDE.md` / `AGENTS.md` :** Ce sont les lois absolues de l'IA. C'est ici qu'on lui dit "Va lire TASKS.md et corrige tes erreurs en silence".
- **`src/lib/__tests__/` :** Tests unitaires Vitest. L'IA les maintient à jour quand elle touche aux fonctions de calcul.
- **`vitest.config.ts` :** Config des tests unitaires (alias `@/`, pattern de fichiers).

---

## 5. 🚀 Le Déploiement Automatique (DevOps Invisible)

Le fichier `.github/workflows/ci.yml` fait tourner automatiquement sur GitHub à chaque push :

1. `npm run ai:check` (format + lint + types)
2. `npm run test:unit` (17 tests Vitest)
3. `npm run test:e2e` (Playwright — nécessite les secrets GitHub)

- 🟢 **Vert :** Ton code est propre, Vercel peut déployer en toute sécurité.
- 🔴 **Rouge :** GitHub te bloque. L'IA peut lire le rapport et corriger.

---

**Prêt à jouer ?**
👉 Va dans `TASKS.md`, écris ta prochaine fonctionnalité, et demande à l'IA de s'en occuper !
