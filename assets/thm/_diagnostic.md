# Diagnostic TryHackMe — passe 2 (masquage de l'automatisation)

- IP publique : `20.109.38.185`

## Marqueurs après maquillage

- `navigator.webdriver` : `undefined`
- `navigator.languages` : `fr-FR,fr,en`
- `window.chrome` présent : `true`

## Le challenge se résout-il ?

| t | HTTP | titre | cookies |
|---|------|-------|---------|
| 1s | 429 | Vercel Security Checkpoint | — |
| 9s | 429 | Vercel Security Checkpoint | — |
| 18s | 429 | Vercel Security Checkpoint | — |
| 27s | 429 | Vercel Security Checkpoint | — |
| 35s | 429 | Vercel Security Checkpoint | — |
| 44s | 429 | Vercel Security Checkpoint | — |
| 53s | 429 | Vercel Security Checkpoint | — |
| 61s | 429 | Vercel Security Checkpoint | — |

**Challenge toujours pas franchi.**

## Contenu de la page de challenge

- Taille du HTML : 29797 caractères
- Texte visible : `Échec de la vérification de votre navigateur Code 21 Point de contrôle de sécurité Vercel | iad1::1787235084-L7HqXG3vG3UC7J4xD98JVkMnveLT5vca`
- Scripts :
  - `[inline 23347 car.]`
- Balises meta :
  - `<meta charset="utf-8">`
  - `<meta name="viewport" content="width=device-width, initial-scale=1">`
  - `<meta name="theme-color" content="#000">`

<details><summary>Script inline du challenge</summary>

```js
(function(e,a){const c=d,t=e();for(;;)try{if(-parseInt(c(257))/1*(-parseInt(c(243))/2)+-parseInt(c(241))/3*(-parseInt(c(259))/4)+-parseInt(c(247))/5*(parseInt(c(235))/6)+parseInt(c(256))/7*(parseInt(c(237))/8)+parseInt(c(255))/9+-parseInt(c(266))/10*(parseInt(c(270))/11)+-parseInt(c(244))/12===a)break;t.push(t.shift())}catch{t.push(t.shift())}})(_,905427);const q=function(){let e=!0;return function(a,c){const t=e?function(){const n=d;if(c){const r=c[n(245)+"ly"](a,arguments);return c=null,r}}:function(){};return e=!1,t}}(),S=q(void 0,function(){const e=d;return S[e(254)+e(253)+"ng"]()["sea"+e(258)](e(260)+e(251)+e(264)+e(267))[e(254)+e(253)+"ng"]()["con"+e(268)+e(271)+"or"](S)[e(250)+e(258)](e(260)+".+)"+e(264)+e(267))});S();function b(e,a){const c=d,t=document[c(265)+c(248)+c(252)+c(246)+"Id"](e);t&&(t[c(269)+c(263)+c(238)]=a)}function D(e,a,c){const t=d;document[t(265)+"Elemen"+t(246)+"Id"](e)?.[t(236)+"le"][t(249)+t(262)+"perty"](a,c)}function B(e){const a=d;document[a(265)+a(248)+"men"+a(246)+"Id"](e)?.[a(239)+a(261)](),document["que"+a(242)+a(240)+"ctor"](e)?.[a(239)+a(261)]()}function d(e,a){const c=_();return d=function(t,n){return t=t-(-1*6747+-3*-133+6583),c[t]},d(e,a)}function _(){const e=["4140392VdEHdb","(((","ove","Pro","erT","+)+","get","566330mUeXVY",")+$","str","inn","275xpgwDC","uct","8233074uolnGw","sty","1041376ficGYW","ext","rem","ele","3QGYwtf","ryS","4VTIlBG","653280NifcvE","app","tBy","5kfnsuG","Ele","set","sea",".+)","men","tri","toS","13501035SzeBFy",
```
</details>

