# Guide de Ronda Dyalna — pour débutant complet

Pas besoin de connaître GitHub ni la programmation : ce guide te donne **les liens directs** et
**chaque clic**. Compte 10 minutes pour la première soirée.

| Je veux… | Lien direct |
| --- | --- |
| Jouer **ce soir** entre amis (Wi-Fi de la maison) | [Télécharger Ronda-Soiree.zip](https://github.com/sakalyyounes-commits/Footy/releases/download/ronda-latest/Ronda-Soiree.zip) + [Node.js](https://nodejs.org/fr/download) |
| Installer l'application **Android** | [Télécharger Ronda-Dyalna.apk](https://github.com/sakalyyounes-commits/Footy/releases/download/ronda-latest/Ronda-Dyalna.apk) |
| Voir tous les téléchargements | [Page des versions](https://github.com/sakalyyounes-commits/Footy/releases/tag/ronda-latest) |
| Mettre le jeu **en ligne** (jouer à distance) | [Partie 4](#4-mettre-le-jeu-en-ligne-pour-jouer-à-distance) |

---

## 1. Jouer ce soir entre amis (sur le Wi-Fi de la maison)

**Ce qu'il faut :** un ordinateur (Windows, Mac ou Linux) et les téléphones de tes amis, tous sur le
**même Wi-Fi**. Les amis n'installent rien : ils jouent dans le navigateur de leur téléphone.

### Étape 1 — Installer Node.js sur l'ordinateur (une seule fois, 3 minutes)

Node.js est le programme qui fait tourner le serveur du jeu.

1. Ouvre **https://nodejs.org/fr/download**.
2. Télécharge la version **LTS** (le bouton mis en avant) pour ton système.
3. Ouvre le fichier téléchargé et clique **Suivant / Continuer** jusqu'à la fin (réglages par défaut).

### Étape 2 — Télécharger le jeu

1. Clique sur **[Ronda-Soiree.zip](https://github.com/sakalyyounes-commits/Footy/releases/download/ronda-latest/Ronda-Soiree.zip)** :
   le téléchargement démarre tout seul.
2. **Dézippe** le fichier :
   - Windows : clic droit sur `Ronda-Soiree.zip` → **Extraire tout…** → **Extraire** ;
   - Mac : double-clic sur le fichier zip.
3. Tu obtiens un dossier **Ronda-Soiree**.

### Étape 3 — Lancer le jeu

- **Windows** : dans le dossier, double-clique sur **`LANCER-RONDA-WINDOWS.bat`**.
  - Si un écran bleu « Windows a protégé votre ordinateur » apparaît : clique **Informations
    complémentaires** puis **Exécuter quand même**.
  - Si Windows demande l'accès au réseau pour Node.js : coche **Réseaux privés** et clique
    **Autoriser l'accès**. *(Sans ça, les téléphones ne pourront pas se connecter.)*
- **Mac** : fais un **clic droit** (ou Ctrl + clic) sur **`LANCER-RONDA-MAC.command`** → **Ouvrir** →
  **Ouvrir**.
  - Si le Mac refuse : **Réglages Système → Confidentialité et sécurité** → en bas, **Ouvrir quand
    même**, puis relance.
  - Si le Mac demande d'accepter les connexions entrantes pour « node » : **Autoriser**.
- **Linux** : dans un terminal ouvert dans le dossier, tape `./lancer-ronda-linux.sh`.

Une **fenêtre noire** s'ouvre (c'est le serveur : **laisse-la ouverte toute la soirée**) et ton
navigateur affiche une page avec un **QR code** et une adresse du type `192.168.1.23:8080`.

### Étape 4 — Les amis rejoignent la partie

1. Chaque ami connecte son téléphone au **même Wi-Fi** que l'ordinateur.
2. Il **scanne le QR code** avec l'appareil photo (ou tape l'adresse dans Chrome ou Safari).
3. Il choisit son **pseudo** et son **avatar**.
4. **Une seule personne** va dans **« Jouer avec des amis »** → choisit **2 contre 2** (ou 1 contre 1)
   → **« Créer la table »**. Un **code de 5 lettres** et un **QR code** s'affichent.
5. Les autres vont dans **« Jouer avec des amis »** → tapent le code → **« Rejoindre »**
   (ou scannent le QR code de la table).
6. Il manque quelqu'un ? Les places vides sont prises par des bots au lancement ; l'hôte peut aussi
   choisir leur niveau (🤖1 débutant, 🤖2 confirmé, 🤖3 expert). Puis **« Lancer la partie »**.

En 2 contre 2, les **partenaires sont face à face** (en haut et en bas de la table).

> 💡 L'ordinateur peut aussi jouer : clique **« Jouer aussi sur cet ordinateur »** sur la page du
> QR code.

---

## 2. Tester le jeu (checklist)

À faire une fois, seul, avant l'arrivée des amis (10 minutes) :

1. **Sur l'ordinateur** : lance le jeu (étape 3), clique **« Jouer aussi sur cet ordinateur »** →
   **« Hors ligne »** → **« Commencer »**. Joue quelques cartes contre les bots.
2. **Avec ton téléphone** : scanne le QR code → choisis un pseudo → **« Jouer avec des amis »** →
   **« Créer la table »** → **« Lancer la partie »** (les places vides sont prises par des bots) →
   joue une manche.
3. **À deux** : l'ordinateur crée une table, le téléphone la rejoint avec le code → lancez.

À vérifier : les cartes se posent et se ramassent, les bandeaux **« Darba ! »** et **« Missa ! »**
s'affichent, les scores montent, la fin de manche affiche le récapitulatif.

**Règles jouées :** 4 cartes à la première donne puis 3 en 2 contre 2 ; ronda (paire) 1 point,
tringa (brelan) 5 points ; darba (prendre la carte que vient de poser le joueur précédent) : b'wahed
1 point, b'khamsa 5, b'achra 10 ; missa (vider le tapis) 1 point ; chaque carte au-delà de 20 vaut
1 point ; la première équipe à 41 gagne (21, 31 ou 61 au choix).

---

## 3. Installer l'application Android (facultatif)

1. Sur le téléphone Android, ouvre **[Ronda-Dyalna.apk](https://github.com/sakalyyounes-commits/Footy/releases/download/ronda-latest/Ronda-Dyalna.apk)**.
2. Ouvre le fichier téléchargé. Android demande d'autoriser l'installation depuis le navigateur :
   **Paramètres → Autoriser cette source**, puis **Installer**.
3. Si une ancienne version est déjà installée, **désinstalle-la d'abord**.

Aujourd'hui, l'application sert à jouer **hors ligne contre les bots**. Pour jouer en ligne depuis
l'application, il faut d'abord mettre le serveur en ligne (partie 4).

**iPhone :** pas d'installation possible sans compte développeur Apple. Les amis sur iPhone jouent
dans **Safari**, ça marche parfaitement (Partager → **Sur l'écran d'accueil** pour une icône).

---

## 4. Mettre le jeu en ligne (pour jouer à distance)

Pour jouer avec des amis qui ne sont **pas chez toi** (4G, autre ville), le serveur doit tourner sur
Internet. **Render.com** le fait gratuitement (offre **Free**).

1. Crée un compte : **https://dashboard.render.com/register** → bouton **GitHub** (connecte-toi
   avec ton compte GitHub `sakalyyounes-commits`).
2. Ouvre **https://dashboard.render.com/web/new** (« New Web Service »).
3. Dans la liste des dépôts, choisis **Footy**. S'il n'apparaît pas : **Configure account** →
   autorise l'accès au dépôt **Footy** → reviens.
4. Remplis exactement :

   | Champ | Valeur |
   | --- | --- |
   | Name | `ronda-dyalna` |
   | Language | **Docker** |
   | Branch | `claude/sharp-euler-el6hsz` |
   | Root Directory | `ronda` |
   | Instance Type | **Free** |

5. Clique **Deploy Web Service**. Attends 5 à 10 minutes (« Live » en vert).
6. Ton lien apparaît en haut, par exemple **`https://ronda-dyalna.onrender.com`**. Envoie-le à tes
   amis : ils jouent dans le navigateur, de n'importe où. Les invitations WhatsApp du jeu utilisent
   automatiquement ce lien.

À savoir sur l'offre gratuite : après 15 minutes sans joueur, le serveur s'endort ; le premier
chargement prend alors environ 1 minute. Les profils et pièces repartent de zéro à chaque mise à jour
(une offre payante avec disque persistant les conserve).

**Relier l'application Android à ce serveur :** sur GitHub → dépôt Footy → **Settings → Secrets and
variables → Actions → Variables → New repository variable** : nom `RONDA_SERVER_URL`, valeur
`wss://ronda-dyalna.onrender.com/ws` (avec ton adresse). Ensuite **Actions → Ronda — tests et
applications → Run workflow** : quelques minutes plus tard, le lien de l'APK donne une application
connectée.

---

## 5. En cas de souci

| Problème | Solution |
| --- | --- |
| « Node.js n'est pas installé » | Installe la version LTS depuis https://nodejs.org puis relance le fichier. |
| Le téléphone n'ouvre pas la page du QR code | Vérifie que le téléphone est sur le **même Wi-Fi** (pas en 4G). Sur Windows, autorise Node.js sur les **réseaux privés** (Pare-feu Windows Defender → Autoriser une application). Essaie l'autre adresse affichée dans la fenêtre noire. |
| Le Wi-Fi d'un café ou d'un hôtel bloque les appareils entre eux | Fais un partage de connexion depuis un téléphone et connecte-y l'ordinateur et les autres téléphones. |
| « Port déjà utilisé » | Le jeu prend tout seul le port suivant (8081…) : utilise l'adresse affichée. Ou ferme l'ancienne fenêtre du serveur. |
| La page reste sur « Connexion au serveur… » | La fenêtre noire du serveur a été fermée : relance le fichier. |
| Un joueur a perdu la connexion | Il rouvre la même adresse sur le même téléphone : il retrouve sa place (en attendant, le jeu joue pour lui). |
| Mac : « impossible d'ouvrir » | Clic droit → Ouvrir, ou Réglages Système → Confidentialité et sécurité → Ouvrir quand même. Dernier recours : ouvre l'app **Terminal**, tape `cd ` (avec un espace), glisse le dossier Ronda-Soiree dans la fenêtre, appuie sur Entrée, puis tape `node server.js` et Entrée. |

---

## 6. Et après ?

- **Publier sur Google Play / App Store**, activer les **publicités** et les **achats** : voir le
  [README technique](README.md) (sections « Applications Android et iPhone » et « Monétisation »)
  et le [plan de lancement](docs/LANCEMENT.md).
- Le code source complet est dans le dossier [`ronda/`](.) de la branche
  `claude/sharp-euler-el6hsz`.
