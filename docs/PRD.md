# PRD — Le Sifflet / VAR Time (produit)

Document de référence court pour aligner vitrine, roadmap et messages publics. Les données sportives réelles viennent de TheSportsDB et des scripts SQL du dépôt — aucun score ou joueur inventé dans ce document.

**Dernière mise à jour :** 2026-05-02

---

## 1. Problème et utilisateur

Les fans suivent un match sur le canapé ou au stade avec un second écran. Ils veulent **réagir ensemble**, **parier virtuellement** sur l’action (VAR, carton, but refusé) et **montrer leur science du jeu** avant le coup d’envoi — sans argent réel ni friction type tableur Excel.

**Utilisateur cible :** supporter mobile-first, ton décalé (références type MPG / Mon Petit Prono), 100 % gratuit.

---

## 2. Proposition de valeur

Une PWA **second écran** qui combine :

1. **Adrénaline du direct** — signaux communautaires, fenêtres de prédiction courtes, cotes dégressives, résolution des événements et feedback immédiat (Sifflets virtuels, karma, classement).
2. **Calme avant la tempête** — **pronostics d’avant-match** : vainqueur, score exact, buteurs, etc., centralisés dans la même arène que le live.

Monnaie interne : **Sifflets** (points fictifs). Aucune monnaie réelle, aucun gain pécuniaire.

---

## 3. Périmètre fonctionnel (MVP+)

| Domaine | Description | Notes produit |
|--------|-------------|----------------|
| **Live** | Lobby matchs, salle live, alertes, `market_events`, paris OUI/NON, résolution + notifications | Cœur « VAR / Waze » |
| **Avant match** | Paris long terme sur un match à venir ou en cours (selon règles métier) : types type buteur, score exact | Vitrine landing + onglet Prédictions |
| **Progression** | Trust score, karma, refill, leaderboard | Badges profil ; la **ligne de grades** sur la landing est **narrative** (ne remplace pas le modèle SQL profil) |
| **Auth & profil** | Google OAuth, profil, historique de paris | — |
| **Modération** | Résolution manuelle / admin, seuils trust | — |

---

## 4. Hors périmètre / contraintes

- Pas de paris en argent réel.
- Pas de génération de fausses données match dans l’UI ou la doc produit : démo = seed / API agrégée.
- Internationalisation : FR en premier pour la CDM 2026 (scope élargi documenté dans `PROJECT_STATE.md`).

---

## 5. Alignement vitrine (`/`)

La page d’accueil publique (marque **VAR Time** sur la landing) doit refléter les deux piliers ci-dessus et une progression **lisible** (carte grades), sans promettre de mécaniques inexistantes en base.

Pour l’état d’implémentation détaillé (tables, RPC, dettes), voir [`PROJECT_STATE.md`](../PROJECT_STATE.md).
