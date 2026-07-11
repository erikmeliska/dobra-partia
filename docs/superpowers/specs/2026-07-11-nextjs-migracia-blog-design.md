# Migrácia na Next.js + blog cez WordPress fake API — design

**Dátum:** 2026-07-11
**Stav:** schválené používateľom (brainstorming session)

## Cieľ

Preniesť statický web dobrapartia.sk (4 HTML stránky) na najnovší Next.js na Verceli
a pridať blog napájaný cez WordPress-kompatibilné fake API — identická implementácia
ako v `trisoft-web`. Blog sa zobrazí na titulke (3 najnovšie články) aj na samostatnej
`/blog` stránke.

## Rozhodnutia (z brainstormingu)

| Otázka | Rozhodnutie |
|---|---|
| Rozsah portu | **1:1 port dizajnu** — rovnaký vizuál a funkcie, žiadny redizajn |
| Databáza | **Neon Postgres + Prisma** (Vercel Marketplace), ako trisoft |
| Publisher článkov | **Rovnaký n8n/AI pipeline ako trisoft**, len s vlastnými credentials |
| Referencie/galéria | **Ostávajú v `references-data.json`**, DB migrácia niekedy neskôr |
| Styling | **Tailwind 3 build-time** (pôvodný web používa Tailwind Play CDN) |

## Stack

- Next.js 16 (App Router), React 19
- Tailwind CSS 3 — brand farby z pôvodného webu do `tailwind.config`
  (`navy #1e3a5f`, `teal #5bb7b4`, `terracotta #c47152`, `sand #f9f7f2`),
  zvyšné custom CSS zo `<style>` bloku do `globals.css`
- Prisma 6 + Neon Postgres (`DATABASE_URL`)
- `@vercel/blob` pre upload obrázkov článkov
- Leaflet cez npm (client komponent), Font Awesome ostáva CDN

## Fake WP API — kópia z trisoft-web

Prenesené takmer bezo zmeny z `trisoft-web`:

- `src/lib/wp-auth.js` — HTTP Basic Auth, env `WP_AUTH` alebo `WP_USERNAME`/`WP_PASSWORD`
- `src/lib/prisma.js` — singleton klient
- Endpointy:
  - `GET/POST /api/wp-json/wp/v2/posts`
  - `GET/PUT/DELETE /api/wp-json/wp/v2/posts/[id]`
  - `GET/POST /api/wp-json/wp/v2/categories`
  - `POST /api/wp-json/wp/v2/media` — Vercel Blob, lokálny fallback `/public/uploads`
- Response shape = WordPress formát (`{ id, title: { rendered }, content: { rendered },
  excerpt: { rendered }, slug, status, featured_media, ... }`)
- Prisma modely `BlogPost`, `BlogCategory`, `MediaUpload` — 1:1 z trisoft schémy
  (bez Audit* modelov)
- Každý write revaliduje `/`, `/blog`, `/blog/[slug]`, `/sitemap.xml` cez `revalidatePath`

### Env premenné

| Premenná | Účel |
|---|---|
| `DATABASE_URL` | Neon Postgres |
| `WP_USERNAME` / `WP_PASSWORD` | Basic Auth pre publikačný pipeline (nové credentials, nie trisoft-ové) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob pre media upload |

## Stránky

- `/` — port `index.html`: hero, služby, referencie carousel, galéria realizácií
  s modalom a tag filtrami, kontaktný formulár (Nominatim vyhľadávanie adries,
  Leaflet mapa, POST na n8n webhook) + **nová sekcia „Z nášho blogu"**
  s 3 najnovšími publikovanými článkami, umiestnená pred kontaktným formulárom
- `/blog` — zoznam publikovaných článkov (karta: obrázok, titulok, perex, dátum)
- `/blog/[slug]` — detail článku, HTML obsah, OG meta per článok
- `/o-nas`, `/ochrana-sukromia`, `/obchodne-podmienky` — porty existujúcich HTML
- Interaktívne časti (menu, carousel, galéria modal, formulár+mapa) = client
  komponenty; zvyšok server komponenty
- `references-data.json` sa importuje staticky

## SEO a kontinuita

- 301 redirecty: `/index.html → /`, `/o-nas.html → /o-nas`,
  `/ochrana-sukromia.html → /ochrana-sukromia`, `/obchodne-podmienky.html → /obchodne-podmienky`
- Zachované OG/Twitter meta tagy a canonical URL (cez Metadata API)
- `sitemap.js` — statické stránky + blog slugy z DB
- `robots.txt`

## Error handling

- API: 401 bez/so zlým auth, 404 neexistujúci post, 400 validácia povinných polí —
  správanie prenesené z trisoft
- Blog stránky: prázdny stav („zatiaľ žiadne články") keď DB nič nevráti;
  homepage sekcia sa pri 0 článkoch skryje celá
- Formulár: existujúce správanie (validácia, GDPR checkbox, chybové hlášky) sa prenesie

## Overenie

1. Lokálne `next dev` + vizuálne porovnanie so starým webom (stránka po stránke)
2. API test cez cURL: create draft → publish → media upload → update → delete
3. Kontrola revalidácie (nový článok sa objaví na `/` aj `/blog`)
4. Preview deploy na Vercel, potom produkcia

## Mimo rozsahu

- Redizajn čohokoľvek
- Migrácia referencií/galérie do DB
- Nový n8n workflow (rieši sa mimo tohto repa, API len dostane credentials)
- Admin UI pre blog
