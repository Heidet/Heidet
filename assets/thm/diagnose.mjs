// Sonde tryhackme.com depuis l'endroit où ce script tourne, et écrit un rapport
// Markdown dans assets/thm/_diagnostic.md (commité par le workflow, parce que
// les logs d'Actions ne sont lisibles qu'avec les droits admin du dépôt).
//
// Passe 2 : le premier diagnostic a montré que tryhackme.com renvoie 429 avec
// une page « Vercel Security Checkpoint » qui ne pose jamais de cookie, alors
// que navigator.webdriver valait true. On teste donc si le challenge se résout
// une fois les marqueurs d'automatisation masqués, et on vide le contenu de la
// page de challenge pour savoir ce qu'elle attend réellement.
//
// Fichier de travail : à supprimer une fois le diagnostic terminé.

import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const USER = process.env.THM_USERNAME || 'Antoineh';
const API = `https://tryhackme.com/api/v2/public-profile?username=${USER}`;
const CHECKPOINT = /Security Checkpoint|Just a moment|Attention Required/i;

const lignes = [];
const log = (s) => { console.log(s); lignes.push(s); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const court = (s, n = 120) => String(s).replace(/\s+/g, ' ').trim().slice(0, n);

log('# Diagnostic TryHackMe — passe 2 (masquage de l\'automatisation)\n');

try {
  const ip = await (await fetch('https://api.ipify.org?format=json')).json();
  log(`- IP publique : \`${ip.ip}\``);
} catch { log('- IP publique : non déterminée'); }
log('');

// --- navigateur maquillé ----------------------------------------------------
// --disable-blink-features=AutomationControlled retire le drapeau que Chromium
// expose normalement ; le reste des marqueurs est corrigé côté page.
const browser = await chromium.launch({
  channel: 'chromium',
  args: [
    '--disable-blink-features=AutomationControlled',
    '--disable-features=IsolateOrigins,site-per-process',
  ],
}).catch(() => chromium.launch({ args: ['--disable-blink-features=AutomationControlled'] }));

const ctx = await browser.newContext({
  locale: 'fr-FR',
  timezoneId: 'Europe/Paris',
  viewport: { width: 1440, height: 900 },
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
  extraHTTPHeaders: { 'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8' },
});

await ctx.addInitScript(() => {
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  Object.defineProperty(navigator, 'languages', { get: () => ['fr-FR', 'fr', 'en'] });
  Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
  Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
  Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
  window.chrome = { runtime: {}, app: {}, csi: () => {}, loadTimes: () => {} };
  const q = window.navigator.permissions.query;
  window.navigator.permissions.query = (p) =>
    p.name === 'notifications' ? Promise.resolve({ state: Notification.permission }) : q(p);
});

const page = await ctx.newPage();

log('## Marqueurs après maquillage\n');
await page.goto('about:blank');
log(`- \`navigator.webdriver\` : \`${await page.evaluate(() => navigator.webdriver)}\``);
log(`- \`navigator.languages\` : \`${await page.evaluate(() => navigator.languages.join(','))}\``);
log(`- \`window.chrome\` présent : \`${await page.evaluate(() => !!window.chrome)}\``);
log('');

// --- le challenge se résout-il maintenant ? ---------------------------------
log('## Le challenge se résout-il ?\n');
log('| t | HTTP | titre | cookies |');
log('|---|------|-------|---------|');

let franchi = false;
const t0 = Date.now();
for (let i = 0; i < 8; i++) {
  const r = await page.goto('https://tryhackme.com/', { waitUntil: 'networkidle', timeout: 60_000 })
                      .catch(() => null);
  const titre = await page.title().catch(() => '?');
  const cookies = (await ctx.cookies()).map((c) => c.name);
  log(`| ${Math.round((Date.now() - t0) / 1000)}s | ${r ? r.status() : 'échec'} | ${court(titre, 34)} | ${cookies.join(', ') || '—'} |`);
  if (r && r.status() === 200 && !CHECKPOINT.test(titre)) { franchi = true; break; }
  await sleep(8_000);
}
log('');
log(franchi ? '**Challenge franchi.**' : '**Challenge toujours pas franchi.**');
log('');

// --- que contient la page de challenge ? ------------------------------------
// C'est l'information qui manquait : sans elle on corrige a l'aveugle.
log('## Contenu de la page de challenge\n');
try {
  const info = await page.evaluate(() => ({
    html: document.documentElement.outerHTML.length,
    scripts: [...document.scripts].map((s) => s.src || `[inline ${s.textContent.length} car.]`),
    texte: document.body.innerText,
    meta: [...document.querySelectorAll('meta')].map((m) => m.outerHTML),
  }));
  log(`- Taille du HTML : ${info.html} caractères`);
  log(`- Texte visible : \`${court(info.texte, 200)}\``);
  log('- Scripts :');
  info.scripts.forEach((s) => log(`  - \`${court(s, 130)}\``));
  log('- Balises meta :');
  info.meta.slice(0, 8).forEach((m) => log(`  - \`${court(m, 130)}\``));

  const inline = await page.evaluate(() =>
    [...document.scripts].filter((s) => !s.src).map((s) => s.textContent).join('\n').slice(0, 1500));
  if (inline.trim()) {
    log('\n<details><summary>Script inline du challenge</summary>\n');
    log('```js');
    log(inline);
    log('```\n</details>');
  }
} catch (e) { log(`- lecture impossible : \`${court(e.message, 100)}\``); }
log('');

// --- si franchi, l'API repond-elle ? ----------------------------------------
if (franchi) {
  const r = await page.goto(API, { waitUntil: 'domcontentloaded', timeout: 45_000 }).catch(() => null);
  const corps = await page.evaluate(() => document.body.innerText).catch(() => '');
  log(`## API après franchissement\n\n- HTTP ${r ? r.status() : 'échec'} — \`${court(corps, 150)}\``);
}

await browser.close();

writeFileSync('assets/thm/_diagnostic.md', lignes.join('\n') + '\n', 'utf8');
console.log('\nRapport écrit dans assets/thm/_diagnostic.md');
