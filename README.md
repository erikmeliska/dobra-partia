# Dobrá Partia — monorepo

Monorepo pre **Dobrá Partia s.r.o.** — verejný web a operačnú appku firmy.
npm workspaces, bez turborepa (zatiaľ netreba).

```
dobra-partia/
├── apps/
│   ├── web/        # verejný web — www.dobrapartia.sk (Next.js)
│   └── app/        # operačná PWA — app.dobrapartia.sk (Next.js + next-auth)
├── packages/
│   └── db/          # zdieľaná Prisma schéma + klient — jediný zdroj pravdy o dátach
└── package.json      # npm workspaces, root skripty
```

## Čo je čo

- **`apps/web`** — marketingový web (titulka, blog, referencie, galéria, kontaktný formulár).
  Zber dopytov (`Dopyt`) a publikačný výstup. Detaily: [`apps/web/README.md`](apps/web/README.md).
- **`apps/app`** — operačná appka pre spoločníkov (PWA): login, inbox dopytov (stavy, filter,
  volať/SMS/mapa), push notifikácie o nových dopytoch. Základ pre ďalšie fázy (pipeline zákaziek,
  nákladový engine, fakturácia — pozri plán automatizácie).
- **`packages/db`** — Prisma schéma (`Partia`, `Uzivatel`, `PushSubscription`, `Zakaznik`,
  `Zakazka`, `Doklad`, `NakladovaPolozka`, `Media`, `Referencia`, `Dopyt`, `BlogPost`,
  `BlogCategory`, `MediaUpload`) a generovaný klient. Obe appky nad ňou pristupujú k tej istej
  Postgres databáze priamo (žiadne HTTP API medzi appkami) — s výnimkou interného notifikačného
  volania web → app (`POST /api/notify/dopyt`, chránené zdieľaným tokenom), keď príde nový dopyt
  cez web formulár.

Multi-tenant od prvého dňa: každá dátová entita (okrem `BlogPost`/`MediaUpload`/`BlogCategory`,
ktoré ostávajú per-web) má `partiaId`. Košická partia je tenant #1, `Dopyt.partiaId` je zatiaľ
nullable (backfill seedom).

## Príkazy (root)

| Príkaz | Čo robí |
|--------|---------|
| `npm run dev:web` | dev server webu na `http://localhost:3457` |
| `npm run dev:app` | dev server appky na `http://localhost:3458` |
| `npm run build:web` | produkčný build webu |
| `npm run build:app` | `prisma db push` do `packages/db` + produkčný build appky (appka je jediné miesto, ktoré pushuje schému) |
| `npm run seed` | seed dát (partia, seedovaní užívatelia, testové dáta) |
| `npm run import:referencie` | jednorazový import referencií z bývalého `references-data.json` do DB (už vykonaný, ostáva pre referenciu/reset) |

## Lokálny vývoj

1. Postgres v Dockeri, port **54329** (lokálny kontajner `dobrapartia-pg`).
2. `npm install` (postinstall generuje Prisma klient v `packages/db`).
3. `npm run dev:web` a/alebo `npm run dev:app` v samostatných termináloch.

## Env súbory

Každý workspace má vlastný `.env`: `apps/web/.env`, `apps/app/.env`, `packages/db/.env`.

| Premenná | web | app | db | Popis |
|----------|:---:|:---:|:--:|-------|
| `DATABASE_URL` | ✓ | ✓ | ✓ | Postgres connection string (lokálne Docker, na Verceli Prisma Postgres — **sensitive**, `vercel env pull` ju vráti prázdnu) |
| `WP_USERNAME` / `WP_PASSWORD` | ✓ | | | Basic auth pre WP-kompatibilné API a `POST /api/dopyt` |
| `DISCORD_WEBHOOK_URL` | ✓ | | | Discord notifikácia pri novom dopyte |
| `APP_URL` | ✓ | | | URL appky, kam web volá interný notifikačný endpoint (`/api/notify/dopyt`) |
| `INTERNAL_API_TOKEN` | ✓ | ✓ | | zdieľaný token pre interné volanie web → app (`/api/notify/dopyt`) |
| `AUTH_SECRET` | | ✓ | | next-auth session secret |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | | ✓ | | verejný VAPID kľúč pre web push (client-side) |
| `VAPID_PRIVATE_KEY` | | ✓ | | privátny VAPID kľúč pre web push (server-side) |
| `VAPID_SUBJECT` | | ✓ | | `mailto:` kontakt požadovaný web push štandardom |

`packages/db/.env` slúži pre skripty spúšťané priamo v `packages/db` (seed, import), preto obsahuje
len `DATABASE_URL` a WP/Discord premenné zdieľané so seed dátami — samostatný `.env` tam v
princípe potrebuje iba `DATABASE_URL`.

## Stav nasadenia

- **`apps/web`** beží v produkcii na `www.dobrapartia.sk` — zatiaľ zo starej (pred-monorepo)
  štruktúry repozitára na Verceli; prepnutie root directory existujúceho Vercel projektu na
  `apps/web` čaká na deploy checklist.
- **`apps/app`** je hotová lokálne (login, inbox dopytov, PWA skelet, push notifikácie), ale
  **ešte nie je nasadená**. Nasadenie (nový Vercel projekt, env premenné, DNS `app.dobrapartia.sk`,
  merge do `main`) je Task 10 plánu — rieši sa spolu s používateľom, nie automaticky.

## Ďalšie dokumenty

- Architektúra a rozhodnutia: [`docs/superpowers/specs/2026-07-11-monorepo-app-pwa-design.md`](docs/superpowers/specs/2026-07-11-monorepo-app-pwa-design.md)
- Implementačný plán a deploy checklist: [`docs/superpowers/plans/2026-07-11-monorepo-prestavba.md`](docs/superpowers/plans/2026-07-11-monorepo-prestavba.md)
- Detaily webu: [`apps/web/README.md`](apps/web/README.md)
