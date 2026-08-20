# Diagnostic TryHackMe depuis un runner GitHub

- IP publique du runner : `64.236.176.230`
- Node : `v22.23.2`

## 1. `fetch` brut, sans navigateur

- API publique : **HTTP 429** — page de challenge — `<!DOCTYPE html><html lang="en" data-astro-cid-nbv56vs3> <head><meta charset="utf-8"><meta `
- page profil : **HTTP 429** — page de challenge — `<!DOCTYPE html><html lang="en" data-astro-cid-nbv56vs3> <head><meta charset="utf-8"><meta `

## 2. Navigateur (canal : chromium)

- User-Agent réel : `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36`
- `navigator.webdriver` : `true`

### Le challenge se résout-il avec le temps ?

| t | page | HTTP | titre | cookies |
|---|------|------|-------|---------|
| 0s | accueil | 429 | Vercel Security Checkpoint | — |
| 10s | accueil | 429 | Vercel Security Checkpoint | — |
| 20s | accueil | 429 | Vercel Security Checkpoint | — |
| 30s | accueil | 429 | Vercel Security Checkpoint | — |
| 40s | accueil | 429 | Vercel Security Checkpoint | — |
| 50s | accueil | 429 | Vercel Security Checkpoint | — |
| 60s | accueil | 429 | Vercel Security Checkpoint | — |
| 71s | accueil | 429 | Vercel Security Checkpoint | — |
| 81s | accueil | 429 | Vercel Security Checkpoint | — |
| 91s | accueil | 429 | Vercel Security Checkpoint | — |
| 101s | accueil | 429 | Vercel Security Checkpoint | — |
| 111s | accueil | 429 | Vercel Security Checkpoint | — |

**Challenge jamais franchi après ~2 min.**

### Routes testées une par une

| route | HTTP | titre / début du corps |
|-------|------|------------------------|
| API public-profile | 429 | `CHECKPOINT` |
| page profil | 429 | `CHECKPOINT` |
| badge iframe (id tiers) | 429 | `CHECKPOINT` |
| badge S3 legacy | 200 | `` |
| CDN avatars | 200 | `` |

## 3. Relais publics, appelés depuis le runner

| relais | résultat |
|--------|----------|
| allorigins | HTTP 200 — `<!DOCTYPE html><html lang="en" data-astro-cid-nbv56vs3> <head><meta ch` |
| codetabs | HTTP 522 — `<!DOCTYPE html> <!--[if lt IE 7]> <html class="no-js ie6 oldie" lang="` |
| jina reader | HTTP 200 — `Title: Vercel Security Checkpoint URL Source: https://tryhackme.com/ap` |
| cors.lol | HTTP 429 — `Rate limit exceeded` |
| thingproxy | échec — `fetch failed` |
