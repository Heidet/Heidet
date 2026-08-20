// Génère assets/tryhackme-card.png, la carte TryHackMe affichée dans le README.
//
// Pourquoi un navigateur headless plutôt qu'un simple fetch : tryhackme.com est
// derrière un « Vercel Security Checkpoint ». Depuis une IP de datacenter — donc
// depuis un runner GitHub — les premières requêtes reçoivent une page de
// challenge JavaScript en HTTP 429 au lieu de la réponse attendue. Ce challenge
// se résout tout seul dans un vrai navigateur, pose un cookie, et les requêtes
// suivantes passent. D'où la séquence ci-dessous : on ouvre d'abord la page
// d'accueil pour laisser le challenge s'exécuter, puis on appelle l'API.
//
// Appelé par .github/workflows/tryhackme-badge.yml.

import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const USER = (process.env.THM_USERNAME || 'Antoineh').trim();
const OUT = process.env.OUT_PATH || 'assets/tryhackme-card.png';
const API = `https://tryhackme.com/api/v2/public-profile?username=${encodeURIComponent(USER)}`;

const CHECKPOINT = /Security Checkpoint|Just a moment|Attention Required/i;
const TENTATIVES = 4;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Le mode headless historique s'annonce comme « HeadlessChrome » dans l'User-Agent
// et échoue à plusieurs tests d'empreinte. Le canal « chromium » utilise le
// nouveau headless, bien plus proche d'un navigateur ordinaire.
async function lancer() {
  try {
    return await chromium.launch({ channel: 'chromium' });
  } catch {
    console.warn('  canal "chromium" indisponible, repli sur le headless par défaut');
    return await chromium.launch();
  }
}

const browser = await lancer();

try {
  const page = await browser.newPage({
    viewport: { width: 1040, height: 320 },
    deviceScaleFactor: 2,          // rendu 2x : net sur écran haute densité
    colorScheme: 'dark',
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
    extraHTTPHeaders: { 'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8' },
  });

  // --- 1. franchir le checkpoint --------------------------------------------
  // Sur une IP résidentielle cette étape est instantanée (aucun challenge).
  await page.goto('https://tryhackme.com/', { waitUntil: 'domcontentloaded', timeout: 60_000 })
            .catch(() => {});
  for (let i = 0; i < 12 && CHECKPOINT.test(await page.title()); i++) {
    await sleep(2_000);
  }

  // --- 2. stats -------------------------------------------------------------
  let data = null;
  let dernierEchec = 'aucune tentative';

  for (let essai = 1; essai <= TENTATIVES && !data; essai++) {
    const res = await page.goto(API, { waitUntil: 'domcontentloaded', timeout: 60_000 })
                          .catch((e) => { dernierEchec = e.message.split('\n')[0]; return null; });

    if (res) {
      const corps = await page.evaluate(() => document.body.innerText);

      if (res.status() === 200 && corps.trim().startsWith('{')) {
        const payload = JSON.parse(corps);
        if (payload.status === 'success' && payload.data) {
          data = payload.data;
          break;
        }
        dernierEchec = `réponse inattendue : ${corps.slice(0, 160)}`;
      } else if (CHECKPOINT.test(await page.title())) {
        dernierEchec = `checkpoint Vercel (HTTP ${res.status()}) — challenge non franchi`;
      } else {
        dernierEchec = `HTTP ${res.status()} : ${corps.slice(0, 160)}`;
      }
    }

    if (!data && essai < TENTATIVES) {
      const attente = essai * 8_000;                    // 8s, 16s, 24s
      console.warn(`  tentative ${essai}/${TENTATIVES} échouée (${dernierEchec})`);
      console.warn(`  nouvelle tentative dans ${attente / 1000}s...`);
      await sleep(attente);
    }
  }

  if (!data) {
    throw new Error(
      `impossible de lire l'API TryHackMe pour "${USER}" après ${TENTATIVES} tentatives.\n` +
      `  Dernier échec : ${dernierEchec}\n` +
      `  Si c'est un checkpoint Vercel, l'IP du runner GitHub est filtree par\n` +
      `  TryHackMe. Repli possible : lancer ce script depuis une machine perso\n` +
      `  (npm install --prefix assets/thm && node assets/thm/shoot.mjs) puis\n` +
      `  committer le PNG. La carte deja presente dans le README reste affichee.`
    );
  }

  // Garde-fou : sans ce contrôle, une réponse dégradée produirait une carte
  // pleine de "undefined" qui serait quand même commitée.
  for (const k of ['username', 'level', 'totalPoints', 'completedRoomsNumber', 'badgesNumber', 'streak']) {
    if (data[k] === undefined || data[k] === null) throw new Error(`champ "${k}" absent de l'API`);
  }

  console.log(
    `  ${data.username} — niveau ${data.level}, ${data.totalPoints} pts, ` +
    `${data.completedRoomsNumber} rooms, ${data.badgesNumber} badges, streak ${data.streak}`
  );

  // --- 3. avatar en data URI ------------------------------------------------
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

  // --- 4. rendu -------------------------------------------------------------
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
