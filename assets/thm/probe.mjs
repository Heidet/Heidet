// Sonde minimale : depuis ce runner, l'API TryHackMe répond-elle ?
//
// Les runners ubuntu-latest sont filtrés (Attack Challenge Mode de Vercel,
// « Code 21 »). Les runners macOS et Windows de GitHub ne sont pas sur les
// mêmes plages d'adresses : d'où cette sonde, lancée sur les trois.
//
// Pas de Playwright ici : si l'IP passe, un `fetch` brut suffit à recevoir le
// JSON ; si elle est filtrée, on reçoit la page de challenge. Ça rend la sonde
// rapide et identique sur les trois systèmes.

import { writeFileSync } from 'node:fs';

const USER = process.env.THM_USERNAME || 'Antoineh';
const OS = process.env.RUNNER_OS || 'inconnu';
const OUT = process.env.OUT_FILE || 'sonde.md';
const API = `https://tryhackme.com/api/v2/public-profile?username=${USER}`;

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

let ip = '?';
try { ip = (await (await fetch('https://api.ipify.org?format=json')).json()).ip; } catch {}

let verdict, detail;
try {
  const r = await fetch(API, { headers: { 'User-Agent': UA, 'Accept-Language': 'fr-FR,fr;q=0.9' } });
  const t = await r.text();

  if (r.status === 200 && t.trim().startsWith('{') && t.includes('"totalPoints"')) {
    const d = JSON.parse(t).data;
    verdict = '**PASSE**';
    detail = `${d.totalPoints} pts, ${d.completedRoomsNumber} rooms, niveau ${d.level}`;
  } else if (/Security Checkpoint/i.test(t)) {
    const code = t.match(/Code\s*(\d+)/i);
    verdict = 'bloqué';
    detail = `checkpoint Vercel, HTTP ${r.status}${code ? `, ${code[0]}` : ''}`;
  } else {
    verdict = 'inattendu';
    detail = `HTTP ${r.status} — ${t.replace(/\s+/g, ' ').slice(0, 80)}`;
  }
} catch (e) {
  verdict = 'échec';
  detail = e.message.replace(/\s+/g, ' ').slice(0, 80);
}

const ligne = `| ${OS} | \`${ip}\` | ${verdict} | ${detail} |`;
console.log(ligne);
writeFileSync(OUT, ligne + '\n', 'utf8');
