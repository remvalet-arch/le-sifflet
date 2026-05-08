---

### 🎨 Sprint L : LANDING V2 — "Vitrine prête pour la CDM 2026"

> **Contexte stratégique :** La landing actuelle a une vraie identité (hook "55%", ton MPG, mockup smartphone) mais souffre de 3 manques majeurs avant le 11 juin : (1) section "Application mobile" contradictoire avec faux boutons App Store qui peut déclencher un rejet Apple, (2) aucune mention de la CDM 2026 alors que c'est l'événement de lancement, (3) aucune preuve sociale ni FAQ. Ce sprint corrige ces 3 manques + crée une seconde landing `/discover` neutralisée pour les modérateurs Apple/Google et la presse mainstream.

- [ ] **L1 : Refonte de la section "Application mobile" (urgence anti-rejet)**
  - _Problème :_ Les boutons "App Store" et "Google Play" affichés comme actifs alors que l'app n'est pas disponible sur les stores → message contradictoire pour visiteur + risque de litige avec Apple sur le copyright des badges store.
  - _Action 1 :_ Dans `src/app/page.tsx`, supprimer entièrement les boutons App Store et Google Play. Les remplacer par une section "📱 INSTALLATION EN 1 CLIC" expliquant que VAR TIME est une PWA (Progressive Web App) installable sur smartphone via le navigateur.
  - _Action 2 :_ Conserver le QR code mais le rendre **fonctionnel** (génération dynamique pointant vers `https://vartime.app` ou ton domaine final). Plus de mention "Bientôt disponible" sur le QR.
  - _Action 3 :_ Sous le QR, ajouter un bloc "📩 Versions iOS et Android natives — septembre 2026" avec un input email + bouton "Me prévenir". Connecter ce formulaire à une nouvelle table `waitlist_subscribers` (`email TEXT UNIQUE`, `subscribed_at`, `source TEXT`). Migration `supabase/migrations/0082_waitlist.sql`.
  - _Action 4 :_ Créer la route API `POST /api/waitlist/subscribe` (anonyme, sans auth) qui valide l'email et insère dans la table. Envoyer un toast Sonner "On te prévient dès que c'est dispo 🎯".
  - _Action 5 :_ Plus tard (post-CDM), cette waitlist sera utilisée pour pousser une notif email au moment du lancement App Store → audience pré-chauffée gratuite.

- [ ] **L2 : Section "🏆 LA COUPE DU MONDE COMMENCE BIENTÔT" (positionnement événementiel)**
  - _Action 1 :_ Insérer une nouvelle section juste après le hero (avant "TON EXPERTISE AU KOP"), titre "🏆 LA COUPE DU MONDE COMMENCE BIENTÔT".
  - _Action 2 :_ Créer un composant `CdmCountdown.tsx` qui affiche un compte à rebours live (jours / heures / minutes) jusqu'au 11 juin 2026 22:00 Paris (coup d'envoi Mexique). Mise à jour côté client toutes les 60s.
  - _Action 3 :_ Sous le countdown, sous-titre fort : "VAR TIME est l'app de TES MATCHS pendant la CDM 2026. Pronos avant les matchs, paris VAR en direct, ligues entre potes."
  - _Action 4 :_ Bouton CTA "📲 Préviens tes potes" → utilise `navigator.share()` avec un message pré-formaté : "Salut ! Le 11 juin la CDM commence — j'ai trouvé une app super pour vivre les matchs ensemble : VAR TIME. On crée une ligue ? https://vartime.app"
  - _Action 5 :_ Après la fin de la CDM (post-19 juillet), cette section devra être désactivée automatiquement → ajouter une prop `endDate` au composant qui le masque si `now > endDate`.

- [ ] **L3 : Section "📸 EN ACTION" (preuve produit)**
  - _Action 1 :_ Insérer une nouvelle section au milieu de la landing (entre "Trois étapes jusqu'au braquage" et "Pas qu'un excité du direct"), titre "📸 EN ACTION — DANS L'APP DÈS MAINTENANT".
  - _Action 2 :_ Layout : 3 colonnes desktop / carousel mobile, avec 3 captures d'écran réelles de l'app (pas des mockups génériques) :
    - Capture 1 : VotingModal en plein pari VAR avec slider de mise + cotes parimutuel
    - Capture 2 : Live Room (onglet Kop) avec timeline événements + badge audience "👁️ X dans le stade"
    - Capture 3 : SquadLeaderboard avec classement Or/Argent/Bronze + chat actif
  - _Action 3 :_ Sous chaque capture, légende courte expliquant ce qu'on voit (ex: "Quand la VAR s'ouvre, tu mises en 90s contre la communauté").
  - _Action 4 :_ Les 3 captures doivent être versionnées dans `public/landing/screens/` et idéalement en deux résolutions (1x pour desktop, 2x pour Retina) au format webp pour la perf.

- [ ] **L4 : Section "❓ TOUT CE QUE TU TE DEMANDES" (FAQ)**
  - _Action 1 :_ Insérer une nouvelle section juste avant le footer, titre "❓ TOUT CE QUE TU TE DEMANDES".
  - _Action 2 :_ Composant `LandingFaq.tsx` avec accordéons (utiliser `details/summary` natif HTML pour la sobriété + accessibilité). 6 questions :
    1. **C'est vraiment gratuit ?** → "Oui, et le restera. Pas de pub, pas d'achat in-app. On finance plus tard via des partenariats avec des marques foot, jamais en te faisant payer."
    2. **Y a-t-il de l'argent réel ?** → "Non, jamais. Les Sifflets sont une monnaie virtuelle gagnée uniquement en jouant. Tu ne peux ni les acheter, ni les retirer, ni les échanger."
    3. **Comment ça marche pendant un match ?** → "Tu signales les actions litigieuses (penalty, carton, but refusé...) → si la communauté valide, un pari s'ouvre 90s → toi et les autres décidez du verdict avant la TV."
    4. **Je peux jouer avec mes potes ?** → "Oui, tu crées une ligue privée avec un code d'invitation. Mode classique (chacun pour soi) ou Braquage 1vs1 (championnat hebdomadaire entre membres)."
    5. **Ça marche sur iPhone et Android ?** → "Oui, dès aujourd'hui en PWA (Progressive Web App) — installable depuis ton navigateur en 1 clic. Les apps natives sortent en septembre 2026."
    6. **Mes données sont safe ?** → "Hébergement européen (Supabase EU), conforme RGPD, aucune revente à des tiers. Tu peux supprimer ton compte à tout moment."
  - _Action 3 :_ Tracker l'ouverture de chaque FAQ via Vercel Analytics (event `faq_opened` avec label) — précieux pour comprendre les frictions des visiteurs.

- [ ] **L5 : Landing alternative `/discover` (version store-friendly)**
  - _Contexte :_ La landing principale garde son ton MPG ("braquage", "parie", "trésor de guerre") qui convertit bien en organique mais qui sera flag par Apple/Google et la presse mainstream. La version `/discover` neutralise le copy pour ces audiences spécifiques.
  - _Action 1 :_ Créer `src/app/discover/page.tsx` qui réutilise les **mêmes composants visuels** que la landing principale mais avec un fichier de copy alternatif `src/lib/copy/discover.ts`.
  - _Action 2 :_ Refactorer la landing principale pour extraire les chaînes de texte dans un objet `mainCopy` exporté depuis `src/lib/copy/main.ts`. La page `/discover` importe `discoverCopy` à la place.
  - _Action 3 :_ Substitutions clés à appliquer dans `discoverCopy` :
    - "JUSQU'AU BRAQUAGE" → "POUR DÉFIER TES POTES"
    - "BRAQUAGE OU 1VS1" → "CHAMPIONNAT 1VS1"
    - "Parie en direct" → "Lance ton défi en direct"
    - "Parie en temps réel sur les décisions de l'arbitre" → "Prédis en temps réel les décisions de l'arbitre"
    - "braque tes potes" → "défie tes potes"
    - "trésor de guerre pour miser" → "réserve de Sifflets pour participer"
    - "Pas qu'un excité du direct" → "Plus que du direct"
    - "tapis sur la VAR" → "engager sur la VAR"
  - _Action 4 :_ Ajouter sur `/discover` un bandeau supplémentaire en bas : "VAR TIME est un jeu gratuit de prédiction sportive. Aucun argent réel. Aucun gain monétaire. Conforme PEGI 3 / Apple 4+."
  - _Action 5 :_ Robot meta sur `/discover` : `<meta name="robots" content="noindex,nofollow">` pour éviter qu'elle ne sorte en SEO et concurrence la principale. Cette page n'a qu'un usage de **déclaration** (review Apple, partage presse).
  - _Action 6 :_ Cette URL `https://vartime.app/discover` sera celle fournie dans le champ "App Review URL" lors de la soumission App Store (post-CDM). Garder en mémoire pour le sprint Capacitor.

- [ ] **L6 : Audit complet des termes problématiques**
  - _Action 1 :_ Créer un script `scripts/audit-banned-words.ts` qui scan tous les fichiers `src/**/*.{ts,tsx}` et `messages/**/*.json` à la recherche des termes : `pari`, `parie`, `parier`, `bet`, `betting`, `wager`, `cote`, `odds`, `mise`, `cashout`, `bookmaker`, `jackpot`, `gambling`, `casino`.
  - _Action 2 :_ Le script génère un rapport `audit-report.md` listant chaque occurrence avec son fichier + ligne + contexte (les 50 chars autour).
  - _Action 3 :_ Ce rapport servira ensuite au sprint Capacitor (Cap-6) pour neutraliser le wording dans l'app native. NE PAS modifier le code à ce stade — juste produire le rapport.
  - _Action 4 :_ Ajouter ce script dans `package.json` comme `npm run audit:banned-words`.

---

### 🦠 Sprint V : VIRALITÉ — "Le moteur de croissance organique"

> **Contexte stratégique :** Sans deep links, partage de victoire, ni preuve sociale sur les pronos, ton app est une coquille vide côté viralité. Ces 3 leviers sont éprouvés (MPP, Sorare, Strava les utilisent tous) et représentent ton meilleur ROI d'acquisition gratuite. Implémentation : ~5-7 jours de Claude Code. Impact estimé : +250% sur le taux d'invitation acceptée + un moteur de propagation organique permanent.

- [ ] **V1 : Deep links d'invitation ligue (Universal Links)**
  - _Problème :_ Aujourd'hui rejoindre une ligue = 6 étapes (recevoir code → ouvrir app → onglet Ligues → bouton Rejoindre → coller code → valider). Tu perds ~80% des invités à chaque palier. Avec un deep link, tu passes à 2 étapes (cliquer le lien → confirmer) → +250% d'acceptation estimé.
  - _Action 1 :_ Créer une nouvelle route `src/app/join/[code]/page.tsx` qui :
    1. Récupère le `code` depuis les params URL (ex: `vartime.app/join/F9DQXT`)
    2. Appelle la RPC `squad_by_invite_code(code)` pour résoudre la ligue
    3. Affiche un écran "👋 Tu es invité dans **{nom_ligue}** par **{nom_owner}** — {nb_membres} membres déjà"
    4. Si user déjà connecté → bouton "Rejoindre cette ligue" qui appelle `POST /api/squads/join`
    5. Si user pas connecté → bouton "Connexion Google + Rejoindre" qui chaîne login OAuth + join automatique au callback
  - _Action 2 :_ Ajouter dans le callback OAuth (`src/app/auth/callback/route.ts`) la gestion d'un paramètre `redirect_to=/join/{code}` qui, après login réussi, déclenche directement le join et redirige sur la page de la ligue.
  - _Action 3 :_ Modifier le bouton "Partager l'invitation" de `LiguesPageClient.tsx` (déjà existant via Sprint 7) pour générer un message :
    > "🏆 Rejoins ma ligue VAR TIME : **{nom_ligue}**.
    > Code : **{code}**
    > 👉 https://vartime.app/join/{code}
    >
    > On joue les matchs ensemble pour la CDM 2026 ! 🚀"
  - _Action 4 :_ Ajouter en plus du `navigator.share()` natif un bouton "Copier le lien" en fallback desktop. Toast Sonner "Lien copié 🔗".
  - _Action 5 :_ Tracker via Vercel Analytics les events `invite_link_clicked` (côté `/join/[code]`) et `invite_link_accepted` (après join réussi) — KPI critique à mesurer.
  - _Action 6 :_ La page `/join/[code]` doit aussi gérer les cas d'erreur élégamment :
    - Code invalide → "Cette invitation n'existe pas ou a expiré. [Demande un nouveau lien à ton pote]"
    - Déjà membre → "Tu fais déjà partie de cette ligue ! [Aller à la ligue]"
    - Ligue pleine (si limite implémentée plus tard) → "Cette ligue est complète. [Crée la tienne]"

- [ ] **V2 : VictoryShareCard — Partage automatique de victoire**
  - _Problème :_ Quand un utilisateur gagne un gros pari (+500 pts sur une VAR), il se passe juste un toast et son solde monte. Aucun moment de gloire shareable → tu rates 90% du potentiel viral organique. Avec une image partageable Instagram/WhatsApp générée à la volée, chaque victoire devient un canal d'acquisition.
  - _Action 1 :_ Créer une route API `GET /api/og/victory/[betId]` ou `[pronoId]` utilisant `@vercel/og` (déjà compatible Next.js 16) pour générer une image PNG dynamique au format Story Instagram (1080×1920).
  - _Action 2 :_ Le design de l'image inclut :
    - Background gradient : couleur de l'équipe gagnante en dominante (récupérer depuis `teams.primary_color`)
    - Logo VAR TIME en watermark coin haut-droit
    - Pseudo de l'utilisateur en gros (`Cafoutch`)
    - Texte hero : "a deviné PSG-Bayern 2-1" ou "a parié juste sur la VAR de la 67e minute"
    - Gain en énorme : "+500 PTS"
    - QR code en bas pointant vers `vartime.app/join` avec un code spécial de tracking
    - Footer discret : "vartime.app · L'app du match en direct"
  - _Action 3 :_ Créer un composant `VictoryShareModal.tsx` qui s'affiche automatiquement après une victoire significative (gain > 200 pts). Contenu :
    - Aperçu de l'image générée (preview iframe ou img)
    - Bouton "📲 Partager ma gloire" → `navigator.share()` avec fichier image attaché si supporté, sinon URL de l'image
    - Bouton "Pas maintenant" pour fermer
    - Option "Ne plus me demander" (stocker en localStorage `disableVictoryShare`)
  - _Action 4 :_ Déclencher cette modale dans deux endroits :
    1. Dans `resolve_event_parimutuel` côté UI : à la résolution Realtime du market_event, si l'utilisateur a `points_earned > 200`
    2. Dans `resolve_match_pronos` : à la fin du match, si gain > 200 pts (Contre-Pied bonus etc.)
  - _Action 5 :_ Tracker l'event `victory_shared` (avec montant + plateforme via API Web Share) — KPI viralité critique.
  - _Action 6 :_ Ajouter une **galerie publique** des plus belles victoires : route `src/app/(app)/hall-of-fame/page.tsx` qui affiche les 50 plus gros gains du mois sous forme de wall avec preview des VictoryShareCards. Source de fierté + preuve sociale en interne. Pas de prio sur ce dernier point — feature bonus.

- [ ] **V3 : Pronos des amis visibles sur les matchs (preuve sociale)**
  - _Problème :_ Quand je pronostique PSG-OM, je suis SEUL face à ma décision. Si je voyais "Adri a mis 2-1, Remi a mis 0-3, Théo a mis 1-1", je serais influencé / motivé / chambreur. C'est exactement ce que MPP fait depuis 8 ans et c'est ce qui crée le débat WhatsApp.
  - _Action 1 :_ Étendre l'API `GET /api/match/[id]/pronos-friends` (nouvelle route) qui retourne, pour le match donné, les pronos visibles de :
    - Membres des squads de l'utilisateur courant
    - Avec règles anti-triche : si le match n'est pas commencé (statut `upcoming`), masquer les scores → afficher juste "X a pronostiqué 🔒". Si le match est commencé/terminé, dévoiler les scores.
  - _Action 2 :_ Sur la PronoCard d'un match (composant existant probablement dans `src/components/pronos/`), ajouter une nouvelle ligne sous les boutons de score : "👥 Tes potes : Adri 🔒 · Remi 🔒 · Théo 🔒" (avant le match) ou "👥 Tes potes : Adri 2-0 ❌ · Remi 1-1 ✅ · Théo 0-2 ❌" (après).
  - _Action 3 :_ Si plus de 5 amis ont pronostiqué, afficher "Adri, Remi, Théo + 2 autres" avec tap pour ouvrir une bottom-sheet listant tous les pronos.
  - _Action 4 :_ Sur la PronoCard d'un match terminé, **mettre en avant le pronostic le plus rare réussi** : "🏆 Adri a deviné le score exact 2-1 (+150 pts)" — incitation au chambrage WhatsApp.
  - _Action 5 :_ Booster "Vision" du Sprint Eco-3 (à venir) dépend de cette infra : si la migration Eco-3 n'a pas encore eu lieu, afficher tout systématiquement (pas de gate cosmétique). Le booster Vision pourra être ajouté plus tard pour gater l'affichage des pronos détaillés sur les matchs non encore commencés (pour les amis HORS squad).
  - _Action 6 :_ Anti-triche stricte : un user ne peut JAMAIS voir les pronos d'un membre d'une squad dont il n'est pas membre, même via API. Vérifier en RPC SECURITY DEFINER (ou en route handler avec `service_role`).

- [ ] **V4 : Notifications push de "dépassement" (revenge addiction)**
  - _Problème :_ Quand Remi me dépasse au classement de ma ligue, je ne reçois rien. Pourtant c'est LE moment exact où je dois revenir dans l'app pour reprendre ma place. Sans cette notif, je décroche.
  - _Action 1 :_ Créer une fonction côté serveur `notifyRankChanges(squadId)` à appeler après chaque résolution majeure (fin de match avec impact classement).
  - _Action 2 :_ Logique : pour chaque membre de la squad, comparer son rang avant/après la résolution. Si dépassement (rang ↘), envoyer un push à l'utilisateur dépassé : "🚨 {pseudo} vient de te passer dans **{nom_ligue}** ! Il/elle a +{ecart} pts d'avance. À toi de jouer 💪"
  - _Action 3 :_ Cooldown : pas plus d'une notif "dépassement" par utilisateur par ligue par 6h (sinon ça spam). Stocker dans la table `squad_nudge_logs` existante (ajouter type `rank_overtake`).
  - _Action 4 :_ Smart mute : si l'utilisateur a l'app ouverte sur l'écran de sa squad au moment du dépassement, ne pas envoyer de push (l'info est déjà visible) — vérifier via la présence du channel Realtime du user.

---

### 🔔 Sprint Push-1 : NOTIFICATIONS POST-RÉSOLUTION — "Le frein rétention #1"

> **Contexte stratégique :** Identifié dans `PROJECT_CONTEXT.md` comme le frein rétention numéro 1 du produit. Aujourd'hui, un utilisateur qui parie sur une VAR ou pose un prono ne reçoit AUCUNE notification quand le verdict tombe s'il a quitté l'app. Résultat : il découvre son gain/perte le lendemain en rouvrant l'app au mieux, jamais au pire. C'est l'équivalent d'un casino sans cris de joie. Impact massif : sans push de victoire, pas d'addiction sportive saine, pas de retour spontané, pas de viralité (cf. Sprint V). L'infra technique existe déjà (`push-sender.ts`), il manque juste les déclenchements aux bons endroits.

- [ ] **Push1-1 : Push après résolution d'un pari VAR**
  - _Action 1 :_ Dans `src/app/api/admin/resolve-event/route.ts` ET dans la fonction `resolveEvent` côté `src/lib/resolve-event.ts`, après la mise à jour des soldes utilisateurs (RPC `resolve_event_parimutuel`), récupérer la liste de tous les utilisateurs ayant un `bet` sur cet event.
  - _Action 2 :_ Pour chaque utilisateur :
    - **Si gagnant** (pari = verdict) : push avec titre "🎉 Tu as gagné ton pari VAR !" + body "Verdict : {verdict_label} ({matchHome} vs {matchAway}). +{points_earned} pts pour toi !" + deep link `vartime.app/match/{matchId}`
    - **Si perdant** : push titre "💔 Pari VAR perdu" + body "Verdict : {verdict_label} ({matchHome} vs {matchAway}). Tu retentes ta chance ?" + deep link match
  - _Action 3 :_ Utiliser `sendPushToUsers([userId], payload)` (existant dans `push-sender.ts`). Group key par `match_id` pour Android (notifs groupées si plusieurs paris résolus dans le même match).
  - _Action 4 :_ Smart mute : skip le push si l'utilisateur est déjà sur l'écran du match (Realtime channel actif). Le toast Sonner local fait le boulot.
  - _Action 5 :_ Logger en base (table `push_logs` à créer si elle n'existe pas, migration `0083_push_logs.sql` : `user_id`, `event_type`, `payload JSONB`, `sent_at`, `success BOOL`) pour audit + debug.

- [ ] **Push1-2 : Push après résolution des pronos d'un match (fin de match)**
  - _Action 1 :_ Dans la RPC `resolve_match_pronos` (déjà existante depuis migration 0045), après la mise à jour des `pronos.status` de `pending` à `won`/`lost`, déclencher un appel HTTP vers une nouvelle route `POST /api/internal/notify-pronos-resolved` (utiliser `pg_net` ou un trigger NOTIFY consumé côté Vercel).
  - _Action 2 :_ Alternative plus simple : appeler `notifyPronosResolved(matchId)` depuis `src/services/api-football-sync.ts` juste après `resolve_match_pronos` (puisque c'est ce flux qui clôture les matchs).
  - _Action 3 :_ La fonction `notifyPronosResolved(matchId)` :
    1. Récupère tous les pronos résolus pour ce match
    2. Pour chaque user : agrège ses gains totaux (1N2 + score exact + buteurs + Contre-Pied bonus)
    3. Envoie un push résumant : "⚽ Match terminé : {home} {scoreH}-{scoreA} {away}. Ton bilan : +{total_points} pts ({stats détaillées en sous-titre}). Vois ta progression ↗"
    4. Deep link vers `/match/{matchId}/recap` (si la page recap existe — sinon `/profile?tab=historique`)
  - _Action 4 :_ Cas spécial gagnants Contre-Pied (score exact rare) : push à part beaucoup plus festif "🎯💎 CONTRE-PIED RÉUSSI ! Score exact {scoreH}-{scoreA} pour {home}-{away}. +{points_earned} pts !" → c'est ce moment qui fait shareloud, à coupler avec le déclenchement automatique de la VictoryShareCard (Sprint V2).

- [ ] **Push1-3 : Push de récap quotidien (digest des résolutions)**
  - _Problème :_ Si un utilisateur a 3 paris en attente sur 3 matchs différents, il va recevoir 3 push séparés. Au-delà de 2 push/jour, le taux de désinscription explose.
  - _Action 1 :_ Créer un cron quotidien `src/app/api/cron/daily-digest/route.ts` qui tourne tous les jours à 09:00 Paris.
  - _Action 2 :_ Pour chaque utilisateur ayant eu ≥2 résolutions dans les dernières 24h :
    - Skip les push individuels de Push1-1 et Push1-2 (ne lancer que le digest)
    - Envoyer un seul push : "☀️ Récap d'hier : tu as gagné {nb_wins}/{nb_total} paris. Bilan : {+/-XXX} pts. Ton rang dans {ligue_principale} : #{rank}. À toi de jouer aujourd'hui ! ⚽"
  - _Action 3 :_ Pour les users avec une seule résolution dans la journée → push individuel normal (Push1-1 ou Push1-2). Pas de digest.
  - _Action 4 :_ Toggle dans le profil utilisateur : "Notifications de récap quotidien" (on/off). Stocker dans `profiles.notif_daily_digest BOOLEAN DEFAULT TRUE` — migration `0084_notif_preferences.sql`.

- [ ] **Push1-4 : Push J-2h avant un match de ligue suivie**
  - _Problème :_ Le rendez-vous (cf. Sprint V — squad pre-game) ne fonctionne pas si l'utilisateur ne sait pas que le match commence. Aujourd'hui : zéro push d'anticipation.
  - _Action 1 :_ Créer un cron `src/app/api/cron/match-imminent/route.ts` qui tourne toutes les 30 min.
  - _Action 2 :_ Pour chaque match avec `start_time` entre `now + 1h45` et `now + 2h15` (fenêtre de 30 min pour éviter doublons), et dont le `competition_id` est dans les `preferred_competitions` d'au moins un user :
    - Pour chaque squad du user, compter les amis de cette squad qui ont déjà pronostiqué ce match
    - Push : "⏰ {home} vs {away} dans 2h ! {nb_amis} de tes potes dans **{nom_ligue}** ont déjà pronostiqué. À ton tour 🎯" + deep link `/pronos?date={date}&match={matchId}`
  - _Action 3 :_ Cooldown : 1 seul push J-2h par user par match, tracé dans `match_subscriptions` ou `push_logs`.
  - _Action 4 :_ Skip si l'utilisateur a déjà pronostiqué ce match.
  - _Action 5 :_ Skip si user a opt-out via toggle `notif_match_imminent BOOLEAN DEFAULT TRUE` sur `profiles`.

- [ ] **Push1-5 : Mise à jour de la page Notifications**
  - _Action 1 :_ Sur la page profil ou dans une section dédiée `src/app/(app)/profile/notifications/page.tsx`, créer un panneau de gestion fin des préférences push. Liste de toggles :
    - 🎯 Résultats de mes paris VAR (par défaut ON)
    - ⚽ Résultats de mes pronos en fin de match (ON)
    - ☀️ Récap quotidien (ON)
    - ⏰ Rappel J-2h avant les matchs de mes ligues (ON)
    - 🚨 Quand un pote me dépasse au classement (ON, Sprint V4)
    - 🔥 Sirène VAR de ma ligue (ON, existant)
    - 📩 Nudges pronos de ma ligue (ON, existant)
  - _Action 2 :_ Chaque toggle persiste dans `profiles.notif_*` (colonnes booléennes). Toutes les fonctions push doivent vérifier ces flags avant d'envoyer.
  - _Action 3 :_ Bouton "Tout désactiver" / "Tout réactiver" en haut. Onboarding visuel : "Plus tu en gardes activées, plus tu vis l'expérience VAR TIME. Mais on respecte ton choix 🙏"
  - _Action 4 :_ **Mise à jour de la page Règles** (`src/app/(app)/rules/page.tsx`) : ajouter une section "🔔 Notifications" listant les types de push envoyés et leur fréquence indicative. Transparence = trust.

---
