# Sprint UX-PRONOS — Refonte de la liste des matchs à pronostiquer

> **Contexte produit** : l'écran principal des pronos affiche la liste des matchs à venir. Pour chaque match, l'utilisateur peut pronostiquer un score exact (deux cases `?` à remplir). Avant le pronostic, on affiche aussi 3 indicateurs de gain potentiel selon l'issue (victoire équipe 1 / nul / victoire équipe 2). Plus l'issue est improbable selon les statistiques, plus le gain est élevé. Ce ne sont **pas** des suggestions de score, ce sont des points potentiels associés à chaque résultat.
>
> **Problème actuel** : la carte match porte trop d'éléments en compétition visuelle. Les éléments secondaires (gain potentiel, forme récente, labels) ont le même poids visuel que les éléments primaires (équipes, logos, score à pronostiquer). Résultat : le cerveau utilisateur ne sait pas où regarder, et la densité empêche l'affichage de plus de 2-3 matchs par écran.
>
> **Objectif du sprint** : refondre la carte match de la liste des pronos pour établir une hiérarchie visuelle claire, supprimer les redondances textuelles, et permettre l'affichage de 4-5 matchs par écran sans scroll. Ne PAS modifier la logique métier, uniquement l'UX/UI.
>
> **Périmètre** : uniquement la **liste** des matchs à pronostiquer (l'écran avec l'onglet Pronos sélectionné). La modale de pronostic qui s'ouvre au tap sur la carte n'est PAS dans ce sprint.

---

## UX-PRONOS-1 — Audit du composant carte match

**Avant tout changement**, identifier précisément le composant React qui rend chaque carte match dans la liste des pronos.

- [ ] Localiser le fichier du composant carte match (probablement dans `components/pronos/` ou similaire). Donner son chemin exact.
- [ ] Identifier tous les sous-composants utilisés (logos clubs, pastilles de forme, cellules de gain, CTA).
- [ ] Lister les props que le composant reçoit, et la source des données (table Supabase, requête).
- [ ] Vérifier si le composant est aussi utilisé ailleurs dans l'app (autre écran, autre contexte). Si oui, **ne pas modifier le composant en place** : créer une variante dédiée à la liste pronos pour ne rien casser.
- [ ] Reporter dans le PR : "Composant identifié : `<chemin>`. Réutilisé dans : <liste écrans> ou aucun autre usage."

---

## UX-PRONOS-2 — Suppression des labels redondants

Ces labels sont redondants ou inutiles et alourdissent l'écran sans apporter d'information :

- [ ] **Supprimer le texte "pts si ✓"** sous chaque cellule de gain potentiel. Le chiffre seul suffit, le contexte est donné par un label unique au-dessus des 3 cellules (cf. UX-PRONOS-3).
- [ ] **Supprimer le texte "5 DERNIERS"** sous les pastilles de forme. Les pastilles de forme avec leur code couleur (vert = victoire, rouge = défaite, gris = nul ou non joué) sont une convention universelle dans les apps foot (SofaScore, OneFootball, FotMob, L'Équipe). Le label est redondant.
- [ ] Vérifier qu'aucun de ces labels n'est traduit via i18n / fichier de strings (s'il y a un système de traduction, supprimer la clé associée pour ne pas laisser de string orpheline).

---

## UX-PRONOS-3 — Label unique pour les cellules de gain

Plutôt que trois labels "pts si ✓" répétés, un seul label discret au-dessus des trois cellules.

- [ ] Ajouter un mini-label centré au-dessus des 3 cellules de gain : **"Gain potentiel"** en gris 60%, taille 11-12px, en uppercase ou non selon ce qui s'aligne avec le design system existant.
- [ ] Le label doit être visuellement secondaire — il introduit la rangée des chiffres mais ne doit pas attirer l'œil.
- [ ] Si le design system a un token spécifique pour les "labels secondaires" / "captions", utiliser ce token plutôt qu'un style ad hoc.

---

## UX-PRONOS-4 — Hiérarchie typographique de la carte

L'œil doit lire la carte dans cet ordre de priorité :

1. **Niveau 1 (primaire)** : noms d'équipes, logos d'équipes, cases de score à pronostiquer (les deux `?`)
2. **Niveau 2 (secondaire)** : cellules de gain potentiel (les 3 chiffres)
3. **Niveau 3 (tertiaire)** : journée (J36), heure du match, pastilles de forme

Appliquer la hiérarchie suivante en respectant les tokens de typographie du design system :

- [ ] **Logos d'équipes** : taille actuelle conservée ou légèrement augmentée si l'espace le permet. Ce sont les éléments les plus identifiables au premier coup d'œil.
- [ ] **Noms d'équipes** : poids font-bold, couleur blanche pleine, taille équivalente à la taille body large du design system (probablement 16-18px). Tronquer avec ellipsis si trop long mais essayer d'afficher le nom complet (ex : "Crystal Palace" plutôt que "Cryst...").
- [ ] **Cases de score (les deux `?`)** : taille équivalente aux logos, fond gris foncé clairement cliquable, bordure subtile. Doivent être visuellement les éléments les plus invitants au tap.
- [ ] **Cellules de gain potentiel** : réduire la taille de **30%** par rapport à l'état actuel. Le chiffre reste lisible (taille 14-15px) mais clairement secondaire. Couleur blanc 80%.
- [ ] **J36, heure du match** : taille 12px, couleur gris 60%.
- [ ] **Pastilles de forme** : réduire la taille de **20%**, espacer les pastilles entre elles (gap +2px). Couleur des pastilles : conserver le code couleur existant (vert/rouge/gris).

Ne PAS introduire de nouvelles couleurs ou tailles arbitraires. Utiliser uniquement les tokens du design system. Si un token nécessaire n'existe pas (ex : "label-tertiary"), le créer dans le fichier de tokens centralisé plutôt que de hardcoder une valeur.

---

## UX-PRONOS-5 — Repositionnement et style du CTA "Sois le premier à pronostiquer"

Actuellement ce CTA prend une ligne complète en bas de la carte, ce qui ajoute de la hauteur inutile.

- [ ] Si le match n'a aucun pronostic encore (ni de l'utilisateur, ni d'autres joueurs), afficher un **mini-badge** discret en jaune whistle au-dessus ou à côté des cases de score, avec le texte court **"Premier à pronostiquer"** (sans "Sois le", trop verbeux). Taille du badge : équivalent à un tag/pill du design system.
- [ ] Si le match a déjà des pronostics d'autres joueurs mais pas de l'utilisateur, ne PAS afficher ce badge.
- [ ] Vérifier la logique métier : la condition "premier à pronostiquer" est-elle vraie au niveau global de l'app, au niveau de la ligue de l'utilisateur, ou autre ? Conserver la logique existante, juste changer l'affichage.
- [ ] Si la simplification du CTA fait perdre une mécanique de gamification (bonus de points pour le premier), garder une indication visuelle claire (ex : badge avec icône `⚡` + tooltip au tap "Bonus si tu es le premier à pronostiquer"). Vérifier dans la logique métier si ce bonus existe avant de prendre la décision.

---

## UX-PRONOS-6 — Compactification verticale de la carte

Cible : **passer d'environ 280px de hauteur par carte à 180-200px** sans sacrifier la lisibilité.

- [ ] Mesurer la hauteur actuelle de la carte match dans la liste pronos (Inspecteur ou DevTools mobile).
- [ ] Réduire les paddings internes verticaux de la carte de ~25%.
- [ ] Réduire le gap entre la rangée logos+noms et la rangée cellules de gain de ~30%.
- [ ] Réduire le margin-bottom externe de chaque carte (espace entre deux cartes successives) à environ 12-16px (à valider visuellement).
- [ ] Tester sur les viewports cibles (iPhone SE, iPhone 14, iPhone 15 Pro Max) : viser **4 cartes match visibles sans scroll** sur un iPhone 14, contre 2-3 actuellement.

---

## UX-PRONOS-7 — Format de la pastille de date

Actuellement la pastille du jour sélectionné affiche "Auj." sans date, alors que les autres jours affichent "Mar. 5", "Mer. 6", etc.

- [ ] **Uniformiser le format de toutes les pastilles** : "Sam. 9", "Dim. 10", "Lun. 11", etc. Plus de cas particulier "Auj." sans chiffre.
- [ ] La pastille du jour actuel reste visuellement distincte (fond jaune whistle) pour signaler qu'elle est sélectionnée par défaut, mais affiche bien la date.
- [ ] **Optionnel** : ajouter une mini-mention "Aujourd'hui" en taille 10px sous la date de la pastille active, mais uniquement si ça ne casse pas l'alignement vertical des autres pastilles. Si ça casse l'alignement, ne pas ajouter.
- [ ] Vérifier que la pastille du lendemain affiche correctement "Demain" en plus de la date — c'est cohérent et utile (cf. screenshot où "Dim. 10 Demain" s'affiche bien).

---

## UX-PRONOS-8 — Tests visuels de régression

Avant de merger :

- [ ] Capture d'écran avant/après côte à côte de la liste des pronos sur les viewports : iPhone SE, iPhone 14, iPhone 15 Pro Max.
- [ ] Vérifier que tous les matchs s'affichent correctement (pas de débordement, pas de troncature aberrante des noms d'équipes).
- [ ] Vérifier le comportement avec des cas limites :
  - équipe avec un nom très long (ex : "Borussia Mönchengladbach")
  - équipe sans logo (fallback)
  - match sans pronostic des autres joueurs (cas du "Premier à pronostiquer")
  - match avec pronostic déjà placé par l'utilisateur (les `?` deviennent les chiffres pronostiqués)
- [ ] Vérifier que le tap sur la carte ouvre toujours correctement la modale de pronostic existante (le sprint ne touche PAS à la modale).
- [ ] Vérifier l'accessibilité minimale : le contraste des éléments tertiaires (gris 60%) reste au-dessus du seuil WCAG AA (4.5:1) sur le fond sombre.

---

## UX-PRONOS-9 — Cohérence avec les autres écrans pronos

Les modifications apportées à la carte match de la liste des pronos doivent être cohérentes avec les autres écrans qui pourraient afficher des cartes similaires (résultats, détails ligue, classements).

- [ ] Lister tous les écrans qui affichent des cartes match similaires.
- [ ] Pour chaque écran, identifier si la même carte est utilisée (auquel cas le composant a été dupliqué en UX-PRONOS-1) ou une carte différente.
- [ ] **Ne pas refondre** ces autres écrans dans ce sprint, mais documenter dans le PR : "Écrans avec carte match similaire à harmoniser dans un sprint ultérieur : <liste>".

---

## Hors scope (à NE PAS faire dans ce sprint)

- ❌ Modifier la modale de pronostic qui s'ouvre au tap (sprint UX-PRONOS-MODALE séparé).
- ❌ Ajouter l'affichage du % de joueurs ayant misé sur chaque issue (à débattre, peut casser la diversité des pronos).
- ❌ Refondre les écrans Résultats, Classements, Mes Ligues.
- ❌ Modifier la logique métier (calcul des points, conditions de "premier à pronostiquer", etc.).
- ❌ Toucher au design des autres composants de l'app (header, bottom nav, etc.).

---

## Critères d'acceptation du sprint

Le sprint est considéré comme terminé quand :

1. Toutes les tâches UX-PRONOS-1 à UX-PRONOS-9 sont cochées.
2. Sur un iPhone 14 en orientation portrait, **4 cartes match sont visibles sans scroll** sur l'écran Pronos (avec header et bottom nav présents).
3. La hiérarchie visuelle est claire : un test du regard de 3 secondes sur la carte permet d'identifier instantanément les équipes et la zone de pronostic, le gain potentiel n'étant lu que dans un second temps.
4. Aucun label redondant ne subsiste ("pts si ✓", "5 DERNIERS").
5. La pastille du jour sélectionné affiche son numéro de date.
6. Aucune régression sur le tap → modale de pronostic.
7. Captures d'écran avant/après ajoutées au PR.
