// Génère assets/tryhackme-card.png, la carte TryHackMe affichée dans le README.
//
// Pourquoi un navigateur headless plutôt qu'un simple fetch : tryhackme.com est
// derrière un « Vercel Security Checkpoint » qui répond 429 à curl/node-fetch.
// Un vrai Chromium passe. On s'en sert donc pour deux choses : lire l'API
// publique, puis rendre le gabarit assets/thm/card.html.
//
// Appelé par .github/workflows/tryhackme-badge.yml.

import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const USER = (process.env.THM_USERNAME || 'Antoineh').trim();
const OUT = process.env.OUT_PATH || 'assets/tryhackme-card.png';
const API = `https://tryhackme.com/api/v2/public-profile?username=${encodeURIComponent(USER)}`;

const browser = await chromium.launch();

try {
  const page = await browser.newPage({
    viewport: { width: 1040, height: 320 },
    deviceScaleFactor: 2,          // rendu 2x : net sur écran haute densité
    colorScheme: 'dark',
  });

  // --- 1. stats -------------------------------------------------------------
  const res = await page.goto(API, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  if (!res || res.status() !== 200) {
    throw new Error(`l'API TryHackMe a répondu ${res ? res.status() : 'rien'} pour "${USER}"`);
  }

  const payload = JSON.parse(await page.evaluate(() => document.body.innerText));
  if (payload.status !== 'success' || !payload.data) {
    throw new Error(`réponse inattendue de l'API : ${JSON.stringify(payload).slice(0, 200)}`);
  }
  const data = payload.data;

  // Garde-fou : sans ce contrôle, une réponse dégradée produirait une carte
  // pleine de "undefined" qui serait quand même commitée.
  for (const k of ['username', 'level', 'totalPoints', 'completedRoomsNumber', 'badgesNumber', 'streak']) {
    if (data[k] === undefined || data[k] === null) throw new Error(`champ "${k}" absent de l'API`);
  }

  console.log(
    `  ${data.username} — niveau ${data.level}, ${data.totalPoints} pts, ` +
    `${data.completedRoomsNumber} rooms, ${data.badgesNumber} badges, streak ${data.streak}`
  );

  // --- 2. avatar en data URI ------------------------------------------------
  // Inliné plutôt que référencé : le PNG final doit être autonome, et le CDN
  // refuse parfois la requête selon l'IP appelante.
  let avatarDataUri = null;
  if (data.avatar) {
    const img = await page.request.get(data.avatar, { timeout: 30_000 }).catch(() => null);
    if (img && img.ok()) {
      const type = img.headers()['content-type'] || 'image/jpeg';
      avatarDataUri = `data:${type};base64,${(await img.body()).toString('base64')}`;
    } else {
      console.warn('  avatar non récupéré, la carte affichera le cercle vide');
    }
  }

  // --- 3. rendu -------------------------------------------------------------
  const card = pathToFileURL(resolve('assets/thm/card.html')).href;
  await page.goto(card, { waitUntil: 'load' });
  await page.evaluate(([d, a]) => window.render(d, a), [data, avatarDataUri]);

  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);

  await page.locator('.card').screenshot({ path: OUT, omitBackground: true });
  console.log(`  carte écrite dans ${OUT}`);
} finally {
  await browser.close();
}
