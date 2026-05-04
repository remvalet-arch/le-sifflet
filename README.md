# VAR Time 📺⚽

**VAR Time** (Le Sifflet) est une application PWA "second écran" pour le football. Conçue pour vivre les matchs en direct avec ses amis, elle permet de signaler les actions litigieuses façon Waze (fautes, penaltys, hors-jeux) et de parier en temps réel avec la communauté sur l'issue de la VAR.

L'application tourne autour de "Sifflets", une monnaie virtuelle, avec un ton très "Mon Petit Gazon" (MPG) pour chambrer ses amis dans une ligue privée.

## 🚀 La Stack Technique

- **Framework :** Next.js 16 (App Router)
- **UI :** React 19, Tailwind v4, Lucide React, Sonner (Toasts)
- **Base de données & Temps Réel :** Supabase (PostgreSQL, Row Level Security, RPC, Realtime subscriptions)
- **Tests :** Playwright (Tests E2E)
- **Mobile-first :** PWA (Progressive Web App) optimisée pour le "tap" et l'utilisation au stade (Optimistic UI).

## 🛠️ Installation & Démarrage

1. **Cloner le projet :**

   ```bash
   git clone <repo>
   cd le-sifflet
   ```

2. **Configuration Environnement :**
   Copie `.env.example` en `.env.local` et remplis tes clés Supabase.

   ```bash
   cp .env.example .env.local
   ```

   _Tu auras besoin de `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, et `SUPABASE_SERVICE_ROLE_KEY` (pour l'API d'administration)._

3. **Installer les dépendances :**

   ```bash
   npm install
   ```

4. **Base de données :**
   _(Optionnel) Si tu utilises Supabase localement, assure-toi d'appliquer les migrations via la CLI._

5. **Lancer le serveur de développement :**
   ```bash
   npm run dev
   ```
   Rends-toi sur [http://localhost:3000](http://localhost:3000).

## 🤖 Guide V-Coder (Agent IA)

Ce dépôt est conçu pour être développé en totale autonomie par une IA (V-Coding).
Un fichier **`TASKS.md`** sert de point d'entrée pour l'agent.

Commandes clés pour la validation de l'IA :

- `npm run ai:check` : Exécute `prettier`, `eslint` et le typecheck TypeScript. Le code doit compiler silencieusement avant d'être validé.
- `npm run ai:verify` : Exécute le check complet + les tests end-to-end (Playwright).
- `npm run test:backend` : Lance un script de simulation de "vrai match" pour voir des événements pop-up en temps réel à l'écran.

Veuillez consulter les fichiers dans `.skills/` pour les conventions strictes d'architecture.

---

_Que la VAR soit avec vous._
