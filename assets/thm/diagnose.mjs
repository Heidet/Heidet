// Sonde tryhackme.com depuis l'endroit où ce script tourne, et écrit un rapport
// Markdown. Objectif : savoir précisément ce qui est filtré depuis un runner
// GitHub, au lieu de corriger à l'aveugle.
//
// Le rapport est commité dans le repo (et non seulement affiché dans les logs)
// parce que les logs d'Actions ne sont lisibles qu'avec les droits admin.
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

log('# Diagnostic TryHackMe depuis un runner GitHub\n');

// --- contexte ---------------------------------------------------------------
try {
  const ip = await (await fetch('https://api.ipify.org?format=json')).json();
  log(`- IP publique du runner : \`${ip.ip}\``);
} catch { log('- IP publique du runner : non déterminée'); }
log(`- Node : \`${process.version}\``);
log('');

// --- 1. fetch brut ----------------------------------------------------------
log('## 1. `fetch` brut, sans navigateur\n');
for (const [nom, url] of [['API publique', API], ['page profil', `https://tryhackme.com/p/${USER}`]]) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 Chrome/140.0.0.0' } });
    const t = await r.text();
    log(`- ${nom} : **HTTP ${r.status}**${CHECKPOINT.test(t) ? ' — page de challenge' : ''} — \`${court(t, 90)}\``);
  } catch (e) { log(`- ${nom} : échec — \`${court(e.message, 90)}\``); }
}
log('');

// --- 2. navigateur ----------------------------------------------------------
let browser, canal = 'chromium';
try { browser = await chromium.launch({ channel: 'chromium' }); }
catch { canal = 'headless par défaut'; browser = await chromium.launch(); }
log(`## 2. Navigateur (canal : ${canal})\n`);

const ctx = await browser.newContext({
  locale: 'fr-FR',
  timezoneId: 'Europe/Paris',
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
});
const page = await ctx.newPage();

log(`- User-Agent réel : \`${await page.evaluate(() => navigator.userAgent)}\``);
log(`- \`navigator.webdriver\` : \`${await page.evaluate(() => navigator.webdriver)}\``);
log('');

// Le point clé : le challenge finit-il par se résoudre si on attend ?
log('### Le challenge se résout-il avec le temps ?\n');
log('| t | page | HTTP | titre | cookies |');
log('|---|------|------|-------|---------|');
const t0 = Date.now();
let franchi = false;
for (let i = 0; i < 12; i++) {
  const r = await page.goto('https://tryhackme.com/', { waitUntil: 'domcontentloaded', timeout: 45_000 })
                      .catch(() => null);
  const titre = await page.title().catch(() => '?');
  const cookies = (await ctx.cookies()).map((c) => c.name);
  const s = Math.round((Date.now() - t0) / 1000);
  log(`| ${s}s | accueil | ${r ? r.status() : 'échec'} | ${court(titre, 40)} | ${cookies.join(', ') || '—'} |`);
  if (r && r.status() === 200 && !CHECKPOINT.test(titre)) { franchi = true; break; }
  await sleep(10_000);
}
log('');
log(franchi ? '**Challenge franchi.**' : '**Challenge jamais franchi après ~2 min.**');
log('');

// --- 3. quelles routes sont filtrées ? --------------------------------------
// Le badge en iframe est conçu pour être embarqué sur des sites tiers : il est
// possible qu'il soit exempté de la protection, contrairement à l'API.
log('### Routes testées une par une\n');
log('| route | HTTP | titre / début du corps |');
log('|-------|------|------------------------|');
const routes = [
  ['API public-profile', API],
  ['page profil', `https://tryhackme.com/p/${USER}`],
  ['badge iframe (id tiers)', 'https://tryhackme.com/api/v2/badges/public-profile?userPublicId=140548'],
  ['badge S3 legacy', 'https://tryhackme-badges.s3.amazonaws.com/tryhackme.png'],
  ['CDN avatars', 'https://cdn-images.tryhackme.com/user-avatars/69de52c5502824f8288572fe-1787220248276'],
];
for (const [nom, url] of routes) {
  const r = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 }).catch(() => null);
  let apercu = '';
  try { apercu = CHECKPOINT.test(await page.title()) ? 'CHECKPOINT' : court(await page.evaluate(() => document.body.innerText), 70); }
  catch { apercu = '(non textuel)'; }
  log(`| ${nom} | ${r ? r.status() : 'échec'} | \`${apercu}\` |`);
}
log('');

await browser.close();

// --- 4. relais publics ------------------------------------------------------
log('## 3. Relais publics, appelés depuis le runner\n');
log('| relais | résultat |');
log('|--------|----------|');
const enc = encodeURIComponent(API);
const relais = [
  ['allorigins', `https://api.allorigins.win/raw?url=${enc}`],
  ['codetabs', `https://api.codetabs.com/v1/proxy?quest=${enc}`],
  ['jina reader', `https://r.jina.ai/${API}`],
  ['cors.lol', `https://api.cors.lol/?url=${enc}`],
  ['thingproxy', `https://thingproxy.freeboard.io/fetch/${API}`],
];
for (const [nom, url] of relais) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 25_000);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    const txt = await r.text();
    const ok = txt.includes('"totalPoints"');
    log(`| ${nom} | ${ok ? '**OK — JSON reçu**' : `HTTP ${r.status} — \`${court(txt, 70)}\``} |`);
  } catch (e) { log(`| ${nom} | échec — \`${court(e.message, 60)}\` |`); }
}

writeFileSync('assets/thm/_diagnostic.md', lignes.join('\n') + '\n', 'utf8');
console.log('\nRapport écrit dans assets/thm/_diagnostic.md');
