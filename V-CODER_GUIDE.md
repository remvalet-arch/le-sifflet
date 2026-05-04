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

| Commande               | À quoi ça sert ?                                                                                                                                    |
| :--------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`          | Lance ton site en local pour que tu puisses le voir sur `http://localhost:3000`.                                                                    |
| `npm run test:backend` | **Le Simulateur de Match !** Ça lance de faux événements en arrière-plan pendant que tu regardes ton app, pour tester la sensation du "Temps Réel". |
| `npm run ai:verify`    | Force l'IA à passer tous les tests de sécurité (Types, ESLint, Playwright).                                                                         |

---

## 3. 📂 Comprendre l'Architecture "Cachée"

On a mis en place des fichiers spéciaux que l'IA utilise pour être intelligente. **Tu n'as pas besoin d'y toucher**, mais c'est bien de savoir qu'ils sont là :

- **Le dossier `.skills/` :** C'est le centre de formation de l'IA. Si elle doit faire un bouton, elle lit `<ui-mobile.xml>`. Si elle doit faire une modale de pari, elle lit `<betting-engine.xml>`. Ça évite qu'elle n'invente du code qui ne correspond pas à ton style "MPG".
- **`PROJECT_STATE.md` :** C'est la **Mémoire** du projet. À chaque fois que l'IA finit une tâche, elle vient écrire ici ce qu'elle a fait. Ainsi, même dans 6 mois, une nouvelle IA saura exactement comment est codé "Le Sifflet".
- **`CLAUDE.md` / `AGENTS.md` :** Ce sont les lois absolues de l'IA. C'est ici qu'on lui dit "Va lire TASKS.md et corrige tes erreurs en silence".

---

## 4. 🚀 Le Déploiement Automatique (DevOps Invisible)

J'ai créé un dossier `.github/workflows/ci.yml`.
Qu'est-ce que ça veut dire ?

Dès que tu utiliseras `git push` (ou que l'IA le fera pour toi) pour envoyer ton code sur GitHub, un robot sur les serveurs de GitHub va s'allumer et lancer `npm run ai:verify`.

- 🟢 Si c'est Vert : Ton code est parfait, il peut être envoyé sur Vercel (ou autre) pour tes utilisateurs.
- 🔴 Si c'est Rouge : GitHub te bloquera pour t'empêcher de mettre en ligne une application cassée. L'IA pourra récupérer le rapport et corriger.

---

**Prêt à jouer ?**
👉 Va dans `TASKS.md`, écris ta première vraie fonctionnalité, et demande à l'IA de s'en occuper !
