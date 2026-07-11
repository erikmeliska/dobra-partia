# Prestavba na monorepo + operačná PWA — implementačný plán

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prestavať repo na monorepo (apps/web + apps/app + packages/db) a dodať skelet operačnej PWA (auth, push, inbox dopytov) nasadenej na app.dobrapartia.sk, pričom web ostáva kanálom (dopyty + publikovanie).

**Architecture:** npm workspaces monorepo; existujúci web sa presúva do `apps/web` bez zmeny správania; Prisma schéma sa sťahuje do `packages/db` (jediný zdroj pravdy, custom output, CJS singleton export); nová Next.js PWA v `apps/app` zdieľa DB cez ten istý balík. Medzi appkami nie je HTTP API okrem jedného interného push endpointu (`/api/notify/dopyt`, shared secret). Spec: `docs/superpowers/specs/2026-07-11-monorepo-app-pwa-design.md`.

**Tech Stack:** Next.js 16 (App Router, Server Actions), React 19, Prisma 6 + Postgres, Tailwind CSS 3, next-auth v5 (beta, credentials + JWT), web-push, vitest, Vercel (2 projekty z 1 repa).

## Global Constraints

- Jazyk kódu: **JavaScript** (.js/.jsx), nie TypeScript — konzistentné s existujúcim webom.
- Názvy doménových entít a polí **po slovensky** (`Zakazka`, `Dopyt`, `partiaId`…) — konzistentné s existujúcou `Dopyt`.
- **Multi-tenant od prvého dňa**: každý nový model má `partiaId`.
- `prisma db push` beží **len z buildu `apps/app`** (po Task 4); web build len `next build`.
- Produkčná `DATABASE_URL` je na Verceli *sensitive* (nedá sa pullnúť) — do nového projektu ju zadáva užívateľ ručne; lokálny dev = Docker Postgres na porte 54329.
- Web (www.dobrapartia.sk) nesmie mať výpadok: všetko sa robí na vetve `monorepo-prestavba`, root directory vo Vercel projekte sa mení až tesne pred merge (Task 10).
- Tailwind farby značky: `navy #1e3a5f`, `teal #5bb7b4`, `terracotta #c47152`, `sand #f9f7f2` (zdieľané oboma appkami).
- Mobile-first UX v `apps/app`: veľké tlačidlá (min. výška ~48 px), ovládateľné jednou rukou.
- Verzie závislostí: `next ^16.2.10`, `react ^19.2.7`, `prisma`/`@prisma/client` `^6.19.3`, `tailwindcss ^3.4.19`.
- Repo root po prestavbe = doterajší adresár `web/` (jediný git repo; `../business` nie je verzovaný).

---

### Task 1: Monorepo skelet — presun webu do `apps/web`

**Files:**
- Create: `package.json` (nový root, workspaces)
- Create: `.gitignore` (root)
- Move: všetky doterajšie root súbory → `apps/web/` (okrem `docs/` a `.git`)

**Interfaces:**
- Produces: workspace `dobra-partia-web` v `apps/web`, spustiteľný cez `npm run build:web` z rootu. Ďalšie tasky predpokladajú túto štruktúru.

- [ ] **Step 1: Vetva a presun trackovaných súborov**

```bash
cd /Users/ericsko/Projekty/_Bizz/TriSoft/dobra-partia/web
git checkout -b monorepo-prestavba
mkdir -p apps/web packages
for f in $(git ls-tree --name-only HEAD); do
  [ "$f" = "docs" ] && continue
  git mv "$f" apps/web/
done
```

`docs/` (specs a plans) ostáva v roote.

- [ ] **Step 2: Presun netrackovaných súborov a vyčistenie**

```bash
mv .env apps/web/.env
rm -rf node_modules .next
```

- [ ] **Step 3: Root package.json**

Create `package.json`:

```json
{
  "name": "dobra-partia",
  "version": "1.0.0",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev:web": "npm run dev -w dobra-partia-web",
    "dev:app": "npm run dev -w dobra-partia-app",
    "build:web": "npm run build -w dobra-partia-web",
    "build:app": "npm run build -w dobra-partia-app"
  }
}
```

(`postinstall` s `prisma generate` sa pridá až v Task 2, keď vznikne workspace `@dobra-partia/db` — `npm -w` na neexistujúci workspace zhadzuje install. `dev:app`/`build:app` fungujú až od Task 4 — to je v poriadku.)

- [ ] **Step 4: Root .gitignore**

Create `.gitignore`:

```
node_modules/
.next/
.env
.env.*
packages/db/generated/
```

- [ ] **Step 5: Inštalácia a overenie buildu**

```bash
npm install
npm run build:web
```

Expected: `next build` prejde presne ako pred presunom (prisma generate + db push + build; `.env` číta prisma z cwd `apps/web`). Ak build zlyhá na cestách, skontroluj, že `apps/web/jsconfig.json` a `apps/web/tailwind.config.js` sa presunuli spolu so `src/`.

- [ ] **Step 6: Dev smoke test**

```bash
npm run dev:web &
sleep 5 && curl -s http://localhost:3457 | grep -o '<title>[^<]*' && kill %1
```

Expected: titulok stránky sa vypíše.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: prestavba na monorepo — web presunutý do apps/web"
```

---

### Task 2: `packages/db` — zdieľaná Prisma vrstva

**Files:**
- Move: `apps/web/prisma/schema.prisma` → `packages/db/prisma/schema.prisma`
- Create: `packages/db/package.json`, `packages/db/index.js`, `packages/db/.env`
- Modify: `apps/web/src/lib/prisma.js`, `apps/web/package.json`, `apps/web/next.config.mjs`, root `package.json` (postinstall už existuje)

**Interfaces:**
- Produces: balík `@dobra-partia/db` — `import prisma from '@dobra-partia/db'` vracia PrismaClient singleton; npm skripty `generate` a `push` (`npm run push -w @dobra-partia/db`). Všetky ďalšie tasky importujú DB výhradne takto.

- [ ] **Step 1: Presun schémy**

```bash
mkdir -p packages/db
git mv apps/web/prisma packages/db/prisma
```

- [ ] **Step 2: Custom output generátora**

V `packages/db/prisma/schema.prisma` zmeň blok generator:

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../generated/client"
}
```

- [ ] **Step 3: package.json a singleton export**

Create `packages/db/package.json`:

```json
{
  "name": "@dobra-partia/db",
  "version": "1.0.0",
  "private": true,
  "main": "index.js",
  "scripts": {
    "generate": "prisma generate",
    "push": "prisma db push --skip-generate"
  },
  "dependencies": {
    "@prisma/client": "^6.19.3"
  },
  "devDependencies": {
    "prisma": "^6.19.3"
  }
}
```

Create `packages/db/index.js` (CJS, aby fungoval v oboch appkách aj v node skriptoch):

```js
const { PrismaClient } = require('./generated/client')

const prisma = globalThis.__prisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma
}

module.exports = prisma
```

- [ ] **Step 4: .env pre Prisma CLI**

Prisma CLI číta `.env` z cwd workspace-u, preto:

```bash
cp apps/web/.env packages/db/.env
```

(Lokálne existujú dve kópie `DATABASE_URL` — `apps/web/.env` pre runtime a `packages/db/.env` pre CLI. Obe gitignorované.)

- [ ] **Step 5: Prepnúť web na zdieľaný balík**

Replace celý obsah `apps/web/src/lib/prisma.js`:

```js
import prisma from '@dobra-partia/db'

export default prisma
```

V `apps/web/package.json`: odstráň `prisma` a `@prisma/client` z dependencies, odstráň `postinstall` skript, pridaj dependency `"@dobra-partia/db": "*"` a zmeň build skript:

```json
"build": "npm run push -w @dobra-partia/db && next build",
```

V `apps/web/next.config.mjs` pridaj do `nextConfig`:

```js
serverExternalPackages: ['@dobra-partia/db'],
```

Do root `package.json` scripts pridaj:

```json
"postinstall": "npm run generate -w @dobra-partia/db"
```

- [ ] **Step 6: Overiť build a beh**

```bash
rm -rf node_modules apps/web/node_modules
npm install
npm run build:web
```

Expected: postinstall vygeneruje klienta do `packages/db/generated/client`, build webu prejde.

```bash
npm run dev:web &
sleep 5 && curl -s http://localhost:3457/blog | grep -io 'blog' | head -1 && kill %1
```

Expected: `blog` (stránka číta DB cez nový balík).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: Prisma schéma a klient presunuté do packages/db (@dobra-partia/db)"
```

---

### Task 3: Rozšírenie schémy (multi-tenant) + seed

**Files:**
- Modify: `packages/db/prisma/schema.prisma`
- Create: `packages/db/seed.js`
- Modify: `packages/db/package.json` (bcryptjs), root `package.json` (seed skript)

**Interfaces:**
- Produces: modely `Partia`, `Uzivatel`, `PushSubscription`, `Zakaznik`, `Zakazka`, `Doklad`, `NakladovaPolozka`, `Media`, `Referencia`; `Dopyt.partiaId`. Seed vytvorí tenant `kosice` + 2 užívateľov a vypíše `PARTIA_ID`. Task 5 používa `Uzivatel` (polia `email`, `passwordHash`, `meno`, `partiaId`), Task 8 `PushSubscription`, Task 9 `Referencia`+`Media`.

- [ ] **Step 1: Doplniť modely do schémy**

Append do `packages/db/prisma/schema.prisma` a rozšír `Dopyt`:

```prisma
model Partia {
  id         String   @id @default(cuid())
  nazov      String
  slug       String   @unique
  createdAt  DateTime @default(now())
  uzivatelia Uzivatel[]
  zakaznici  Zakaznik[]
  zakazky    Zakazka[]
  doklady    Doklad[]
  polozky    NakladovaPolozka[]
  media      Media[]
  referencie Referencia[]
  dopyty     Dopyt[]
}

model Uzivatel {
  id            String   @id @default(cuid())
  partiaId      String
  partia        Partia   @relation(fields: [partiaId], references: [id])
  meno          String
  email         String   @unique
  telefon       String   @default("")
  passwordHash  String
  createdAt     DateTime @default(now())
  subscriptions PushSubscription[]
}

model PushSubscription {
  id         String   @id @default(cuid())
  uzivatelId String
  uzivatel   Uzivatel @relation(fields: [uzivatelId], references: [id], onDelete: Cascade)
  endpoint   String   @unique
  p256dh     String
  auth       String
  createdAt  DateTime @default(now())
}

model Zakaznik {
  id        String   @id @default(cuid())
  partiaId  String
  partia    Partia   @relation(fields: [partiaId], references: [id])
  typ       String   @default("domacnost") // domacnost | firma | spravca | realitka
  meno      String
  telefon   String   @default("")
  email     String   @default("")
  adresa    String   @default("")
  lat       Float?
  lon       Float?
  poznamka  String   @default("")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  zakazky   Zakazka[]
}

model Zakazka {
  id         String    @id @default(cuid())
  partiaId   String
  partia     Partia    @relation(fields: [partiaId], references: [id])
  zakaznikId String?
  zakaznik   Zakaznik? @relation(fields: [zakaznikId], references: [id])
  dopytId    String?   @unique
  dopyt      Dopyt?    @relation(fields: [dopytId], references: [id])
  nazov      String
  sluzba     String
  stav       String    @default("novy") // novy | nacenene | termin | hotovo | zaplatene
  adresa     String    @default("")
  lat        Float?
  lon        Float?
  termin     DateTime?
  cena       Decimal?  @db.Decimal(10, 2)
  poznamka   String    @default("")
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  doklady    Doklad[]
  polozky    NakladovaPolozka[]
  media      Media[]
}

model Doklad {
  id        String    @id @default(cuid())
  partiaId  String
  partia    Partia    @relation(fields: [partiaId], references: [id])
  zakazkaId String?
  zakazka   Zakazka?  @relation(fields: [zakazkaId], references: [id])
  typ       String    @default("blocek") // blocek | faktura | ine
  stav      String    @default("inbox")  // inbox | spracovany | priradeny
  fotoUrl   String    @default("")
  qrData    String    @default("")
  ekasaRaw  Json?
  predajca  String    @default("")
  suma      Decimal?  @db.Decimal(10, 2)
  datum     DateTime?
  createdAt DateTime  @default(now())
  polozky   NakladovaPolozka[]
}

model NakladovaPolozka {
  id             String   @id @default(cuid())
  partiaId       String
  partia         Partia   @relation(fields: [partiaId], references: [id])
  dokladId       String?
  doklad         Doklad?  @relation(fields: [dokladId], references: [id])
  zakazkaId      String?
  zakazka        Zakazka? @relation(fields: [zakazkaId], references: [id])
  nazov          String
  mnozstvo       Decimal  @default(1) @db.Decimal(10, 3)
  jednotkovaCena Decimal? @db.Decimal(10, 2)
  suma           Decimal  @db.Decimal(10, 2)
  kategoria      String   @default("material") // material | phm | prenajom | skladkovne | rezia
  createdAt      DateTime @default(now())
}

model Media {
  id                 String      @id @default(cuid())
  partiaId           String
  partia             Partia      @relation(fields: [partiaId], references: [id])
  zakazkaId          String?
  zakazka            Zakazka?    @relation(fields: [zakazkaId], references: [id])
  referenciaId       String?
  referencia         Referencia? @relation(fields: [referenciaId], references: [id])
  url                String
  alt                String      @default("")
  typ                String      @default("ine") // pred | po | blocek | ine
  suhlasPublikovanie String      @default("nie") // nie | anonymne | s_menom
  poradie            Int         @default(0)
  createdAt          DateTime    @default(now())
}

model Referencia {
  id         String   @id @default(cuid())
  partiaId   String
  partia     Partia   @relation(fields: [partiaId], references: [id])
  typ        String // testimonial | projekt
  text       String   @default("") // testimonial
  autor      String   @default("")
  hviezdicky Int?
  nazov      String   @default("") // projekt
  popis      String   @default("")
  datum      String   @default("") // "2026-03"
  lokalita   String   @default("")
  sluzba     String   @default("")
  tagy       String[] @default([])
  poradie    Int      @default(0)
  published  Boolean  @default(true)
  createdAt  DateTime @default(now())
  fotky      Media[]
}
```

Do existujúceho modelu `Dopyt` pridaj (nullable — existujúce riadky sa backfillnú v seede):

```prisma
  partiaId  String?
  partia    Partia?  @relation(fields: [partiaId], references: [id])
  zakazka   Zakazka?
```

- [ ] **Step 2: Push na lokálnu DB**

```bash
npm run generate -w @dobra-partia/db
npm run push -w @dobra-partia/db
```

Expected: `Your database is now in sync with your Prisma schema.` (Docker PG 54329 musí bežať.)

- [ ] **Step 3: Seed skript**

```bash
npm install bcryptjs -w @dobra-partia/db
```

Create `packages/db/seed.js`:

```js
// Seed: tenant "kosice" + užívatelia z env SEED_UZIVATELIA.
// Spustenie: npm run seed  (env SEED_UZIVATELIA='[{"meno":"Erik","email":"erik@dobrapartia.sk","heslo":"..."}]')
const bcrypt = require('bcryptjs')
const prisma = require('./index')

async function main() {
  const partia = await prisma.partia.upsert({
    where: { slug: 'kosice' },
    update: {},
    create: { nazov: 'Dobrá Partia Košice', slug: 'kosice' },
  })
  console.log('PARTIA_ID=' + partia.id)

  const uzivatelia = JSON.parse(process.env.SEED_UZIVATELIA || '[]')
  for (const u of uzivatelia) {
    await prisma.uzivatel.upsert({
      where: { email: u.email },
      update: { meno: u.meno },
      create: {
        partiaId: partia.id,
        meno: u.meno,
        email: u.email,
        passwordHash: bcrypt.hashSync(u.heslo, 10),
      },
    })
    console.log('uzivatel: ' + u.email)
  }

  const backfill = await prisma.dopyt.updateMany({
    where: { partiaId: null },
    data: { partiaId: partia.id },
  })
  console.log('dopyty backfill: ' + backfill.count)
}

main().finally(() => prisma.$disconnect())
```

Do root `package.json` scripts pridaj:

```json
"seed": "node --env-file=packages/db/.env packages/db/seed.js"
```

- [ ] **Step 4: Spustiť seed lokálne a overiť**

```bash
SEED_UZIVATELIA='[{"meno":"Test","email":"test@dobrapartia.sk","heslo":"test1234"}]' npm run seed
node --env-file=packages/db/.env -e "const p=require('./packages/db');p.partia.findMany().then(r=>{console.log(r);return p.uzivatel.count()}).then(c=>{console.log('uzivatelia:',c);p.\$disconnect()})"
```

Expected: 1 partia so slug `kosice`, `uzivatelia: 1`, backfill count = počet existujúcich dopytov.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(db): multi-tenant schéma (Partia, Uzivatel, Zakazka, Doklad, ...) + seed"
```

---

### Task 4: Skelet `apps/app` (Next.js) + presun `db push` do jej buildu

**Files:**
- Create: `apps/app/package.json`, `apps/app/next.config.mjs`, `apps/app/tailwind.config.js`, `apps/app/postcss.config.js`, `apps/app/jsconfig.json`, `apps/app/.env`, `apps/app/src/app/layout.js`, `apps/app/src/app/globals.css`, `apps/app/src/app/page.js`
- Modify: `apps/web/package.json` (build bez push)

**Interfaces:**
- Produces: workspace `dobra-partia-app`, dev na porte 3458, alias `@/* → ./src/*`. Layout exportuje root `<html lang="sk">` s triedou `bg-sand`. Ďalšie tasky pridávajú stránky do `apps/app/src/app/`.

- [ ] **Step 1: package.json**

Create `apps/app/package.json`:

```json
{
  "name": "dobra-partia-app",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3458",
    "build": "npm run push -w @dobra-partia/db && next build",
    "start": "next start",
    "test": "vitest run"
  },
  "dependencies": {
    "@dobra-partia/db": "*",
    "next": "^16.2.10",
    "react": "^19.2.7",
    "react-dom": "^19.2.7"
  },
  "devDependencies": {
    "autoprefixer": "^10.5.2",
    "postcss": "^8.5.16",
    "tailwindcss": "^3.4.19",
    "vitest": "^3.2.0"
  }
}
```

Zároveň v `apps/web/package.json` zmeň build (push odteraz robí len app):

```json
"build": "next build",
```

- [ ] **Step 2: Konfigy**

Create `apps/app/next.config.mjs`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@dobra-partia/db'],
}

export default nextConfig
```

```bash
cp apps/web/tailwind.config.js apps/app/tailwind.config.js
cp apps/web/postcss.config.js apps/app/postcss.config.js
cp apps/web/jsconfig.json apps/app/jsconfig.json
cp apps/web/.env apps/app/.env
```

- [ ] **Step 3: Layout, štýly, placeholder stránka**

Create `apps/app/src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Create `apps/app/src/app/layout.js`:

```js
import './globals.css'

export const metadata = {
  title: 'Dobrá Partia — Appka',
  robots: { index: false, follow: false },
}

export const viewport = {
  themeColor: '#1e3a5f',
}

export default function RootLayout({ children }) {
  return (
    <html lang="sk">
      <body className="bg-sand text-navy min-h-screen">{children}</body>
    </html>
  )
}
```

Create `apps/app/src/app/page.js`:

```js
export default function Home() {
  return <main className="p-6 text-xl font-bold">Dobrá Partia — appka beží</main>
}
```

- [ ] **Step 4: Build oboch appiek**

```bash
npm install
npm run build:app
npm run build:web
```

Expected: oba buildy prejdú; `build:app` spraví `db push` (lokálna DB), `build:web` už nie.

- [ ] **Step 5: Dev smoke test**

```bash
npm run dev:app &
sleep 5 && curl -s http://localhost:3458 | grep -o 'appka beží' && kill %1
```

Expected: `appka beží`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(app): skelet operačnej appky (Next.js, Tailwind, port 3458); db push presunutý do jej buildu"
```

---

### Task 5: Auth — next-auth v5, login pre 2 užívateľov

**Files:**
- Create: `apps/app/src/lib/auth-helpers.js`, `apps/app/src/lib/auth-helpers.test.js`, `apps/app/src/auth.config.js`, `apps/app/src/auth.js`, `apps/app/src/app/api/auth/[...nextauth]/route.js`, `apps/app/src/middleware.js`, `apps/app/src/app/login/page.js`
- Modify: `apps/app/package.json` (deps), `apps/app/.env` (AUTH_SECRET)

**Interfaces:**
- Consumes: model `Uzivatel` (Task 3), balík `@dobra-partia/db`.
- Produces: `auth()` (server session s `session.user.partiaId`), `signIn`/`signOut` z `@/auth`; middleware chráni všetko okrem `/login`, `/api/auth/*`, `/api/notify/*` a statiky. Task 6 volá `auth()` v server action, Task 8 v subscribe route.

- [ ] **Step 1: Závislosti a secret**

```bash
npm install next-auth@beta bcryptjs -w dobra-partia-app
echo "AUTH_SECRET=$(openssl rand -base64 32)" >> apps/app/.env
```

- [ ] **Step 2: Failing test pre verifyCredentials**

Create `apps/app/src/lib/auth-helpers.test.js`:

```js
import { describe, it, expect } from 'vitest'
import bcrypt from 'bcryptjs'
import { verifyCredentials } from './auth-helpers'

const hash = bcrypt.hashSync('spravne-heslo', 4)
const fakeDb = {
  uzivatel: {
    findUnique: async ({ where }) =>
      where.email === 'erik@dobrapartia.sk'
        ? { id: 'u1', meno: 'Erik', email: where.email, partiaId: 'p1', passwordHash: hash }
        : null,
  },
}

describe('verifyCredentials', () => {
  it('vráti užívateľa pri správnom hesle', async () => {
    const u = await verifyCredentials(fakeDb, 'erik@dobrapartia.sk', 'spravne-heslo')
    expect(u).toEqual({ id: 'u1', name: 'Erik', email: 'erik@dobrapartia.sk', partiaId: 'p1' })
  })
  it('vráti null pri zlom hesle', async () => {
    expect(await verifyCredentials(fakeDb, 'erik@dobrapartia.sk', 'zle')).toBeNull()
  })
  it('vráti null pre neexistujúci email', async () => {
    expect(await verifyCredentials(fakeDb, 'x@x.sk', 'spravne-heslo')).toBeNull()
  })
  it('vráti null pre prázdne vstupy', async () => {
    expect(await verifyCredentials(fakeDb, '', '')).toBeNull()
  })
})
```

- [ ] **Step 3: Overiť, že test padá**

Run: `npm test -w dobra-partia-app`
Expected: FAIL — `Cannot find module './auth-helpers'` (alebo ekvivalent).

- [ ] **Step 4: Implementácia**

Create `apps/app/src/lib/auth-helpers.js`:

```js
import bcrypt from 'bcryptjs'

export async function verifyCredentials(db, email, password) {
  if (!email || !password) return null
  const u = await db.uzivatel.findUnique({ where: { email } })
  if (!u) return null
  const ok = await bcrypt.compare(password, u.passwordHash)
  if (!ok) return null
  return { id: u.id, name: u.meno, email: u.email, partiaId: u.partiaId }
}
```

- [ ] **Step 5: Overiť, že testy prechádzajú**

Run: `npm test -w dobra-partia-app`
Expected: 4 passed.

- [ ] **Step 6: NextAuth split config (middleware bez Prismy)**

Create `apps/app/src/auth.config.js` (edge-safe, bez DB importov — používa ho middleware):

```js
export const authConfig = {
  pages: { signIn: '/login' },
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user
    },
    jwt({ token, user }) {
      if (user) token.partiaId = user.partiaId
      return token
    },
    session({ session, token }) {
      session.user.partiaId = token.partiaId
      return session
    },
  },
  providers: [],
}
```

Create `apps/app/src/auth.js`:

```js
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import prisma from '@dobra-partia/db'
import { authConfig } from './auth.config'
import { verifyCredentials } from './lib/auth-helpers'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(creds) {
        return verifyCredentials(prisma, creds?.email, creds?.password)
      },
    }),
  ],
})
```

Create `apps/app/src/app/api/auth/[...nextauth]/route.js`:

```js
import { handlers } from '@/auth'

export const { GET, POST } = handlers
```

Create `apps/app/src/middleware.js`:

```js
import NextAuth from 'next-auth'
import { authConfig } from './auth.config'

export const { auth: middleware } = NextAuth(authConfig)

export const config = {
  matcher: ['/((?!api/auth|api/notify|login|_next|sw\\.js|manifest|icons|favicon).*)'],
}
```

- [ ] **Step 7: Login stránka**

Create `apps/app/src/app/login/page.js`:

```js
import { redirect } from 'next/navigation'
import { AuthError } from 'next-auth'
import { signIn } from '@/auth'

async function prihlasit(formData) {
  'use server'
  try {
    await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirectTo: '/dopyty',
    })
  } catch (e) {
    if (e instanceof AuthError) redirect('/login?chyba=1')
    throw e
  }
}

export default async function LoginPage({ searchParams }) {
  const { chyba } = await searchParams
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form action={prihlasit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-center">Dobrá Partia</h1>
        {chyba && (
          <p className="rounded-lg bg-terracotta/10 p-3 text-center text-terracotta">
            Nesprávny e-mail alebo heslo
          </p>
        )}
        <input
          name="email" type="email" required placeholder="E-mail" autoComplete="email"
          className="w-full rounded-xl border border-navy/20 bg-white p-4 text-lg"
        />
        <input
          name="password" type="password" required placeholder="Heslo" autoComplete="current-password"
          className="w-full rounded-xl border border-navy/20 bg-white p-4 text-lg"
        />
        <button type="submit" className="w-full rounded-xl bg-navy p-4 text-lg font-bold text-white">
          Prihlásiť sa
        </button>
      </form>
    </main>
  )
}
```

- [ ] **Step 8: Manuálne overenie**

```bash
npm run dev:app
```

V prehliadači `http://localhost:3458` → presmeruje na `/login`; zlé heslo ukáže chybu; účet zo seedu (Task 3, `test@dobrapartia.sk` / `test1234`) sa prihlási a presmeruje na `/dopyty` (zatiaľ 404 — vznikne v Task 6). Potom `npm run build:app` musí prejsť.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(app): auth — next-auth credentials, login, middleware, 30-dňové sessions"
```

---

### Task 6: Inbox dopytov

**Files:**
- Create: `apps/app/src/lib/dopyty.js`, `apps/app/src/lib/dopyty.test.js`, `apps/app/src/actions/dopyty.js`, `apps/app/src/app/dopyty/page.js`, `apps/app/src/components/DopytKarta.jsx`, `apps/app/src/components/AppHeader.jsx`
- Modify: `apps/app/src/app/page.js` (redirect na /dopyty)

**Interfaces:**
- Consumes: `auth()` z `@/auth` (Task 5), `Dopyt` model, `@dobra-partia/db`.
- Produces: `zmenStavDopytu(id, stav)` server action; `STAVY_DOPYTU = ['novy', 'kontaktovany', 'dokonceny']`; `jePlatnyStav(stav) → boolean`. `AppHeader` komponent (nadpis + odhlásenie) — Task 8 doň pridá `PushNastavenie`.

- [ ] **Step 1: Failing test pre stavy**

Create `apps/app/src/lib/dopyty.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { STAVY_DOPYTU, jePlatnyStav } from './dopyty'

describe('jePlatnyStav', () => {
  it('pozná všetky tri stavy', () => {
    expect(STAVY_DOPYTU).toEqual(['novy', 'kontaktovany', 'dokonceny'])
    for (const s of STAVY_DOPYTU) expect(jePlatnyStav(s)).toBe(true)
  })
  it('odmieta neznáme hodnoty', () => {
    expect(jePlatnyStav('zaplatene')).toBe(false)
    expect(jePlatnyStav('')).toBe(false)
    expect(jePlatnyStav(undefined)).toBe(false)
  })
})
```

- [ ] **Step 2: Overiť fail**

Run: `npm test -w dobra-partia-app`
Expected: FAIL — modul `./dopyty` neexistuje.

- [ ] **Step 3: Implementácia lib + action**

Create `apps/app/src/lib/dopyty.js`:

```js
export const STAVY_DOPYTU = ['novy', 'kontaktovany', 'dokonceny']

export const STAV_LABEL = {
  novy: 'Nový',
  kontaktovany: 'Kontaktovaný',
  dokonceny: 'Dokončený',
}

export function jePlatnyStav(stav) {
  return STAVY_DOPYTU.includes(stav)
}
```

Create `apps/app/src/actions/dopyty.js`:

```js
'use server'

import { revalidatePath } from 'next/cache'
import prisma from '@dobra-partia/db'
import { auth } from '@/auth'
import { jePlatnyStav } from '@/lib/dopyty'

export async function zmenStavDopytu(id, stav) {
  const session = await auth()
  if (!session?.user) throw new Error('Neprihlásený')
  if (!jePlatnyStav(stav)) throw new Error('Neplatný stav')
  await prisma.dopyt.update({
    where: { id },
    data: { stav, vybavene: stav === 'dokonceny' },
  })
  revalidatePath('/dopyty')
}
```

- [ ] **Step 4: Overiť pass**

Run: `npm test -w dobra-partia-app`
Expected: všetky testy passed (auth-helpers + dopyty).

- [ ] **Step 5: UI — header, karta, stránka**

Create `apps/app/src/components/AppHeader.jsx`:

```js
import { signOut } from '@/auth'

export default function AppHeader({ title }) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between bg-navy px-4 py-3 text-white">
      <h1 className="text-lg font-bold">{title}</h1>
      <form
        action={async () => {
          'use server'
          await signOut({ redirectTo: '/login' })
        }}
      >
        <button type="submit" className="rounded-lg bg-white/10 px-3 py-2 text-sm">
          Odhlásiť
        </button>
      </form>
    </header>
  )
}
```

Create `apps/app/src/components/DopytKarta.jsx`:

```js
'use client'

import { useTransition } from 'react'
import { zmenStavDopytu } from '@/actions/dopyty'
import { STAVY_DOPYTU, STAV_LABEL } from '@/lib/dopyty'

const STAV_FARBA = {
  novy: 'bg-terracotta text-white',
  kontaktovany: 'bg-teal text-white',
  dokonceny: 'bg-navy/20 text-navy',
}

export default function DopytKarta({ dopyt }) {
  const [pending, startTransition] = useTransition()
  return (
    <div className={`rounded-2xl bg-white p-4 shadow-sm ${pending ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-lg font-bold">{dopyt.meno}</p>
          <p className="text-sm text-navy/60">
            {dopyt.sluzba} · {new Date(dopyt.createdAt).toLocaleDateString('sk-SK')}
          </p>
          <p className="mt-1 text-sm">{dopyt.adresa}</p>
          {dopyt.popis && <p className="mt-1 text-sm text-navy/80">{dopyt.popis}</p>}
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${STAV_FARBA[dopyt.stav] || STAV_FARBA.novy}`}>
          {STAV_LABEL[dopyt.stav] || dopyt.stav}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <a href={`tel:${dopyt.telefon}`} className="rounded-xl bg-navy p-3 text-center font-bold text-white">
          Volať
        </a>
        <a href={`sms:${dopyt.telefon}`} className="rounded-xl bg-teal p-3 text-center font-bold text-white">
          SMS
        </a>
        {dopyt.lat != null && dopyt.lon != null ? (
          <a
            href={`https://www.google.com/maps?q=${dopyt.lat},${dopyt.lon}`}
            target="_blank" rel="noreferrer"
            className="rounded-xl bg-sand p-3 text-center font-bold"
          >
            Mapa
          </a>
        ) : (
          <span className="rounded-xl bg-sand p-3 text-center text-navy/40">Mapa</span>
        )}
      </div>
      <div className="mt-2 flex gap-2">
        {STAVY_DOPYTU.filter((s) => s !== dopyt.stav).map((s) => (
          <button
            key={s}
            disabled={pending}
            onClick={() => startTransition(() => zmenStavDopytu(dopyt.id, s))}
            className="flex-1 rounded-xl border border-navy/20 p-3 text-sm font-bold"
          >
            → {STAV_LABEL[s]}
          </button>
        ))}
      </div>
    </div>
  )
}
```

Create `apps/app/src/app/dopyty/page.js`:

```js
import prisma from '@dobra-partia/db'
import AppHeader from '@/components/AppHeader'
import DopytKarta from '@/components/DopytKarta'
import { STAVY_DOPYTU, STAV_LABEL, jePlatnyStav } from '@/lib/dopyty'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function DopytyPage({ searchParams }) {
  const { stav } = await searchParams
  const filter = jePlatnyStav(stav) ? { stav } : {}
  const dopyty = await prisma.dopyt.findMany({
    where: filter,
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return (
    <>
      <AppHeader title="Dopyty" />
      <main className="mx-auto max-w-xl space-y-3 p-4">
        <nav className="flex gap-2">
          <Link href="/dopyty" className={`rounded-full px-4 py-2 text-sm font-bold ${!stav ? 'bg-navy text-white' : 'bg-white'}`}>
            Všetky
          </Link>
          {STAVY_DOPYTU.map((s) => (
            <Link
              key={s}
              href={`/dopyty?stav=${s}`}
              className={`rounded-full px-4 py-2 text-sm font-bold ${stav === s ? 'bg-navy text-white' : 'bg-white'}`}
            >
              {STAV_LABEL[s]}
            </Link>
          ))}
        </nav>
        {dopyty.length === 0 && <p className="p-6 text-center text-navy/50">Žiadne dopyty</p>}
        {dopyty.map((d) => (
          <DopytKarta key={d.id} dopyt={d} />
        ))}
      </main>
    </>
  )
}
```

Replace `apps/app/src/app/page.js`:

```js
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/dopyty')
}
```

- [ ] **Step 6: Manuálne overenie + build**

`npm run dev:app` → login → `/dopyty` ukazuje dopyty z lokálnej DB (sú tam z produkčného vývoja webu; ak nie, vytvor jeden cez web formulár na `localhost:3457`). Zmena stavu funguje a prežije reload. Potom:

Run: `npm run build:app`
Expected: build prejde.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(app): inbox dopytov — zoznam, filter stavov, volať/SMS/mapa, zmena stavu"
```

---

### Task 7: PWA — manifest, service worker, ikony

**Files:**
- Create: `apps/app/src/app/manifest.js`, `apps/app/public/sw.js`, `apps/app/src/components/SwRegister.jsx`, `apps/app/public/icons/icon-192.png`, `apps/app/public/icons/icon-512.png`
- Modify: `apps/app/src/app/layout.js`

**Interfaces:**
- Produces: instalovateľná PWA; SW s push handlermi (payload `{ title, body, url }`) — Task 8 posiela presne tento tvar. `SwRegister` vracia registráciu SW pri načítaní.

- [ ] **Step 1: Ikony z existujúceho loga**

```bash
mkdir -p apps/app/public/icons
sips -z 192 192 apps/web/public/assets/logo.png --out apps/app/public/icons/icon-192.png
sips -z 512 512 apps/web/public/assets/logo.png --out apps/app/public/icons/icon-512.png
```

(Ak `logo.png` nie je štvorec, `sips -z` ho natiahne — pre skelet OK, finálne ikony sa doladia neskôr.)

- [ ] **Step 2: Manifest**

Create `apps/app/src/app/manifest.js`:

```js
export default function manifest() {
  return {
    name: 'Dobrá Partia',
    short_name: 'Partia',
    description: 'Operačná appka Dobrej Partie',
    start_url: '/dopyty',
    display: 'standalone',
    background_color: '#f9f7f2',
    theme_color: '#1e3a5f',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  }
}
```

- [ ] **Step 3: Service worker (ručný, bez bundlera)**

Create `apps/app/public/sw.js`:

```js
self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data && event.data.text() }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Dobrá Partia', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url || '/dopyty' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/dopyty'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const win = wins.find((w) => 'focus' in w)
      if (win) {
        win.navigate(url)
        return win.focus()
      }
      return self.clients.openWindow(url)
    })
  )
})
```

- [ ] **Step 4: Registrácia SW**

Create `apps/app/src/components/SwRegister.jsx`:

```js
'use client'

import { useEffect } from 'react'

export default function SwRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((e) => console.error('SW:', e))
    }
  }, [])
  return null
}
```

V `apps/app/src/app/layout.js` pridaj import a render:

```js
import SwRegister from '@/components/SwRegister'
```

a v body: `{children}` → `<>{children}<SwRegister /></>` (t. j. `<body className="…"><SwRegister />{children}</body>`).

- [ ] **Step 5: Overenie**

`npm run dev:app`, v Chrome DevTools → Application: manifest sa načíta, SW `sw.js` je activated, Lighthouse „installable" bez chýb. `npm run build:app` prejde.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(app): PWA — manifest, service worker s push handlermi, ikony"
```

---

### Task 8: Push notifikácie — subscribe + interný endpoint + hook z webu

**Files:**
- Create: `apps/app/src/lib/push.js`, `apps/app/src/app/api/push/subscribe/route.js`, `apps/app/src/app/api/notify/dopyt/route.js`, `apps/app/src/app/api/notify/dopyt/route.test.js`, `apps/app/src/components/PushNastavenie.jsx`, `apps/web/src/lib/notify-app.js`
- Modify: `apps/app/src/components/AppHeader.jsx`, `apps/web/src/lib/dopyt.js`, `apps/app/.env`, `apps/web/.env`

**Interfaces:**
- Consumes: model `PushSubscription` (Task 3), `auth()` (Task 5), SW push handler (Task 7, payload `{ title, body, url }`).
- Produces: `POST /api/notify/dopyt` (header `x-internal-token`, body `{ meno, sluzba, adresa }`) → push obom spoločníkom; `notifyAppNovyDopyt(dopyt)` volaný z `createDopyt` na webe. Env kontrakt: app `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `INTERNAL_API_TOKEN`; web `APP_URL`, `INTERNAL_API_TOKEN` (rovnaká hodnota).

- [ ] **Step 1: Závislosť a kľúče**

```bash
npm install web-push -w dobra-partia-app
npx web-push generate-vapid-keys
openssl rand -hex 32
```

Do `apps/app/.env` pridaj (hodnoty z výstupov):

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public key>
VAPID_PRIVATE_KEY=<private key>
VAPID_SUBJECT=mailto:info@dobrapartia.sk
INTERNAL_API_TOKEN=<hex token>
```

Do `apps/web/.env` pridaj:

```
APP_URL=http://localhost:3458
INTERNAL_API_TOKEN=<ten istý hex token>
```

- [ ] **Step 2: Failing test pre notify endpoint**

Create `apps/app/src/app/api/notify/dopyt/route.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../../lib/push', () => ({ sendPushAll: vi.fn(async () => ({ sent: 2 })) }))

import { POST } from './route'
import { sendPushAll } from '../../../../lib/push'

beforeEach(() => {
  process.env.INTERNAL_API_TOKEN = 'tajny'
  vi.clearAllMocks()
})

function req(token, body) {
  return new Request('http://x/api/notify/dopyt', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { 'x-internal-token': token } : {}) },
    body: JSON.stringify(body),
  })
}

describe('POST /api/notify/dopyt', () => {
  it('odmietne bez tokenu (401)', async () => {
    const res = await POST(req(null, { meno: 'X' }))
    expect(res.status).toBe(401)
    expect(sendPushAll).not.toHaveBeenCalled()
  })
  it('odmietne zlý token (401)', async () => {
    const res = await POST(req('zly', { meno: 'X' }))
    expect(res.status).toBe(401)
  })
  it('pošle push so správnym tokenom', async () => {
    const res = await POST(req('tajny', { meno: 'Marek', sluzba: 'kosenie', adresa: 'Hlavná 1' }))
    expect(res.status).toBe(200)
    expect(sendPushAll).toHaveBeenCalledWith({
      title: 'Nový dopyt: kosenie',
      body: 'Marek — Hlavná 1',
      url: '/dopyty',
    })
  })
})
```

- [ ] **Step 3: Overiť fail**

Run: `npm test -w dobra-partia-app`
Expected: FAIL — `./route` / `../../../../lib/push` neexistujú.

- [ ] **Step 4: Implementácia push lib + routes**

Create `apps/app/src/lib/push.js`:

```js
import webpush from 'web-push'
import prisma from '@dobra-partia/db'

let configured = false
function setup() {
  if (configured) return
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
  configured = true
}

export async function sendPushAll(payload) {
  setup()
  const subs = await prisma.pushSubscription.findMany()
  const body = JSON.stringify(payload)
  const results = await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        body
      )
    )
  )
  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    if (r.status === 'rejected' && [404, 410].includes(r.reason?.statusCode)) {
      await prisma.pushSubscription.delete({ where: { id: subs[i].id } }).catch(() => {})
    }
  }
  return { sent: results.filter((r) => r.status === 'fulfilled').length }
}
```

Create `apps/app/src/app/api/notify/dopyt/route.js`:

```js
import { NextResponse } from 'next/server'
import { sendPushAll } from '../../../../lib/push'

export async function POST(request) {
  const token = request.headers.get('x-internal-token')
  if (!token || token !== process.env.INTERNAL_API_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { meno, sluzba, adresa } = await request.json()
  const result = await sendPushAll({
    title: `Nový dopyt: ${sluzba || 'neuvedená služba'}`,
    body: `${meno || ''} — ${adresa || ''}`,
    url: '/dopyty',
  })
  return NextResponse.json({ ok: true, ...result })
}
```

Create `apps/app/src/app/api/push/subscribe/route.js`:

```js
import { NextResponse } from 'next/server'
import prisma from '@dobra-partia/db'
import { auth } from '@/auth'

export async function POST(request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const sub = await request.json()
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return NextResponse.json({ error: 'Neplatná subscription' }, { status: 400 })
  }
  await prisma.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    update: { p256dh: sub.keys.p256dh, auth: sub.keys.auth, uzivatelId: session.user.id },
    create: {
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      uzivatelId: session.user.id,
    },
  })
  return NextResponse.json({ ok: true })
}
```

Pozn.: `session.user.id` — next-auth v JWT session drží id v `token.sub`; over v behu a keby chýbalo, pridaj do `jwt` callbacku `if (user) token.id = user.id` a do `session` callbacku `session.user.id = token.sub`.

- [ ] **Step 5: Overiť pass**

Run: `npm test -w dobra-partia-app`
Expected: všetky testy passed.

- [ ] **Step 6: Klientske zapnutie notifikácií**

Create `apps/app/src/components/PushNastavenie.jsx`:

```js
'use client'

import { useEffect, useState } from 'react'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export default function PushNastavenie() {
  const [stav, setStav] = useState('nezname') // nezname | vypnute | zapnute | nepodporovane

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStav('nepodporovane')
      return
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setStav(sub ? 'zapnute' : 'vypnute'))
  }, [])

  async function zapni() {
    const povolenie = await Notification.requestPermission()
    if (povolenie !== 'granted') return
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
    })
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(sub.toJSON()),
    })
    setStav('zapnute')
  }

  if (stav === 'nepodporovane' || stav === 'zapnute' || stav === 'nezname') return null
  return (
    <button onClick={zapni} className="rounded-lg bg-terracotta px-3 py-2 text-sm font-bold text-white">
      🔔 Zapnúť notifikácie
    </button>
  )
}
```

V `apps/app/src/components/AppHeader.jsx` pridaj `import PushNastavenie from './PushNastavenie'` a vlož `<PushNastavenie />` vedľa odhlasovacieho tlačidla (do wrapperu `<div className="flex items-center gap-2">…</div>`).

- [ ] **Step 7: Hook z webu**

Create `apps/web/src/lib/notify-app.js`:

```js
export async function notifyAppNovyDopyt(dopyt) {
  const url = process.env.APP_URL
  const token = process.env.INTERNAL_API_TOKEN
  if (!url || !token) return
  try {
    await fetch(`${url}/api/notify/dopyt`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-token': token },
      body: JSON.stringify({ meno: dopyt.meno, sluzba: dopyt.sluzba, adresa: dopyt.adresa }),
      signal: AbortSignal.timeout(3000),
    })
  } catch (e) {
    console.error('Push notify error:', e)
  }
}
```

V `apps/web/src/lib/dopyt.js`: pridaj `import { notifyAppNovyDopyt } from '@/lib/notify-app'` a hneď za `await sendDiscordMessage(...)` pridaj:

```js
    await notifyAppNovyDopyt(dopyt)
```

- [ ] **Step 8: E2E overenie lokálne**

Spusti obe appky (`npm run dev:web`, `npm run dev:app`). V appke zapni notifikácie (Chrome). Pošli dopyt cez formulár na `localhost:3457`. Expected: do pár sekúnd príde systémová notifikácia „Nový dopyt: …" a klik na ňu otvorí `/dopyty`. `npm run build:app && npm run build:web` prejdú.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(app+web): web push — subscribe, interný notify endpoint, hook z formulára dopytu"
```

---

### Task 9: Referencie webu z DB

**Files:**
- Create: `packages/db/import-referencie.js`, `apps/web/src/lib/referencie.js`
- Modify: `apps/web/src/app/page.js`, `apps/web/src/components/home/Referencie.jsx`, `apps/web/src/components/home/Galeria.jsx`, root `package.json`
- Delete: `apps/web/src/data/references-data.json`

**Interfaces:**
- Consumes: modely `Referencia` + `Media` (Task 3), tenant `kosice`.
- Produces: `getReferencieData() → { testimonials, projects, tags }` v tvare identickom s pôvodným JSON-om; `Referencie` prijíma prop `testimonials`, `Galeria` props `projects` a `tags`.

- [ ] **Step 1: Import skript**

Create `packages/db/import-referencie.js`:

```js
// Jednorazový import references-data.json → Referencia + Media.
// Idempotentný: zmaže a nahrá znova. Spustenie: npm run import:referencie
const fs = require('fs')
const path = require('path')
const prisma = require('./index')

async function main() {
  const data = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../../apps/web/src/data/references-data.json'), 'utf8')
  )
  const partia = await prisma.partia.findUniqueOrThrow({ where: { slug: 'kosice' } })

  await prisma.media.deleteMany({ where: { partiaId: partia.id, referenciaId: { not: null } } })
  await prisma.referencia.deleteMany({ where: { partiaId: partia.id } })

  for (const t of data.testimonials) {
    await prisma.referencia.create({
      data: {
        partiaId: partia.id,
        typ: 'testimonial',
        text: t.text,
        autor: t.author,
        lokalita: t.location,
        sluzba: t.service,
        hviezdicky: t.rating,
        poradie: t.id,
      },
    })
  }

  for (const p of data.projects) {
    await prisma.referencia.create({
      data: {
        partiaId: partia.id,
        typ: 'projekt',
        nazov: p.title,
        popis: p.description,
        lokalita: p.location,
        datum: p.date,
        tagy: p.tags,
        poradie: p.id,
        fotky: {
          create: p.photos.map((f, i) => ({
            partiaId: partia.id,
            url: f.src.startsWith('assets/') ? '/' + f.src : f.src,
            alt: f.alt,
            typ: 'ine',
            suhlasPublikovanie: 's_menom',
            poradie: i,
          })),
        },
      },
    })
  }

  const pocet = await prisma.referencia.count({ where: { partiaId: partia.id } })
  console.log('referencie:', pocet)
}

main().finally(() => prisma.$disconnect())
```

Do root `package.json` scripts pridaj:

```json
"import:referencie": "node --env-file=packages/db/.env packages/db/import-referencie.js"
```

- [ ] **Step 2: Spustiť import lokálne**

Run: `npm run import:referencie`
Expected: `referencie: 18` (6 testimonialov + 12 projektov).

- [ ] **Step 3: Web lib**

Create `apps/web/src/lib/referencie.js`:

```js
import prisma from '@dobra-partia/db'

const TAGY = {
  'hodinovy-majster': 'Hodinový majster',
  'zahradne-prace': 'Záhradné práce',
  'bazenovy-servis': 'Bazénový servis',
  'zimna-udrzba': 'Zimná údržba',
  'vypratavanie': 'Vypratávanie',
  'tlakove-cistenie': 'Tlakové čistenie',
  'exterier': 'Exteriér',
  'interier': 'Interiér',
}

export async function getReferencieData() {
  const refs = await prisma.referencia.findMany({
    where: { published: true },
    orderBy: { poradie: 'asc' },
    include: { fotky: { orderBy: { poradie: 'asc' } } },
  })
  return {
    testimonials: refs
      .filter((r) => r.typ === 'testimonial')
      .map((r) => ({
        id: r.poradie,
        text: r.text,
        author: r.autor,
        location: r.lokalita,
        service: r.sluzba,
        rating: r.hviezdicky,
      })),
    projects: refs
      .filter((r) => r.typ === 'projekt')
      .map((r) => ({
        id: r.poradie,
        title: r.nazov,
        description: r.popis,
        location: r.lokalita,
        date: r.datum,
        tags: r.tagy,
        photos: r.fotky.map((f) => ({ src: f.url, alt: f.alt })),
      })),
    tags: TAGY,
  }
}
```

- [ ] **Step 4: Prepojiť page → props**

V `apps/web/src/app/page.js`: sprav komponent `async`, pridaj `import { getReferencieData } from '@/lib/referencie'`, na začiatok `const refData = await getReferencieData()`, a pridaj nad exportom `export const revalidate = 3600`. Zmeň rendery na `<Referencie testimonials={refData.testimonials} />` a `<Galeria projects={refData.projects} tags={refData.tags} />`.

V `apps/web/src/components/home/Referencie.jsx`: zmaž `import refData from '@/data/references-data.json'`, zmeň signatúru na `export default function Referencie({ testimonials })` a zmaž riadok `const testimonials = refData.testimonials`.

V `apps/web/src/components/home/Galeria.jsx`: zmaž JSON import, zmeň signatúru na `export default function Galeria({ projects, tags })` a nahraď všetky použitia `refData.projects` → `projects` a `refData.tags` → `tags`.

- [ ] **Step 5: Zmazať JSON a overiť**

```bash
git rm apps/web/src/data/references-data.json
npm run build:web
npm run dev:web
```

Expected: build prejde; na `localhost:3457` sekcie Referencie aj Galéria vyzerajú presne ako predtým (carousel, tag filtre, modal s fotkami).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(web): referencie a galéria z DB (Referencia + Media) namiesto JSON"
```

---

### Task 10: Nasadenie, env, DNS a aktualizácia dokumentov

**Files:**
- Modify: `README.md` (root — nový), `apps/web/README.md`, `../business/plan-automatizacie.md`, `../business/handover.md`

Tento task obsahuje kroky vo Vercel dashboarde (root directory sa cez CLI nastaviť nedá) — vykonať presne v tomto poradí, aby web nemal výpadok.

- [ ] **Step 1: Produkčný seed a import**

Užívateľ vloží produkčnú `DATABASE_URL` (sensitive — nikam sa neukladá) do jednorazového príkazu:

```bash
DATABASE_URL='<produkcna>' SEED_UZIVATELIA='[{"meno":"...","email":"...","heslo":"..."},{"meno":"...","email":"...","heslo":"..."}]' node packages/db/seed.js
DATABASE_URL='<produkcna>' node packages/db/import-referencie.js
```

Pozor: produkčná schéma ešte nemá nové tabuľky — najprv `DATABASE_URL='<produkcna>' npx prisma db push --skip-generate --schema=packages/db/prisma/schema.prisma`. Zapíš si vypísané `PARTIA_ID`.

- [ ] **Step 2: Nový Vercel projekt `dobra-partia-app`**

V dashboarde: Add New → Project → import repo `erikmeliska/dobra-partia` → **Root Directory: `apps/app`**, framework Next.js, production branch `main`. Env vars (Production + Preview): `DATABASE_URL` (sensitive, ručne), `AUTH_SECRET` (nový: `openssl rand -base64 32`), `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT=mailto:info@dobrapartia.sk`, `INTERNAL_API_TOKEN` (nový hex, produkčný). Domains: pridať `app.dobrapartia.sk` (DNS je na Verceli — záznam sa vytvorí sám).

- [ ] **Step 3: Env do existujúceho projektu `dobra-partia` (web)**

Settings → Environment Variables: `APP_URL=https://app.dobrapartia.sk`, `INTERNAL_API_TOKEN=<ten istý produkčný hex>`.

- [ ] **Step 4: Prepnutie root directory webu + merge (choreografia bez výpadku)**

1. V projekte `dobra-partia`: Settings → Build & Deployment → **Root Directory: `apps/web`** (build command ostáva default — číta sa z `apps/web/package.json`).
2. Ihneď potom merge a push:

```bash
git checkout nextjs-migracia   # alebo main, podľa aktuálnej produkčnej vetvy
git merge monorepo-prestavba
git push
```

(Medzi krokom 1 a pushom nesmie prebehnúť iný deploy — starý kód s novým root directory by zlyhal. Ak by build spadol, instant rollback cez Vercel „Promote previous deployment".)

- [ ] **Step 5: Produkčný smoke test**

- `https://www.dobrapartia.sk` — titulka, referencie/galéria (z DB), blog, formulár odošle dopyt → Discord správa príde.
- `https://app.dobrapartia.sk` — login oboch užívateľov, inbox ukazuje dopyty (vrátane práve poslaného), zmena stavu funguje.
- Na mobile: pridať appku na plochu (iOS: Zdieľať → Pridať na plochu), zapnúť notifikácie, poslať testovací dopyt cez web → push príde.

- [ ] **Step 6: Aktualizácia dokumentov**

1. Root `README.md` (nový): krátky prehľad monorepa — `apps/web` (verejný web, www.dobrapartia.sk), `apps/app` (operačná PWA, app.dobrapartia.sk), `packages/db` (Prisma), príkazy `dev:web`/`dev:app`/`seed`, odkaz na spec a na `apps/web/README.md`.
2. `apps/web/README.md`: v úvode doplniť vetu, že web je teraz `apps/web` v monorepe a operačná appka žije v `apps/app`.
3. `../business/plan-automatizacie.md`: prepísať odsek „Architektonické rozhodnutie" — namiesto „jeden repozitár, jeden deploy… `/admin`" popísať monorepo apps/web + apps/app + packages/db, `app.dobrapartia.sk`, dva Vercel projekty; vo Fáze 2 nahradiť „`/admin`" za „`apps/app`" a vo Fáze 0 odškrtnúť hotové položky (rozšírená schéma, migrácia references-data.json, partiaId v Dopyt).
4. `../business/handover.md`: do „Otvorené úlohy" doplniť riadok o hotovej prestavbe (dátum, appka nasadená, spec link).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "docs: root README, aktualizácia plánu automatizácie a handoveru po prestavbe na monorepo"
git push
```

---

## Poznámky pre implementátora

- **Docker Postgres** musí bežať pri každom lokálnom builde `apps/app` (build robí `db push`). Štart podľa doterajšieho dev setupu (port 54329, viď `apps/web/.env`).
- **next-auth v5 beta**: API je `NextAuth(config)` vracajúci `{ handlers, auth, signIn, signOut }`. Ak sa presné správanie líši (beta), over v node_modules README — nie v starých v4 tutoriáloch (`getServerSession` je v4, nepoužívať).
- **Push na iOS** funguje len z appky pridanej na plochu (iOS 16.4+); v Safari na desktope si `Notification.requestPermission` vyžaduje user gesture — tlačidlo v `PushNastavenie` to spĺňa.
- Ak `npm run push -w @dobra-partia/db` na Verceli zlyhá na chýbajúcom `DATABASE_URL`, over, že env var je nastavená aj pre build (nie len runtime).
