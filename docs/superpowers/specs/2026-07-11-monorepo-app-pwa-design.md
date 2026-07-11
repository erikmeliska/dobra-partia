# Dizajn: prestavba na monorepo — web (kanál) + operačná PWA

> Dátum: 11. 7. 2026 · Stav: schválený
> Nadväzuje na `../business/biznis-plan.md`, `../business/handover.md` a `../business/plan-automatizacie.md` (v3).
> **Toto rozhodnutie nahrádza** architektonické rozhodnutie z `plan-automatizacie.md` („web sa stane zároveň operačnou aplikáciou firmy — jeden repozitár, jeden deploy, `/admin` vo webe").

## Rozhodnutie

Správa a manažment biznisu sa **nestavia ako `/admin` vo verejnom webe**, ale ako **samostatná operačná PWA** v tom istom monorepe. Web ostáva kanálom: zber dopytov a publikačný výstup (referencie, galéria, blog). Gro funkcionality (pipeline zákaziek, nákladový engine, fakturácia, publikačný automat, zmluvy, dashboard) žije v PWA.

Dôvody:

1. **Rôzna kadencia a riziko** — marketingový web je SEO-kritický a stabilný; operačná appka sa iteruje denne. Nezávislé deploye = zmena v appke nikdy neriskuje web, ktorý živí dopyty.
2. **Multi-tenant „biznis v krabici" (Fáza 7)** — partnerom sa predáva systém, nie košický web. Samostatná appka je produktom od prvého dňa; `/admin` vo webe by sa neskôr musel vyrezávať.
3. **PWA požiadavky** — offline capture fronta, push notifikácie, manifest a service worker sa ladia čistejšie na vlastnom origin-e (`app.dobrapartia.sk`).
4. **Bezpečnostná hranica** — auth, firemné dáta a marže nepatria na verejnú doménu.

Forma: **PWA v Next.js** (nie natívna appka). Kamera cez `<input capture>`, offline fronta cez service worker, push funguje aj na iOS (16.4+, po pridaní na plochu). Ak PWA neskôr narazí na limity (background GPS), dá sa zabaliť do Capacitor/Expo wrappera bez prepisovania.

## 1. Štruktúra repozitára

Existujúci repo `erikmeliska/dobra-partia` (dnes = celý web) sa prestavia na monorepo cez npm workspaces:

```
dobra-partia/
├── apps/
│   ├── web/        # existujúci Next.js web (presunutý cez git mv, história zachovaná)
│   └── app/        # NOVÁ operačná PWA — app.dobrapartia.sk
├── packages/
│   └── db/         # Prisma schéma + klient — jediný zdroj pravdy o dátach
└── package.json    # npm workspaces
```

Štartuje sa na čistých npm workspaces bez turborepa — Vercel má natívnu monorepo podporu a dve appky ho nepotrebujú; turbo sa doplní, až keď budú build časy bolieť.

Vercel: existujúci projekt `dobra-partia` dostane root directory `apps/web` (doména www.dobrapartia.sk ostáva); nový projekt `dobra-partia-app` s root `apps/app` a doménou `app.dobrapartia.sk`. Jedna Postgres DB (existujúca Prisma Postgres na Verceli) zdieľaná oboma projektmi.

## 2. Deľba zodpovedností

| | `apps/web` (verejný) | `apps/app` (operačný) |
|---|---|---|
| **Zber** | formulár → `Dopyt` (funguje), rozšírenie: upload fotiek, preferovaný termín, checkbox „som firma / správca" | inbox dopytov, pipeline, celý životný cyklus zákazky |
| **Publikovanie** | galéria referencií a blog — číta z DB len `published` záznamy | publikačný automat zapisuje `Referencia` / `Media` / `BlogPost` |
| **Vlastní dáta** | nič — číta/zapisuje výhradne cez `packages/db` | všetko ostatné: zákazky, doklady, náklady, zmluvy, zákazníci |

Medzi appkami **nie je HTTP API** — obe sú server-side Next.js nad tou istou DB cez zdieľaný Prisma klient z `packages/db`. n8n ostáva integračnou vrstvou pre tretie strany (SMS, WhatsApp, SuperFaktúra, eKasa retry fronta, počasie). Existujúce WP-kompatibilné API a `POST /api/dopyt` (Basic auth) na webe ostávajú bez zmeny.

## 3. Dátový model (`packages/db`)

Preberá existujúcu schému (`BlogPost`, `BlogCategory`, `MediaUpload`, `Dopyt`) a rozširuje ju podľa Fázy 0 plánu automatizácie:

- `Partia` — tenant; košická partia = tenant #1. **Multi-tenant od prvého dňa**: každá nová entita má `partiaId`.
- `Uzivatel` — 2 seedovaní užívatelia (spoločníci), väzba na `Partia`.
- `Zakaznik`, `Zakazka`, `Doklad`, `NakladovaPolozka`, `Media`, `Referencia`.
- Doplnenie `partiaId` do `Dopyt` (dnes ho nemá).
- Migrácia `references-data.json` (6 testimonialov, 9 projektov, 28 fotiek) do DB — web začne referencie čítať z DB, appka ich vie od Fázy 5 publikovať.

Schéma sa synchronizuje `prisma db push` **len z jedného miesta** (build `apps/app`), aby sa deploye nebili. Produkčná `DATABASE_URL` je na Verceli sensitive — do nového projektu sa nastaví ručne; lokálny dev na Docker PG (port 54329).

## 4. Nová PWA (`apps/app`) — skelet

- **Auth:** Auth.js (credentials) pre 2 užívateľov, dlhé sessions (~30 dní), mobile-first login. Žiadny signup — seed.
- **PWA:** manifest + ručne písaný service worker (bez bundlera — Serwist/precaching až keď bude reálne treba), inštalácia na plochu, Web Push (nový dopyt pípne obom spoločníkom). Offline capture fronta (IndexedDB → sync) sa dodá spolu s capture buttonom vo Fáze 3 — v skelete by bola mŕtvy kód; SW základ pre ňu skelet dodáva.
- **UX princípy z plánu automatizácie platia:** jeden capture button, veľké tlačidlá, ovládanie jednou rukou v rukaviciach, písanie na klávesnici = zlyhanie UX.
- **Prvý funkčný obsah:** inbox dopytov — zoznam z `Dopyt`, zmena stavu (novy → kontaktovany → dokonceny), tlačidlá volať/SMS. Appka je užitočná od prvého dňa nasadenia.

## 5. Mapovanie fáz plánu automatizácie

Obsah fáz 1–7 z `plan-automatizacie.md` sa nemení — mení sa len „kde": všade, kde plán hovorí `/admin`, sa číta `apps/app`.

| Fáza | Zmena oproti plánu |
|------|--------------------|
| 0 | rozširuje sa o: prestavbu na monorepo, `packages/db`, skelet PWA (auth, manifest, push, inbox dopytov), Vercel projekt + DNS `app.dobrapartia.sk` |
| 1 (lead engine) | bez zmeny — n8n + web; push notifikácia ide navyše do PWA |
| 2 (zákazková appka) | stavia sa v `apps/app` namiesto `/admin` |
| 3–6 | bez zmeny, všetko v `apps/app` |
| 7 (partneri) | benefit zadarmo: appka je už samostatný produkt |

Súčasť implementácie: aktualizovať architektonické rozhodnutie v `../business/plan-automatizacie.md`.

## 6. Riziká a ošetrenie

- **Prestavba nesmie zhodiť produkčný web** — presun do `apps/web` na vetve, overiť Vercel preview deploy pred merge; zmena root directory vo Vercel projekte súčasne s merge.
- **Drift schémy** — vylúčený konštrukciou: jedna schéma v `packages/db`, obe appky importujú ten istý klient.
- **iOS push** vyžaduje pridanie na plochu — súčasť onboardingu; fallback notifikácie cez Telegram/SMS (n8n) ostávajú.
- **eKasa API nedokumentované** (Fáza 3) — mimo scope tejto prestavby; offline fronta v skelete s ním počíta.

## 7. Testovanie

- CI/build: `next build` oboch appiek + `prisma generate` musí prejsť na každej vetve.
- Po presune webu: smoke test formulára (dopyt → DB + Discord), blog WP API, redirecty, sitemap.
- PWA: inštalácia na reálny mobil (iOS aj Android), push notifikácia, login, inbox dopytov.
- DB: `db push` na lokálnom Dockri, seed užívateľov a tenantu, migrácia referencií overená proti webu.

## Mimo scope tejto prestavby

Funkcionalita fáz 1–7 (lead engine automaty, pipeline UI, nákladový engine, fakturácia, publikačný automat, zmluvy, dashboard) — každá fáza dostane vlastný implementačný plán. Táto prestavba dodáva iba fundament: monorepo, zdieľanú DB vrstvu, rozšírenú schému a nasadený skelet PWA s inboxom dopytov.
