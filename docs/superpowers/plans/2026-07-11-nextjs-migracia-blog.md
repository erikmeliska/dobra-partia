# Migrácia na Next.js + blog cez WP fake API — implementačný plán

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preniesť statický web dobrapartia.sk 1:1 do Next.js 16 na Verceli a pridať blog napájaný WordPress-kompatibilným fake API (identická implementácia ako trisoft-web).

**Architecture:** Next.js App Router; statické HTML sa rozseká na server komponenty, interaktívne časti (menu, carousel, galéria, formulár s mapou) na client komponenty. Blog žije v Neon Postgres cez Prisma, publikuje sa cez `/api/wp-json/wp/v2/*` endpointy skopírované z trisoft-web, writes revalidujú statické stránky.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 3, Prisma 6, Neon Postgres, @vercel/blob, Leaflet (npm).

**Spec:** `docs/superpowers/specs/2026-07-11-nextjs-migracia-blog-design.md`

## Global Constraints

- 1:1 vizuálny port — žiadne dizajnové zmeny, existujúce Tailwind classy a slovenské texty sa prenášajú doslovne z HTML
- Brand farby: `navy #1e3a5f`, `teal #5bb7b4`, `terracotta #c47152`, `sand #f9f7f2`
- WP API response shape a error kódy presne ako trisoft-web (zdroj: `/Users/ericsko/Projekty/_Bizz/TriSoft/trisoft-web`)
- Obrázky ostávajú `<img>` (nie `next/image`) — zachovanie 1:1 markup správania
- Font Awesome 6.5.0 ostáva cez CDN `<link>`; Leaflet sa presúva na npm balík
- Kontaktný formulár posiela na interné `POST /api/dopyt` (náhrada za pôvodný n8n webhook) — response shape `{ success, message }` zhodná s n8n
- Env: `DATABASE_URL`, `WP_USERNAME`, `WP_PASSWORD`, `BLOB_READ_WRITE_TOKEN`, `DISCORD_WEBHOOK`
- Žiadny test framework sa nezavádza — každý task má presné manuálne verifikačné kroky (curl / dev server / build); commit až po úspešnej verifikácii
- Konverzia HTML→JSX: `class`→`className`, `for`→`htmlFor`, self-closing tagy (`<img />`, `<input />`), komentáre `{/* */}`, inline `onclick` neexistuje (všetko cez React handlery)

---

### Task 1: Next.js scaffold, Tailwind, layout s navigáciou a footerom

**Files:**
- Create: `package.json`, `next.config.mjs`, `tailwind.config.js`, `postcss.config.js`, `jsconfig.json`
- Create: `src/app/layout.js`, `src/app/globals.css`, `src/app/page.js` (dočasný placeholder)
- Create: `src/components/Nav.jsx` (client), `src/components/Footer.jsx`
- Modify: `.gitignore`
- Move: `assets/*` → `public/assets/*`, `references-data.json` → `src/data/references-data.json`

**Interfaces:**
- Produces: `src/app/layout.js` (root layout s Nav + Footer, importuje globals.css), Tailwind classy `bg-navy`, `text-navy`, `text-teal`, `bg-teal`, `bg-terracotta`, `border-teal`, `bg-sand` dostupné všade, alias `@/` → `src/`

- [ ] **Step 1: package.json a konfigy**

```json
{
  "name": "dobra-partia-web",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3457",
    "build": "prisma generate && next build",
    "postinstall": "prisma generate",
    "start": "next start",
    "lint": "next lint"
  }
}
```

Run: `npm install next@latest react@latest react-dom@latest && npm install prisma@^6 @prisma/client@^6 @vercel/blob leaflet && npm install -D tailwindcss@^3 postcss autoprefixer`

(Prisma sa inštaluje už teraz, aby `build` script fungoval; schema príde v Task 7 — dovtedy `prisma generate` zlyhá, preto až do Task 7 používaj `npx next build`.)

`next.config.mjs`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/o-nas.html', destination: '/o-nas', permanent: true },
      { source: '/ochrana-sukromia.html', destination: '/ochrana-sukromia', permanent: true },
      { source: '/obchodne-podmienky.html', destination: '/obchodne-podmienky', permanent: true },
    ]
  },
}

export default nextConfig
```

`tailwind.config.js`:

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#1e3a5f',
        teal: '#5bb7b4',
        terracotta: '#c47152',
        sand: '#f9f7f2',
      },
    },
  },
  plugins: [],
}
```

POZOR: farby definované v theme.extend.colors vygenerujú aj `bg-teal/10`, `text-white/70` a pod. — opacity varianty používané v HTML fungujú automaticky.

`postcss.config.js`:

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

`jsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

`.gitignore` — pridaj:

```
node_modules/
.next/
.env
.env.local
public/uploads/
```

- [ ] **Step 2: Presun assetov**

```bash
mkdir -p public src/data
git mv assets public/assets
git mv references-data.json src/data/references-data.json
```

- [ ] **Step 3: globals.css**

Port `<style>` bloku z `index.html:32-118`. Custom farebné utility (`.bg-navy` atď.) NEprenášaj — rieši ich tailwind.config. Prenes zvyšok:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
    --navy: #1e3a5f;
    --teal: #5bb7b4;
    --terracotta: #c47152;
    --sand: #f9f7f2;
}
body {
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    background-color: var(--sand);
    scroll-behavior: smooth;
}
.hero-gradient {
    background: linear-gradient(135deg, #1e3a5f 0%, #2a4d7d 100%);
}
.card-shadow {
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
}
.service-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}
#address-results {
    max-height: 200px;
    overflow-y: auto;
    z-index: 100;
}
.result-item:hover {
    background-color: #f3f4f6;
    cursor: pointer;
}
#map {
    height: 220px;
    border-radius: 12px;
    z-index: 1;
}
/* Carousel */
.carousel-slide { min-width: 100%; padding: 0 1rem; box-sizing: border-box; }
@media (min-width: 768px) { .carousel-slide { min-width: 50%; } }
@media (min-width: 1024px) { .carousel-slide { min-width: 33.333%; } }
/* Gallery */
.gallery-item { cursor: pointer; overflow: hidden; border-radius: 1rem; }
.gallery-item img { transition: transform 0.3s ease; }
.gallery-item:hover img { transform: scale(1.05); }
.tag-btn.active { background-color: var(--teal); color: white; }
/* Modal thumb */
.thumb { opacity: 0.5; cursor: pointer; transition: opacity 0.2s; }
.thumb.active { opacity: 1; outline: 2px solid var(--teal); outline-offset: 2px; }
.mobile-menu {
    transform: translateX(100%);
    transition: transform 0.3s ease-in-out;
}
.mobile-menu.open {
    transform: translateX(0);
}
.form-success {
    animation: fadeIn 0.5s ease-in-out;
}
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Step 4: Root layout**

`src/app/layout.js`:

```jsx
import './globals.css'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

export const metadata = {
  metadataBase: new URL('https://www.dobrapartia.sk'),
  title: 'Dobrá Partia | Váš domov v pohode',
  description:
    'Dobrá Partia - kompletný servis pre váš domov a záhradu v Košickom kraji. Záhradné práce, bazénový servis, hodinový majster a viac.',
  icons: { icon: '/assets/favicon.ico' },
  openGraph: {
    url: 'https://www.dobrapartia.sk/',
    title: 'Dobrá Partia | Váš domov v pohode',
    description:
      'Kompletný servis pre váš domov a záhradu v Košickom kraji. Záhradné práce, bazénový servis, hodinový majster a viac.',
    images: ['https://www.dobrapartia.sk/assets/hero-logo.jpg'],
    type: 'website',
    locale: 'sk_SK',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dobrá Partia | Váš domov v pohode',
    description: 'Kompletný servis pre váš domov a záhradu v Košickom kraji.',
    images: ['https://www.dobrapartia.sk/assets/hero-logo.jpg'],
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="sk">
      <head>
        <link
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
          rel="stylesheet"
        />
      </head>
      <body>
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  )
}
```

- [ ] **Step 5: Nav a Footer komponenty**

`src/components/Nav.jsx` — client komponent. Port `index.html:122-218` (nav + mobile menu). Mobile menu open/close stav cez `useState` namiesto `classList`:

```jsx
'use client'

import { useState } from 'react'

export default function Nav() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      {/* sem port <nav> z index.html:122-179 — class→className,
          <a href="#..."> odkazy na sekcie zmeň na href="/#sluzby" atď.,
          aby fungovali aj z /blog a /o-nas.
          Pridaj odkaz "Blog" → href="/blog" medzi existujúce položky menu.
          onClick={() => setMenuOpen(true)} na mobile-menu-btn */}
      {/* mobile menu div z index.html:181-217:
          className={`mobile-menu ... ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen(false)} na close btn aj na každý <a> */}
    </>
  )
}
```

`src/components/Footer.jsx` — server komponent, port `<footer>` z `index.html:770-925` doslovne (class→className, odkazy na `.html` stránky prepíš na nové routy `/o-nas`, `/ochrana-sukromia`, `/obchodne-podmienky`, kotvy na `/#sekcia`).

- [ ] **Step 6: Placeholder homepage**

`src/app/page.js`:

```jsx
export default function HomePage() {
  return <main />
}
```

- [ ] **Step 7: Verifikácia**

Run: `npx next build`
Expected: build prejde bez chýb.

Run: `npx next dev --port 3457` a otvor `http://localhost:3457`
Expected: nav + footer vyzerajú identicky ako na starom webe (porovnaj so starým `index.html` otvoreným cez `file://`), mobile menu sa otvára/zatvára, farby sedia.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: Next.js 16 scaffold, Tailwind, layout s nav a footerom"
```

---

### Task 2: Homepage — statické sekcie (hero, služby, ako pracujeme, kontakt-obal)

**Files:**
- Create: `src/components/home/Hero.jsx`, `src/components/home/Sluzby.jsx`, `src/components/home/AkoPracujeme.jsx`
- Modify: `src/app/page.js`

**Interfaces:**
- Consumes: layout z Task 1
- Produces: `<Hero />`, `<Sluzby />`, `<AkoPracujeme />` — čisté server komponenty bez props

- [ ] **Step 1: Port sekcií**

Doslovný port (konverzné pravidlá z Global Constraints, žiadna logika):
- `Hero.jsx` ← `<header>` z `index.html:219-268`
- `Sluzby.jsx` ← `<section id="sluzby">` z `index.html:270-380`
- `AkoPracujeme.jsx` ← `<section id="ako-pracujeme">` z `index.html:382-458`

Cesty obrázkov: `assets/...` → `/assets/...` (public root).

- [ ] **Step 2: Zapoj do page.js**

```jsx
import Hero from '@/components/home/Hero'
import Sluzby from '@/components/home/Sluzby'
import AkoPracujeme from '@/components/home/AkoPracujeme'

export default function HomePage() {
  return (
    <main>
      <Hero />
      <Sluzby />
      <AkoPracujeme />
    </main>
  )
}
```

- [ ] **Step 3: Verifikácia**

Run: `npx next dev --port 3457`
Expected: sekcie hero/služby/ako-pracujeme vizuálne identické so starým webom (side-by-side porovnanie), kotvy `/#sluzby`, `/#ako-pracujeme` z menu skrolujú správne.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: port hero, služby a ako-pracujeme sekcií"
```

---

### Task 3: Referencie carousel (client komponent)

**Files:**
- Create: `src/components/home/Referencie.jsx`
- Modify: `src/app/page.js`

**Interfaces:**
- Consumes: `src/data/references-data.json` (shape: `{ testimonials: [{ author, location, rating, text }], tags: { key: label }, projects: [...] }`)
- Produces: `<Referencie />` bez props

- [ ] **Step 1: Implementácia**

Port logiky z `index.html:1103-1201` + markup sekcie `index.html:460-477` do Reactu:

```jsx
'use client'

import { useState, useEffect } from 'react'
import refData from '@/data/references-data.json'

function getSlidesPerView() {
  if (window.innerWidth >= 1024) return 3
  if (window.innerWidth >= 768) return 2
  return 1
}

export default function Referencie() {
  const [index, setIndex] = useState(0)
  const [slidesPerView, setSlidesPerView] = useState(1)
  const testimonials = refData.testimonials

  useEffect(() => {
    const update = () => {
      const spv = getSlidesPerView()
      setSlidesPerView(spv)
      setIndex(i => Math.min(i, Math.max(testimonials.length - spv, 0)))
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [testimonials.length])

  const dotCount = Math.max(testimonials.length - slidesPerView + 1, 1)

  return (
    <section id="referencie" className="py-24 max-w-7xl mx-auto px-4">
      {/* nadpis sekcie — port z index.html:460-465 doslovne */}
      <div className="relative overflow-hidden">
        <div
          id="carousel-track"
          className="flex transition-transform duration-500"
          style={{ transform: `translateX(${-(index * (100 / slidesPerView))}%)` }}
        >
          {testimonials.map((t, i) => (
            <div key={i} className="carousel-slide">
              <div className="bg-white p-8 rounded-2xl shadow-md h-full flex flex-col">
                <span className="text-yellow-400 mb-4 flex gap-1">
                  {Array.from({ length: t.rating }).map((_, s) => (
                    <i key={s} className="fas fa-star" />
                  ))}
                </span>
                <p className="text-gray-600 italic flex-grow mb-6 leading-relaxed">
                  {'„'}{t.text}{'“'}
                </p>
                <div className="flex items-center gap-3 mt-auto">
                  <div className="w-10 h-10 bg-teal/10 rounded-full flex items-center justify-center text-teal font-bold">
                    {t.author.charAt(0)}
                  </div>
                  <div>
                    <div className="font-bold text-navy text-sm">{t.author}</div>
                    <div className="text-gray-400 text-xs">{t.location}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() => setIndex(i => Math.max(i - 1, 0))}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-navy hover:bg-gray-50 transition z-10"
        >
          <i className="fas fa-chevron-left" />
        </button>
        <button
          onClick={() => setIndex(i => Math.min(i + 1, testimonials.length - slidesPerView))}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-navy hover:bg-gray-50 transition z-10"
        >
          <i className="fas fa-chevron-right" />
        </button>
      </div>
      <div className="flex justify-center gap-2 mt-6">
        {Array.from({ length: dotCount }).map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`w-2.5 h-2.5 rounded-full transition-all ${i === index ? 'bg-teal w-6' : 'bg-gray-300'}`}
          />
        ))}
      </div>
    </section>
  )
}
```

Šípky (`fa-chevron-left/right`) prever proti `index.html:469-474` — použi presne tie ikony, čo sú v origináli. Nadpis sekcie portni doslovne.

- [ ] **Step 2: Zapoj do page.js** — pridaj `<Referencie />` za `<AkoPracujeme />`.

- [ ] **Step 3: Verifikácia**

Run: `npx next dev --port 3457`
Expected: carousel identický so starým webom — 3/2/1 slidy podľa šírky, šípky, bodky (aktívna širšia teal), resize správanie.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: referencie carousel ako React komponent"
```

---

### Task 4: Galéria realizácií — tag filtre + modal (client komponent)

**Files:**
- Create: `src/components/home/Galeria.jsx`
- Modify: `src/app/page.js`

**Interfaces:**
- Consumes: `src/data/references-data.json` (`projects: [{ title, location, date: 'YYYY-MM', description, tags: [key], photos: [{ src, alt }] }]`, `tags: { key: label }`)
- Produces: `<Galeria />` bez props

- [ ] **Step 1: Implementácia**

Port markup `index.html:480-517` (sekcia + modal) a logiky `index.html:1203-1358`. Stav: `activeTag` (string, default `'all'`), `modalProject` (objekt alebo `null`), `activePhoto` (index). Kľúčové časti:

```jsx
'use client'

import { useState, useEffect } from 'react'
import refData from '@/data/references-data.json'

const MONTHS = ['január','február','marec','apríl','máj','jún','júl','august','september','október','november','december']

function formatDate(dateStr) {
  const parts = dateStr.split('-')
  return MONTHS[parseInt(parts[1], 10) - 1] + ' ' + parts[0]
}

export default function Galeria() {
  const [activeTag, setActiveTag] = useState('all')
  const [modalProject, setModalProject] = useState(null)
  const [activePhoto, setActivePhoto] = useState(0)

  const filtered = refData.projects.filter(
    p => activeTag === 'all' || p.tags.includes(activeTag)
  )

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') setModalProject(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    document.body.style.overflow = modalProject ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [modalProject])

  const openModal = project => { setModalProject(project); setActivePhoto(0) }

  return (
    <section id="realizacie" className="py-24 bg-white">
      {/* nadpis sekcie — port z index.html:480-486 doslovne */}

      {/* tag filtre */}
      <div className="flex flex-wrap justify-center gap-2 mb-10">
        {[['all', 'Všetky'], ...Object.entries(refData.tags)].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTag(key)}
            className={`tag-btn px-4 py-2 rounded-full text-sm font-medium border border-gray-200 ${
              activeTag === key ? 'active' : 'text-gray-600 hover:border-teal'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* grid — port kariet z logiky index.html:1246-1291:
          cover = project.photos[0], overlay s title/location/tagmi,
          badge "N fotiek" ak photos.length > 1, onClick={() => openModal(project)} */}

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          {/* text z index.html:489-494 */}
        </div>
      )}

      {/* modal — port index.html:497-517; viditeľnosť cez podmienené classy:
          className={`fixed inset-0 z-[100] ... transition-opacity duration-300 ${
            modalProject ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          onClick na pozadí zatvára (e.target === e.currentTarget),
          thumbs menia activePhoto, class "thumb active" podľa indexu */}
    </section>
  )
}
```

Karty gridu a vnútro modalu prepíš deklaratívne podľa imperatívnej logiky — všetky classy zachovaj doslovne (sú v pláne uvedených riadkoch originálu).

- [ ] **Step 2: Zapoj do page.js** — pridaj `<Galeria />` za `<Referencie />`.

- [ ] **Step 3: Verifikácia**

Run: `npx next dev --port 3457`
Expected: filtre prepínajú projekty, karta otvára modal, thumbs prepínajú fotku, Escape aj klik na pozadie zatvára, scroll body sa zamyká, „N fotiek" badge sedí. Porovnaj so starým webom.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: galéria realizácií s filtrami a modalom"
```

---

### Task 5: Kontaktný formulár — Nominatim, Leaflet (client komponent)

**Files:**
- Create: `src/components/home/KontaktForm.jsx`
- Modify: `src/app/page.js`

**Interfaces:**
- Consumes: npm balík `leaflet` (nainštalovaný v Task 1)
- Produces: `<KontaktForm />` bez props — renderuje celú sekciu `#kontakt`

Formulár posiela na `/api/dopyt` — route vznikne až v Task 9 (potrebuje Prisma z Task 7). V tomto tasku sa verifikuje UI a chybový stav; úspešné odoslanie sa doverifikuje v Task 9.

- [ ] **Step 1: Implementácia**

Port markup `index.html:519-768` a logiky `index.html:945-1086`. Kľúčové body:

```jsx
'use client'

import { useState, useRef, useEffect } from 'react'
import 'leaflet/dist/leaflet.css'

export default function KontaktForm() {
  const [addressQuery, setAddressQuery] = useState('')
  const [results, setResults] = useState([])
  const [latLon, setLatLon] = useState(null)       // { lat, lon }
  const [status, setStatus] = useState('idle')      // idle | sending | success | error
  const mapRef = useRef(null)                       // Leaflet map instance
  const markerRef = useRef(null)
  const searchTimeout = useRef(null)

  // Nominatim autocomplete — port index.html:955-1003
  function onAddressInput(e) {
    const query = e.target.value
    setAddressQuery(query)
    clearTimeout(searchTimeout.current)
    if (query.length < 3) { setResults([]); return }
    searchTimeout.current = setTimeout(async () => {
      const url =
        'https://nominatim.openstreetmap.org/search?format=json&q=' +
        encodeURIComponent(query) +
        '&addressdetails=1&limit=5&countrycodes=sk&viewbox=19.9,49.2,22.6,48.3&bounded=0'
      try {
        const r = await fetch(url, { headers: { 'Accept-Language': 'sk' } })
        setResults(await r.json())
      } catch (err) {
        console.error('Chyba pri hľadaní adresy:', err)
      }
    }, 400)
  }

  async function selectResult(item) {
    setAddressQuery(item.display_name)
    setLatLon({ lat: item.lat, lon: item.lon })
    setResults([])
    const L = (await import('leaflet')).default
    const lat = parseFloat(item.lat), lon = parseFloat(item.lon)
    if (!mapRef.current) {
      mapRef.current = L.map('map').setView([lat, lon], 15)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
      }).addTo(mapRef.current)
    } else {
      mapRef.current.setView([lat, lon], 15)
    }
    if (markerRef.current) markerRef.current.setLatLng([lat, lon])
    else markerRef.current = L.marker([lat, lon]).addTo(mapRef.current)
    setTimeout(() => mapRef.current.invalidateSize(), 200)
  }

  // zavretie výsledkov klikom mimo — port index.html:1005-1009
  useEffect(() => {
    const onDocClick = e => {
      if (e.target.id !== 'address-input') setResults([])
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  async function onSubmit(e) {
    e.preventDefault()
    setStatus('sending')
    const formData = new FormData(e.target)
    const data = {
      meno: formData.get('meno'),
      telefon: formData.get('telefon'),
      email: formData.get('email') || '',
      adresa: formData.get('adresa'),
      lat: latLon?.lat || '',
      lon: latLon?.lon || '',
      sluzba: formData.get('sluzba'),
      popis: formData.get('popis') || '',
      odoslane: new Date().toISOString(),
      zdroj: 'web-formular',
    }
    try {
      const response = await fetch('/api/dopyt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Server error')
      setStatus('success')
    } catch (err) {
      console.error('Chyba pri odosielaní:', err)
      setStatus('error')
    }
  }

  return (
    <section id="kontakt" className="py-24 max-w-5xl mx-auto px-4">
      {/* port index.html:519-768:
          - formulár skrytý pri status==='success', namiesto neho form-success blok
          - form-error blok viditeľný pri status==='error'
          - submit btn disabled + text "Odosielam..." pri status==='sending'
          - address input: value={addressQuery} onChange={onAddressInput}
          - výsledky: results.map(item => <div onClick={() => selectResult(item)} .../>)
          - map container: className={latLon ? '' : 'hidden'} s <div id="map" />
          - hidden lat/lon inputy už netreba (stav je v latLon) */}
    </section>
  )
}
```

Markup formulára (polia meno/telefon/email/adresa/sluzba/popis, GDPR checkbox s `required`, labely, success/error bloky) portni doslovne z uvedených riadkov.

- [ ] **Step 2: Zapoj do page.js** — pridaj `<KontaktForm />` za `<Galeria />`.

- [ ] **Step 3: Verifikácia**

Run: `npx next dev --port 3457`
Expected: napíš „Košice" do adresy → našepkávač ukáže výsledky → výber zobrazí Leaflet mapu s markerom. Validácia povinných polí a GDPR checkboxu funguje. Odoslanie zatiaľ skončí error stavom (`/api/dopyt` ešte neexistuje — 404) → zobrazí sa form-error blok; to je očakávané, E2E úspešné odoslanie sa verifikuje v Task 9.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: kontaktný formulár s Nominatim a Leaflet mapou"
```

---

### Task 6: Statické stránky /o-nas, /ochrana-sukromia, /obchodne-podmienky

**Files:**
- Create: `src/app/o-nas/page.js`, `src/app/ochrana-sukromia/page.js`, `src/app/obchodne-podmienky/page.js`

**Interfaces:**
- Consumes: layout (Nav/Footer) z Task 1 — stránky renderujú len obsah `<main>`
- Produces: routy `/o-nas`, `/ochrana-sukromia`, `/obchodne-podmienky`

- [ ] **Step 1: Port stránok**

Pre každú stránku: obsah medzi nav a footerom portni do `<main>`; nav/footer NEportuj (sú v layoute). Ak sa nav/footer v týchto HTML líši od index.html (skontroluj!), zjednoť na verziu z layoutu. Per-page metadata cez `export const metadata` — title/description/canonical/OG prenes z `<head>` každého HTML, napr.:

```jsx
export const metadata = {
  title: 'O nás | Dobrá Partia',
  description: '...presne z o-nas.html...',
  alternates: { canonical: 'https://www.dobrapartia.sk/o-nas' },
  openGraph: { url: 'https://www.dobrapartia.sk/o-nas', /* ...z o-nas.html... */ },
}

export default function ONasPage() {
  return <main>{/* port obsahu o-nas.html */}</main>
}
```

Interné odkazy `*.html` prepíš na nové routy.

- [ ] **Step 2: Verifikácia**

Run: `npx next dev --port 3457`
Expected: všetky tri stránky vizuálne identické s originálmi; `curl -sI http://localhost:3457/o-nas.html | head -3` vráti `308` redirect na `/o-nas`.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: port stránok o-nas, ochrana-sukromia, obchodne-podmienky"
```

---

### Task 7: Prisma + Neon Postgres + wp-auth

**Files:**
- Create: `prisma/schema.prisma`, `src/lib/prisma.js`, `src/lib/wp-auth.js`, `.env` (lokálne, negitované)

**Interfaces:**
- Produces: `prisma` default export (PrismaClient singleton), `verifyWpAuth(request)` → `NextResponse | null`, modely `BlogPost`, `BlogCategory`, `MediaUpload`, `Dopyt`

- [ ] **Step 1: Schema**

`prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model BlogPost {
  id        String   @id @default(cuid())
  wpId      Int      @unique
  title     String
  slug      String   @unique
  perex     String
  text      String
  image     String   @default("")
  status    String   @default("draft")
  published Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model MediaUpload {
  id        Int      @id @default(autoincrement())
  filename  String
  url       String
  createdAt DateTime @default(now())
}

model BlogCategory {
  id   Int    @id @default(autoincrement())
  name String
  slug String @unique
}

// Náhrada za n8n Data Table "Dopyty - Dobrá Partia" — rovnaké stĺpce
model Dopyt {
  id        String   @id @default(cuid())
  meno      String
  telefon   String
  email     String   @default("")
  adresa    String
  lat       Float?
  lon       Float?
  sluzba    String
  popis     String   @default("")
  stav      String   @default("novy")
  vybavene  Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

- [ ] **Step 2: Neon databáza**

Vercel projekt je už linknutý (`.vercel/` existuje). Vytvor Neon DB cez Vercel Marketplace — dashboard projektu → Storage → Create Database → Neon (free tier). Tým sa `DATABASE_URL` pridá do Vercel env. Potom:

```bash
vercel env pull .env
npx prisma db push
```

Expected: `Your database is now in sync with your Prisma schema.`

Ak dashboard nie je poruke, DATABASE_URL sa dá vytvoriť aj na neon.tech a pridať cez `vercel env add DATABASE_URL`.

- [ ] **Step 3: lib súbory (1:1 z trisoft)**

`src/lib/prisma.js`:

```js
import { PrismaClient } from '@prisma/client'

const prisma = globalThis.__prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma
}

export default prisma
```

`src/lib/wp-auth.js`:

```js
import { NextResponse } from 'next/server'

export function verifyWpAuth(request) {
  const auth = request.headers.get('authorization')
  if (!auth) {
    return NextResponse.json(
      { code: 'rest_not_logged_in', message: 'You are not currently logged in.' },
      { status: 401 }
    )
  }

  // Support WP_AUTH (pre-encoded base64) or WP_USERNAME:WP_PASSWORD
  const validTokens = []

  if (process.env.WP_AUTH) {
    validTokens.push('Basic ' + process.env.WP_AUTH)
  }

  if (process.env.WP_USERNAME && process.env.WP_PASSWORD) {
    validTokens.push(
      'Basic ' + Buffer.from(`${process.env.WP_USERNAME}:${process.env.WP_PASSWORD}`).toString('base64')
    )
  }

  if (!validTokens.some(token => auth === token)) {
    return NextResponse.json(
      { code: 'rest_forbidden', message: 'Invalid credentials.' },
      { status: 403 }
    )
  }

  return null // auth OK
}
```

- [ ] **Step 4: WP credentials**

```bash
openssl rand -base64 24   # vygeneruj heslo
```

Do `.env` pridaj (a zapíš si hodnoty pre publikačný pipeline):

```
WP_USERNAME=dobrapartia-publisher
WP_PASSWORD=<vygenerované>
DISCORD_WEBHOOK=<Discord webhook URL — rovnaký, aký používa n8n workflow (Discord channel → Integrations → Webhooks, alebo z n8n credentials "Discord Webhook account")>
```

- [ ] **Step 5: Verifikácia**

Run: `npx prisma generate && npm run build`
Expected: build prejde (od tohto tasku už funguje aj `npm run build` s prisma generate).

Run: `npx prisma studio` (krátko otvor)
Expected: vidno prázdne tabuľky BlogPost, MediaUpload, BlogCategory, Dopyt.

- [ ] **Step 6: Commit**

```bash
git add prisma src/lib .gitignore
git commit -m "feat: Prisma schema (BlogPost, BlogCategory, MediaUpload, Dopyt) + wp-auth"
```

---

### Task 8: WP fake API endpointy

**Files:**
- Create: `src/app/api/wp-json/wp/v2/posts/route.js`
- Create: `src/app/api/wp-json/wp/v2/posts/[id]/route.js`
- Create: `src/app/api/wp-json/wp/v2/categories/route.js`
- Create: `src/app/api/wp-json/wp/v2/media/route.js`

**Interfaces:**
- Consumes: `prisma` a `verifyWpAuth` z Task 7
- Produces: WordPress-kompatibilné REST API (auth Basic; response shape `{ id, date, modified, slug, status, title.rendered, content.rendered, excerpt.rendered, featured_media, link }`)

Všetky štyri súbory sú 1:1 kópie z trisoft-web (`/Users/ericsko/Projekty/_Bizz/TriSoft/trisoft-web/src/app/api/wp-json/wp/v2/...`) — revalidované cesty (`/`, `/blog`, `/sitemap.xml`, `/blog/[slug]`) sú zhodou okolností rovnaké, takže sa kopíruje bezo zmeny.

- [ ] **Step 1: Skopíruj routes**

```bash
mkdir -p src/app/api/wp-json/wp/v2
cp -R /Users/ericsko/Projekty/_Bizz/TriSoft/trisoft-web/src/app/api/wp-json/wp/v2/posts src/app/api/wp-json/wp/v2/
cp -R /Users/ericsko/Projekty/_Bizz/TriSoft/trisoft-web/src/app/api/wp-json/wp/v2/categories src/app/api/wp-json/wp/v2/
cp -R /Users/ericsko/Projekty/_Bizz/TriSoft/trisoft-web/src/app/api/wp-json/wp/v2/media src/app/api/wp-json/wp/v2/
```

Obsah súborov over — importujú `@/lib/prisma` a `@/lib/wp-auth`, oba existujú z Task 7. Referencia — `posts/route.js` musí obsahovať: `slugify`, `getNextWpId`, `resolveMediaUrl`, `toWpResponse`, `GET` (list, `orderBy createdAt desc`), `POST` (create; 400 bez title, 409 na duplicate slug/P2002, `revalidatePath` na `/`, `/blog`, `/sitemap.xml`, `/blog/${slug}`, 201 s WP response). `posts/[id]/route.js`: `GET` (404 `rest_post_invalid_id`), `PUT` (upsert — recreate ak neexistuje, inak partial update, revalidate), `DELETE` (404 ak neexistuje, vráti `{ deleted: true, previous }`). `categories/route.js`: `GET` list, `POST` create (existujúci slug vráti 200 s existujúcou). `media/route.js`: `POST` formData `file`, Vercel Blob ak `BLOB_READ_WRITE_TOKEN`, inak `public/uploads`, vráti `{ id, source_url, media_details.file }` 201.

- [ ] **Step 2: Verifikácia cez cURL**

Spusti `npx next dev --port 3457` a over celý životný cyklus (heslo z Task 7):

```bash
AUTH="dobrapartia-publisher:<heslo>"

# 401 bez auth
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3457/api/wp-json/wp/v2/posts
# Expected: 401

# create draft
curl -s -u "$AUTH" -X POST http://localhost:3457/api/wp-json/wp/v2/posts \
  -H 'Content-Type: application/json' \
  -d '{"title":"Testovací článok","content":"<p>Obsah</p>","excerpt":"Perex","status":"draft"}'
# Expected: 201, {"id":1,...,"status":"draft","title":{"rendered":"Testovací článok"},...}

# publish
curl -s -u "$AUTH" -X PUT http://localhost:3457/api/wp-json/wp/v2/posts/1 \
  -H 'Content-Type: application/json' -d '{"status":"publish"}'
# Expected: 200, "status":"publish"

# media upload (lokálny fallback bez BLOB tokenu)
curl -s -u "$AUTH" -X POST http://localhost:3457/api/wp-json/wp/v2/media \
  -F 'file=@public/assets/logo.png'
# Expected: 201, {"id":1,"source_url":"/uploads/....png",...}

# category
curl -s -u "$AUTH" -X POST http://localhost:3457/api/wp-json/wp/v2/categories \
  -H 'Content-Type: application/json' -d '{"name":"Záhrada"}'
# Expected: 201, {"id":1,...,"slug":"zahrada"}

# delete
curl -s -u "$AUTH" -X DELETE http://localhost:3457/api/wp-json/wp/v2/posts/1
# Expected: {"deleted":true,...}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api
git commit -m "feat: WordPress fake API (posts, categories, media) — port z trisoft-web"
```

---

### Task 9: Dopyt API — náhrada n8n webhooku (Postgres + Discord)

**Files:**
- Create: `src/lib/discord.js`, `src/app/api/dopyt/route.js`

**Interfaces:**
- Consumes: `prisma` z Task 7 (model `Dopyt`), formulár z Task 5 (POST payload `{ meno, telefon, email, adresa, lat, lon, sluzba, popis, odoslane, zdroj }`)
- Produces: `POST /api/dopyt` → `{ success: true, message: 'Dopyt bol prijatý' }` | 400/500 `{ success: false, message }`; `sendDiscordMessage(content)` v `src/lib/discord.js`

Pôvodný n8n workflow robil: insert do n8n Data Table „Dopyty - Dobrá Partia" → Discord notifikácia → JSON odpoveď. Toto API robí presne to isté lokálne.

- [ ] **Step 1: Discord helper**

`src/lib/discord.js` (pattern z trisoft `src/lib/discord.js`, ale plain content ako n8n workflow):

```js
export async function sendDiscordMessage(content) {
  const webhookUrl = process.env.DISCORD_WEBHOOK
  if (!webhookUrl) return

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
  } catch (err) {
    console.error('Discord webhook error:', err)
  }
}
```

- [ ] **Step 2: API route**

`src/app/api/dopyt/route.js` — správa pre Discord je doslovný formát z n8n workflow:

```js
import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { sendDiscordMessage } from '@/lib/discord'

export async function POST(request) {
  try {
    const body = await request.json()
    const { meno, telefon, email, adresa, lat, lon, sluzba, popis } = body

    if (!meno || !telefon || !adresa || !sluzba) {
      return NextResponse.json(
        { success: false, message: 'Chýbajú povinné polia' },
        { status: 400 }
      )
    }

    const dopyt = await prisma.dopyt.create({
      data: {
        meno,
        telefon,
        email: email || '',
        adresa,
        lat: lat ? parseFloat(lat) : null,
        lon: lon ? parseFloat(lon) : null,
        sluzba,
        popis: popis || '',
      },
    })

    await sendDiscordMessage(
      `🔔 **NOVÝ DOPYT z webu**

👤 **Meno:** ${dopyt.meno}
📞 **Telefón:** ${dopyt.telefon}
📧 **E-mail:** ${dopyt.email || 'neuvedený'}

📍 **Adresa:** ${dopyt.adresa}
🔧 **Služba:** ${dopyt.sluzba}
📝 **Popis:** ${dopyt.popis || 'bez popisu'}

🗺️ **Mapa:** https://www.google.com/maps?q=${dopyt.lat},${dopyt.lon}

⏰ ${dopyt.createdAt.toISOString()}`
    )

    return NextResponse.json({ success: true, message: 'Dopyt bol prijatý' })
  } catch (error) {
    console.error('Dopyt error:', error)
    return NextResponse.json(
      { success: false, message: 'Chyba pri spracovaní' },
      { status: 500 }
    )
  }
}
```

(`sendDiscordMessage` nikdy nehodí — zlyhanie Discordu nesmie zhodiť uloženie dopytu.)

- [ ] **Step 3: Verifikácia**

S bežiacim dev serverom:

```bash
# validácia
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3457/api/dopyt \
  -H 'Content-Type: application/json' -d '{"meno":"X"}'
# Expected: 400

# plný dopyt
curl -s -X POST http://localhost:3457/api/dopyt -H 'Content-Type: application/json' -d '{
  "meno":"TEST — ignorovať","telefon":"+421 900 000 000","email":"",
  "adresa":"Hlavná 1, Košice","lat":"48.72","lon":"21.26",
  "sluzba":"zahradne-prace","popis":"test lokálneho API",
  "odoslane":"2026-07-11T12:00:00.000Z","zdroj":"web-formular"}'
# Expected: {"success":true,"message":"Dopyt bol prijatý"}
```

Over: riadok v tabuľke Dopyt (`npx prisma studio`), Discord správa v kanáli (ak je `DISCORD_WEBHOOK` v `.env`). Potom E2E cez formulár na `http://localhost:3457/#kontakt` — vyplň, odošli, zobrazí sa success stav (dokončenie verifikácie z Task 5). Testovací riadok potom zmaž v Prisma Studio.

- [ ] **Step 4: Commit**

```bash
git add src/lib/discord.js src/app/api/dopyt
git commit -m "feat: /api/dopyt — náhrada n8n webhooku (Postgres + Discord notifikácia)"
```

---

### Task 10: Blog stránky + sekcia na titulke

**Files:**
- Create: `src/lib/blog.js`, `src/app/blog/page.js`, `src/app/blog/[slug]/page.js`
- Create: `src/components/home/BlogSekcia.jsx`
- Modify: `src/app/page.js`

**Interfaces:**
- Consumes: `prisma` z Task 7 (`blogPost.findMany({ where: { published: true } })`)
- Produces: `getPublishedPosts(limit)` a `getPostBySlug(slug)` v `src/lib/blog.js`; routy `/blog`, `/blog/[slug]`; `<BlogSekcia posts={posts} />`

- [ ] **Step 1: Data helper**

`src/lib/blog.js`:

```js
import prisma from '@/lib/prisma'

export async function getPublishedPosts(limit) {
  return prisma.blogPost.findMany({
    where: { published: true },
    orderBy: { createdAt: 'desc' },
    ...(limit ? { take: limit } : {}),
  })
}

export async function getPostBySlug(slug) {
  return prisma.blogPost.findUnique({ where: { slug } })
}

export function formatPostDate(date) {
  return new Intl.DateTimeFormat('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}
```

- [ ] **Step 2: /blog zoznam**

`src/app/blog/page.js` — dizajn v duchu existujúceho webu (sand pozadie, navy nadpisy, biele karty ako galéria):

```jsx
import Link from 'next/link'
import { getPublishedPosts, formatPostDate } from '@/lib/blog'

export const metadata = {
  title: 'Blog | Dobrá Partia',
  description: 'Rady a tipy pre váš domov a záhradu od Dobrej Partie.',
  alternates: { canonical: 'https://www.dobrapartia.sk/blog' },
  openGraph: {
    url: 'https://www.dobrapartia.sk/blog',
    title: 'Blog | Dobrá Partia',
    description: 'Rady a tipy pre váš domov a záhradu od Dobrej Partie.',
  },
}

export default async function BlogPage() {
  const posts = await getPublishedPosts()

  return (
    <main className="py-24 max-w-7xl mx-auto px-4">
      <div className="text-center mb-14">
        <span className="text-teal font-semibold text-sm uppercase tracking-wider">Blog</span>
        <h1 className="text-4xl font-bold text-navy mt-2">Rady a tipy pre váš domov</h1>
      </div>
      {posts.length === 0 ? (
        <p className="text-center py-16 text-gray-400">Zatiaľ tu nie sú žiadne články.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map(post => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="bg-white rounded-2xl card-shadow overflow-hidden group flex flex-col"
            >
              {post.image && (
                <div className="overflow-hidden">
                  <img
                    src={post.image}
                    alt={post.title}
                    loading="lazy"
                    className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              )}
              <div className="p-6 flex flex-col flex-grow">
                <div className="text-gray-400 text-xs mb-2">{formatPostDate(post.createdAt)}</div>
                <h2 className="text-lg font-bold text-navy mb-2">{post.title}</h2>
                <p className="text-gray-600 text-sm flex-grow">{post.perex}</p>
                <span className="text-teal font-semibold text-sm mt-4">
                  Čítať viac <i className="fas fa-arrow-right ml-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
```

- [ ] **Step 3: /blog/[slug] detail**

`src/app/blog/[slug]/page.js`:

```jsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPostBySlug, getPublishedPosts, formatPostDate } from '@/lib/blog'

export async function generateStaticParams() {
  const posts = await getPublishedPosts()
  return posts.map(post => ({ slug: post.slug }))
}

export async function generateMetadata({ params }) {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post || !post.published) return {}
  return {
    title: `${post.title} | Dobrá Partia`,
    description: post.perex,
    alternates: { canonical: `https://www.dobrapartia.sk/blog/${post.slug}` },
    openGraph: {
      url: `https://www.dobrapartia.sk/blog/${post.slug}`,
      title: post.title,
      description: post.perex,
      type: 'article',
      ...(post.image ? { images: [post.image] } : {}),
    },
  }
}

export default async function BlogPostPage({ params }) {
  const { slug } = await params
  const post = await getPostBySlug(slug)
  if (!post || !post.published) notFound()

  return (
    <main className="py-24 max-w-3xl mx-auto px-4">
      <Link href="/blog" className="text-teal font-semibold text-sm">
        <i className="fas fa-arrow-left mr-1" /> Späť na blog
      </Link>
      <h1 className="text-4xl font-bold text-navy mt-4 mb-3">{post.title}</h1>
      <div className="text-gray-400 text-sm mb-8">{formatPostDate(post.createdAt)}</div>
      {post.image && (
        <img src={post.image} alt={post.title} className="w-full rounded-2xl card-shadow mb-10" />
      )}
      <article
        className="blog-content"
        dangerouslySetInnerHTML={{ __html: post.text }}
      />
    </main>
  )
}
```

Do `globals.css` pridaj typografiu pre obsah článku (obsah prichádza ako HTML z pipeline):

```css
/* Blog článok */
.blog-content { color: #4b5563; line-height: 1.75; }
.blog-content h2 { color: var(--navy); font-size: 1.5rem; font-weight: 700; margin: 2rem 0 0.75rem; }
.blog-content h3 { color: var(--navy); font-size: 1.25rem; font-weight: 700; margin: 1.5rem 0 0.5rem; }
.blog-content p { margin-bottom: 1rem; }
.blog-content ul, .blog-content ol { margin: 0 0 1rem 1.5rem; }
.blog-content ul { list-style: disc; }
.blog-content ol { list-style: decimal; }
.blog-content li { margin-bottom: 0.25rem; }
.blog-content a { color: var(--teal); text-decoration: underline; }
.blog-content img { border-radius: 1rem; margin: 1.5rem 0; }
.blog-content blockquote { border-left: 4px solid var(--teal); padding-left: 1rem; font-style: italic; margin: 1.5rem 0; }
```

- [ ] **Step 4: Sekcia na titulke**

`src/components/home/BlogSekcia.jsx` (server komponent):

```jsx
import Link from 'next/link'
import { formatPostDate } from '@/lib/blog'

export default function BlogSekcia({ posts }) {
  if (!posts.length) return null

  return (
    <section id="blog" className="py-24 max-w-7xl mx-auto px-4">
      <div className="text-center mb-14">
        <span className="text-teal font-semibold text-sm uppercase tracking-wider">Blog</span>
        <h2 className="text-4xl font-bold text-navy mt-2">Z nášho blogu</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map(post => (
          <Link
            key={post.id}
            href={`/blog/${post.slug}`}
            className="bg-white rounded-2xl card-shadow overflow-hidden group flex flex-col"
          >
            {post.image && (
              <div className="overflow-hidden">
                <img
                  src={post.image}
                  alt={post.title}
                  loading="lazy"
                  className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            )}
            <div className="p-6 flex flex-col flex-grow">
              <div className="text-gray-400 text-xs mb-2">{formatPostDate(post.createdAt)}</div>
              <h3 className="text-lg font-bold text-navy mb-2">{post.title}</h3>
              <p className="text-gray-600 text-sm flex-grow">{post.perex}</p>
              <span className="text-teal font-semibold text-sm mt-4">
                Čítať viac <i className="fas fa-arrow-right ml-1" />
              </span>
            </div>
          </Link>
        ))}
      </div>
      <div className="text-center mt-10">
        <Link
          href="/blog"
          className="inline-block bg-teal text-white font-semibold px-8 py-3 rounded-full hover:opacity-90 transition"
        >
          Všetky články
        </Link>
      </div>
    </section>
  )
}
```

`src/app/page.js` — homepage sa stane async, sekcia ide pred kontakt:

```jsx
import Hero from '@/components/home/Hero'
import Sluzby from '@/components/home/Sluzby'
import AkoPracujeme from '@/components/home/AkoPracujeme'
import Referencie from '@/components/home/Referencie'
import Galeria from '@/components/home/Galeria'
import BlogSekcia from '@/components/home/BlogSekcia'
import KontaktForm from '@/components/home/KontaktForm'
import { getPublishedPosts } from '@/lib/blog'

export default async function HomePage() {
  const posts = await getPublishedPosts(3)

  return (
    <main>
      <Hero />
      <Sluzby />
      <AkoPracujeme />
      <Referencie />
      <Galeria />
      <BlogSekcia posts={posts} />
      <KontaktForm />
    </main>
  )
}
```

- [ ] **Step 5: Verifikácia**

S bežiacim dev serverom vytvor a publikuj článok cez cURL (ako v Task 8, status `publish`). Potom:
- `http://localhost:3457/blog` — článok v zozname s dátumom po slovensky
- `http://localhost:3457/blog/<slug>` — detail s obsahom a formátovanou typografiou
- `http://localhost:3457/` — sekcia „Z nášho blogu" pred kontaktom
- zmaž článok cez `DELETE` → sekcia na titulke zmizne (0 článkov), `/blog` ukáže prázdny stav
- `curl -s http://localhost:3457/blog/neexistuje -o /dev/null -w "%{http_code}\n"` → `404`

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: blog stránky a sekcia Z nášho blogu na titulke"
```

---

### Task 11: SEO — sitemap, robots

**Files:**
- Create: `src/app/sitemap.js`, `src/app/robots.js`

**Interfaces:**
- Consumes: `getPublishedPosts` z Task 10

- [ ] **Step 1: sitemap.js**

```js
import { getPublishedPosts } from '@/lib/blog'

const BASE = 'https://www.dobrapartia.sk'

export default async function sitemap() {
  const posts = await getPublishedPosts()

  return [
    { url: `${BASE}/`, changeFrequency: 'monthly', priority: 1 },
    { url: `${BASE}/o-nas`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/blog`, changeFrequency: 'weekly', priority: 0.8 },
    ...posts.map(post => ({
      url: `${BASE}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: 'monthly',
      priority: 0.6,
    })),
    { url: `${BASE}/ochrana-sukromia`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/obchodne-podmienky`, changeFrequency: 'yearly', priority: 0.3 },
  ]
}
```

- [ ] **Step 2: robots.js**

```js
export default function robots() {
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/api/' },
    sitemap: 'https://www.dobrapartia.sk/sitemap.xml',
  }
}
```

- [ ] **Step 3: Verifikácia**

Run: `curl -s http://localhost:3457/sitemap.xml` → obsahuje statické stránky + publikované blog slugy.
Run: `curl -s http://localhost:3457/robots.txt` → `Disallow: /api/` a odkaz na sitemap.

- [ ] **Step 4: Commit**

```bash
git add src/app/sitemap.js src/app/robots.js
git commit -m "seo: sitemap a robots"
```

---

### Task 12: Cleanup, README, deploy na Vercel

**Files:**
- Delete: `index.html`, `o-nas.html`, `ochrana-sukromia.html`, `obchodne-podmienky.html`, `.playwright-mcp/`, `screenshots/` (ak už netreba)
- Modify: `README.md`

- [ ] **Step 1: Finálne porovnanie so starým webom**

Pred zmazaním otvor starý `index.html` cez `file://` vedľa `http://localhost:3457` a prejdi sekciu po sekcii (desktop aj mobil šírka). Rozdiely oprav.

- [ ] **Step 2: Zmaž staré súbory**

```bash
git rm index.html o-nas.html ochrana-sukromia.html obchodne-podmienky.html
git rm -r .playwright-mcp screenshots
```

(Ostávajú v git histórii — návrat je možný kedykoľvek.)

- [ ] **Step 3: README update**

Prepíš sekcie Štruktúra (Next.js layout), Funkcie (+ blog), pridaj sekciu „Blog / WP fake API" s endpointami, env premennými a príkladom cURL publish flow (create → media → publish). Sekciu o n8n formulári nahraď popisom `/api/dopyt` (payload, tabuľka Dopyt so stĺpcami stav/vybavene, Discord notifikácia) a poznámkou, že n8n workflow „dobra-partia-dopyt" je nahradený a dá sa deaktivovať.

- [ ] **Step 4: Env na Verceli**

```bash
vercel env add WP_USERNAME production   # dobrapartia-publisher
vercel env add WP_PASSWORD production   # heslo z Task 7
vercel env add DISCORD_WEBHOOK production   # Discord webhook URL z Task 7
```

`BLOB_READ_WRITE_TOKEN`: dashboard → Storage → Create Blob store (pridá token do env automaticky). `DATABASE_URL` už existuje z Task 7.

- [ ] **Step 5: Preview deploy + smoke test**

```bash
vercel
```

Na preview URL over: titulku, galériu, formulár (testovací dopyt „TEST — ignorovať" → Discord notifikácia + riadok v DB), `/blog`, publish článku cez cURL na preview API (auth funguje), redirect `/o-nas.html`.

POZOR: preview deploye majú Vercel Authentication — ak cURL na API vracia Vercel SSO stránku, testni API až na produkcii alebo vypni ochranu pre preview.

- [ ] **Step 6: Produkčný deploy**

```bash
vercel --prod
```

Over `https://www.dobrapartia.sk`: všetky stránky, sitemap, robots, publish + delete testovacieho článku cez API (objaví sa a zmizne na titulke — potvrdí revalidáciu), OG tagy cez `curl -s https://www.dobrapartia.sk | grep og:`.

- [ ] **Step 7: Commit + push**

```bash
git add -A
git commit -m "chore: odstránené staré HTML, README pre Next.js verziu"
git push
```

- [ ] **Step 8: Odovzdávka credentials + deaktivácia n8n**

Zapíš `WP_USERNAME`/`WP_PASSWORD` tam, kde ich nájde publikačný pipeline (nie do gitu). Endpoint pre pipeline: `https://www.dobrapartia.sk/api/wp-json/wp/v2/`. Po overení produkčného formulára deaktivuj starý n8n workflow „dobra-partia-dopyt" na n8n.ixy.sk (dopyty už tečú do Postgres + Discord priamo).
