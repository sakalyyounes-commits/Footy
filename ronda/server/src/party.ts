import qrcode from 'qrcode-generator';

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** QR code (SVG, modules noirs sur fond blanc) qui ouvre l'adresse donnée. */
export function qrSvg(text: string): string {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  return qr.createSvgTag({ cellSize: 8, margin: 2, scalable: true });
}

/**
 * Page « soirée entre amis », ouverte automatiquement sur l'ordinateur qui fait tourner le jeu :
 * un grand QR code que les amis scannent avec leur téléphone (même Wi-Fi).
 */
export function partyPage(urls: string[], localUrl: string): string {
  const main = urls[0] ?? '';
  const others = urls.slice(1);
  const body = main
    ? `<div class="qr">${qrSvg(main)}</div>
  <div class="url">${escapeHtml(main.replace(/^http:\/\//, ''))}</div>
  <ol>
    <li>Chaque joueur connecte son téléphone <b>au même Wi-Fi</b> que cet ordinateur.</li>
    <li>Il <b>scanne le QR code</b> avec l'appareil photo, ou tape l'adresse ci-dessus dans Chrome ou Safari.</li>
    <li>Il choisit son prénom. Une personne crée la table dans <b>« Jouer avec des amis »</b>,
      les autres la rejoignent avec le code à 5 lettres.</li>
  </ol>
  <a class="btn" href="${escapeHtml(main)}">Jouer aussi sur cet ordinateur</a>
  ${
    others.length
      ? `<p class="small">Le QR code ne fonctionne pas ? Essaie aussi : ${others.map((u) => `<b>${escapeHtml(u.replace(/^http:\/\//, ''))}</b>`).join(' · ')}</p>`
      : ''
  }`
    : `<p class="warn">Aucun réseau Wi-Fi détecté. Connecte cet ordinateur au Wi-Fi de la maison, puis relance le jeu.</p>
  <a class="btn" href="${escapeHtml(localUrl)}">Jouer seul sur cet ordinateur</a>`;
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Ronda Dyalna — soirée entre amis</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<style>
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px 16px;
    font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; color: #fff7e0;
    background: radial-gradient(ellipse at 50% 0%, #3b2a7a 0%, #1a1240 45%, #0b0820 100%); }
  main { width: min(100%, 560px); text-align: center; padding: 28px 24px 30px; border-radius: 28px;
    background: linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.02));
    border: 2px solid rgba(255, 206, 84, .55); box-shadow: 0 30px 80px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.2); }
  h1 { margin: 0; font-size: 30px; letter-spacing: .5px;
    background: linear-gradient(180deg, #fff3b0, #f7c948 55%, #c98a12); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .sub { margin: 6px 0 20px; opacity: .85; }
  .qr { width: min(78vw, 300px); margin: 0 auto; padding: 14px; background: #fff; border-radius: 22px;
    box-shadow: 0 0 0 6px rgba(255, 206, 84, .9), 0 18px 40px rgba(0,0,0,.5); }
  .qr svg { display: block; width: 100%; height: auto; }
  .url { margin: 20px 0 8px; font-size: clamp(22px, 6vw, 34px); font-weight: 800; letter-spacing: 1px; color: #ffe38a;
    word-break: break-all; }
  ol { text-align: left; line-height: 1.5; padding-left: 22px; margin: 18px 0 22px; }
  li { margin: 8px 0; }
  .btn { display: inline-block; padding: 15px 26px; border-radius: 999px; font-weight: 800; font-size: 17px; color: #fff;
    text-decoration: none; background: linear-gradient(180deg, #5fe27a, #1f9d3c 55%, #137a2b);
    box-shadow: 0 6px 0 #0d5a1f, 0 12px 24px rgba(0,0,0,.45), inset 0 2px 0 rgba(255,255,255,.45); }
  .small { font-size: 14px; opacity: .8; margin-top: 18px; }
  .warn { background: rgba(255, 90, 90, .15); border: 1px solid rgba(255, 120, 120, .5); padding: 14px; border-radius: 14px; }
  .keep { margin-top: 22px; font-size: 13px; opacity: .7; }
</style>
</head>
<body>
<main>
  <h1>Ronda Dyalna 🃏</h1>
  <p class="sub">La soirée est prête ! Invite tes amis à la table.</p>
  ${body}
  <p class="keep">Laisse la fenêtre du serveur ouverte pendant toute la partie.</p>
</main>
</body>
</html>`;
}
