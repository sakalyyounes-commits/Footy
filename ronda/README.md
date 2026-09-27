# Ronda Dyalna — روندا ديالنا 🃏

Le jeu de cartes marocain **Ronda** en ligne, sur **Android**, **iPhone** et **navigateur** :
1 contre 1, **2 contre 2**, entre amis avec un code, contre l'ordinateur sans Internet.
Pensé comme les grands jeux « à tables » (Parchisi Star, Ludo King) : pièces virtuelles, tables
à mise de Tanger à Rabat, bonus quotidien, niveaux, boutique, classement.

> 🚀 **Débutant ? Commence par le [guide pas à pas](GUIDE.md)** : jouer ce soir entre amis sur le
> Wi-Fi, installer l'APK Android, mettre le jeu en ligne — avec les liens de téléchargement directs.

> Nom de travail : « Ronda Dyalna » (*notre Ronda*). Il se change en un seul endroit par plate-forme
> (voir [Personnaliser](#personnaliser)).

---

## Sommaire

1. [Ce que contient le jeu](#ce-que-contient-le-jeu)
2. [Règles implémentées](#règles-implémentées)
3. [Démarrer en local](#démarrer-en-local)
4. [Architecture](#architecture)
5. [Mettre le serveur en ligne](#mettre-le-serveur-en-ligne)
6. [Applications Android et iPhone](#applications-android-et-iphone)
7. [Monétisation : publicités et achats](#monétisation--publicités-et-achats)
8. [Configuration (variables)](#configuration-variables)
9. [Tests et qualité](#tests-et-qualité)
10. [Personnaliser](#personnaliser)
11. [Limites connues et suite](#limites-connues-et-suite)

Le plan de lancement (stores, croissance, revenus) est dans [`docs/LANCEMENT.md`](docs/LANCEMENT.md).

---

## Ce que contient le jeu

| | |
| --- | --- |
| **Modes** | En ligne 1v1 et 2v2 par tables à mise · Amis : table privée avec code, partage WhatsApp, lien d'invitation · Hors ligne contre 3 niveaux de bots · Reprise automatique d'une partie hors ligne interrompue |
| **Tables en ligne** | Tanger (100) → Fès → Chefchaouen → Essaouira → Casablanca → Marrakech → Rabat (250 000), débloquées par niveau ; le gagnant empoche le pot moins 10 % |
| **Bots** | *Mbtadi* (débutant), *Mtwasset* (compte les cartes, évalue le risque de darba), *M3allem* (simule des centaines de fins de donne à chaque coup, tient compte des annonces). Les bots en ligne sont **toujours signalés 🤖** |
| **Progression** | XP et niveaux, récompense à chaque niveau, statistiques (darbas, missas, rondas, tringas, séries), classement |
| **Économie** | 2 500 pièces offertes, bonus quotidien sur 7 jours (jusqu'à 5 000), pièces gratuites toutes les 4 h, vidéo récompensée, coup de pouce quand on est à sec, parrainage (+2 000 chacun) |
| **Boutique** | Dos de cartes (zellige, Majorelle, tapis berbère, Chefchaouen, royal, or, VIP), tapis (riad, Majorelle, ville bleue, Sahara, nuit de Marrakech, palais), cadres d'avatar ; packs de pièces, pack de bienvenue, sans publicité, VIP |
| **Social** | Messages rapides en darija (« Hak hadi ! », « Tbarkellah », « Nta m3allem »…) et emojis — pas de chat libre, donc rien à modérer |
| **Visuels** | Cartes espagnoles dessinées en SVG (figures dans un arc outrepassé marocain, « pintas » sur le cadre), 16 avatars (tarbouche, capuche de djellaba, foulard, turban…), animations des cartes, bandeaux DARBA / B'KHAMSA / B'ACHRA / MISSA |
| **Son** | Effets et musique **synthétisés** (darbouka au rythme maqsum, oud en mode hijaz) : aucun fichier audio, aucune licence |
| **Langues** | Français, arabe (darija, de droite à gauche), anglais |
| **Compte** | Invité sans e-mail ni téléphone, code de transfert pour changer de téléphone |

## Règles implémentées

Conformes à la Ronda telle qu'on la joue au Maroc (référence : pagat.com et règles marocaines) :

- **Jeu espagnol de 40 cartes** : deniers (*dheb*), coupes (*tbaye9*), épées (*syouf*), bâtons (*zrawet*) ; 1 à 7, puis 10 (*sota*), 11 (*caballo*), 12 (*rey*).
- **Qui distribue** : en début de partie, chaque joueur tire une carte ; **la plus petite distribue** (en cas d'égalité, seuls les ex æquo retirent). Le joueur à droite du donneur reçoit et joue en premier ; le donneur passe à droite à chaque manche.
- **Distribution** : 1v1 → 4 cartes × 5 donnes ; **2v2 → 4 cartes, puis 3 et 3**, partenaires face à face. Tapis vide au départ.
- **Prise** : même valeur + la suite ascendante sans trou (… 6-7-**10**-11-12).
- **Ronda** (paire) 1 point, **Tringa** (brelan) 5 points. Plusieurs annonces : la plus grande ronda rafle tout ; une tringa bat toutes les rondas (5 points + 1 par ronda) ; entre deux tringas, la plus grande gagne. **Si les quatre joueurs ont chacun une ronda, c'est la plus petite qui gagne** (avec cinq rondas, la plus grande reprend le dessus). Égalité entre adversaires : le pot est partagé.
- **Darba** : prendre la carte que vient de poser le joueur précédent → **b'wahed** (1). En 2v2, le suivant peut rebondir avec la 3e carte → **b'khamsa** (5), puis le suivant avec la 4e → **b'achra** (10) : le dernier emporte le paquet et les points.
- **Missa** : vider le tapis → 1 point (pas avec la toute dernière carte).
- **Dernière carte du donneur** : le donneur joue la dernière carte de la manche. Il prend avec un **12** → +5 pour son équipe ; il prend avec un **1**, ou ne prend rien → +5 pour l'équipe adverse.
- **Fin de manche** : le dernier preneur ramasse le tapis ; chaque carte au-delà de 20 = 1 point. **Victoire immédiate à 41** (ou 21/31/61 en partie privée).

Variantes réglables dans les tables privées et hors ligne : objectif, darba en chaîne (activée par défaut en 2v2, désactivée en 1v1), dernière carte du donneur (activée par défaut), valeurs des points.

## Démarrer en local

Prérequis : **Node.js 22.12+**.

```bash
cd ronda
npm install
npm run dev:server      # serveur de jeu sur http://localhost:8080 (WebSocket /ws)
npm run dev             # application sur http://localhost:5174 (dans un 2e terminal)
```

Ouvrir http://localhost:5174 dans le navigateur (idéalement en vue « téléphone » des outils de
développement). Le mode hors ligne fonctionne même sans le serveur.

## Architecture

```
ronda/
  core/     règles (moteur pur TypeScript), bots, économie, protocole réseau — partagé
  server/   serveur Node.js : WebSocket, comptes, matchmaking, salons, parties, pièces, SQLite
  app/      application React + Vite ; android/ et ios/ = projets natifs Capacitor
  Dockerfile, render.yaml, fly.toml   déploiement du serveur (qui sert aussi la version web)
```

- **Serveur autoritaire** : c'est le serveur qui mélange (source cryptographique), distribue, vérifie
  chaque coup et calcule les points. Un joueur ne reçoit jamais les cartes des autres.
- **Temps réel** : WebSocket, reconnexion automatique, reprise de la partie au retour de
  l'application, chrono par tour (20 s), le jeu joue automatiquement pour un joueur absent.
- **Même moteur partout** : l'application (hors ligne), le serveur et les bots utilisent le même
  code de règles (`core/`), couvert par les tests.
- **Stockage** : SQLite intégré à Node (`DATA_DIR/ronda.db`), écritures regroupées ; un ancien
  `profiles.json` est importé automatiquement.

## Mettre le serveur en ligne

Le serveur sert **aussi la version web** du jeu : une fois déployé, le jeu est jouable à son adresse
(et s'installe sur l'écran d'accueil comme une application).

### Option 1 — Render.com (le plus simple)

1. Sur render.com : **New + → Blueprint**, choisir ce dépôt et le fichier `ronda/render.yaml`
   (ou **New + → Web Service**, *Root Directory* `ronda`, *Runtime* Docker, et ajouter un disque monté sur `/data`).
2. Attendre le déploiement, puis ouvrir `https://<nom>.onrender.com` : le jeu s'affiche.
3. L'adresse WebSocket à donner aux applications est `wss://<nom>.onrender.com/ws`.

> Le plan gratuit de Render met le serveur en veille : prendre au minimum le plan *Starter*
> (les parties en cours vivent en mémoire, il faut un serveur toujours allumé).

### Option 2 — Fly.io

```bash
cd ronda
fly launch --no-deploy --copy-config      # garde fly.toml (région Madrid, proche du Maroc)
fly volumes create ronda_data --size 1
fly deploy
```

### Option 3 — Un VPS (OVH, Hetzner, Scaleway…)

```bash
cd ronda
docker build -t ronda .
docker run -d --restart unless-stopped -p 8080:8080 -v ronda-data:/data ronda
```

Mettre un reverse proxy HTTPS devant (Caddy : `ronda.mondomaine.ma { reverse_proxy localhost:8080 }`).

Capacité mesurée : **200 parties complètes jouées en parallèle** (100 en 1v1, 100 en 2v2 complétées
par des bots, sans aucun délai d'animation) sur un seul processus. Pic de latence de la boucle serveur :
35 ms avec des bots *Mtwasset*, 120 ms dans le pire cas où tous les bots sont des *M3allem* (une décision
experte coûte 1 à 3 ms). En conditions réelles (une carte toutes les 1 à 2 secondes par table), un petit
serveur tient plusieurs centaines de tables simultanées. Au-delà, voir
[Limites connues](#limites-connues-et-suite).

## Applications Android et iPhone

Les projets natifs sont dans `app/android` (Android Studio) et `app/ios` (Xcode, Swift Package Manager).

### Tester tout de suite sur Android (sans rien installer)

Chaque push lance la CI **« Ronda — tests et applications »** qui produit un **APK de test** :
GitHub → onglet **Actions** → dernier run → artefact **`ronda-dyalna-debug-apk`** → dézipper,
copier l'APK sur le téléphone et l'installer (autoriser les « sources inconnues »).

Pour que cet APK se connecte à votre serveur : GitHub → **Settings → Secrets and variables →
Actions → Variables** → ajouter `RONDA_SERVER_URL` = `wss://<votre-serveur>/ws`, puis relancer la CI.
Sans cette variable, l'APK fonctionne en mode hors ligne uniquement.

### Construire en local

```bash
cd ronda
cp app/.env.example app/.env.production   # renseigner VITE_SERVER_URL=wss://…/ws
npm run build -w @ronda/app
cd app
npx cap sync            # copie le jeu dans les projets natifs
npx cap open android    # Android Studio → Build → Generate Signed App Bundle
npx cap open ios        # Xcode (Mac) → Product → Archive
```

### Publier sur les stores (checklist)

1. **Identifiant** : `com.rondadyalna.app` (dans `app/capacitor.config.ts`, `android/app/build.gradle`,
   le projet Xcode). À choisir définitivement **avant** la première publication.
2. **Version** : `versionCode`/`versionName` (Android) et *Version/Build* (Xcode) à augmenter à chaque envoi.
3. **Google Play** (25 $ une fois) : créer l'application, envoyer l'**AAB** signé, remplir la fiche
   (textes prêts dans `docs/LANCEMENT.md`), le questionnaire de contenu (monnaie virtuelle non
   échangeable, pas d'argent réel), la sécurité des données (identifiant publicitaire si AdMob).
4. **App Store** (99 $/an, Mac requis) : App Store Connect → nouvelle app, archive Xcode, captures
   d'écran 6,7" et 6,5", questionnaire d'âge, confidentialité (*App Tracking Transparency* si AdMob).
5. Icône : `app/assets/icon-only.png` (1024×1024). Visuel de partage : `app/public/og-image.png`.
   Pour tout régénérer : `npx playwright install chromium` (une fois), `npm run dev`, puis
   `node app/scripts/icons.mjs` et `npx @capacitor/assets generate --ios --android` dans `app/`.

### Liens d'invitation

- `rondadyalna://join/CODE` ouvre directement la table dans l'application (déjà configuré).
- `https://<serveur>/join/CODE` affiche une page d'invitation (aperçu WhatsApp, bouton « Ouvrir
  dans l'application », « Jouer dans le navigateur », liens stores via `PLAY_STORE_URL`/`APP_STORE_URL`).
- Pour que ce lien https ouvre l'application directement (App Links / Universal Links) : définir
  `ANDROID_CERT_SHA256` et `IOS_APP_ID` sur le serveur et décommenter le bloc prévu dans
  `AndroidManifest.xml` (et ajouter *Associated Domains* dans Xcode).

## Monétisation : publicités et achats

Les pièces sont **virtuelles** : elles ne s'échangent jamais contre de l'argent réel (c'est ce qui
distingue un jeu de cartes d'un jeu d'argent, pour les stores comme pour la loi).

### Publicités — Google AdMob

- Vidéo **récompensée** (le joueur choisit : +400 pièces, 8 par jour) et **interstitielle** au plus une
  partie sur deux, jamais pendant le jeu, jamais pour les VIP ou « Sans publicité ».
- Consentement RGPD (formulaire Google UMP) et App Tracking Transparency (iOS) gérés.
- Aujourd'hui : **identifiants de TEST de Google**. Pour les vrais :
  1. Créer l'application dans AdMob (Android et iOS) et deux blocs (récompensé, interstitiel) par plate-forme.
  2. Remplacer l'ID d'application : `android/app/src/main/res/values/strings.xml` (`admob_app_id`) et
     `ios/App/App/Info.plist` (`GADApplicationIdentifier`).
  3. Renseigner les blocs dans `app/.env.production` (ou les variables GitHub) :
     `VITE_ADMOB_ANDROID_REWARDED`, `VITE_ADMOB_ANDROID_INTERSTITIAL`, `VITE_ADMOB_IOS_REWARDED`, `VITE_ADMOB_IOS_INTERSTITIAL`.
  4. Configurer le formulaire de consentement RGPD dans AdMob (*Confidentialité et messages*).

### Achats intégrés — RevenueCat

RevenueCat gère Google Play Billing et l'App Store, les reçus et les abonnements (gratuit jusqu'à
2 500 $ de revenus mensuels). Les pièces sont créditées **par le serveur**, jamais par l'application.

1. Créer les produits dans Google Play Console et App Store Connect avec **exactement** ces identifiants :

   | Identifiant | Contenu | Prix conseillé |
   | --- | --- | --- |
   | `ronda_coins_10k` | 10 000 pièces (consommable) | 0,99 € / 10 MAD |
   | `ronda_coins_60k` | 60 000 pièces (consommable) | 4,99 € / 49 MAD |
   | `ronda_coins_150k` | 150 000 pièces (consommable) | 9,99 € / 99 MAD |
   | `ronda_coins_1m` | 1 000 000 pièces (consommable) | 49,99 € / 499 MAD |
   | `ronda_starter` | 30 000 pièces + dos en or (non consommable) | 1,99 € / 19 MAD |
   | `ronda_no_ads` | Sans publicité (non consommable) | 2,99 € / 29 MAD |
   | `ronda_vip_month` | VIP (abonnement mensuel) | 4,99 € / 49 MAD |

2. RevenueCat : créer le projet, relier les deux stores, importer ces produits.
3. Clés publiques du SDK → `VITE_REVENUECAT_ANDROID_KEY` et `VITE_REVENUECAT_IOS_KEY`.
4. **Webhook** (Integrations → Webhooks) : URL `https://<serveur>/webhooks/revenuecat`, en-tête
   *Authorization* = la valeur de `REVENUECAT_WEBHOOK_SECRET` du serveur. Chaque achat est crédité une
   seule fois (idempotence par identifiant de transaction).

## Configuration (variables)

**Serveur** (variables d'environnement) :

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `PORT` | 8080 | Port HTTP/WebSocket |
| `DATA_DIR` | `./data` | Dossier de la base SQLite (volume persistant en production) |
| `STATIC_DIR` | — | Dossier de la version web à servir (`/srv/public` dans Docker) |
| `TURN_MS` | 20000 | Temps de réflexion d'un joueur |
| `BOT_FILL_MS` | 12000 | Attente avant de compléter une table avec des bots (0 = jamais) |
| `ROUND_PAUSE_MS` | 4500 | Pause entre deux manches |
| `ACCOUNTS_PER_IP_PER_HOUR` | 30 | Anti-abus sur la création de comptes |
| `REVENUECAT_WEBHOOK_SECRET` | — | Secret du webhook d'achats |
| `PLAY_STORE_URL`, `APP_STORE_URL` | — | Liens affichés sur la page d'invitation |
| `ANDROID_CERT_SHA256`, `ANDROID_PACKAGE`, `IOS_APP_ID` | — | App Links / Universal Links |

**Application** (au moment du build, voir `app/.env.example`) : `VITE_SERVER_URL`, `VITE_ADMOB_*`,
`VITE_REVENUECAT_*`.

Les montants (tables, récompenses, boutique, prix) sont dans [`core/src/economy.ts`](core/src/economy.ts),
partagé par le serveur et l'application.

## Tests et qualité

```bash
npm test            # 83 tests : règles, bots, stockage, parties complètes en ligne
npm run typecheck   # TypeScript strict sur les trois paquets
npm run build       # vérification + builds de l'application et du serveur
npm run e2e         # parcours joueurs dans Chromium (après npm run build ; npx playwright install chromium)
```

- **Règles** : tirage du donneur (égalités et nouveaux tirages), distribution, prises et suites,
  darba simple et en chaîne, missa, annonces (quatre rondas, tringas, égalités), dernière carte du
  donneur, fin de manche, victoire immédiate, conservation des 40 cartes sur des centaines de parties
  aléatoires, cohérence entre l'aperçu de prise et le coup réel.
- **Bots** : coups légaux, bon choix sur des positions types (dont la carte à garder pour la fin
  quand le bot distribue). En simulation avec toutes les règles (tirage du donneur, dernière carte ;
  parties en 41 points, 400 à 1 000 parties par duel), *Mtwasset* bat *Mbtadi* dans ~87 % des parties
  en 1v1 et ~86 % en 2v2 ; *M3allem* bat *Mtwasset* dans ~77 % des parties en 1v1 et ~65 % en 2v2
  (à quatre, la distribution pèse davantage). Dans les simulations de *M3allem*, chaque joueur raisonne
  sans voir les autres mains (auparavant il « voyait » la main suivante) : en 1v1, *M3allem* était ainsi
  passé de 67 % à 77 % contre *Mtwasset*.
- **Serveur** : vrais WebSockets — comptes, reconnexion, file d'attente, tables complétées par des bots,
  salons 2v2 entre amis, abandon, coup illégal, webhook d'achat idempotent, limite anti-abus.
- **Bout en bout** : le serveur construit sert la version web et deux navigateurs jouent réellement —
  partie hors ligne, table entre amis rejointe par lien d'invitation par un nouveau joueur puis lancée,
  file d'attente en ligne complétée par des bots signalés.
- La **CI GitHub** relance tout à chaque push, compile l'APK Android et l'image Docker
  (et l'application iOS à la demande : *Run workflow* → cocher iOS).

## Personnaliser

- **Nom affiché** : `appName` dans `app/capacitor.config.ts`, `app_name` dans
  `android/app/src/main/res/values/strings.xml`, `CFBundleDisplayName` dans `ios/App/App/Info.plist`,
  `app.name` dans `app/src/i18n/*.ts`, `name` dans `app/vite.config.ts` (manifeste web).
- **Économie, tables, boutique** : `core/src/economy.ts`.
- **Règles par défaut** : `core/src/engine/rules.ts`.
- **Textes** : `app/src/i18n/fr.ts`, `ar.ts`, `en.ts`.
- **Couleurs et thèmes de tapis** : `app/src/styles/global.css` et `game.css`.

## Limites connues et suite

- **Un seul serveur** : les parties en cours vivent en mémoire (un redémarrage les interrompt ; les
  comptes et pièces sont sauvegardés). Pour plusieurs serveurs : Redis pour les files d'attente et une
  base partagée (PostgreSQL) à la place de SQLite.
- **Récompense vidéo** : créditée à la demande de l'application, plafonnée à 8 par jour. Pour une
  sécurité maximale, activer la vérification côté serveur (SSV) d'AdMob — l'identifiant du joueur est
  déjà transmis à AdMob.
- **Connexion Google / Apple** : non incluse (le code de transfert suffit pour changer de téléphone).
- **Notifications push** (bonus prêt, ami qui t'invite) : à ajouter avec Firebase Cloud Messaging.
- Pistes : tournois du week-end, ligues saisonnières, liste d'amis, tutoriel interactif, mode 3 joueurs.
