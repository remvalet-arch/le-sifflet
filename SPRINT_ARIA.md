# Sprint ARIA — Accessibilité critique

> **Contexte produit** : VAR TIME est une PWA mobile-first. Une partie des utilisateurs utilise des lecteurs d'écran (VoiceOver iOS, TalkBack Android) ou navigue au clavier. L'audit du TECH_BIBLE révèle que VotingModal est exemplaire (role, aria-modal, focus trap, aria-live) mais que **ActionDrawer et AlertDrawer n'ont aucun attribut ARIA**, ce qui rend ces deux composants invisibles aux lecteurs d'écran. Le scroll lock body est aussi manquant sur les modales, ce qui crée un bug ennuyeux : sur iOS, scroller dans une modale fait scroller le body en arrière-plan.
>
> **Pourquoi c'est urgent avant la CDM** :
>
> 1. **Accessibilité** : c'est non négociable pour une app moderne. Si un user malvoyant ne peut pas placer un pari VAR pendant un match, c'est un bug bloquant.
> 2. **App Store** : si tu vises iOS App Store via Capacitor plus tard, Apple regarde de près l'accessibilité. Mieux vaut anticiper.
> 3. **UX iOS** : le scroll lock manquant crée un bug visuel sur les modales (background qui glisse) très perceptible.
> 4. **C'est rapide** : 4-6 heures de travail max, pour un gros gain perçu.
>
> **Périmètre** : ajouter ARIA et scroll lock sur les drawers/modales identifiés dans l'audit. Aucune modification de logique métier.

---

## ARIA-1 — Audit du pattern existant (VotingModal)

VotingModal est marqué "Excellent" dans l'audit. C'est notre référence à reproduire sur les autres composants.

- [ ] Lire `src/components/<chemin>/VotingModal.tsx`.
- [ ] Identifier précisément les éléments ARIA en place :
  - `role="dialog"` ou `role="alertdialog"` ?
  - `aria-modal="true"` ?
  - `aria-labelledby="<id>"` qui pointe vers le titre du dialog ?
  - `aria-describedby="<id>"` qui pointe vers la description ?
  - Focus trap (probablement via une lib comme `focus-trap-react` ou un useEffect custom) ?
  - `role="timer"` + `aria-live` sur le compteur 90s ?
- [ ] Documenter le pattern dans le PR : "Pattern de référence VotingModal : `<liste des attributs et techniques>`."
- [ ] Vérifier si VotingModal a déjà le scroll lock body. Le TECH_BIBLE dit que non. Si confirmé, ce sera traité en ARIA-5.

---

## ARIA-2 — Mise à niveau d'ActionDrawer

Composant : `src/components/<chemin>/ActionDrawer.tsx` (à localiser).

- [ ] Identifier le rôle fonctionnel d'ActionDrawer (drawer qui s'ouvre par le bas pour proposer des actions sur un match ? sur un user ? autre ?).
- [ ] Ajouter les attributs ARIA suivants sur le conteneur racine du drawer :
  ```tsx
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="action-drawer-title"
    aria-describedby="action-drawer-description" // optionnel si pas de description
  >
    <h2 id="action-drawer-title">{title}</h2>
    {/* ... */}
  </div>
  ```
- [ ] Si le drawer n'a pas de titre `<h2>` actuellement, **en ajouter un** (visuellement caché si nécessaire avec une classe `sr-only`) qui décrit la fonction du drawer. Exemple : "Actions sur ce match".
- [ ] Implémenter le focus trap : quand le drawer s'ouvre, le focus part sur le premier élément focusable du drawer (souvent le bouton de fermeture). Tab doit cycler à l'intérieur du drawer. Échap doit fermer.
- [ ] Si le projet n'a pas déjà de helper focus trap, **réutiliser celui de VotingModal**. Ne pas réinventer la roue.
- [ ] À la fermeture du drawer, **rendre le focus à l'élément qui l'avait avant ouverture** (UX standard pour les modales).
- [ ] Tester avec VoiceOver (iOS) ou en émulation : à l'ouverture, le titre doit être annoncé, et la navigation rotor doit rester confinée au drawer.

---

## ARIA-3 — Mise à niveau d'AlertDrawer

Composant : `src/components/<chemin>/AlertDrawer.tsx`.

- [ ] Même pattern qu'ActionDrawer (ARIA-2).
- [ ] **Cas particulier AlertDrawer** : il sert probablement à signaler une action VAR (cf. mention `AlertDrawer` dans le contexte produit). Si c'est une notification d'action urgente, considérer `role="alertdialog"` au lieu de `role="dialog"` :
  - `alertdialog` = signale au lecteur d'écran qu'il faut interrompre et lire immédiatement
  - `dialog` = standard, s'insère dans la lecture normale
- [ ] Si le contenu d'AlertDrawer change dynamiquement (ex: countdown qui se met à jour), envelopper la zone qui change avec `aria-live="polite"` (ou `assertive` si vraiment urgent).
- [ ] Mêmes étapes focus trap + Échap + restauration du focus.

---

## ARIA-4 — Correction de ProfileEditModal

L'audit indique : "`aria-labelledby` manquant" sur ProfileEditModal.

- [ ] Localiser `src/components/<chemin>/ProfileEditModal.tsx`.
- [ ] Vérifier si le composant a déjà `role="dialog"` et `aria-modal`. Si oui, juste ajouter `aria-labelledby="profile-edit-title"` et donner cet id au `<h2>` du modal.
- [ ] Si le composant n'a aucun ARIA, faire la mise à niveau complète comme pour ActionDrawer (ARIA-2).

---

## ARIA-5 — Scroll lock body sur ouverture de modales

Le TECH_BIBLE indique que le scroll lock body est manquant sur **VotingModal**, **ActionDrawer**, et probablement **ProfileEditModal**.

- [ ] Créer un hook réutilisable `src/hooks/useScrollLock.ts` :

  ```typescript
  import { useEffect } from "react";

  export function useScrollLock(isLocked: boolean) {
    useEffect(() => {
      if (!isLocked) return;

      const originalOverflow = document.body.style.overflow;
      const originalPaddingRight = document.body.style.paddingRight;
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;

      document.body.style.overflow = "hidden";
      // Compense la disparition du scrollbar pour éviter un layout shift sur desktop
      document.body.style.paddingRight = `${scrollbarWidth}px`;

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
      };
    }, [isLocked]);
  }
  ```

- [ ] **Cas spécial iOS Safari** : `overflow: hidden` sur body ne suffit pas toujours sur iOS. Ajouter aussi `position: fixed` + `top: -<scrollY>px` pour bloquer fermement, et restaurer le scrollY à la fermeture. Si tu préfères une lib établie, `body-scroll-lock` règle ces edge cases mais ajoute une dépendance.
- [ ] Brancher le hook dans VotingModal, ActionDrawer, AlertDrawer, ProfileEditModal :
  ```tsx
  function VotingModal({ isOpen, ... }) {
    useScrollLock(isOpen);
    // ...
  }
  ```
- [ ] Tester sur un vrai iPhone (ou émulation iOS Safari) : ouvrir une modale, essayer de scroller le contenu derrière. Le body NE doit PAS bouger.

---

## ARIA-6 — Vérification du contraste texte secondaire

L'audit signale `text-zinc-500` sur `bg-zinc-900` à un ratio de ~4:1, qui est à la limite WCAG AA (qui exige ≥ 4.5:1 pour le texte normal).

- [ ] Lister les utilisations de `text-zinc-500` dans le code (`grep -rn "text-zinc-500" src/`).
- [ ] Pour chaque occurrence sur fond `zinc-900` ou `zinc-950`, **remplacer par `text-zinc-400`** qui a un meilleur contraste (~5.5:1).
- [ ] **Exceptions acceptables** : labels purement décoratifs ou texte > 18px (qui a un seuil WCAG plus bas, 3:1).
- [ ] **Ne PAS toucher au design system global** dans ce sprint — juste corriger les cas où le texte fonctionnel (lisibilité importante) utilise zinc-500. Si le doute s'installe, choisir zinc-400 (gain accessibilité, perte esthétique négligeable).
- [ ] Vérifier visuellement après changement que ça ne casse pas l'équilibre des écrans.

---

## ARIA-7 — Labels associés aux inputs

L'audit mentionne "29+ inputs de formulaire sans `<label>` associé".

- [ ] Faire un grep des `<input>`, `<select>`, `<textarea>` dans `src/`.
- [ ] Pour chaque input, vérifier qu'il a soit :
  - Un `<label htmlFor="<id>">` explicite, ou
  - Un attribut `aria-label="<texte descriptif>"`, ou
  - Un attribut `aria-labelledby="<id>"` qui pointe vers un élément voisin.
- [ ] Si aucun des trois : ajouter `aria-label` (le plus simple si le label visuel n'existe pas dans le design).
- [ ] **Cas fréquent** : les inputs de score dans les pronostics (les `?`). Ajouter `aria-label="Score équipe domicile"` et `aria-label="Score équipe extérieur"`.
- [ ] **Cas fréquent** : les barres de recherche. Ajouter `aria-label="Rechercher un utilisateur"` ou équivalent.
- [ ] Ce sous-sprint peut être traité en bulk avec un seul commit "ARIA: add labels to form inputs" qui touche beaucoup de fichiers en surface.

---

## ARIA-8 — Tests d'accessibilité

Avant de merger, vérifier que les améliorations sont effectives.

- [ ] **Lighthouse Accessibility audit** : lancer sur les pages clés (lobby, match, profile, shop). Cibler un score ≥ 95.
- [ ] **Test au clavier** : naviguer toute l'app uniquement au clavier (Tab, Shift+Tab, Entrée, Échap). Vérifier :
  - Tous les éléments interactifs sont atteignables.
  - Focus visible sur l'élément actif (ring Tailwind ou équivalent).
  - Échap ferme bien les modales.
  - Tab ne sort pas d'une modale ouverte.
- [ ] **Test VoiceOver iOS** ou TalkBack Android, si tu as un device :
  - Ouvrir une modale → le titre est annoncé.
  - Naviguer dans la modale → les boutons et inputs sont annoncés correctement.
  - Fermer → focus rendu à l'élément initial.
- [ ] Captures d'écran Lighthouse avant/après dans le PR.

---

## Hors scope

- ❌ Refonte du focus visible global (ring de focus custom). Si Tailwind a `focus:ring-2 focus:ring-whistle` partout, c'est déjà bien.
- ❌ Internationalisation des `aria-label` — ils peuvent rester en français pour l'instant (c'est cohérent avec l'app).
- ❌ Tests automatisés d'accessibilité (axe-core, jest-axe) — sprint séparé si nécessaire.
- ❌ Audit complet WCAG niveau AAA — on vise AA, qui est le standard.

---

## Critères d'acceptation

1. ActionDrawer, AlertDrawer, ProfileEditModal ont un pattern ARIA équivalent à VotingModal.
2. Hook `useScrollLock` créé et branché sur les 4 modales/drawers.
3. Scroll lock fonctionne sur iOS Safari (vérifié sur device ou émulation correcte).
4. Contraste texte secondaire corrigé (zinc-500 → zinc-400 sur les cas critiques).
5. Tous les inputs ont un label (visible ou aria-label).
6. Lighthouse Accessibility ≥ 95 sur les pages clés.
7. Navigation clavier complète possible sans souris.
