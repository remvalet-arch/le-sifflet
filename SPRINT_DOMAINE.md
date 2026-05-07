---

### 🌐 Sprint D : MIGRATION DOMAINE — "le-sifflet.vercel.app → vartime.app"

> **Contexte stratégique :** Migration du domaine de production de `le-sifflet.vercel.app` (URL Vercel automatique, peu mémorable, branding hérité) vers `vartime.app` (domaine acheté, aligné avec la marque VAR TIME, signal "application" fort, neutre vis-à-vis d'Apple). Doit être fait **AVANT** la production des contenus marketing (vidéos, ambassadeurs, presse) et **AVANT** la sortie de la landing v2 — sinon doublé de travail. Coût : 15$/an. Effort : 1 jour de Claude Code + 30 min côté utilisateur (achat + DNS).

#### Partie 1 : Actions humaines (à faire AVANT que Claude Code commence)

- [ ] **D1 (humain) : Achat du domaine sur Cloudflare Registrar**
  - _Action 1 :_ Créer un compte Cloudflare gratuit sur https://cloudflare.com (si pas déjà fait).
  - _Action 2 :_ Naviguer vers Domain Registration → Register Domains, chercher `vartime.app`.
  - _Action 3 :_ Acheter (~13-14$/an au prix coûtant, tarif le plus bas du marché). Carte bancaire requise. WHOIS privacy automatiquement gratuit.
  - _Action 4 :_ Activer immédiatement les options : auto-renewal, DNSSEC.
  - _Estimation :_ 5 min.

- [ ] **D2 (humain) : Pré-vérification marque INPI**
  - _Action :_ Aller sur https://data.inpi.fr/recherche_avancee/marques et chercher "VARTIME" puis "VAR TIME". Vérifier qu'aucune marque déposée en classe 9 (logiciels/applications mobiles) ou classe 41 (services de divertissement) ne crée un conflit en France ou en UE.
  - _Si conflit trouvé :_ STOP — décision business à prendre (pivot de nom, contestation, etc.). Ne pas continuer la migration.
  - _Si aucun conflit :_ noter "OK" et passer à D3. Optionnel : envisager un dépôt INPI ultérieur (~210€) après confirmation du product-market fit, pas urgent à 35 jours du lancement.
  - _Estimation :_ 10 min.

- [ ] **D3 (humain) : Connexion domaine ↔ Vercel**
  - _Action 1 :_ Dans le dashboard Vercel du projet `le-sifflet`, aller dans Settings → Domains.
  - _Action 2 :_ Cliquer "Add Domain" → entrer `vartime.app`. Vercel détecte que le DNS n'est pas encore configuré.
  - _Action 3 :_ Vercel affiche les DNS records nécessaires (typiquement un A record `76.76.21.21` pour la racine + un CNAME `cname.vercel-dns.com` pour `www`). Copier ces valeurs.
  - _Action 4 :_ Dans Cloudflare → DNS → Records, ajouter ces 2 entrées exactement comme indiqué par Vercel. **Important :** désactiver le mode "Proxy" (orange cloud) sur ces records → mettre en "DNS only" (gray cloud) — sinon Vercel ne peut pas servir l'app correctement.
  - _Action 5 :_ Ajouter aussi `www.vartime.app` sur Vercel pour gérer la redirection www → root automatiquement.
  - _Action 6 :_ Attendre la propagation DNS (5 min à 1h en général). Vercel le détecte automatiquement et provisionne le certificat SSL. Vérifier que `https://vartime.app` charge correctement la PWA.
  - _Estimation :_ 15 min + temps de propagation.

- [ ] **D4 (humain) : Configuration emails via Cloudflare Email Routing**
  - _Action 1 :_ Dans Cloudflare → Email → Email Routing, activer le service.
  - _Action 2 :_ Créer ces alias forwardés vers ton vrai email (Gmail/Proton perso) :
    - `hello@vartime.app` → ton email perso
    - `contact@vartime.app` → ton email perso
    - `presse@vartime.app` → ton email perso
    - `admin@vartime.app` → ton email perso
    - `*@vartime.app` (catch-all) → ton email perso
  - _Action 3 :_ Cloudflare ajoute automatiquement les MX records nécessaires.
  - _Action 4 :_ Tester en t'envoyant un mail à `hello@vartime.app` depuis un autre compte → tu dois le recevoir sur ton perso.
  - _Note :_ Si tu veux pouvoir ENVOYER depuis ces adresses (pas juste recevoir), il faudra plus tard passer à Google Workspace (~6€/mois) ou ProtonMail. Pour le lancement, le forward est suffisant.
  - _Estimation :_ 10 min.

#### Partie 2 : Actions Claude Code (à lancer APRÈS validation D1-D4)

- [x] **D5 : Mise à jour des références au domaine dans le code**
  - _Action 1 :_ Faire un grep dans tout le repo : `grep -rn "le-sifflet" src/ public/ messages/ docs/ --include="*.{ts,tsx,json,md,html,xml}"`.
  - _Action 2 :_ Remplacer toutes les occurrences de `le-sifflet.vercel.app` par `vartime.app`. Vérifier en particulier :
    - `src/app/layout.tsx` : meta tags `og:url`, `twitter:url`, `canonical`
    - `public/manifest.webmanifest` : champ `start_url`
    - `public/sw.js` : URLs de cache (si hardcodées)
    - `messages/*.json` : URLs dans les traductions (probablement aucune mais vérifier)
    - `src/app/api/**/route.ts` : URLs absolues éventuelles dans des emails ou push notifications
    - `vercel.json` : section `rewrites` ou `redirects` si présente
  - _Action 3 :_ Mettre à jour `.env.example` : ajouter une variable `NEXT_PUBLIC_APP_URL=https://vartime.app` qui sera la source de vérité pour toutes les URL absolues. Refactoriser le code pour utiliser cette variable au lieu de hardcoder le domaine.
  - _Action 4 :_ Mettre à jour `.env.local` (sur ta machine) avec la nouvelle valeur de `NEXT_PUBLIC_APP_URL`.
  - _Action 5 :_ Mettre à jour l'environnement Vercel (Production + Preview + Development) avec `NEXT_PUBLIC_APP_URL=https://vartime.app`.

- [x] **D6 : Mise à jour des Open Graph et SEO**
  - _Action 1 :_ Dans `src/app/layout.tsx`, vérifier/mettre à jour les meta tags :
    - `<title>VAR TIME — L'app du match en direct</title>`
    - `<meta name="description" content="Pronos avant les matchs, paris VAR en direct, ligues entre potes. L'app du match en direct, 100% gratuite, sifflets virtuels.">`
    - `<meta property="og:title" content="VAR TIME — L'app du match en direct">`
    - `<meta property="og:url" content="https://vartime.app">`
    - `<meta property="og:image" content="https://vartime.app/og-image.png">`
    - `<meta property="og:site_name" content="VAR TIME">`
    - `<meta name="twitter:card" content="summary_large_image">`
    - `<meta name="twitter:title" content="VAR TIME">`
    - `<meta name="twitter:image" content="https://vartime.app/og-image.png">`
  - _Action 2 :_ Créer une image Open Graph `public/og-image.png` (1200×630 px) au branding VAR TIME : logo, tagline "L'app du match en direct", visuel mockup smartphone. Si la création d'image n'est pas possible côté Claude Code, marquer en TODO et fournir une image placeholder.
  - _Action 3 :_ Mettre à jour `public/manifest.webmanifest` :
    - `name`: "VAR TIME — L'app du match en direct"
    - `short_name`: "VAR TIME"
    - `start_url`: "/"
    - `theme_color`: couleur de marque
    - `icons`: vérifier que les chemins fonctionnent
  - _Action 4 :_ Vérifier et mettre à jour `public/robots.txt` :
    ```
    User-agent: *
    Allow: /
    Disallow: /admin/
    Disallow: /api/
    Disallow: /discover    # si la landing /discover est noindex (cf. Sprint L)
    Sitemap: https://vartime.app/sitemap.xml
    ```
  - _Action 5 :_ Ajouter ou mettre à jour `src/app/sitemap.ts` pour générer un sitemap dynamique listant les pages publiques (landing, /rules, /laws, /privacy, /cgu, /mentions-legales).

- [x] **D7 : Redirections de l'ancien domaine**
  - _Action 1 :_ Dans `vercel.json` à la racine du projet (créer le fichier s'il n'existe pas), ajouter une section `redirects` :
    ```json
    {
      "redirects": [
        {
          "source": "/(.*)",
          "has": [{"type": "host", "value": "le-sifflet.vercel.app"}],
          "destination": "https://vartime.app/$1",
          "permanent": true
        }
      ]
    }
    ```
  - _Action 2 :_ Push sur la branche main → Vercel déploie automatiquement → toute requête sur `le-sifflet.vercel.app/xxx` retourne désormais un 301 vers `vartime.app/xxx`. Tu ne perds aucun lien existant (WhatsApp partagés, screenshots, etc.).
  - _Action 3 :_ Tester manuellement : ouvrir `https://le-sifflet.vercel.app/profile` dans un navigateur → doit rediriger vers `https://vartime.app/profile`.
  - _Action 4 :_ Mettre à jour la config Supabase Auth → Authentication → URL Configuration → Site URL = `https://vartime.app` ; Redirect URLs : ajouter `https://vartime.app/auth/callback` (et conserver l'ancienne URL Vercel le temps de la transition).

- [~] **D8 : Configuration email transactionnel (préparation)** _(backlog Sprint L)_
  - _Action 1 :_ Pas urgent à ce stade, mais préparer le terrain : si tu as besoin d'envoyer des emails depuis l'app (waitlist confirmation, reset password, notifications), tu auras besoin d'un service comme Resend (https://resend.com) ou Supabase SMTP custom.
  - _Action 2 :_ Configurer SPF + DKIM sur le domaine via Cloudflare DNS pour autoriser un service tiers à envoyer en ton nom (records exact dépendent du service choisi).
  - _Action 3 :_ Marquer en backlog pour traitement avec Sprint L (qui ajoute la waitlist email).

- [x] **D9 : Communication aux utilisateurs bêta**
  - _Action 1 :_ Sur l'ancienne URL `le-sifflet.vercel.app`, après la mise en place de la redirection 301, le contenu va automatiquement charger l'app sur le nouveau domaine. Mais les utilisateurs qui ont installé la PWA sous `le-sifflet.vercel.app` doivent réinstaller la PWA depuis `vartime.app` pour bénéficier des features pleines (push notifs notamment, qui sont scopées par origine).
  - _Action 2 :_ Préparer un message à diffuser aux 6 bêta-testeurs (chat ligue, mail) :
    > "🚀 VAR TIME a son vrai domaine : **vartime.app** !
    > 
    > Pour bénéficier de toutes les notifs et de la PWA installée, **désinstalle l'ancienne version** (long-press sur l'icône → Désinstaller) et **réinstalle** depuis https://vartime.app (ouvrir dans Safari/Chrome → menu → Ajouter à l'écran d'accueil).
    > 
    > Ton compte, tes pronos, tes Sifflets, tout est conservé — c'est juste l'URL qui change.
    > 
    > Merci pour ton feedback bêta 🙏"
  - _Action 3 :_ Ajouter un bandeau temporaire en haut de l'app (composant `MigrationBanner.tsx`) affiché pendant 7 jours après la migration, avec ce même message + bouton "OK, j'ai compris" pour le dismiss (stockage localStorage).

- [ ] **D10 : Validation finale**
  - _Action 1 :_ Checklist de validation après migration :
    - [ ] `https://vartime.app` charge la landing
    - [ ] `https://vartime.app/lobby` charge le lobby (après login)
    - [ ] `https://www.vartime.app` redirige vers `https://vartime.app`
    - [ ] `https://le-sifflet.vercel.app` redirige (301) vers `https://vartime.app`
    - [ ] Login Google fonctionne avec le nouveau domaine
    - [ ] Le service worker se met à jour (`navigator.serviceWorker.getRegistration()` pointe vers vartime.app)
    - [ ] Push notifications fonctionnent (test sur un device)
    - [ ] Open Graph s'affiche bien (tester via https://opengraph.xyz/url/https%3A%2F%2Fvartime.app)
    - [ ] Email à `hello@vartime.app` est bien reçu sur le forward perso
    - [ ] `npm run ai:check` passe en vert
  - _Action 2 :_ Faire un commit "feat: migration to vartime.app" et merger sur main.

---
