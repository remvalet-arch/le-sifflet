# SPRINT.md — VAR TIME · Correctifs & Améliorations

> Généré le 11/05/2026 · Audits desktop (1062px) + mobile (390×844 — iPhone 14)
> Priorités : 🔴 Critique · 🟠 Majeur · 🟡 Mineur
> Effort : S = <1h · M = demi-journée · L = 1-2j · XL = 1 semaine+

---

## SPRINT A — Navigation & Headers

> Objectif : une seule flèche, un seul titre, une convention claire.

### A-1 · Double flèche `← ← PAGE` sur toutes les pages secondaires 🔴 · S

**Problème :** Le composant BackButton rend simultanément une icône SVG `ArrowLeft`
ET un `<span>` dont le texte commence par le caractère Unicode `←`.
Résultat visuel : `← ← STADE`, `← ← PARAMÈTRES`, etc. sur toutes les pages.

**Pages impactées :** Boutique, Classement, Paramètres, Notifications,
Match, Ligue détail, Conversation — toutes les pages avec topbar de retour.

**Fix :** Supprimer le caractère `←` du texte du span. L'icône SVG suffit.

```tsx
// ❌ Avant
<a aria-label="← Stade" href="/lobby">
  <ArrowLeftIcon className="h-4 w-4" aria-hidden />
  <span>← Stade</span>
</a>

// ✅ Après
<a aria-label="Retour vers Stade" href="/lobby">
  <ArrowLeftIcon className="h-4 w-4" aria-hidden />
  <span>Stade</span>
</a>
```

Correction dans le composant partagé → propagation automatique partout.

---

### A-2 · Boutique — double titre + double bouton retour 🔴 · S

**Problème :** La Boutique affiche deux niveaux simultanément :

- Topbar : `← Stade` (gauche) + `BOUTIQUE` (centre)
- Header in-page : `< 🛍️ Boutique` + solde 🪙 (redondant)

**Fix :** Supprimer le header in-page. Déplacer le solde dans la topbar.

```tsx
// TopBar Boutique
<TopBar back="/lobby" title="BOUTIQUE" right={<SiffletBalance />} />
// Supprimer le <PageHeader> interne
```

---

### A-3 · Pages primaires — double niveau de titre 🟠 · S

**Problème :** Les pages de la bottom nav (Ligues, Pronos) affichent
un titre dans la topbar ET un H1 dans la page.

- `/ligues` : topbar `MES LIGUES` + H1 `LIGUES`
- `/pronos` : topbar `MES PRONOS` + H1 `PRONOS 7 prochains jours`

**Fix — Convention à adopter :**

| Type de page                  | Pattern                                |
| ----------------------------- | -------------------------------------- |
| Page primaire (bottom nav)    | Pas de topbar — H1 in-page uniquement  |
| Page secondaire (avec retour) | TopBar `← titre` — pas de H1 redondant |

---

### A-4 · `← STADE` hardcodé — retour contextuel manquant 🟡 · S

**Problème :** Le bouton retour pointe toujours vers `/lobby` (Stade),
même quand la page a été ouverte depuis Paramètres, une Ligue, etc.

**Fix :** Remplacer le lien statique par `router.back()`.

```tsx
// Avant
<TopBar backHref="/lobby" backLabel="Stade" />

// Après
<TopBar onBack={() => router.back()} backLabel={previousPageTitle} />
```

---

### A-5 · Messages — titre d'en-tête figé "MESSAGES" 🟠 · S

**Problème :** L'en-tête de conversation affiche "MESSAGES" au lieu
du nom du contact.

**Fix :**

```tsx
// Avant
<TopBar title="MESSAGES" />
// Après
<TopBar title={conversation?.participant?.username ?? "Messages"} />
```

---

## SPRINT B — Débordements & Troncatures mobiles

> Objectif : zéro contenu coupé ou hors écran sur 390px.

### B-1 · Profile — 3/5 onglets invisibles sur mobile 🔴 · S

**Problème :** Sur 390px, seuls Profil et Historique sont visibles.
Badges commence à 396px, Amis à 486px, Stats à 582px — hors écran
sans indicateur de scroll.

**Fix :**

```css
.profile-tabs {
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
}
.profile-tabs-wrapper {
  position: relative;
}
.profile-tabs-wrapper::after {
  content: "";
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 32px;
  background: linear-gradient(to right, transparent, var(--bg-surface));
  pointer-events: none;
}
```

---

### B-2 · Boutique — onglets sans indicateur de scroll 🟠 · S

**Problème :** Les onglets Avatars / Bordures / Effets / Boosters / Mes items
débordent sur mobile sans gradient ni flèche indicatrice.

**Fix :** Même pattern CSS que B-1 appliqué à `.shop-tabs`.

---

### B-3 · Lobby — pills de filtres sans gradient 🟠 · S

**Problème :** Les filtres (DIRECT / LIGUE1 / PL / LALIGA…) scrollent
horizontalement sans fade latéral droit. L'utilisateur ne perçoit pas
qu'il y a d'autres filtres disponibles.

**Fix :**

```css
.lobby-filters-wrapper {
  position: relative;
}
.lobby-filters-wrapper::after {
  content: "";
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 40px;
  background: linear-gradient(to right, transparent, var(--bg-base));
  pointer-events: none;
}
```

---

### B-4 · VAR bet slider — zone de touch trop petite 🟠 · S

**Problème :** Le track du slider de mise VAR fait ~4px de hauteur.
Cible de touch insuffisante sur mobile (WCAG recommande 44×44px min).

**Fix :**

```css
.var-bet-slider input[type="range"] {
  height: 44px;
}
.var-bet-slider input[type="range"]::-webkit-slider-runnable-track {
  height: 6px;
}
.var-bet-slider input[type="range"]::-webkit-slider-thumb {
  width: 28px;
  height: 28px;
}
```

---

## SPRINT D — Surcharge d'information

### D-1 · Onglet Stats visible pre-match 🟡 · S

**Problème :** L'onglet Stats est affiché avant le match mais ne contient
rien. Crée une attente déçue.

**Fix (rapide) :** Masquer l'onglet si `match.status === 'scheduled'`. // probablemen "live" plutôt.

```tsx
{
  match.status !== "scheduled" && <Tab>Stats</Tab>;
}
```

**Fix (enrichi) :** Afficher forme récente + head-to-head -> Récupération via API Football

---

### D-2 · Paramètres notifications — liste sans groupage 🟡 · S

**Problème :** ~8 toggles d'affilée sans séparateur visuel.
Difficile à scanner.

**Fix — 2 sections :**

- **Activité sociale** : Demande d'ami, Messages privés, Commentaires KOP
- **Jeu** : Résultats matchs, Rappels pronos, Récompenses Boutique, Alertes VAR

---

### D-3 · KOP Vestiaire — densité pronos 🟡 · M

**Problème :** Chaque prono empile auteur + score + timestamp sur 3 lignes.
Sur mobile avec 10+ pronos : mur de texte.

**Fix :** Layout compact 1 ligne :
`[Avatar 24px] [pseudo bold] · [score accent] ····· [⏱ muted]`

Afficher max 20 pronos + bouton "Voir tous".

## SPRINT E — Mobile UX

### E-1 · Messages — safe area padding manquant 🟠 · S

**Problème :** Sur iPhone avec Home Indicator, l'input de message et
le bas du fil de conversation passent sous la barre système.

**Fix :**

```css
.messages-input-bar {
  padding-bottom: max(12px, env(safe-area-inset-bottom));
}
.messages-thread {
  padding-bottom: calc(64px + env(safe-area-inset-bottom));
}
```

---

### E-2 · Post-prono — double feedback simultané 🟡 · S

**Problème :** Après validation d'un prono, le toast de confirmation ET
la modale de permission notifications apparaissent en même temps.

**Fix :** Séquencer :

```tsx
// Toast d'abord, modale après disparition
setTimeout(() => {
  if (!notificationPermissionAsked) showNotificationPrompt();
}, 2000);
```

---

### E-3 · Bottom nav — indicateur d'onglet actif peu visible 🟡 · S

**Problème :** L'onglet actif est signalé uniquement par la couleur de
l'icône. Faible contraste en plein soleil ou sur écrans ternes.

**Fix :** Ajouter un trait en haut de l'item actif :

```css
.bottom-nav-item.active::after {
  content: "";
  position: absolute;
  top: 0;
  left: 20%;
  right: 20%;
  height: 2px;
  background: var(--color-whistle);
  border-radius: 0 0 2px 2px;
}
```

---

### E-4 · Boutique Mes items — empty state sans CTA 🟡 · S

**Problème :** L'onglet "Mes items" vide n'a aucun lien vers la boutique.
L'utilisateur est bloqué.

**Fix :**

```tsx
<EmptyState
  icon="🛍️"
  title="Tu n'as encore rien acheté"
  description="Découvre les avatars, effets et titres disponibles"
  cta={
    <Button variant="secondary" href="/shop?tab=avatars">
      Voir la boutique
    </Button>
  }
/>
```

---

---

## SPRINT 6 — Partage de ligue

> Durée estimée : 3-4 jours · Priorité : 🟠 Majeur

### Objectif

Permettre à un membre d'inviter des amis dans sa ligue privée via un lien,
un code ou un QR code, sans passer par le back-office.

### User stories

- En tant que membre d'une ligue, je veux partager un lien d'invitation
  pour que mes amis rejoignent directement ma ligue sans chercher un code.
- En tant qu'invité, je veux cliquer sur un lien et atterrir directement
  sur la page de confirmation d'adhésion, connecté ou non.
- En tant que créateur, je veux voir combien de fois mon lien a été utilisé.

### Tâches techniques

**Back-end**

- [ ] Table `league_invites` : `id`, `league_id`, `code` (uuid court 6 chars),
      `created_by`, `created_at`, `expires_at` (nullable), `uses`, `max_uses` (nullable)
- [ ] `GET /api/leagues/join/[code]` → retourne les infos de la ligue (nom, membres,
      emoji) sans auth requise
- [ ] `POST /api/leagues/join/[code]` → ajoute l'utilisateur connecté à la ligue,
      retourne erreur si déjà membre / ligue pleine / lien expiré
- [ ] Génération auto d'un code à la création de ligue (réutiliser le code existant
      visible dans les cartes ligue)
- [ ] Régénération manuelle du code possible par le créateur (invalide l'ancien)

**Front-end**

- [ ] Bouton **Inviter** dans la page détail d'une ligue (visible pour tous les membres)
- [ ] Bottom sheet d'invitation avec 3 options :
  - Copier le lien (`https://vartime.app/ligues/join/[code]`)
  - Copier le code seul (ex: `F9DQXT`)
  - Afficher le QR code (librairie `qrcode.react`)
- [ ] Page `/ligues/join/[code]` :
  - Affiche nom de la ligue, emoji, nb membres, créateur
  - Bouton **Rejoindre** si connecté
  - Redirect vers login + retour automatique si non connecté
  - Message d'erreur si lien invalide / expiré / déjà membre
- [ ] Deep link PWA : `manifest.json` `start_url` + gestion `scope`
      pour que le lien ouvre l'app si installée
- [ ] Toast de confirmation à l'arrivée dans la ligue : "Bienvenue dans [nom] 🎉"

### Critères d'acceptation

- [ ] Un lien partagé depuis iPhone ouvre l'app PWA si installée,
      le navigateur sinon
- [ ] Un utilisateur non connecté est redirigé vers login puis
      revient automatiquement sur la page de la ligue
- [ ] Un lien déjà utilisé par le même utilisateur affiche "Tu es déjà membre"
- [ ] Le QR code est lisible et fonctionnel depuis un autre téléphone
- [ ] Le code existant visible sur les cartes ligue est le même que celui partageable

### Edge cases

- Ligue pleine → message "Cette ligue est complète"
- Lien expiré → message "Ce lien d'invitation a expiré"
- Utilisateur banni de la ligue → accès refusé silencieux
- Partage depuis une ligue dont on n'est pas créateur → possible (tout membre peut inviter)

---

## SPRINT 10 — Accessibilité WCAG AA

> Durée estimée : 4-5 jours · Priorité : 🟠 Majeur

### Objectif

Atteindre la conformité WCAG 2.1 niveau AA sur l'ensemble de l'application,
en priorité sur les flux critiques (pari VAR, prono, navigation).

### User stories

- En tant qu'utilisateur naviguant au clavier, je veux pouvoir accéder
  à toutes les fonctionnalités sans souris.
- En tant qu'utilisateur malvoyant avec lecteur d'écran, je veux que
  tous les boutons et icônes soient correctement nommés.
- En tant qu'utilisateur avec une sensibilité aux contrastes, je veux
  que tous les textes soient lisibles sur leurs fonds respectifs.

### Tâches techniques

**Contraste**

- [ ] Auditer tous les tokens de couleur avec `axe-core` ou `color.review`
- [ ] Texte normal : ratio ≥ 4.5:1 · Texte large (18px+) : ratio ≥ 3:1
- [ ] Cas identifiés à corriger :
  - Labels gris sur fond sombre (`text-zinc-400` sur `bg-zinc-900`) → vérifier
  - Badges de statut (PERDU, EN ATTENTE) → vérifier fond/texte
  - Pills de filtres non-sélectionnées
  - Score "Prono : x-x" en gris sur carte match

**Focus visible**

- [ ] Ajouter `focus-visible:ring-2 focus-visible:ring-[var(--color-whistle)]`
      sur tous les éléments interactifs (boutons, liens, inputs, toggles)
- [ ] Supprimer les `outline: none` sans remplacement
- [ ] Tester la navigation Tab sur : bottom nav → filtres → cards → modales

**Labels & ARIA**

- [ ] `aria-label` sur tous les boutons icône sans texte :
  - Bouton VAR (center bottom nav)
  - Bouton cloche (notifications)
  - Bouton message
  - Bouton hamburger
  - Boutons `×` de fermeture des modales et bottom sheets
  - Bouton copier le code ligue
- [ ] `aria-live="polite"` sur les toasts et feedbacks dynamiques
- [ ] `aria-expanded` sur le menu hamburger et les accordéons
- [ ] `role="dialog"` + `aria-modal="true"` + `aria-labelledby` sur toutes les modales
- [ ] `alt` sur toutes les images (logos clubs, avatars)

**Navigation clavier**

- [ ] Piège de focus (`focus trap`) dans toutes les modales et bottom sheets :
      Tab doit cycler à l'intérieur, Échap doit fermer
- [ ] Ordre de lecture logique (vérifier `tabindex` parasites)
- [ ] Raccourci Échap pour fermer bottom sheet VAR, wizard ligue, modales

**Formulaires**

- [ ] `<label>` explicites ou `aria-label` sur tous les inputs (score prono,
      pseudo, code ligue, mise VAR)
- [ ] Messages d'erreur associés via `aria-describedby`

**Mouvement & animation**

- [ ] Respecter `prefers-reduced-motion` : désactiver/réduire les animations
      de confetti, pulse, transitions si activé

### Critères d'acceptation

- [ ] Score axe-core ≥ 0 violation critique sur les 5 pages principales
- [ ] Navigation complète au clavier possible sur le flux pari VAR
- [ ] VoiceOver iOS lit correctement le bouton VAR, les scores, les toasts
- [ ] Tous les ratios de contraste ≥ 4.5:1 (vérifiable avec Colour Contrast Analyser)
- [ ] `prefers-reduced-motion` désactive les animations de gamification

---

## SPRINT 11 — Messagerie enrichie

> Durée estimée : 6-8 jours · Priorité : 🟡 Mineur

### Objectif

Passer la messagerie d'un chat texte basique à une expérience sociale
complète avec présence, réactions et médias légers.

### User stories

- En tant qu'utilisateur, je veux voir si mon contact est en ligne
  pour savoir s'il peut me répondre rapidement.
- En tant qu'utilisateur, je veux voir si mon message a été lu.
- En tant qu'utilisateur, je veux réagir à un message avec un emoji
  sans écrire une réponse complète.
- En tant qu'utilisateur, je veux envoyer un GIF ou une image dans
  la conversation pour rendre les échanges plus vivants.
- En tant qu'utilisateur, je veux recevoir une notification push
  quand j'ai un nouveau message privé, même si l'app est en arrière-plan.

### Tâches techniques

**Présence & statut de lecture**

- [ ] Champ `last_seen_at` sur le profil utilisateur (mis à jour à chaque action)
- [ ] Indicateur en ligne : point vert sur avatar si `last_seen_at < 5 min`
- [ ] Statut de lecture : timestamp `read_at` par message + par destinataire
- [ ] Affichage "Vu" sous le dernier message lu (à droite, style iMessage)
- [ ] Double coche ou indicateur visuel discret (ne pas copier WhatsApp)

**Réactions**

- [ ] Long press (mobile) ou hover + bouton (desktop) sur un message
      → picker d'emojis réduit (6 emojis fixes : 👍 ❤️ 😂 😮 🔥 👎)
- [ ] Affichage des réactions sous le message : `[emoji] [count]`
- [ ] Un utilisateur peut retirer sa réaction en rappuyant
- [ ] Pas de réaction sur ses propres messages (optionnel, à décider)
- [ ] Stockage : table `message_reactions` (`message_id`, `user_id`, `emoji`)

**Envoi de médias**

- [ ] Bouton `+` dans l'input bar → menu : Image / GIF
- [ ] **Image** : upload via file picker → resize côté client (max 800px,
      compression JPEG 80%) → stockage Supabase Storage → URL dans le message
- [ ] **GIF** : intégration Tenor API (gratuit) → search inline → envoi URL
- [ ] Affichage inline dans la bulle de message (ratio préservé, max 240px wide)
- [ ] Tap sur image → plein écran avec fermeture par swipe down
- [ ] Pas de vidéo dans ce sprint

**Notifications push messages privés**

- [ ] Service Worker : écoute les événements `new_message` via Supabase Realtime
- [ ] Notification push avec : avatar expéditeur, prévisualisation 60 chars, action "Répondre"
- [ ] Regroupement : max 1 notif par conversation (pas de spam si 5 messages d'affilée)
- [ ] Respect du toggle "Messages privés" dans /settings/notifications
- [ ] Notification silencieuse si l'utilisateur est déjà dans la conversation

**UX & polish**

- [ ] Correction header : afficher le nom du contact (cf. A-5 SPRINT A)
- [ ] Indicateur de frappe "..." animé (via Realtime)
- [ ] Swipe gauche sur un message → citer/répondre
- [ ] Pagination messages (charger 30 à la fois, scroll to load more)

### Critères d'acceptation

- [ ] L'indicateur "en ligne" se met à jour en moins de 30 secondes
- [ ] Le statut "Vu" apparaît dans les 2 secondes après ouverture du message
- [ ] Une réaction s'affiche en temps réel pour les deux participants
- [ ] Une image envoyée s'affiche en moins de 3 secondes sur 4G
- [ ] La notification push arrive avec prévisualisation sur iOS et Android
- [ ] Le GIF s'affiche inline sans dépasser la largeur de la bulle

### Edge cases

- Message supprimé avec réactions → afficher "[Message supprimé]", conserver réactions
- Image trop lourde (>10MB) → message d'erreur "Image trop lourde (max 5MB)"
- Pas de connexion → message en attente (icône horloge), renvoi auto à la reconnexion
- Contact bloqué → aucune notification, messages non affichés

---

## SPRINT 12 — Onboarding interactif & Mode clair

> Durée estimée : 8-10 jours · Priorité : 🟡 Mineur
> Note : tokens CSS du mode clair déjà définis (Sprint 4). Travail restant : application.

### Objectif

Remplacer le wizard statique actuel par un onboarding gamifié qui met
l'utilisateur en situation réelle, et livrer un mode clair complet et
soigné utilisable dès le premier lancement.

### User stories

- En tant que nouvel utilisateur, je veux comprendre comment fonctionne
  un pari VAR avant de voir mon premier vrai match.
- En tant que nouvel utilisateur, je veux faire mon premier prono guidé
  pour comprendre le système de points.
- En tant qu'utilisateur, je veux choisir entre le thème sombre et clair
  selon mes préférences, et pouvoir en changer à tout moment.
- En tant qu'utilisateur sur iOS, je veux que le thème suive
  automatiquement le mode système si je n'ai pas fait de choix manuel.

### Tâches techniques

**Onboarding interactif**

- [ ] Déclenchement : à la première connexion (`user.onboarding_completed === false`)
- [ ] Possibilité de passer (skip) à tout moment avec confirmation
- [ ] Progression sauvegardée : si l'utilisateur ferme et revient,
      reprendre à l'étape en cours
- [ ] Bouton "Revoir l'intro" dans Paramètres qui reset et relance le wizard

Étape 1 — Bienvenue (écran plein)

- [ ] Animation d'entrée : logo VAR TIME + tagline
- [ ] Texte d'accroche court (2 phrases max)
- [ ] CTA : "C'est parti →"

Étape 2 — Simulation pari VAR

- [ ] Faux match en direct avec timer qui décompte (ex: "Mbappé touche le ballon de la main ?")
- [ ] L'utilisateur voit la bottom sheet VAR exactement comme en vrai
- [ ] Il peut cliquer OUI ou NON avec une fausse mise (sifflets fictifs)
- [ ] Résultat immédiat simulé : "Tu as gagné ! +200 🪙" ou "Raté ! Mais t'as compris le principe."
- [ ] Explication des règles en overlay après le résultat (2-3 bullet points max)

Étape 3 — Premier prono guidé

- [ ] Un vrai match à venir (ou fictif si aucun match proche)
- [ ] Highlight sur les inputs de score avec tooltip "Entre ton score prédit ici"
- [ ] Validation du prono → confettis + "Premier prono enregistré ! 🎉"

Étape 4 — Choix du thème

- [ ] 2 cartes côte à côte : Mode sombre / Mode clair avec prévisualisation
- [ ] Option "Suivre le système"
- [ ] Sélection → transition douce vers le thème choisi
- [ ] Ce choix est modifiable dans Paramètres → Apparence

Étape 5 — Notifications

- [ ] Reproduire l'écran de prompt natif iOS/Android AVANT le vrai prompt système
      (explication de pourquoi : "Pour recevoir les alertes VAR en direct")
- [ ] Si refus → accepter sans friction, noter le refus, re-proposer après J+7

Finalisation

- [ ] `user.onboarding_completed = true` en base
- [ ] Redirect vers `/lobby` avec le premier match mis en évidence

**Mode clair**

- [ ] Audit de tous les composants : vérifier qu'aucun n'a de couleur hardcodée
      (`bg-zinc-950`, `text-white`, etc.) en dehors des tokens
- [ ] Remplacer toute couleur hardcodée par le token correspondant :
  - `bg-zinc-950` → `var(--bg-base)`
  - `text-white` → `var(--text-primary)`
  - `border-white/10` → `var(--border-subtle)`
  - etc.
- [ ] Définir les valeurs light des tokens (si pas encore fait) :

```css
[data-theme="light"] {
  --bg-base: #f5f5f5;
  --bg-surface: #ffffff;
  --text-primary: #111111;
  --text-muted: #666666;
  --border-subtle: rgba(0, 0, 0, 0.08);
  /* conserver --color-whistle en jaune/or (identité de marque) */
}
```

- [ ] Cas particuliers à traiter manuellement :
  - Carte match live (fond vert sombre → vert clair adapté)
  - Bottom sheet VAR (fond dramatique → adapter sans perdre l'émotion)
  - Badges XP (gradients → vérifier lisibilité sur fond clair)
  - Graphiques / barres de progression
- [ ] Toggle dans Paramètres → Apparence :

---

## Tableau de bord

| Ref | Titre                                   | Priorité | Effort |
| --- | --------------------------------------- | -------- | ------ |
| A-1 | Double flèche ← ← sur toutes les pages  | 🔴       | S      |
| A-2 | Boutique double titre + double retour   | 🔴       | S      |
| B-1 | Profile 3/5 onglets hors écran mobile   | 🔴       | S      |
| C-1 | Bouton VAR accessible à tous            | 🔴       | M      |
| A-3 | Pages primaires double niveau de titre  | 🟠       | S      |
| A-4 | Retour hardcodé vers Stade              | 🟠       | S      |
| A-5 | Messages header figé "MESSAGES"         | 🟠       | S      |
| B-2 | Boutique onglets overflow sans gradient | 🟠       | S      |
| B-3 | Lobby filtres overflow sans gradient    | 🟠       | S      |
| B-4 | VAR slider zone de touch trop petite    | 🟠       | S      |
| C-2 | Déclenchement VAR sans confirmation     | 🟠       | S      |
| E-1 | Messages safe area inset manquant       | 🟠       | S      |
| D-1 | Onglet Stats visible pre-match          | 🟡       | S      |
| D-2 | Settings notifications sans groupage    | 🟡       | S      |
| D-3 | KOP Vestiaire densité pronos            | 🟡       | M      |
| D-4 | Hamburger items redondants              | 🟡       | S      |
| E-2 | Post-prono double feedback              | 🟡       | S      |
| E-3 | Bottom nav indicateur actif             | 🟡       | S      |
| E-4 | Boutique Mes items empty state sans CTA | 🟡       | S      |
| F-1 | Sprint 6 — Partage ligue                | 🟠       | L      |
| F-2 | Sprint 10 — Accessibilité WCAG AA       | 🟠       | L      |
| F-3 | Sprint 11 — Messagerie enrichie         | 🟡       | XL     |
| F-4 | Sprint 12 — Onboarding + Mode clair     | 🟡       | XL     |

---

## Ordre d'exécution recommandé

**Semaine 1 — Critiques + quick wins S**
A-1, A-2, B-1, A-3, A-4, A-5, B-2, B-3, B-4, C-2, E-1

**Semaine 2 — Sécurité + polish**
