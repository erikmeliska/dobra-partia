# Capture button + bločkový inbox — implementačný plán

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fotka bločku v PWA → QR → eKasa API → štruktúrované položky v DB, s offline frontou, Vercel Blob úložiskom fotiek a BAML/Gemini fallbackom; inbox dokladov na `/doklady`.

**Architecture:** Klient (apps/app) fotí cez `input capture`, dekóduje QR v prehliadači (jsqr) a ukladá do IndexedDB fronty; flush posiela multipart na `POST /api/doklady`. Server: dedup podľa `qrData`, fotka do Vercel Blob, `Doklad` create, pipeline `spracujDoklad` (eKasa s retry → BAML OCR fallback → `rucne`). Spec: `docs/superpowers/specs/2026-07-12-capture-blocky-design.md`. Referenčný kód: `/Users/ericsko/Projekty/_Sandbox/agents/accounting/web` (odtiaľ prevzatý eKasa response tvar a BAML súbory).

**Tech Stack:** Next.js 16 (apps/app), Prisma 6 (`@dobra-partia/db`), jsqr, idb-keyval, sharp, @vercel/blob, @boundaryml/baml (Gemini), vitest.

## Global Constraints

- Jazyk kódu: **JavaScript** (.js/.jsx). Jediná výnimka: BAML generuje TypeScript klienta do `apps/app/src/lib/baml_client/` — preto Task 4 pridáva `typescript` devDep a `tsconfig.json` s `allowJs` (nahradí jsconfig.json; alias `@/*` ostáva).
- Názvy doménových entít, polí a funkcií **po slovensky** (`Doklad`, `spracujDoklad`, `pridajDoFronty`…), v štýle existujúceho kódu.
- **Každá query na `Doklad`/`NakladovaPolozka` je scopovaná `partiaId` zo session** (`session.user.partiaId`) — bez výnimky.
- eKasa endpoint: `POST https://ekasa.financnasprava.sk/mdu/api/v1/opd/receipt/find`, body `{"receiptId": "<obsah QR>"}`. **Volať sekvenčne, nikdy paralelne**; retry max 3 pokusy s delaymi 1 s / 3 s, timeout 10 s per pokus. **`items[].price` je SUMA RIADKU** — jednotková cena = `price / (quantity || 1)`.
- Stavy dokladu: `inbox | spracovany | rucne | priradeny`; `overenie: ekasa | ocr | nic`.
- Mobile-first: veľké tlačidlá (p-3/p-4), farby navy/teal/terracotta/sand, jedna ruka.
- TDD (vitest, `npm test -w dobra-partia-app`) pre čistú logiku: mapper, fronta flush, validácie. eKasa a Gemini sa v testoch mockujú.
- Lokálny dev: Docker PG 54329 musí bežať; app na porte 3458; login `test@dobrapartia.sk`/`test1234`.
- Nič sa nemení v `apps/web` ani v modeloch mimo `Doklad`.
- Env: `BLOB_READ_WRITE_TOKEN` a `GOOGLE_API_KEY` — na Verceli ich rieši Task 9 (užívateľ); lokálne do `apps/app/.env` (ak `GOOGLE_API_KEY` lokálne nie je, manuálne OCR testy sa preskočia a uvedie sa to v reporte).

---

### Task 1: Schéma — `Doklad.overenie` + indexy

**Files:**
- Modify: `packages/db/prisma/schema.prisma` (model Doklad)

**Interfaces:**
- Produces: pole `Doklad.overenie String @default("nic")`; indexy `@@index([partiaId, stav])`, `@@index([partiaId, qrData])`. Všetky ďalšie tasky s tým počítajú.

- [ ] **Step 1: Uprav model Doklad**

V `packages/db/prisma/schema.prisma` v modeli `Doklad`: zmeň komentár pri `stav` a pridaj `overenie` + indexy, aby model vyzeral takto (ostatné polia nechaj tak, ako sú):

```prisma
model Doklad {
  id        String    @id @default(cuid())
  partiaId  String
  partia    Partia    @relation(fields: [partiaId], references: [id])
  zakazkaId String?
  zakazka   Zakazka?  @relation(fields: [zakazkaId], references: [id])
  typ       String    @default("blocek") // blocek | faktura | ine
  stav      String    @default("inbox")  // inbox | spracovany | rucne | priradeny
  overenie  String    @default("nic")    // ekasa | ocr | nic
  fotoUrl   String    @default("")
  qrData    String    @default("")
  ekasaRaw  Json?
  predajca  String    @default("")
  suma      Decimal?  @db.Decimal(10, 2)
  datum     DateTime?
  createdAt DateTime  @default(now())
  polozky   NakladovaPolozka[]

  @@index([partiaId, stav])
  @@index([partiaId, qrData])
}
```

- [ ] **Step 2: Push na lokálnu DB**

Run: `npm run generate -w @dobra-partia/db && npm run push -w @dobra-partia/db`
Expected: `Your database is now in sync with your Prisma schema.`

- [ ] **Step 3: Commit**

```bash
git add packages/db/prisma/schema.prisma
git commit -m "feat(db): Doklad.overenie + indexy pre bločkový inbox"
```

---

### Task 2: eKasa klient s retry + mapper (TDD)

**Files:**
- Create: `apps/app/src/lib/ekasa.js`, `apps/app/src/lib/doklady.js`, `apps/app/src/lib/doklady.test.js`, `apps/app/src/lib/ekasa.test.js`, `apps/app/src/lib/fixtures/ekasa-sample.json`

**Interfaces:**
- Produces:
  - `fetchReceipt(qrText) → Promise<{ ok: true, receipt } | { ok: false, reason: 'nenajdene' | 'nedostupne' }>` — `nenajdene` je trvalé (zlé/neznáme ID), `nedostupne` je dočasné (sieť/429/5xx po retry).
  - `mapEkasaReceipt(receipt) → { doklad: { predajca, suma, datum, ekasaRaw, overenie: 'ekasa', stav: 'spracovany' }, polozky: [{ nazov, mnozstvo, jednotkovaCena, suma, kategoria: 'material' }] }`
  - `parseEkasaDatum('07.10.2020 16:57:12') → Date`

- [ ] **Step 1: Fixture z reálnej odpovede**

Create `apps/app/src/lib/fixtures/ekasa-sample.json` (skrátená reálna odpoveď zo sondy 12. 7. 2026 — 3 položky, reálne hodnoty):

```json
{
  "returnValue": 0,
  "receipt": {
    "receiptId": "O-AC6D5656CDC64336AD5656CDC60336E0",
    "ico": "17147786",
    "dic": "2020518962",
    "icDph": "SK2020518962",
    "issueDate": "07.10.2020 16:57:12",
    "createDate": "07.10.2020 16:57:12",
    "receiptNumber": 1570,
    "type": "PD",
    "taxBaseBasic": 11.47,
    "taxBaseReduced": 2.21,
    "totalPrice": 16.2,
    "vatAmountBasic": 2.3,
    "vatAmountReduced": 0.22,
    "vatRateBasic": 20.0,
    "vatRateReduced": 10.0,
    "items": [
      { "name": "REZY KAKAOVE EXT", "itemType": "K", "quantity": 3.0, "vatRate": 20.0, "price": 1.33 },
      { "name": "ROZOK 50g BEZ E", "itemType": "K", "quantity": 4.0, "vatRate": 10.0, "price": 0.32 },
      { "name": "JABLKA CERVE.II", "itemType": "K", "quantity": 0.895, "vatRate": 10.0, "price": 0.87 }
    ],
    "organization": {
      "name": "MILK-AGRO, spol. s r.o.",
      "ico": "17147786",
      "dic": "2020518962",
      "icDph": "SK2020518962",
      "municipality": "Prešov",
      "streetName": "Čapajevova",
      "postalCode": "08046",
      "country": "Slovensko",
      "vatPayer": true
    },
    "unit": { "cashRegisterCode": "88820205189620059", "municipality": "Prešov", "unitType": "STANDARD" },
    "vatSummary": [
      { "vatBase": 2.21, "vatAmount": 0.22, "vat": { "vatRate": 10.0 } },
      { "vatBase": 11.47, "vatAmount": 2.3, "vat": { "vatRate": 20.0 } }
    ]
  }
}
```

- [ ] **Step 2: Failing testy pre mapper**

Create `apps/app/src/lib/doklady.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { mapEkasaReceipt, parseEkasaDatum } from './doklady'
import fixture from './fixtures/ekasa-sample.json'

describe('parseEkasaDatum', () => {
  it('parsuje DD.MM.YYYY HH:mm:ss', () => {
    const d = parseEkasaDatum('07.10.2020 16:57:12')
    expect(d.getFullYear()).toBe(2020)
    expect(d.getMonth()).toBe(9)
    expect(d.getDate()).toBe(7)
    expect(d.getHours()).toBe(16)
  })
  it('vráti null pre neplatný vstup', () => {
    expect(parseEkasaDatum('')).toBeNull()
    expect(parseEkasaDatum(undefined)).toBeNull()
  })
})

describe('mapEkasaReceipt', () => {
  const { doklad, polozky } = mapEkasaReceipt(fixture.receipt)

  it('mapuje hlavičku dokladu', () => {
    expect(doklad.predajca).toBe('MILK-AGRO, spol. s r.o.')
    expect(doklad.suma).toBe(16.2)
    expect(doklad.stav).toBe('spracovany')
    expect(doklad.overenie).toBe('ekasa')
    expect(doklad.ekasaRaw.receiptId).toBe('O-AC6D5656CDC64336AD5656CDC60336E0')
    expect(doklad.datum.getFullYear()).toBe(2020)
  })

  it('price je suma riadku — jednotková cena sa dopočíta', () => {
    expect(polozky).toHaveLength(3)
    expect(polozky[0]).toEqual({
      nazov: 'REZY KAKAOVE EXT',
      mnozstvo: 3.0,
      suma: 1.33,
      jednotkovaCena: 1.33 / 3,
      kategoria: 'material',
    })
  })

  it('quantity 0 nepadne na delení nulou', () => {
    const r = { ...fixture.receipt, items: [{ name: 'X', quantity: 0, vatRate: 20, price: 5 }] }
    expect(mapEkasaReceipt(r).polozky[0].jednotkovaCena).toBe(5)
  })
})
```

- [ ] **Step 3: Overiť fail**

Run: `npm test -w dobra-partia-app`
Expected: FAIL — `./doklady` neexistuje.

- [ ] **Step 4: Implementácia mappera**

Create `apps/app/src/lib/doklady.js`:

```js
// Mapovanie eKasa odpovede na Doklad + NakladovaPolozka[].
// POZOR: eKasa items[].price je SUMA RIADKU (súčet price = totalPrice, overené na živej vzorke).

export function parseEkasaDatum(s) {
  if (!s) return null
  const m = /^(\d{2})\.(\d{2})\.(\d{4})(?: (\d{2}):(\d{2}):(\d{2}))?$/.exec(s)
  if (!m) return null
  return new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0))
}

export function mapEkasaReceipt(receipt) {
  return {
    doklad: {
      predajca: receipt.organization?.name || '',
      suma: receipt.totalPrice ?? null,
      datum: parseEkasaDatum(receipt.issueDate),
      ekasaRaw: receipt,
      overenie: 'ekasa',
      stav: 'spracovany',
    },
    polozky: (receipt.items || []).map((i) => ({
      nazov: i.name,
      mnozstvo: i.quantity ?? 1,
      suma: i.price,
      jednotkovaCena: i.price / (i.quantity || 1),
      kategoria: 'material',
    })),
  }
}
```

- [ ] **Step 5: Overiť pass**

Run: `npm test -w dobra-partia-app`
Expected: doklady testy passed (plus doterajšie).

- [ ] **Step 6: Failing testy pre eKasa klienta**

Create `apps/app/src/lib/ekasa.test.js`:

```js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchReceipt } from './ekasa'
import fixture from './fixtures/ekasa-sample.json'

function odpoved(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

async function sBehomCasov(promise) {
  // fetchReceipt spí medzi pokusmi — posúvame fake časovače, kým skončí
  let done = false
  const p = promise.finally(() => { done = true })
  while (!done) {
    await vi.advanceTimersByTimeAsync(1000)
  }
  return p
}

describe('fetchReceipt', () => {
  it('úspech na prvý pokus', async () => {
    global.fetch = vi.fn(async () => odpoved(200, fixture))
    const r = await fetchReceipt('O-ABC')
    expect(r.ok).toBe(true)
    expect(r.receipt.totalPrice).toBe(16.2)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('returnValue != 0 → nenajdene, bez retry', async () => {
    global.fetch = vi.fn(async () => odpoved(200, { returnValue: 3 }))
    const r = await fetchReceipt('O-ZLE')
    expect(r).toEqual({ ok: false, reason: 'nenajdene' })
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('4xx → nenajdene, bez retry', async () => {
    global.fetch = vi.fn(async () => odpoved(400, {}))
    const r = await fetchReceipt('O-ZLE')
    expect(r).toEqual({ ok: false, reason: 'nenajdene' })
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('429 → retry, po 3 pokusoch nedostupne', async () => {
    global.fetch = vi.fn(async () => odpoved(429, {}))
    const r = await sBehomCasov(fetchReceipt('O-ABC'))
    expect(r).toEqual({ ok: false, reason: 'nedostupne' })
    expect(global.fetch).toHaveBeenCalledTimes(3)
  })

  it('network chyba → retry → úspech na druhý pokus', async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('sieť'))
      .mockResolvedValueOnce(odpoved(200, fixture))
    const r = await sBehomCasov(fetchReceipt('O-ABC'))
    expect(r.ok).toBe(true)
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })
})
```

- [ ] **Step 7: Overiť fail**

Run: `npm test -w dobra-partia-app`
Expected: FAIL — `./ekasa` neexistuje.

- [ ] **Step 8: Implementácia eKasa klienta**

Create `apps/app/src/lib/ekasa.js`:

```js
// Nedokumentované API Finančnej správy „Over doklad".
// Server má rate limiter — volať sekvenčne, s backoffom, nikdy v paralelnej dávke.
const EKASA_URL = 'https://ekasa.financnasprava.sk/mdu/api/v1/opd/receipt/find'
const DELAYS_MS = [0, 1000, 3000]
const TIMEOUT_MS = 10000

const spanok = (ms) => new Promise((r) => setTimeout(r, ms))

export async function fetchReceipt(qrText) {
  for (let pokus = 0; pokus < DELAYS_MS.length; pokus++) {
    if (DELAYS_MS[pokus]) await spanok(DELAYS_MS[pokus])
    try {
      const res = await fetch(EKASA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptId: qrText }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      if (res.status === 429 || res.status >= 500) continue // dočasné → retry
      if (!res.ok) return { ok: false, reason: 'nenajdene' } // 4xx = trvalé
      const data = await res.json()
      if (data.returnValue === 0 && data.receipt) return { ok: true, receipt: data.receipt }
      return { ok: false, reason: 'nenajdene' }
    } catch {
      // network/timeout → retry
    }
  }
  return { ok: false, reason: 'nedostupne' }
}
```

- [ ] **Step 9: Overiť pass**

Run: `npm test -w dobra-partia-app`
Expected: všetky testy passed.

- [ ] **Step 10: Commit**

```bash
git add apps/app/src/lib
git commit -m "feat(app): eKasa klient s retry/backoff + mapper receipt → Doklad (TDD)"
```

---

### Task 3: Blob upload + `POST /api/doklady` + pipeline (bez OCR)

**Files:**
- Create: `apps/app/src/lib/qr-server.js`, `apps/app/src/lib/ocr.js` (stub), `apps/app/src/lib/pipeline.js`, `apps/app/src/app/api/doklady/route.js`, `apps/app/src/app/api/doklady/route.test.js`, `apps/app/vitest.config.js`
- Modify: `apps/app/package.json` (deps)

**Interfaces:**
- Consumes: `fetchReceipt`, `mapEkasaReceipt` (Task 2); modely `Doklad`/`NakladovaPolozka` (Task 1).
- Produces:
  - `POST /api/doklady` (session auth, `FormData`: `foto` File, `qrText` string?) → `{ dokladId, stav, duplicita?: true }`.
  - `spracujDoklad(dokladId) → Promise<doklad>` v `pipeline.js` — používa ho aj `overitDoklad` action (Task 7).
  - `extractReceiptZFotky(buffer, mimeType) → Promise<null>` stub v `ocr.js` — Task 4 ho nahradí ozajstným.
  - `decodeQrZBuffra(buffer) → Promise<string|null>` v `qr-server.js`.

- [ ] **Step 1: Závislosti + vitest alias**

```bash
npm install @vercel/blob sharp jsqr -w dobra-partia-app
```

Create `apps/app/vitest.config.js` (testy v tomto tasku mockujú `@/auth` — vitest potrebuje alias `@` explicitne, Next si ho berie z ts/jsconfig, vitest nie):

```js
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
})
```

Over, že doterajšie testy stále bežia: `npm test -w dobra-partia-app` → 6+ passed.

- [ ] **Step 2: Server QR decode + OCR stub**

Create `apps/app/src/lib/qr-server.js` (prevzaté z accounting appky, + druhý pokus v polovičnej mierke):

```js
import jsQR from 'jsqr'
import sharp from 'sharp'

export async function decodeQrZBuffra(buffer) {
  try {
    const plny = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const kod = jsQR(new Uint8ClampedArray(plny.data), plny.info.width, plny.info.height)
    if (kod) return kod.data
    const polovica = await sharp(buffer)
      .resize({ width: Math.round(plny.info.width / 2) })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    const kod2 = jsQR(new Uint8ClampedArray(polovica.data), polovica.info.width, polovica.info.height)
    return kod2 ? kod2.data : null
  } catch (e) {
    console.error('QR decode zlyhal:', e)
    return null
  }
}
```

Create `apps/app/src/lib/ocr.js` (stub — Task 4 nahradí):

```js
// Stub — ozajstná BAML/Gemini extrakcia príde v ďalšom tasku.
export async function extractReceiptZFotky() {
  return null
}
```

- [ ] **Step 3: Pipeline**

Create `apps/app/src/lib/pipeline.js`:

```js
import prisma from '@dobra-partia/db'
import { fetchReceipt } from './ekasa'
import { mapEkasaReceipt, mapOcrReceipt } from './doklady'
import { extractReceiptZFotky } from './ocr'

async function ulozVysledok(doklad, { doklad: polia, polozky }) {
  const [aktualny] = await prisma.$transaction([
    prisma.doklad.update({ where: { id: doklad.id }, data: polia }),
    prisma.nakladovaPolozka.deleteMany({ where: { dokladId: doklad.id } }),
    prisma.nakladovaPolozka.createMany({
      data: polozky.map((p) => ({ ...p, dokladId: doklad.id, partiaId: doklad.partiaId })),
    }),
  ])
  return aktualny
}

async function stiahniFotku(fotoUrl) {
  if (!fotoUrl) return null
  try {
    const res = await fetch(fotoUrl)
    if (!res.ok) return null
    const mimeType = res.headers.get('content-type') || 'image/jpeg'
    return { buffer: Buffer.from(await res.arrayBuffer()), mimeType }
  } catch {
    return null
  }
}

// Spracuje doklad v stave inbox/rucne: eKasa → OCR → rucne.
export async function spracujDoklad(dokladId) {
  const doklad = await prisma.doklad.findUnique({ where: { id: dokladId } })
  if (!doklad) return null

  if (doklad.qrData) {
    const vysledok = await fetchReceipt(doklad.qrData)
    if (vysledok.ok) return ulozVysledok(doklad, mapEkasaReceipt(vysledok.receipt))
    if (vysledok.reason === 'nedostupne') return doklad // ostáva inbox, overí sa neskôr
    // nenajdene → skús OCR
  }

  const foto = await stiahniFotku(doklad.fotoUrl)
  const ocr = foto ? await extractReceiptZFotky(foto.buffer, foto.mimeType) : null

  if (ocr?.qrCode && ocr.qrCode !== doklad.qrData) {
    // LLM prečítal QR, ktoré klient netrafil — najprv dedup, potom eKasa
    const duplikat = await prisma.doklad.findFirst({
      where: { partiaId: doklad.partiaId, qrData: ocr.qrCode, id: { not: doklad.id } },
    })
    if (duplikat) {
      await prisma.doklad.delete({ where: { id: doklad.id } })
      return { ...duplikat, duplicita: true }
    }
    const druhy = await fetchReceipt(ocr.qrCode)
    if (druhy.ok) {
      await prisma.doklad.update({ where: { id: doklad.id }, data: { qrData: ocr.qrCode } })
      return ulozVysledok(doklad, mapEkasaReceipt(druhy.receipt))
    }
  }

  if (ocr) return ulozVysledok(doklad, mapOcrReceipt(ocr))

  return prisma.doklad.update({
    where: { id: doklad.id },
    data: { stav: 'rucne', overenie: 'nic' },
  })
}
```

Do `apps/app/src/lib/doklady.js` pridaj `mapOcrReceipt` (Task 4 ho začne reálne sýtiť dátami, tvar je daný BAML `Receipt` schemou):

```js
// BAML Receipt → Doklad + polozky. items[] má unitPrice aj totalPrice priamo.
export function mapOcrReceipt(r) {
  return {
    doklad: {
      predajca: r.supplierName || '',
      suma: r.totalAmount ?? null,
      datum: r.issueDate ? new Date(r.issueDate) : null,
      ekasaRaw: null,
      overenie: 'ocr',
      stav: 'spracovany',
    },
    polozky: (r.items || []).map((i) => ({
      nazov: i.name,
      mnozstvo: i.quantity ?? 1,
      suma: i.totalPrice ?? 0,
      jednotkovaCena: i.unitPrice ?? (i.totalPrice ?? 0) / (i.quantity || 1),
      kategoria: 'material',
    })),
  }
}
```

- [ ] **Step 4: Failing test pre route**

Create `apps/app/src/app/api/doklady/route.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

const db = {
  doklad: { findFirst: vi.fn(), create: vi.fn() },
}
vi.mock('@dobra-partia/db', () => ({ default: db }))
vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@vercel/blob', () => ({ put: vi.fn(async () => ({ url: 'https://blob/x.jpg' })) }))
vi.mock('../../../lib/qr-server', () => ({ decodeQrZBuffra: vi.fn(async () => null) }))
vi.mock('../../../lib/pipeline', () => ({
  spracujDoklad: vi.fn(async () => ({ id: 'd1', stav: 'spracovany' })),
}))

import { POST } from './route'
import { auth } from '@/auth'

function requestSFotkou(qrText) {
  const fd = new FormData()
  fd.set('foto', new File([new Uint8Array([1, 2, 3])], 'blocek.jpg', { type: 'image/jpeg' }))
  if (qrText) fd.set('qrText', qrText)
  return { formData: async () => fd }
}

beforeEach(() => {
  vi.clearAllMocks()
  auth.mockResolvedValue({ user: { id: 'u1', partiaId: 'p1' } })
  db.doklad.findFirst.mockResolvedValue(null)
  db.doklad.create.mockResolvedValue({ id: 'd1', partiaId: 'p1', qrData: 'O-X', fotoUrl: 'https://blob/x.jpg' })
})

describe('POST /api/doklady', () => {
  it('bez session → 401', async () => {
    auth.mockResolvedValue(null)
    const res = await POST(requestSFotkou('O-X'))
    expect(res.status).toBe(401)
  })

  it('duplicitné QR → vráti existujúci doklad, nič nezakladá', async () => {
    db.doklad.findFirst.mockResolvedValue({ id: 'existujuci' })
    const res = await POST(requestSFotkou('O-X'))
    const body = await res.json()
    expect(body).toEqual({ duplicita: true, dokladId: 'existujuci' })
    expect(db.doklad.create).not.toHaveBeenCalled()
  })

  it('nový doklad → create so scopovaným partiaId + spustí pipeline', async () => {
    const res = await POST(requestSFotkou('O-X'))
    const body = await res.json()
    expect(db.doklad.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ partiaId: 'p1', qrData: 'O-X', stav: 'inbox' }),
      })
    )
    expect(body.dokladId).toBe('d1')
    expect(body.stav).toBe('spracovany')
  })

  it('bez fotky → 400', async () => {
    const fd = new FormData()
    const res = await POST({ formData: async () => fd })
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 5: Overiť fail**

Run: `npm test -w dobra-partia-app`
Expected: FAIL — `./route` neexistuje.

- [ ] **Step 6: Implementácia route**

Create `apps/app/src/app/api/doklady/route.js`:

```js
import { NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import prisma from '@dobra-partia/db'
import { auth } from '@/auth'
import { decodeQrZBuffra } from '../../../lib/qr-server'
import { spracujDoklad } from '../../../lib/pipeline'

export async function POST(request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const partiaId = session.user.partiaId

  const form = await request.formData()
  const foto = form.get('foto')
  if (!foto || typeof foto.arrayBuffer !== 'function') {
    return NextResponse.json({ error: 'Chýba fotka' }, { status: 400 })
  }
  const buffer = Buffer.from(await foto.arrayBuffer())

  let qrText = (form.get('qrText') || '').toString()
  if (!qrText) qrText = (await decodeQrZBuffra(buffer)) || ''

  if (qrText) {
    const existujuci = await prisma.doklad.findFirst({ where: { partiaId, qrData: qrText } })
    if (existujuci) return NextResponse.json({ duplicita: true, dokladId: existujuci.id })
  }

  const blob = await put(`doklady/${partiaId}/${Date.now()}.jpg`, buffer, {
    access: 'public',
    addRandomSuffix: true,
    contentType: foto.type || 'image/jpeg',
  })

  const doklad = await prisma.doklad.create({
    data: { partiaId, stav: 'inbox', qrData: qrText, fotoUrl: blob.url },
  })

  const spracovany = await spracujDoklad(doklad.id)
  return NextResponse.json({
    dokladId: spracovany?.id || doklad.id,
    stav: spracovany?.stav || 'inbox',
    ...(spracovany?.duplicita ? { duplicita: true } : {}),
  })
}
```

- [ ] **Step 7: Overiť pass + build**

Run: `npm test -w dobra-partia-app && npm run build:app`
Expected: testy passed, build prejde. (Lokálne bez `BLOB_READ_WRITE_TOKEN` reálny upload zlyhá — to je OK, reálny upload sa testuje v Task 8 s tokenom; unit testy blob mockujú.)

- [ ] **Step 8: Commit**

```bash
git add apps/app
git commit -m "feat(app): POST /api/doklady — Blob upload, dedup, pipeline eKasa (OCR stub)"
```

---

### Task 4: BAML/Gemini OCR fallback

**Files:**
- Create: `apps/app/baml_src/clients.baml`, `apps/app/baml_src/generators.baml`, `apps/app/baml_src/receipts.baml`, `apps/app/tsconfig.json`
- Modify: `apps/app/src/lib/ocr.js` (nahradiť stub), `apps/app/package.json` (deps), `apps/app/src/lib/doklady.test.js` (testy mapOcrReceipt)
- Delete: `apps/app/jsconfig.json` (nahradí ho tsconfig)
- Generated: `apps/app/src/lib/baml_client/**` (gitovaný)

**Interfaces:**
- Consumes: `mapOcrReceipt` (Task 3), pipeline volá `extractReceiptZFotky` (Task 3 stub).
- Produces: `extractReceiptZFotky(buffer, mimeType) → Promise<{ qrCode?, supplierName?, totalAmount, currency, issueDate?, items: [{ name, quantity, unitPrice, totalPrice, vatRate }] } | null>`.

- [ ] **Step 1: Deps + tsconfig**

```bash
npm install @boundaryml/baml -w dobra-partia-app
npm install -D typescript @types/node -w dobra-partia-app
git rm apps/app/jsconfig.json
```

Create `apps/app/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": false,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 2: BAML zdrojáky** (adaptované z accounting appky; retry policy tentoraz aj ZAPOJENÁ na klienta)

Create `apps/app/baml_src/clients.baml`:

```baml
client<llm> Gemini {
  provider google-ai
  retry_policy Exponential
  options {
    model "gemini-3-flash-preview"
    api_key env.GOOGLE_API_KEY
  }
}

retry_policy Exponential {
  max_retries 2
  strategy {
    type exponential_backoff
    delay_ms 300
    multiplier 1.5
    max_delay_ms 10000
  }
}
```

Create `apps/app/baml_src/generators.baml`:

```baml
generator target {
  output_type "typescript"
  output_dir "../src/lib"
  version "0.216.0"
  default_client_mode async
}
```

Create `apps/app/baml_src/receipts.baml`:

```baml
class ReceiptItem {
  name string
  quantity float
  unitPrice float
  totalPrice float
  vatRate float
}

class Receipt {
  qrCode string? @description("The full QR code content (URL or ID starting with O-). Look for the eKasa QR code, usually at the bottom of the receipt.")
  supplierName string? @description("Name of the store or supplier")
  supplierVatId string? @description("VAT ID (IC DPH) of the supplier")
  totalAmount float @description("Total amount paid")
  currency string @description("Currency code (e.g. EUR)")
  issueDate string? @description("Date of issue in ISO format YYYY-MM-DD")
  items ReceiptItem[]
}

function ExtractReceipt(receiptImage: image) -> Receipt {
  client Gemini
  prompt #"
    Extract data from this receipt.

    If there is a QR code (usually at the bottom), try to decode it.
    The QR code for Slovak eKasa usually contains a long ID starting with 'O-' or 'V-'.

    {{ receiptImage }}

    {{ ctx.output_format }}
  "#
}
```

- [ ] **Step 3: Vygenerovať klienta**

Run: `cd apps/app && npx baml-cli generate && cd ../..`
Expected: `apps/app/src/lib/baml_client/` vznikne (TypeScript). Over, že verzia v generators.baml sedí s nainštalovanou `@boundaryml/baml` (`npm ls @boundaryml/baml -w dobra-partia-app`); ak nie, uprav `version` v generators.baml na nainštalovanú a spusti generate znova.

- [ ] **Step 4: Failing testy pre mapOcrReceipt**

Append do `apps/app/src/lib/doklady.test.js`:

```js
import { mapOcrReceipt } from './doklady'

describe('mapOcrReceipt', () => {
  it('mapuje BAML Receipt na doklad + položky', () => {
    const { doklad, polozky } = mapOcrReceipt({
      supplierName: 'Hornbach',
      totalAmount: 55.5,
      currency: 'EUR',
      issueDate: '2026-04-04',
      items: [{ name: 'Silikón', quantity: 2, unitPrice: 5, totalPrice: 10, vatRate: 23 }],
    })
    expect(doklad.predajca).toBe('Hornbach')
    expect(doklad.suma).toBe(55.5)
    expect(doklad.overenie).toBe('ocr')
    expect(doklad.stav).toBe('spracovany')
    expect(doklad.datum.getFullYear()).toBe(2026)
    expect(polozky[0]).toEqual({
      nazov: 'Silikón', mnozstvo: 2, suma: 10, jednotkovaCena: 5, kategoria: 'material',
    })
  })
  it('prázdne items a chýbajúci dátum nepadnú', () => {
    const { doklad, polozky } = mapOcrReceipt({ totalAmount: 3, currency: 'EUR' })
    expect(polozky).toEqual([])
    expect(doklad.datum).toBeNull()
  })
})
```

(Implementácia `mapOcrReceipt` už existuje z Task 3 — testy majú prejsť rovno; ak nie, oprav implementáciu, nie testy.)

- [ ] **Step 5: Overiť pass**

Run: `npm test -w dobra-partia-app`
Expected: passed.

- [ ] **Step 6: Nahradiť OCR stub**

Replace celý obsah `apps/app/src/lib/ocr.js`:

```js
import { Image } from '@boundaryml/baml'
import { b } from './baml_client'

// Gemini extrakcia bločku z fotky. Vráti BAML Receipt alebo null (chyba/nečitateľné).
export async function extractReceiptZFotky(buffer, mimeType = 'image/jpeg') {
  if (!process.env.GOOGLE_API_KEY) return null
  try {
    const img = Image.fromBase64(mimeType, buffer.toString('base64'))
    return await b.ExtractReceipt(img)
  } catch (e) {
    console.error('OCR extrakcia zlyhala:', e?.message)
    return null
  }
}
```

- [ ] **Step 7: Manuálny test OCR (len ak je GOOGLE_API_KEY v apps/app/.env)**

```bash
node --env-file=apps/app/.env -e "
const fs = require('fs');
(async () => {
  const { extractReceiptZFotky } = await import('./apps/app/src/lib/ocr.js').catch(() => ({}));
})();" 2>/dev/null || echo "ESM import mimo Next nejde — otestuje sa cez pipeline v Task 8"
```

Ak priamy import nejde (ESM/TS mix), OCR sa overí end-to-end v Task 8 cez API. Ak kľúč nie je, uveď to v reporte a pokračuj.

- [ ] **Step 8: Build + testy**

Run: `npm test -w dobra-partia-app && npm run build:app`
Expected: testy passed; build prejde s TS klientom (tsconfig allowJs).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(app): BAML/Gemini OCR fallback pre bločky bez QR"
```

---

### Task 5: Capture klient — FAB, downscale + jsQR, offline fronta (TDD flush)

**Files:**
- Create: `apps/app/src/lib/capture.js`, `apps/app/src/lib/fronta.js`, `apps/app/src/lib/fronta.test.js`, `apps/app/src/components/CaptureButton.jsx`
- Modify: `apps/app/src/app/layout.js`, `apps/app/package.json` (idb-keyval)

**Interfaces:**
- Consumes: `POST /api/doklady` (Task 3).
- Produces: `<CaptureButton />` FAB v layoute; `flushFrontu(posli) → Promise<{ odoslane, zostava }>` kde `posli(zaznam)` vracia Promise (throw = nechaj vo fronte); `pridajDoFronty({ blob, qrText })`; `pocetVoFronte()`.

- [ ] **Step 1: Závislosť**

```bash
npm install idb-keyval -w dobra-partia-app
```

- [ ] **Step 2: Failing testy fronty**

Create `apps/app/src/lib/fronta.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

const sklad = new Map()
vi.mock('idb-keyval', () => ({
  get: vi.fn(async (k) => sklad.get(k)),
  set: vi.fn(async (k, v) => void sklad.set(k, v)),
}))

import { pridajDoFronty, flushFrontu, pocetVoFronte } from './fronta'

beforeEach(() => sklad.clear())

describe('fronta', () => {
  it('pridá záznam a spočíta ho', async () => {
    await pridajDoFronty({ blob: 'b1', qrText: 'O-1' })
    expect(await pocetVoFronte()).toBe(1)
  })

  it('flush odošle sekvenčne a úspešné odstráni', async () => {
    await pridajDoFronty({ blob: 'b1', qrText: 'O-1' })
    await pridajDoFronty({ blob: 'b2', qrText: 'O-2' })
    const posli = vi.fn(async () => {})
    const r = await flushFrontu(posli)
    expect(posli).toHaveBeenCalledTimes(2)
    expect(r).toEqual({ odoslane: 2, zostava: 0 })
    expect(await pocetVoFronte()).toBe(0)
  })

  it('pri zlyhaní sa zastaví a zvyšok ostane', async () => {
    await pridajDoFronty({ blob: 'b1', qrText: 'O-1' })
    await pridajDoFronty({ blob: 'b2', qrText: 'O-2' })
    const posli = vi.fn(async () => { throw new Error('offline') })
    const r = await flushFrontu(posli)
    expect(posli).toHaveBeenCalledTimes(1)
    expect(r).toEqual({ odoslane: 0, zostava: 2 })
    expect(await pocetVoFronte()).toBe(2)
  })
})
```

- [ ] **Step 3: Overiť fail**

Run: `npm test -w dobra-partia-app`
Expected: FAIL — `./fronta` neexistuje.

- [ ] **Step 4: Implementácia fronty**

Create `apps/app/src/lib/fronta.js`:

```js
import { get, set } from 'idb-keyval'

const KLUC = 'doklady-fronta'

async function nacitaj() {
  return (await get(KLUC)) || []
}

export async function pridajDoFronty({ blob, qrText }) {
  const fronta = await nacitaj()
  fronta.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, blob, qrText, createdAt: Date.now() })
  await set(KLUC, fronta)
}

export async function pocetVoFronte() {
  return (await nacitaj()).length
}

// Sekvenčný flush: posli(zaznam) — resolve = hotovo (odstráni sa), reject = stop (skúsi sa nabudúce).
export async function flushFrontu(posli) {
  let fronta = await nacitaj()
  let odoslane = 0
  while (fronta.length) {
    try {
      await posli(fronta[0])
      fronta = fronta.slice(1)
      await set(KLUC, fronta)
      odoslane++
    } catch {
      break
    }
  }
  return { odoslane, zostava: fronta.length }
}
```

- [ ] **Step 5: Overiť pass**

Run: `npm test -w dobra-partia-app`
Expected: passed.

- [ ] **Step 6: Capture — downscale + QR v prehliadači**

Create `apps/app/src/lib/capture.js`:

```js
import jsQR from 'jsqr'

const MAX_ROZMER = 2000

// Fotka z inputu → zmenšený JPEG blob + pokus o QR (plná a polovičná mierka).
export async function spracujFotku(file) {
  const bitmap = await createImageBitmap(file)
  const pomer = Math.min(1, MAX_ROZMER / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * pomer)
  const h = Math.round(bitmap.height * pomer)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, w, h)

  let qrText = null
  const plne = ctx.getImageData(0, 0, w, h)
  const kod = jsQR(plne.data, w, h)
  if (kod) qrText = kod.data
  else {
    const c2 = document.createElement('canvas')
    c2.width = Math.round(w / 2)
    c2.height = Math.round(h / 2)
    const ctx2 = c2.getContext('2d')
    ctx2.drawImage(bitmap, 0, 0, c2.width, c2.height)
    const pol = ctx2.getImageData(0, 0, c2.width, c2.height)
    const kod2 = jsQR(pol.data, c2.width, c2.height)
    if (kod2) qrText = kod2.data
  }

  const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.8))
  return { blob, qrText }
}
```

- [ ] **Step 7: CaptureButton FAB**

Create `apps/app/src/components/CaptureButton.jsx`:

```js
'use client'

import { useEffect, useRef, useState } from 'react'
import { spracujFotku } from '@/lib/capture'
import { pridajDoFronty, flushFrontu, pocetVoFronte } from '@/lib/fronta'
import { useRouter } from 'next/navigation'

async function posliZaznam(zaznam) {
  const fd = new FormData()
  fd.set('foto', zaznam.blob, 'blocek.jpg')
  if (zaznam.qrText) fd.set('qrText', zaznam.qrText)
  const res = await fetch('/api/doklady', { method: 'POST', body: fd })
  if (!res.ok) throw new Error(`upload ${res.status}`)
  return res.json()
}

export default function CaptureButton() {
  const inputRef = useRef(null)
  const router = useRouter()
  const [pocet, setPocet] = useState(0)
  const [sprava, setSprava] = useState('')

  async function obnovPocet() {
    setPocet(await pocetVoFronte())
  }

  async function flush() {
    if (!navigator.onLine) return
    const r = await flushFrontu(posliZaznam)
    await obnovPocet()
    if (r.odoslane > 0) {
      setSprava(`Odoslané: ${r.odoslane} ✓`)
      setTimeout(() => setSprava(''), 3000)
      router.refresh()
    }
  }

  useEffect(() => {
    obnovPocet()
    flush()
    window.addEventListener('online', flush)
    return () => window.removeEventListener('online', flush)
  }, [])

  async function naFotku(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setSprava('Spracúvam…')
    try {
      const { blob, qrText } = await spracujFotku(file)
      await pridajDoFronty({ blob, qrText })
      await obnovPocet()
      setSprava(qrText ? 'QR nájdené, odosielam…' : 'Bez QR, odosielam…')
      await flush()
    } catch (err) {
      console.error(err)
      setSprava('Nepodarilo sa spracovať fotku')
      setTimeout(() => setSprava(''), 4000)
    }
  }

  return (
    <>
      {sprava && (
        <div className="fixed bottom-24 left-1/2 z-30 -translate-x-1/2 rounded-full bg-navy px-4 py-2 text-sm text-white shadow-lg">
          {sprava}
        </div>
      )}
      <button
        onClick={() => inputRef.current?.click()}
        aria-label="Odfotiť bloček"
        className="fixed bottom-6 right-6 z-30 flex h-16 w-16 items-center justify-center rounded-full bg-terracotta text-3xl text-white shadow-xl active:scale-95"
      >
        📷
        {pocet > 0 && (
          <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-navy text-xs font-bold">
            {pocet}
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={naFotku}
      />
    </>
  )
}
```

- [ ] **Step 8: FAB do layoutu**

V `apps/app/src/app/layout.js` pridaj `import CaptureButton from '@/components/CaptureButton'` a do `<body>` vedľa `<SwRegister />` pridaj `<CaptureButton />`. (FAB je fixed — na login stránke pôsobí navyše, ale je neškodný; middleware aj tak neprihláseného z API odbije.)

- [ ] **Step 9: Manuálne overenie + build**

`npm run dev:app`, prihlás sa, na desktope klikni FAB a vyber JPEG z `/Users/ericsko/Projekty/_Sandbox/agents/accounting/web/test_images/` — toast prejde stavmi a záznam sa odošle (bez BLOB tokenu lokálne upload padne — over aspoň, že záznam ostal vo fronte a badge ukazuje 1; s tokenom over celý flow). `npm run build:app` musí prejsť. Nenechaj bežať dev server.

- [ ] **Step 10: Commit**

```bash
git add apps/app
git commit -m "feat(app): capture FAB — downscale, jsQR v prehliadači, offline fronta (TDD flush)"
```

---

### Task 6: `/doklady` zoznam + navigácia

**Files:**
- Create: `apps/app/src/lib/doklady-ui.js`, `apps/app/src/lib/doklady-ui.test.js`, `apps/app/src/app/doklady/page.js`, `apps/app/src/components/DokladKarta.jsx`
- Modify: `apps/app/src/components/AppHeader.jsx`

**Interfaces:**
- Consumes: model Doklad + polozky, `auth()`.
- Produces: `STAVY_DOKLADU = ['inbox', 'spracovany', 'rucne']`, `STAV_DOKLADU_LABEL`, `jePlatnyStavDokladu(s)`, `OVERENIE_IKONA`. `AppHeader` dostáva prop `aktivna` ('dopyty' | 'doklady') a renderuje prepínacie linky — Task 7 aj existujúca /dopyty stránka ho používajú.

- [ ] **Step 1: Failing test**

Create `apps/app/src/lib/doklady-ui.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { STAVY_DOKLADU, jePlatnyStavDokladu } from './doklady-ui'

describe('jePlatnyStavDokladu', () => {
  it('pozná stavy zoznamu', () => {
    expect(STAVY_DOKLADU).toEqual(['inbox', 'spracovany', 'rucne'])
    for (const s of STAVY_DOKLADU) expect(jePlatnyStavDokladu(s)).toBe(true)
  })
  it('odmieta neznáme', () => {
    expect(jePlatnyStavDokladu('priradeny')).toBe(false) // v UI filtri až od časti 2
    expect(jePlatnyStavDokladu(undefined)).toBe(false)
  })
})
```

- [ ] **Step 2: Overiť fail**

Run: `npm test -w dobra-partia-app`
Expected: FAIL.

- [ ] **Step 3: Implementácia**

Create `apps/app/src/lib/doklady-ui.js`:

```js
export const STAVY_DOKLADU = ['inbox', 'spracovany', 'rucne']

export const STAV_DOKLADU_LABEL = {
  inbox: 'Inbox',
  spracovany: 'Spracovaný',
  rucne: 'Ručne',
  priradeny: 'Priradený',
}

export const OVERENIE_IKONA = {
  ekasa: '✅',
  ocr: '🤖',
  nic: '❔',
}

export function jePlatnyStavDokladu(stav) {
  return STAVY_DOKLADU.includes(stav)
}
```

- [ ] **Step 4: Overiť pass**

Run: `npm test -w dobra-partia-app`
Expected: passed.

- [ ] **Step 5: AppHeader s navigáciou**

Replace `apps/app/src/components/AppHeader.jsx`:

```js
import Link from 'next/link'
import { signOut } from '@/auth'
import PushNastavenie from './PushNastavenie'

const SEKCIE = [
  { key: 'dopyty', href: '/dopyty', label: 'Dopyty' },
  { key: 'doklady', href: '/doklady', label: 'Doklady' },
]

export default function AppHeader({ aktivna }) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between bg-navy px-4 py-3 text-white">
      <nav className="flex gap-1">
        {SEKCIE.map((s) => (
          <Link
            key={s.key}
            href={s.href}
            className={`rounded-lg px-3 py-2 text-sm font-bold ${aktivna === s.key ? 'bg-white/20' : 'text-white/70'}`}
          >
            {s.label}
          </Link>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        <PushNastavenie />
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
      </div>
    </header>
  )
}
```

V `apps/app/src/app/dopyty/page.js` zmeň `<AppHeader title="Dopyty" />` na `<AppHeader aktivna="dopyty" />`.

- [ ] **Step 6: Karta + stránka**

Create `apps/app/src/components/DokladKarta.jsx`:

```js
import Link from 'next/link'
import { STAV_DOKLADU_LABEL, OVERENIE_IKONA } from '@/lib/doklady-ui'

const STAV_FARBA = {
  inbox: 'bg-terracotta text-white',
  spracovany: 'bg-teal text-white',
  rucne: 'bg-white text-navy border border-navy/30',
  priradeny: 'bg-navy/20 text-navy',
}

export default function DokladKarta({ doklad }) {
  return (
    <Link href={`/doklady/${doklad.id}`} className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm">
      {doklad.fotoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={doklad.fotoUrl} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
      ) : (
        <div className="h-16 w-16 shrink-0 rounded-xl bg-sand" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">{doklad.predajca || 'Neznámy bloček'}</p>
        <p className="text-sm text-navy/60">
          {doklad.datum ? new Date(doklad.datum).toLocaleDateString('sk-SK') : '—'}
        </p>
        <p className="text-lg font-bold">{doklad.suma != null ? `${Number(doklad.suma).toFixed(2)} €` : '—'}</p>
      </div>
      <span
        className={`h-fit shrink-0 rounded-full px-3 py-1 text-xs font-bold ${STAV_FARBA[doklad.stav] || STAV_FARBA.inbox}`}
      >
        {OVERENIE_IKONA[doklad.overenie] || ''} {STAV_DOKLADU_LABEL[doklad.stav] || doklad.stav}
      </span>
    </Link>
  )
}
```

Create `apps/app/src/app/doklady/page.js`:

```js
import Link from 'next/link'
import prisma from '@dobra-partia/db'
import { auth } from '@/auth'
import AppHeader from '@/components/AppHeader'
import DokladKarta from '@/components/DokladKarta'
import { STAVY_DOKLADU, STAV_DOKLADU_LABEL, jePlatnyStavDokladu } from '@/lib/doklady-ui'

export const dynamic = 'force-dynamic'

export default async function DokladyPage({ searchParams }) {
  const session = await auth()
  const { stav } = await searchParams
  const filter = jePlatnyStavDokladu(stav) ? { stav } : {}
  const doklady = await prisma.doklad.findMany({
    where: { partiaId: session.user.partiaId, ...filter },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return (
    <>
      <AppHeader aktivna="doklady" />
      <main className="mx-auto max-w-xl space-y-3 p-4 pb-28">
        <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <Link
            href="/doklady"
            className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${!stav ? 'bg-navy text-white' : 'bg-white'}`}
          >
            Všetky
          </Link>
          {STAVY_DOKLADU.map((s) => (
            <Link
              key={s}
              href={`/doklady?stav=${s}`}
              className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${stav === s ? 'bg-navy text-white' : 'bg-white'}`}
            >
              {STAV_DOKLADU_LABEL[s]}
            </Link>
          ))}
        </nav>
        {doklady.length === 0 && (
          <p className="p-6 text-center text-navy/50">Žiadne doklady — odfoť prvý bloček 📷</p>
        )}
        {doklady.map((d) => (
          <DokladKarta key={d.id} doklad={d} />
        ))}
      </main>
    </>
  )
}
```

- [ ] **Step 7: Manuálne overenie + build**

Dev server, prihlásiť, `/doklady` ukazuje prázdny stav alebo doklady z Task 5 testov; prepínanie Dopyty ⇄ Doklady v hlavičke funguje. `npm run build:app` prejde. Server nenechať bežať.

- [ ] **Step 8: Commit**

```bash
git add apps/app
git commit -m "feat(app): /doklady zoznam s filtrami + prepínacia navigácia v hlavičke"
```

---

### Task 7: Detail dokladu + akcie (overiť znova, upraviť, zmazať)

**Files:**
- Create: `apps/app/src/actions/doklady.js`, `apps/app/src/app/doklady/[id]/page.js`, `apps/app/src/components/DokladDetail.jsx`
- Modify: `apps/app/src/lib/doklady.js` + `apps/app/src/lib/doklady.test.js` (validácia úpravy)

**Interfaces:**
- Consumes: `spracujDoklad` (Task 3), `jePlatnyStavDokladu`/labely (Task 6), `auth()`.
- Produces: server actions `overitDoklad(id)`, `upravDoklad(id, { predajca, suma, datum })`, `zmazDoklad(id)`; `validujUpravu({ predajca, suma, datum }) → { ok: true, data } | { ok: false, chyba }` v `doklady.js`.

- [ ] **Step 1: Failing test validácie**

Append do `apps/app/src/lib/doklady.test.js`:

```js
import { validujUpravu } from './doklady'

describe('validujUpravu', () => {
  it('prijme platné hodnoty a znormalizuje typy', () => {
    const r = validujUpravu({ predajca: 'Hornbach', suma: '12,50', datum: '2026-07-12' })
    expect(r.ok).toBe(true)
    expect(r.data.suma).toBe(12.5)
    expect(r.data.datum.getFullYear()).toBe(2026)
    expect(r.data.predajca).toBe('Hornbach')
  })
  it('odmietne zápornú a nečíselnú sumu', () => {
    expect(validujUpravu({ predajca: 'X', suma: '-1', datum: '' }).ok).toBe(false)
    expect(validujUpravu({ predajca: 'X', suma: 'abc', datum: '' }).ok).toBe(false)
  })
  it('prázdny dátum je OK (null), predajca sa oreže', () => {
    const r = validujUpravu({ predajca: '  Obchod  ', suma: '5', datum: '' })
    expect(r.ok).toBe(true)
    expect(r.data.datum).toBeNull()
    expect(r.data.predajca).toBe('Obchod')
  })
})
```

- [ ] **Step 2: Overiť fail**

Run: `npm test -w dobra-partia-app`
Expected: FAIL — `validujUpravu` neexistuje.

- [ ] **Step 3: Implementácia validácie**

Append do `apps/app/src/lib/doklady.js`:

```js
export function validujUpravu({ predajca, suma, datum }) {
  const cistySuma = parseFloat(String(suma ?? '').replace(',', '.'))
  if (Number.isNaN(cistySuma) || cistySuma < 0) {
    return { ok: false, chyba: 'Suma musí byť nezáporné číslo' }
  }
  const cistyDatum = datum ? new Date(datum) : null
  if (cistyDatum && Number.isNaN(cistyDatum.getTime())) {
    return { ok: false, chyba: 'Neplatný dátum' }
  }
  return {
    ok: true,
    data: { predajca: String(predajca || '').trim(), suma: cistySuma, datum: cistyDatum },
  }
}
```

- [ ] **Step 4: Overiť pass**

Run: `npm test -w dobra-partia-app`
Expected: passed.

- [ ] **Step 5: Server actions**

Create `apps/app/src/actions/doklady.js`:

```js
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import prisma from '@dobra-partia/db'
import { auth } from '@/auth'
import { spracujDoklad } from '@/lib/pipeline'
import { validujUpravu } from '@/lib/doklady'

async function najdiVlastny(id) {
  const session = await auth()
  if (!session?.user) throw new Error('Neprihlásený')
  const doklad = await prisma.doklad.findFirst({
    where: { id, partiaId: session.user.partiaId },
  })
  if (!doklad) throw new Error('Doklad neexistuje')
  return doklad
}

export async function overitDoklad(id) {
  const doklad = await najdiVlastny(id)
  if (!['inbox', 'rucne'].includes(doklad.stav)) return
  await spracujDoklad(doklad.id)
  revalidatePath(`/doklady/${id}`)
  revalidatePath('/doklady')
}

export async function upravDoklad(id, hodnoty) {
  await najdiVlastny(id)
  const v = validujUpravu(hodnoty)
  if (!v.ok) throw new Error(v.chyba)
  await prisma.doklad.update({
    where: { id },
    data: { ...v.data, stav: 'spracovany' }, // overenie ostáva 'nic'
  })
  revalidatePath(`/doklady/${id}`)
  revalidatePath('/doklady')
}

export async function zmazDoklad(id) {
  await najdiVlastny(id)
  await prisma.$transaction([
    prisma.nakladovaPolozka.deleteMany({ where: { dokladId: id } }),
    prisma.doklad.delete({ where: { id } }),
  ])
  revalidatePath('/doklady')
  redirect('/doklady')
}
```

- [ ] **Step 6: Detail stránka + klientsky komponent**

Create `apps/app/src/app/doklady/[id]/page.js`:

```js
import { notFound } from 'next/navigation'
import prisma from '@dobra-partia/db'
import { auth } from '@/auth'
import AppHeader from '@/components/AppHeader'
import DokladDetail from '@/components/DokladDetail'

export const dynamic = 'force-dynamic'

export default async function DokladDetailPage({ params }) {
  const session = await auth()
  const { id } = await params
  const doklad = await prisma.doklad.findFirst({
    where: { id, partiaId: session.user.partiaId },
    include: { polozky: true },
  })
  if (!doklad) notFound()
  return (
    <>
      <AppHeader aktivna="doklady" />
      <main className="mx-auto max-w-xl space-y-4 p-4 pb-28">
        <DokladDetail
          doklad={{
            ...doklad,
            suma: doklad.suma != null ? Number(doklad.suma) : null,
            polozky: doklad.polozky.map((p) => ({
              id: p.id,
              nazov: p.nazov,
              mnozstvo: Number(p.mnozstvo),
              suma: Number(p.suma),
              jednotkovaCena: p.jednotkovaCena != null ? Number(p.jednotkovaCena) : null,
            })),
          }}
        />
      </main>
    </>
  )
}
```

(Decimal polia sa pred odovzdaním klientskemu komponentu konvertujú na `Number` — Decimal nie je serializovateľný.)

Create `apps/app/src/components/DokladDetail.jsx`:

```js
'use client'

import { useState, useTransition } from 'react'
import { overitDoklad, upravDoklad, zmazDoklad } from '@/actions/doklady'
import { STAV_DOKLADU_LABEL, OVERENIE_IKONA } from '@/lib/doklady-ui'

export default function DokladDetail({ doklad }) {
  const [pending, start] = useTransition()
  const [editujem, setEditujem] = useState(false)
  const [chyba, setChyba] = useState('')

  function akcia(fn) {
    setChyba('')
    start(async () => {
      try {
        await fn()
      } catch (e) {
        setChyba(e?.message || 'Akcia zlyhala')
      }
    })
  }

  return (
    <div className={`space-y-4 ${pending ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">{doklad.predajca || 'Neznámy bloček'}</h1>
          <p className="text-sm text-navy/60">
            {doklad.datum ? new Date(doklad.datum).toLocaleString('sk-SK') : 'bez dátumu'}
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-sm font-bold shadow-sm">
          {OVERENIE_IKONA[doklad.overenie]} {STAV_DOKLADU_LABEL[doklad.stav] || doklad.stav}
        </span>
      </div>

      {chyba && <p className="rounded-xl bg-terracotta/10 p-3 text-terracotta">{chyba}</p>}

      {doklad.fotoUrl && (
        <a href={doklad.fotoUrl} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={doklad.fotoUrl} alt="Fotka bločku" className="max-h-72 w-full rounded-2xl object-contain bg-white" />
        </a>
      )}

      <p className="text-3xl font-bold">{doklad.suma != null ? `${doklad.suma.toFixed(2)} €` : '—'}</p>

      {doklad.polozky.length > 0 && (
        <div className="rounded-2xl bg-white p-3 shadow-sm">
          {doklad.polozky.map((p) => (
            <div key={p.id} className="flex justify-between border-b border-sand py-2 last:border-0">
              <span className="min-w-0 truncate pr-2">
                {p.nazov}
                {p.mnozstvo !== 1 && <span className="text-navy/50"> ×{p.mnozstvo}</span>}
              </span>
              <span className="shrink-0 font-bold">{p.suma.toFixed(2)} €</span>
            </div>
          ))}
        </div>
      )}

      {editujem ? (
        <form
          action={(fd) =>
            akcia(async () => {
              await upravDoklad(doklad.id, {
                predajca: fd.get('predajca'),
                suma: fd.get('suma'),
                datum: fd.get('datum'),
              })
              setEditujem(false)
            })
          }
          className="space-y-2 rounded-2xl bg-white p-3 shadow-sm"
        >
          <input name="predajca" defaultValue={doklad.predajca} placeholder="Predajca" className="w-full rounded-xl border border-navy/20 p-3" />
          <input name="suma" defaultValue={doklad.suma ?? ''} placeholder="Suma €" inputMode="decimal" className="w-full rounded-xl border border-navy/20 p-3" />
          <input name="datum" type="date" defaultValue={doklad.datum ? String(doklad.datum).slice(0, 10) : ''} className="w-full rounded-xl border border-navy/20 p-3" />
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="flex-1 rounded-xl bg-navy p-3 font-bold text-white">Uložiť</button>
            <button type="button" onClick={() => setEditujem(false)} className="rounded-xl bg-sand p-3">Zrušiť</button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {['inbox', 'rucne'].includes(doklad.stav) && doklad.qrData && (
            <button onClick={() => akcia(() => overitDoklad(doklad.id))} disabled={pending} className="rounded-xl bg-teal p-3 font-bold text-white">
              Overiť znova
            </button>
          )}
          <button onClick={() => setEditujem(true)} className="rounded-xl bg-white p-3 font-bold shadow-sm">
            Upraviť
          </button>
          <button
            onClick={() => window.confirm('Zmazať doklad aj s položkami?') && akcia(() => zmazDoklad(doklad.id))}
            disabled={pending}
            className="col-span-2 rounded-xl border border-terracotta p-3 font-bold text-terracotta"
          >
            Zmazať
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 7: Testy + build + manuálne overenie**

Run: `npm test -w dobra-partia-app && npm run build:app`
Expected: passed + build OK. Dev server: otvor doklad z Task 5/6, over „Upraviť" (uloží a stav sa zmení na Spracovaný), „Zmazať" (vráti na zoznam). Server nenechať bežať.

- [ ] **Step 8: Commit**

```bash
git add apps/app
git commit -m "feat(app): detail dokladu — overiť znova, ručná úprava, zmazanie"
```

---

### Task 8: Lokálne E2E — reálne fotky, offline fronta

**Files:**
- Create: `apps/app/scripts/test-blocky.mjs`

Predpoklad: `BLOB_READ_WRITE_TOKEN` v `apps/app/.env` (ak ho užívateľ ešte nedodal, tento task sa robí s lokálnym zápisom fotky — over to v Task 9; bez tokenu spusti E2E aspoň po krok dedup/QR a uveď v reporte, čo sa preskočilo). `GOOGLE_API_KEY` — bez neho OCR vetva skončí v `rucne` (očakávané, uveď v reporte).

- [ ] **Step 1: E2E skript cez pipeline (bez HTTP, priamo nad lokálnou DB)**

Create `apps/app/scripts/test-blocky.mjs`:

```js
// Spustenie z repo rootu: node --env-file=apps/app/.env apps/app/scripts/test-blocky.mjs <adresár s fotkami>
// Prejde fotky cez decode → dedup → pipeline nad LOKÁLNOU DB (bez Blob — fotoUrl nechá prázdne, OCR krok dostane buffer priamo).
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const prisma = require('../../packages/db/index.js')

const { decodeQrZBuffra } = await import('../src/lib/qr-server.js')
const { fetchReceipt } = await import('../src/lib/ekasa.js')
const { mapEkasaReceipt } = await import('../src/lib/doklady.js')

const dir = process.argv[2]
const partia = await prisma.partia.findFirstOrThrow({ where: { slug: 'kosice' } })

for (const subor of fs.readdirSync(dir).filter((f) => /\.jpe?g$/i.test(f))) {
  const buffer = fs.readFileSync(path.join(dir, subor))
  const qr = await decodeQrZBuffra(buffer)
  process.stdout.write(`${subor}: QR=${qr ? qr.slice(0, 20) + '…' : 'NIE'}`)
  if (!qr) { console.log(' → OCR vetva (netestuje sa tu)'); continue }
  const r = await fetchReceipt(qr)
  if (!r.ok) { console.log(` → eKasa: ${r.reason}`); continue }
  const { doklad, polozky } = mapEkasaReceipt(r.receipt)
  console.log(` → ${doklad.predajca} ${doklad.suma} € (${polozky.length} položiek)`)
  await new Promise((res) => setTimeout(res, 1500)) // rate limiter!
}
await prisma.$disconnect()
```

Pozn.: skript importuje ESM `.js` z Next `src/` — ak import zlyhá na alias/ESM chybách, skopíruj si čisté funkcie do skriptu (sú malé); dôležitý je výsledok testu, nie DRY v teste.

- [ ] **Step 2: Spustiť na reálnych fotkách**

Run: `node --env-file=apps/app/.env apps/app/scripts/test-blocky.mjs "/Users/ericsko/Projekty/_Sandbox/agents/accounting/web/test_images"`
Expected: pri fotkách s čitateľným QR vypíše predajcu, sumu a počet položiek z eKasa; ostatné `QR=NIE`/`nenajdene` (CZK bločky eKasa nepozná — očakávané). Výsledky zapíš do reportu per súbor.

- [ ] **Step 3: E2E cez prehliadač (celý flow s DB)**

Dev server + prihlásenie; cez FAB nahraj 2 fotky z test_images (jednu s QR, jednu bez). Over v `/doklady`: prvá `spracovany ✅` s položkami, druhá `rucne`/`spracovany 🤖` (podľa GOOGLE_API_KEY). Nahraj prvú EŠTE RAZ → toast prejde, ale nový doklad nevznikne (dedup — v zozname ostáva jedna karta). Ak lokálne nie je BLOB token: upload padne — over aspoň dedup na úrovni API logov a uveď v reporte.

- [ ] **Step 4: Offline test**

V DevTools Network → Offline: odfoť/nahraj fotku → badge na FABe ukáže 1, doklad nevznikne. Network → Online → event flushne frontu → badge zmizne, doklad pribudne. Zapíš výsledok do reportu.

- [ ] **Step 5: Commit**

```bash
git add apps/app/scripts
git commit -m "test(app): E2E skript pre bločkový pipeline nad reálnymi fotkami"
```

---

### Task 9: Deploy — Blob store, GOOGLE_API_KEY, produkčný smoke

Kroky 1–2 vykonáva UŽÍVATEĽ (dashboard/kľúče), zvyšok kontrolér.

- [ ] **Step 1 (užívateľ): Blob store** — Vercel dashboard → Storage → Create → Blob (názov napr. `dobra-partia-doklady`) → Connect Project → `dobra-partia-app` (Production + Preview). Tým pribudne `BLOB_READ_WRITE_TOKEN`. Ten istý token vložiť aj do `apps/app/.env` pre lokálny dev (Storage → token).

- [ ] **Step 2 (užívateľ): GOOGLE_API_KEY** — Google AI Studio kľúč; vložiť do env projektu `dobra-partia-app` (Production + Preview) a do `apps/app/.env`.

- [ ] **Step 3: Push + deploy**

```bash
git push dobra-partia main
```

Počkať na READY cez Vercel API (vzor z prestavby — deployments endpoint, nie parsovanie `vercel ls`).

- [ ] **Step 4: Produkčný smoke**

- `POST https://app.dobrapartia.sk/api/doklady` bez session → 401.
- Užívateľ na mobile: FAB → odfotiť reálny bloček z peňaženky → v `/doklady` sa objaví spracovaný doklad s položkami (✅ ekasa). Odfotiť ten istý ešte raz → duplicita, nový nevznikne.
- Kontrola Vercel runtime logov appky — žiadne fatal/error počas testu.

- [ ] **Step 5: Dokumenty + ledger**

- `../business/plan-automatizacie.md`: vo Fáze 3 odškrtnúť capture/eKasa inbox časť (poznámka: AI priradenie a Zúčtuj ostávajú na časť 2 po Fáze 2).
- Root `README.md`: doplniť `/doklady` do prehľadu funkcií appky + `BLOB_READ_WRITE_TOKEN`, `GOOGLE_API_KEY` do env tabuľky.
- `.superpowers/sdd/progress.md`: záznam o dokončení.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "docs: bločkový inbox nasadený — aktualizácia README a plánu automatizácie"
git push dobra-partia main
```

---

## Poznámky pre implementátora

- **Docker Postgres** (54329) musí bežať pri testoch aj buildoch (`build:app` robí db push).
- **eKasa rate limiter**: pri E2E skripte je 1,5 s pauza medzi volaniami — neodstraňovať, neparalelizovať.
- **`sharp` na Verceli** funguje natívne; lokálne na macOS sa nainštaluje darwin binárka — commitovať len package.json/lock.
- **Decimal → Number** pri odovzdávaní do client komponentov (viď Task 7) — inak Next spadne na serializácii.
- **BAML klient je TypeScript** — gitovaný, negeneruje sa na Verceli; po zmene `.baml` súborov treba `npx baml-cli generate` lokálne a commitnúť.
