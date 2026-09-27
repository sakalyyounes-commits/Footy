// Assemble le paquet « Ronda-Soiree » : le jeu complet à lancer sur un ordinateur pour jouer entre
// amis sur le Wi-Fi de la maison. Prérequis : `npm run build -w @ronda/app && npm run build -w @ronda/server`.
// Résultat : dist/soiree/Ronda-Soiree/ et dist/soiree/Ronda-Soiree.zip
import { execFileSync } from 'node:child_process';
import { chmodSync, cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'dist', 'soiree');
const pkg = join(outDir, 'Ronda-Soiree');
const guide = 'https://github.com/sakalyyounes-commits/Footy/blob/claude/sharp-euler-el6hsz/ronda/GUIDE.md';

for (const need of ['app/dist/index.html', 'server/dist/server.js']) {
  if (!existsSync(join(root, need))) throw new Error(`${need} manquant : lance d'abord les builds de l'application et du serveur.`);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(pkg, { recursive: true });
cpSync(join(root, 'server/dist/server.js'), join(pkg, 'server.js'));
cpSync(join(root, 'app/dist'), join(pkg, 'web'), { recursive: true });
// server.js est un module ES : Node.js doit le savoir, même dans ses versions un peu anciennes.
writeFileSync(join(pkg, 'package.json'), `${JSON.stringify({ name: 'ronda-soiree', private: true, type: 'module' }, null, 2)}\n`);
// Ce fichier active le mode soirée (QR code, adresse Wi-Fi, page /soiree) au lancement de server.js.
writeFileSync(join(pkg, 'ronda-soiree.json'), `${JSON.stringify({ localParty: true, port: 8080 }, null, 2)}\n`);

const crlf = (s) => s.replace(/\r?\n/g, '\r\n');

writeFileSync(
  join(pkg, 'LANCER-RONDA-WINDOWS.bat'),
  crlf(`@echo off
chcp 65001 >nul
title Ronda Dyalna - serveur de la soiree
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 goto nonode
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)"
if errorlevel 1 goto oldnode
set NODE_NO_WARNINGS=1
node "%~dp0server.js"
echo.
echo Le serveur est arrete. Appuie sur une touche pour fermer cette fenetre.
pause >nul
exit /b 0

:nonode
echo.
echo   Node.js n'est pas installe sur cet ordinateur.
echo   1. La page de telechargement s'ouvre : installe la version LTS.
echo   2. Relance ensuite ce fichier (double-clic).
echo.
start "" "https://nodejs.org/fr/download"
pause
exit /b 1

:oldnode
echo.
echo   Ta version de Node.js est trop ancienne : installe la version LTS
echo   depuis https://nodejs.org puis relance ce fichier.
echo.
start "" "https://nodejs.org/fr/download"
pause
exit /b 1
`),
);

const unixLauncher = (openCmd) => `#!/bin/bash
# Ronda Dyalna : lance le serveur de la soirée (laisse cette fenêtre ouverte pendant la partie).
cd "$(dirname "$0")" || exit 1
for p in /usr/local/bin /opt/homebrew/bin "$HOME/.volta/bin"; do
  [ -x "$p/node" ] && PATH="$p:$PATH"
done
if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "  Node.js n'est pas installé. Installe la version LTS depuis https://nodejs.org"
  echo "  puis relance ce fichier."
  ${openCmd} "https://nodejs.org/fr/download" >/dev/null 2>&1
  read -r -p "Appuie sur Entrée pour fermer…" _
  exit 1
fi
if ! node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)"; then
  echo "  Ta version de Node.js est trop ancienne : installe la version LTS depuis https://nodejs.org"
  read -r -p "Appuie sur Entrée pour fermer…" _
  exit 1
fi
NODE_NO_WARNINGS=1 node server.js
read -r -p "Le serveur est arrêté. Appuie sur Entrée pour fermer…" _
`;

writeFileSync(join(pkg, 'LANCER-RONDA-MAC.command'), unixLauncher('open'));
writeFileSync(join(pkg, 'lancer-ronda-linux.sh'), unixLauncher('xdg-open'));
chmodSync(join(pkg, 'LANCER-RONDA-MAC.command'), 0o755);
chmodSync(join(pkg, 'lancer-ronda-linux.sh'), 0o755);

writeFileSync(
  join(pkg, 'LISEZ-MOI.txt'),
  crlf(`RONDA DYALNA : SOIRÉE ENTRE AMIS
================================

Jouer ce soir sur le Wi-Fi de la maison, en 4 étapes :

1. Installe Node.js une seule fois : https://nodejs.org (bouton « LTS »).
2. Lance le jeu sur cet ordinateur :
     - Windows : double-clique sur LANCER-RONDA-WINDOWS.bat
       (si Windows demande l'autorisation réseau, clique « Autoriser »)
     - Mac : clic droit sur LANCER-RONDA-MAC.command, puis « Ouvrir »
     - Linux : ./lancer-ronda-linux.sh
3. Une page s'ouvre avec un QR code. Chaque ami connecte son téléphone au
   MÊME Wi-Fi, puis scanne le QR code (ou tape l'adresse affichée).
4. Une personne choisit « Jouer avec des amis » puis « Créer la table » ;
   les autres rejoignent avec le code. Les places vides peuvent être des bots.

Laisse la fenêtre noire (le serveur) ouverte pendant toute la soirée.
Pour arrêter : ferme-la.

Guide complet (installation, test, mise en ligne) :
${guide}
`),
);

rmSync(join(outDir, 'Ronda-Soiree.zip'), { force: true });
execFileSync('zip', ['-rqX', 'Ronda-Soiree.zip', 'Ronda-Soiree'], { cwd: outDir });
console.log(`Paquet prêt : ${join(outDir, 'Ronda-Soiree.zip')}`);
