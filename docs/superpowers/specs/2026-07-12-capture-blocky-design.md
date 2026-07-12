# Dizajn: Capture button + bločkový inbox (Fáza 3, časť 1)

> Dátum: 12. 7. 2026 · Stav: schválený
> Nadväzuje na `../business/plan-automatizacie.md` (Fáza 3) a spec `2026-07-11-monorepo-app-pwa-design.md`.
> Referenčná implementácia: `/Users/ericsko/Projekty/_Sandbox/agents/accounting/web` — preberajú sa overené časti (eKasa klient a response interface, BAML ExtractReceipt, dedup, stavový model, prepočet cien), opravujú sa jej slabiny (žiadny retry na eKasa, jednopokusový jsQR, lokálny filesystem).

## Cieľ

Jeden capture button v operačnej PWA: fotka bločku → QR → eKasa API → štruktúrované položky v DB. V teréne sa nič nevypisuje; funguje aj bez signálu. Toto je zberná polovica nákladového enginu — AI priradenie k zákazkám, split a „Zúčtuj" prídu v časti 2 (po Fáze 2).

## Overené fakty o eKasa API (sonda 12. 7. 2026 + slovensko.digital)

- `POST https://ekasa.financnasprava.sk/mdu/api/v1/opd/receipt/find`, body `{"receiptId":"O-…"}` (obsah QR kódu), JSON odpoveď `{returnValue: 0, receipt: {...}}`.
- `receipt` obsahuje: `receiptId`, `ico`, `dic`, `icDph`, `issueDate` (`"07.10.2020 16:57:12"` — DD.MM.YYYY HH:mm:ss), `totalPrice`, `items[]` (`name`, `quantity`, `vatRate`, `price`), `organization` (`name`, adresa…), `unit`, `vatSummary[]`.
- **`items[].price` je SUMA RIADKU, nie jednotková cena** (overené: Σ price = totalPrice). Jednotková cena = `price / (quantity || 1)`.
- Prefixy receiptId: `O-` (ORP), `V-` (VRP), 32-znakový hex (offline doklad) — všetky sa posielajú tak, ako sú v QR.
- Server má „drsný" rate limiter → volať sekvenčne, s retry/backoffom, nikdy paralelne v dávke.

## Architektúra

### Klient (apps/app)

- **`CaptureButton`** — plávajúci FAB viditeľný na všetkých obrazovkách appky (v layoute). Tap → `<input type="file" accept="image/*" capture="environment">` → natívny foťák.
- **Spracovanie fotky v prehliadači** (`src/lib/capture.js`): canvas downscale na max 2000 px JPEG (~q0.8) + pokus o QR dekódovanie cez `jsqr` nad canvas ImageData (skúsiť plnú aj polovičnú mierku). Výstup: `{ blob, qrText | null }`.
- **Offline fronta** (`src/lib/fronta.js`, `idb-keyval`): záznamy `{ id, blob, qrText, createdAt }`. Flush: sekvenčne po jednom, spúšťaný (a) hneď po pridaní, (b) `window online` evente, (c) otvorení appky. Po úspechu záznam zmizne; po neúspechu ostáva (ďalší flush ho zopakuje). Badge s počtom čakajúcich pri FABe.

### Server (apps/app)

- **`POST /api/doklady`** (session auth, multipart: `foto` + `qrText?`):
  1. Ak `qrText` chýba → server skúsi QR ešte raz zo servera (`sharp` → raw RGBA → `jsqr`), ako v accounting appke.
  2. **Dedup**: ak `qrText` existuje a `Doklad` s rovnakým `qrData` v partii už je → HTTP 200 s `{ duplicita: true, dokladId }`, nič sa nezakladá.
  3. Fotka → **Vercel Blob** (`put`, public store, náhodný suffix) → `fotoUrl`.
  4. `Doklad` create: `partiaId` zo session (**scopovať od začiatku**), `stav: 'inbox'`, `qrData`, `fotoUrl`.
  5. Ak QR: **eKasa lookup** (`src/lib/ekasa.js`) — 3 pokusy s backoffom 1 s / 3 s na 429/5xx/network; timeout 10 s per pokus. Úspech → krok 6. Neúspech → doklad ostáva `inbox` (overí sa neskôr), response `{ stav: 'inbox' }`.
  6. **Uloženie výsledku** (`src/lib/doklady.js` — čistá, testovateľná mapovacia funkcia): `predajca = organization.name`, `suma = totalPrice`, `datum = parse(issueDate)`, `ekasaRaw = celý receipt JSON`, `overenie: 'ekasa'`, `stav: 'spracovany'` + `NakladovaPolozka[]`: `nazov = name`, `mnozstvo = quantity`, `suma = price` (riadková), `jednotkovaCena = price/(quantity||1)`, `kategoria: 'material'` (default; prekategorizovanie v časti 2).
  7. Ak QR nebolo / eKasa vrátila „nenájdené": **BAML `ExtractReceipt`** (Gemini, prevzaté z accounting vrátane pokusu LLM prečítať QR z fotky — ak QR nájde, vráť sa na krok 5). Výstup → položky s `overenie: 'ocr'`, `stav: 'spracovany'`. Ak extrakcia zlyhá → `stav: 'rucne'`, `overenie: 'nic'`.
- **Server actions** (`src/actions/doklady.js`): `overitDoklad(id)` — znovu spustí kroky 5–7 pre doklad v stave `inbox`/`rucne` s `qrData`; `upravDoklad(id, { predajca, suma, datum })` — ručné doplnenie pre `rucne`, po uložení nastaví `stav: 'spracovany'` (`overenie` ostáva `'nic'`); `zmazDoklad(id)` — zmaže doklad + položky (omylom odfotené). Všetky: session auth + kontrola `partiaId`.

### BAML (prevzaté z accounting)

`apps/app/baml_src/`: `clients.baml` (Gemini flash cez `env.GOOGLE_API_KEY`, s retry policy — na rozdiel od accounting ju aj zapojiť) + `receipts.baml` (`Receipt`/`ReceiptItem` schema + `ExtractReceipt(image)`; prompt žiada aj obsah QR). Generovaný klient v `apps/app/src/lib/baml_client/` (gitovaný, ako v accounting) — `baml-cli generate` sa púšťa len lokálne pri zmene `.baml` súborov, build na Verceli ho nepotrebuje.

## Stavový model dokladu

```
inbox ──(eKasa OK / OCR OK)──▶ spracovany ──(časť 2)──▶ priradeny
  │                                ▲
  └─(QR aj OCR zlyhá)──▶ rucne ────┘ (ručné doplnenie / overitDoklad)
```

`overenie: 'ekasa' | 'ocr' | 'nic'` — dôveryhodnosť dát (eKasa = autoritatívne DPH; OCR = odhad; pri `ocr`/`nic` UI jemne signalizuje „skontroluj").

## Zmeny v schéme (packages/db)

- `Doklad`: + `overenie String @default("nic")`; `@@index([partiaId, stav])`; `@@index([partiaId, qrData])` (dedup lookup). Komentár k `stav` aktualizovať na `inbox | spracovany | priradeny | rucne`.
- Nič iné — `Doklad`/`NakladovaPolozka` z prestavby sedia.

## UI — `/doklady`

- Položka „Doklady" v `AppHeader` navigácii (prepínanie Dopyty ⇄ Doklady) + FAB.
- Zoznam: karta = miniatúra (Blob URL), predajca (alebo „Neznámy bloček"), suma, dátum, badge stavu (`inbox`=terracotta, `spracovany`=teal, `rucne`=navy outline) + ikonka overenia. Filter taby (Všetky / Inbox / Spracované / Ručne) — scrollovateľné (`overflow-x-auto`, poučenie z dopytov).
- Detail (`/doklady/[id]`): fotka (klik = plná), polia predajca/suma/dátum, tabuľka položiek (názov, množstvo, suma, DPH), akcie podľa stavu: „Overiť znova" (inbox s QR), edit formulár (rucne), zmazať.
- Mobile-first: veľké tlačidlá, jedna ruka.

## Závislosti a env

- Nové deps `apps/app`: `jsqr`, `idb-keyval`, `sharp`, `@vercel/blob`, `@boundaryml/baml`.
- Env `dobra-partia-app` (Production+Preview): `BLOB_READ_WRITE_TOKEN` (Blob store „Connect Project" v dashboarde — vytvoriť store pre appku), `GOOGLE_API_KEY` (dodá užívateľ; rovnaký kľúč do `apps/app/.env` pre lokálny dev).

## Testovanie

- Vitest (TDD pre čistú logiku): mapovanie eKasa receipt → Doklad+polozky (riadková suma → jednotková cena, DPH, parse dátumu — proti reálnej odpovedi zo sondy uloženej ako fixture), dedup rozhodnutie, výber ďalšieho kroku pipeline (QR? → eKasa; nie → OCR; zlyhalo → rucne).
- Manuálne E2E: 11 reálnych fotiek z `accounting/web/test_images` (pokrýva QR aj OCR cestu, CZK bločky), živý bloček z peňaženky na mobile, offline test (režim lietadlo → fotka → online → doklad sa objaví).
- eKasa klient sa v testoch mockuje; živé volania len manuálne (rate limiter).

## Mimo scope (časť 2, po Fáze 2)

AI priradenie položiek k zákazkám, split bločku, réžia + mesačná uzávierka, „Zúčtuj", prekategorizovanie položiek, živý video skener, private Blob prístup.
