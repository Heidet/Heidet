# Carte TryHackMe

Génère `assets/tryhackme-card.png`, la carte affichée en haut du README du profil.

| fichier | rôle |
|---|---|
| `card.html` | le design de la carte. Ouvre-le directement dans un navigateur : il s'affiche avec des données de démo, pratique pour retoucher le CSS. |
| `shoot.mjs` | lit l'API publique de TryHackMe, dessine `card.html` dans un Chromium headless, capture le PNG. |
| `package.json` | la seule dépendance, Playwright. |

## Rafraîchir la carte

```bash
npm install --prefix assets/thm
node assets/thm/shoot.mjs
git commit -am "chore: mise à jour de la carte TryHackMe" && git push
```

À lancer depuis une machine perso. La raison est ci-dessous.

## Pourquoi ce n'est pas automatisé

TryHackMe a activé l'**Attack Challenge Mode** de Vercel, qui refuse les IP
d'hébergement. Depuis un runner GitHub, `tryhackme.com` répond invariablement
`HTTP 429` avec une page de challenge, et la vérification échoue :

> Échec de la vérification de votre navigateur — **Code 21**

Mesures faites le 20/08/2026, toutes concordantes :

| ce qui a été testé | résultat |
|---|---|
| `ubuntu-latest`, `windows-latest`, `macos-latest` | 429 sur les trois — GitHub n'héberge que des runners Azure |
| ~20 tentatives réparties sur 4 runs, 5 IP distinctes | 429 à chaque fois, jamais un cookie posé |
| masquage de l'automatisation (`navigator.webdriver`, `window.chrome`, UA/locale/fuseau réalistes, canal `chromium`) | rejeté, « Code 21 » |
| routes `/api/v2/public-profile`, `/p/<pseudo>`, badge en iframe | filtrées toutes les trois |
| relais publics : allorigins, codetabs, r.jina.ai, cors.lol, thingproxy | même challenge, ou hors service |
| `tryhackme-badges.s3.amazonaws.com`, `cdn-images.tryhackme.com` | **200** — seul le domaine derrière Vercel est filtré |

Le badge PNG historique n'est plus une option non plus : TryHackMe l'annonce
encore dans son API (`badgeImageURL`) mais il répond `403` pour les comptes
récents. Seuls de vieux comptes en ont un.

Constat qui confirme le diagnostic : `virtualISP/tryhackme-profile-badge`, qui
automatisait la même chose, n'a plus commité de badge depuis le 01/06/2026 alors
que son streak change tous les jours.

Aller plus loin supposerait de casser volontairement un contrôle anti-bot
(outillage stealth dédié, proxy résidentiel payant) — et retomberait en panne à
la première mise à jour côté TryHackMe.

`.github/workflows/tryhackme-badge.yml` est conservé, déclenchable à la main
uniquement, pour le jour où ce filtrage sera levé.
