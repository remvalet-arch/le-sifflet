# Sprint REFACTOR — Architecture des composants

> **Contexte produit** : trois composants critiques de VAR TIME ont dépassé les 800 lignes : `PronosticsHubClient.tsx` (1106L), `VotingModal.tsx` (892L), `ProfileClient.tsx` (843L). À cette taille, la maintenance devient lente, les régressions sont plus probables, et tout debug/itération coûte cher en concentration. Le risque concret avant la CDM : un bug critique dans un de ces fichiers, et tu passes 2h à comprendre où il est avant de le fixer en 5 minutes.
>
> **Pourquoi c'est important mais NON urgent** : ces composants fonctionnent. Le refactor n'apporte aucune feature nouvelle. C'est un investissement sur ta vélocité future. **Si tu manques de temps avant la CDM, ce sprint peut être reporté à août.** Mais une fois fait, tu maintiens 3 fichiers de 200-300 lignes au lieu de 3 fichiers de 1000+, et chaque modification ultérieure devient 3-5× plus rapide.
>
> **Périmètre** : extraire des sous-composants depuis les 3 gros fichiers, sans modifier le comportement. Le résultat doit être strictement identique côté utilisateur.

---

## REFACTOR-0 — Discipline du refactor sans régression

Ce sprint est risqué : on touche à du code qui marche. Les règles sont strictes.

- [ ] **Avant de commencer** : faire un commit de référence sur `main` avec un tag `pre-refactor-2026-05-XX`. Permet de revenir au comportement exact si on découvre une régression en CDM.
- [ ] **Chaque extraction = un commit séparé**, avec un message clair : "Extract `<NewComponent>` from `<OldFile>`".
- [ ] **Aucune modification fonctionnelle pendant l'extraction**. Si tu vois un bug, un dead code, une amélioration UX possible : note-le dans une issue séparée et continue. Mélanger refacto et fix = double risque.
- [ ] **Tester manuellement après chaque extraction** : le composant parent doit se comporter exactement comme avant. Si un état est passé en props, vérifier le flow complet (mount, update, unmount).
- [ ] **Ne pas traiter les 3 gros composants en parallèle**. Faire l'un, le tester en preview, le merger, puis attaquer le suivant. Sinon les conflits de merge deviennent ingérables.

---

## REFACTOR-1 — Découpage de `PronosticsHubClient.tsx` (1106 lignes)

D'après le TECH_BIBLE : "Mix score picker + scorer + date filter".

- [ ] Lire intégralement le fichier `src/components/<chemin>/PronosticsHubClient.tsx`.
- [ ] Identifier les **zones logiques distinctes** dans le composant. D'après l'audit, au moins 3 :
  1. **DateSlider / MatchFilterBar** : la barre du haut avec les pastilles de date (Mar. 5, Mer. 6, etc.) et les filtres de compétition (UCL, L1, BL).
  2. **ScorerAllocationEditor** : la partie qui gère l'allocation des buteurs (probablement ~300 lignes).
  3. **MatchListWithPronos** : la liste des matchs + cellules de pronostic (le sujet du sprint UX-PRONOS).
- [ ] Pour chaque zone, créer un nouveau fichier dans `src/components/pronos/` :
  - `src/components/pronos/DateSlider.tsx`
  - `src/components/pronos/MatchFilterBar.tsx`
  - `src/components/pronos/ScorerAllocationEditor.tsx`
  - `src/components/pronos/MatchList.tsx` (ou nom équivalent)
- [ ] Extraire chaque zone une par une, en passant les états et callbacks via props :

  ```tsx
  // Avant : tout dans PronosticsHubClient
  const [selectedDate, setSelectedDate] = useState(...);
  // ... 200 lignes de logique date
  return (
    <div>
      <div>{/* date slider inline */}</div>
      ...
    </div>
  );

  // Après
  const [selectedDate, setSelectedDate] = useState(...);
  return (
    <div>
      <DateSlider value={selectedDate} onChange={setSelectedDate} />
      ...
    </div>
  );
  ```

- [ ] **Cible** : `PronosticsHubClient.tsx` doit faire moins de 300 lignes après extraction. Il devient un orchestrateur qui gère l'état global et compose les sous-composants.
- [ ] **Tester** : naviguer sur `/pronos`, changer de date, changer de filtre compétition, allouer des buteurs, placer un pronostic. Tout doit marcher comme avant.

---

## REFACTOR-2 — Découpage de `VotingModal.tsx` (892 lignes)

D'après le TECH_BIBLE : "3 setIntervals, scroll lock manquant".

**Note importante** : le scroll lock est traité dans le sprint ARIA. Ne pas le faire ici. Ce sprint REFACTOR ne fait QUE de l'extraction.

- [ ] Lire `src/components/<chemin>/VotingModal.tsx`.
- [ ] Identifier les sous-zones :
  1. **VotingTimer** : le compteur 90s avec `role="timer"` et `aria-live`. C'est un composant indépendant (probablement 50-80 lignes).
  2. **VotingOptions** : la zone qui affiche les choix de pari (OUI / NON / autre selon le type de market).
  3. **VotingResults** : si la modale affiche aussi le résultat post-vote (% des autres joueurs, gains potentiels).
  4. **VotingHeader** : titre, type de market, équipes concernées.
- [ ] Créer dans `src/components/voting/` :
  - `src/components/voting/VotingTimer.tsx`
  - `src/components/voting/VotingOptions.tsx`
  - `src/components/voting/VotingResults.tsx`
  - `src/components/voting/VotingHeader.tsx`
- [ ] Extraire le timer en premier (le plus indépendant). Ses 3 setIntervals doivent rester dans ce composant ; bien les nettoyer dans le `useEffect` de cleanup.
- [ ] **Attention aux callbacks** : VotingModal a probablement beaucoup de logique métier (envoi du pari, MAJ du solde, etc.). Cette logique doit **rester dans VotingModal** ou être déplacée dans un hook custom (`useVotingMarket`), PAS dans les sous-composants visuels. Les sous-composants doivent être "dumb" (juste afficher et appeler un callback).
- [ ] **Cible** : `VotingModal.tsx` < 250 lignes. Devient un orchestrateur ARIA + state.

---

## REFACTOR-3 — Découpage de `ProfileClient.tsx` (843 lignes)

D'après le TECH_BIBLE : "Onglets profil/amis/badges/historique mélangés".

- [ ] Lire `src/components/<chemin>/ProfileClient.tsx`.
- [ ] Le découpage est presque évident car les onglets sont déjà des zones logiques séparées :
  1. **ProfileOverview** : header, avatar, niveau, XP bar.
  2. **ProfileFriends** : déjà extrait selon le TECH_BIBLE en `AmisContent` — vérifier l'état actuel.
  3. **ProfileBadges** : grille des badges débloqués + critères.
  4. **ProfileHistory** : historique des paris/résultats groupés par match.
- [ ] Vérifier d'abord si `AmisContent` est déjà dans un fichier séparé (le TECH_BIBLE suggère "déjà en fichier séparé, vérifier"). Si oui, ne pas refaire le travail.
- [ ] Créer/compléter dans `src/components/profile/` :
  - `src/components/profile/ProfileOverview.tsx`
  - `src/components/profile/ProfileBadges.tsx`
  - `src/components/profile/ProfileHistory.tsx`
- [ ] **Pattern recommandé** : `ProfileClient` reste l'orchestrateur qui gère l'onglet sélectionné et les données partagées (l'objet user complet). Chaque onglet reçoit la slice de données qui le concerne.
- [ ] **Cible** : `ProfileClient.tsx` < 200 lignes après extraction.

---

## REFACTOR-4 — Hooks custom pour la logique partagée

Pendant l'extraction, des morceaux de logique métier vont apparaître comme candidats à des hooks custom.

- [ ] Identifier les hooks candidats. Exemples typiques :
  - `useVotingMarket(marketId)` — toute la logique de récupération du market, du timer, du placement de pari.
  - `useUserBadges(userId)` — fetch + caching des badges d'un user.
  - `useMatchPronos(matchId)` — fetch + caching des pronos d'un match.
- [ ] **Ne pas créer un hook par convention** : seulement quand la logique est réutilisée par 2+ composants OU quand elle est complexe (> 30 lignes) et mérite l'isolation.
- [ ] Placer les hooks dans `src/hooks/` avec un nommage clair `useXxxYyy.ts`.
- [ ] Documenter brièvement chaque hook créé (1 ligne JSDoc qui dit ce qu'il fait et ce qu'il retourne).

---

## REFACTOR-5 — Vérification finale avec un test exhaustif

C'est le sprint le plus risqué. Le test final doit être exhaustif.

- [ ] Pour chaque composant refactoré, faire un test manuel de **tous les cas d'usage principaux** :
  - **PronosticsHubClient** : changer date, changer filtre compétition, scroller, allouer buteurs sur un match, placer pronostic, voir l'effet sur le solde Sifflets.
  - **VotingModal** : ouvrir une modale (provoquer un signalement VAR ou un market auto), vérifier le timer, voter OUI/NON, voir le résultat, fermer, ré-ouvrir un autre market.
  - **ProfileClient** : naviguer entre les 4 onglets, vérifier que les données s'affichent, vérifier que la navigation entre onglets ne déclenche pas de re-fetch inutile.
- [ ] **Test de non-régression sur les classements et les Sifflets** : placer 3-4 paris, faire résoudre un match (en environnement de test), vérifier que les points et Sifflets sont correctement crédités. C'est le bout du tuyau le plus critique pour le produit.
- [ ] Si Sentry ou un équivalent est branché en preview, vérifier qu'aucune nouvelle erreur n'apparaît après le refactor.

---

## REFACTOR-6 — Mise à jour de la documentation

Le TECH_BIBLE mentionne les tailles de ces composants. Il faut maintenir cette doc à jour.

- [ ] Mettre à jour la section "4.2 Composants Critiques" du TECH_BIBLE avec les nouvelles tailles.
- [ ] Ajouter une entrée dans le PROJECT_STATE notant la date du refactor et les fichiers extraits, pour que les futurs Claude Code aient le contexte.

---

## Hors scope

- ❌ Modifier le comportement utilisateur de quoi que ce soit. Ce sprint est strictement structurel.
- ❌ Optimiser les performances (memoization, useMemo, useCallback agressifs). Faire d'abord le refactor, puis observer si des perfs sont à optimiser.
- ❌ Réécrire la logique métier. Si une fonction est moche mais marche, on la déplace telle quelle.
- ❌ Refactor d'autres composants non listés (LiveRoom, MatchLobby, LeagueHub) — ils sont marqués OK dans l'audit.

---

## Critères d'acceptation

1. `PronosticsHubClient.tsx` < 300 lignes.
2. `VotingModal.tsx` < 250 lignes.
3. `ProfileClient.tsx` < 200 lignes.
4. Tous les sous-composants extraits sont dans `src/components/<feature>/`.
5. Aucune régression utilisateur observable (test manuel exhaustif réalisé).
6. Le TECH_BIBLE est à jour avec les nouvelles tailles.

---

## Pour Claude Code

- Branche : `refactor/components-architecture`.
- **Faire UN composant à la fois** : extraire PronosticsHubClient, tester, merger en preview, valider, puis attaquer VotingModal, etc. Ne PAS tout faire en une seule branche géante.
- Après chaque extraction, lancer `npm run build` (ou équivalent) pour vérifier que TypeScript ne casse pas. Les erreurs de typage sur les props sont fréquentes lors d'extractions.
- Si un sous-composant a besoin d'accéder à beaucoup d'état du parent (10+ props), c'est un signe que l'extraction est mal placée — soit l'état doit être déplacé dans le sous-composant, soit on garde le code dans le parent. Discuter le compromis dans le PR plutôt que de forcer.
- Si le refactor révèle un bug pré-existant (état mal initialisé, callback qui ferme sur une stale closure, etc.), **noter le bug en issue séparée** et garder le comportement existant à l'identique. La priorité ici est zéro régression.
