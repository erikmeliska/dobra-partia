# Dobrá Partia - Web

**https://www.dobrapartia.sk**

Webová stránka pre firmu **Dobrá Partia s.r.o.** — Next.js (App Router) aplikácia.
Pôvodná statická HTML verzia bola premigrovaná na Next.js s Postgres databázou,
blogom cez WordPress-kompatibilné API a spracovaním dopytov cez Server Action.

## Technológie

- **Next.js 16** (App Router, React 19, Server Actions)
- **Tailwind CSS 3**
- **Prisma 6** + **PostgreSQL** (lokálne Docker, produkcia Prisma Postgres na Verceli)
- **Leaflet.js** + OpenStreetMap **Nominatim** (geocoding v kontaktnom formulári)
- **@vercel/blob** (úložisko obrázkov blogu na produkcii)
- Deploy: **Vercel**

## Štruktúra

```
web/
├── src/
│   ├── app/
│   │   ├── layout.js                # Root layout (Nav, Footer, meta)
│   │   ├── page.js                  # Titulná stránka
│   │   ├── o-nas/                    # O nás
│   │   ├── ochrana-sukromia/         # GDPR
│   │   ├── obchodne-podmienky/       # Obchodné podmienky
│   │   ├── blog/
│   │   │   ├── page.js               # Zoznam článkov
│   │   │   └── [slug]/page.js        # Detail článku
│   │   ├── sitemap.js               # /sitemap.xml
│   │   ├── robots.js                # /robots.txt
│   │   └── api/
│   │       ├── dopyt/route.js        # POST dopyt (Basic auth) pre externé nástroje
│   │       └── wp-json/wp/v2/        # WordPress fake API (blog)
│   │           ├── posts/route.js
│   │           ├── posts/[id]/route.js
│   │           ├── media/route.js
│   │           └── categories/route.js
│   ├── actions/
│   │   └── dopyt.js                  # Server Action `odosliDopyt`
│   ├── components/
│   │   ├── Nav.jsx, Footer.jsx
│   │   └── home/                     # Hero, Sluzby, PreFirmy, AkoPracujeme,
│   │                                 #   Referencie, Galeria, BlogSekcia, KontaktForm
│   ├── data/
│   │   └── references-data.json      # Referencie + realizácie (fotky, tagy)
│   └── lib/
│       ├── prisma.js                 # Prisma client singleton
│       ├── dopyt.js                  # createDopyt() — DB + Discord
│       ├── discord.js                # Discord webhook notifikácie
│       ├── blog.js                   # čítanie blog postov
│       └── wp-auth.js                # Basic auth pre WP API + /api/dopyt
├── prisma/
│   └── schema.prisma                # BlogPost, MediaUpload, BlogCategory, Dopyt
├── public/
│   └── assets/                       # logo, favicon, hero, mapa, references/
└── next.config.mjs                  # redirecty *.html → clean URL
```

## Funkcie

- **Titulná stránka** — hero, služby, sekcia „Pre firmy a správcov", ako pracujeme
- **Referencie** — carousel s recenziami zákazníkov
- **Galéria realizácií** — projekty s fotkami, tag filtre, detail modal
- **Blog** — články spravované cez WordPress-kompatibilné API, sekcia na titulke
- **Kontaktný formulár** — validácia, GDPR súhlas, vyhľadávanie adries cez Nominatim
  (prioritne SK), Leaflet mapa s markerom
- **Odosielanie dopytov** — Server Action → Postgres tabuľka `Dopyt` + Discord notifikácia
- Responzívny dizajn, mobilné menu
- **SEO** — `/sitemap.xml`, `/robots.txt`, OG / Twitter meta tagy, canonical URL
- Redirecty starých `*.html` URL na clean URL (301)

## Formulár / Dopyty

Kontaktný formulár volá **Server Action `odosliDopyt`** (`src/actions/dopyt.js`),
ktorá cez `createDopyt()` (`src/lib/dopyt.js`):

1. uloží dopyt do Postgres tabuľky **`Dopyt`**,
2. pošle notifikáciu na **Discord** cez `DISCORD_WEBHOOK_URL`.

Tabuľka `Dopyt` (nahrádza pôvodnú n8n Data Table „Dopyty – Dobrá Partia"):

| Stĺpec | Typ | Popis |
|---------|-----|-------|
| meno | string | Meno zákazníka |
| telefon | string | Telefónne číslo |
| email | string | E-mail (voliteľné) |
| adresa | string | Plná adresa z OSM |
| lat / lon | float? | GPS súradnice |
| sluzba | string | Typ služby |
| popis | string | Popis práce |
| **stav** | string | `novy` / `kontaktovany` / `dokonceny` |
| **vybavene** | boolean | `false` / `true` |
| createdAt / updatedAt | datetime | automaticky |

### Externé nástroje: `POST /api/dopyt`

Externé nástroje (napr. bývalý n8n flow) môžu vytvárať dopyty cez
`POST /api/dopyt` s **HTTP Basic auth** (rovnaké credentials ako WP API —
`WP_USERNAME` / `WP_PASSWORD`). Bez auth vracia **401**, s neplatnou auth **403**.

```bash
curl -X POST https://www.dobrapartia.sk/api/dopyt \
  -u "$WP_USERNAME:$WP_PASSWORD" \
  -H "Content-Type: application/json" \
  -d '{"meno":"Jozef Kováč","telefon":"+421 911 222 333","email":"jozef@email.sk","adresa":"Hlavná 12, Košice","sluzba":"zahradne-prace","popis":"Kosenie trávnika"}'
```

> **Pozn.:** starý n8n workflow „dobra-partia-dopyt" (n8n.ixy.sk) je týmto flow
> **nahradený** — celý reťazec formulár → Postgres → Discord bol 11. 7. 2026
> overený na produkcii, workflow sa dá deaktivovať.

## Blog / WordPress fake API

Blog články sa spravujú cez WordPress-kompatibilné REST endpointy pod
`/api/wp-json/wp/v2/`. Všetky vyžadujú **HTTP Basic auth** (`WP_USERNAME` /
`WP_PASSWORD`, prípadne pre-encoded `WP_AUTH`). Dáta sa ukladajú do tabuliek
`BlogPost`, `MediaUpload`, `BlogCategory`.

| Endpoint | Metóda | Popis |
|----------|--------|-------|
| `/api/wp-json/wp/v2/posts` | GET / POST | zoznam / vytvorenie článku |
| `/api/wp-json/wp/v2/posts/{id}` | GET / PUT / DELETE | detail / úprava / zmazanie |
| `/api/wp-json/wp/v2/media` | POST | upload obrázka (multipart `file`) |
| `/api/wp-json/wp/v2/categories` | GET | kategórie |

Obrázky sa na produkcii nahrávajú na **Vercel Blob** (ak je nastavený
`BLOB_READ_WRITE_TOKEN`), inak fallback na lokálny `public/uploads/`.

### Publish flow cez cURL (create → media → publish)

```bash
BASE=https://www.dobrapartia.sk
AUTH="$WP_USERNAME:$WP_PASSWORD"

# 1) upload obrázka → vráti { "id": <mediaId>, "source_url": ... }
curl -X POST "$BASE/api/wp-json/wp/v2/media" \
  -u "$AUTH" \
  -F "file=@obrazok.jpg"

# 2) vytvorenie článku so statusom publish a featured_media = <mediaId>
curl -X POST "$BASE/api/wp-json/wp/v2/posts" \
  -u "$AUTH" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Nový článok",
    "content": "<p>Text článku…</p>",
    "excerpt": "Krátky perex",
    "status": "publish",
    "featured_media": <mediaId>
  }'
```

## Environment premenné

| Premenná | Popis |
|----------|-------|
| `DATABASE_URL` | Postgres connection string (lokálne Docker, na Verceli Prisma Postgres — sensitive) |
| `WP_USERNAME` | používateľ pre WP API a `/api/dopyt` (`dobrapartia-publisher`) |
| `WP_PASSWORD` | heslo pre WP API a `/api/dopyt` |
| `DISCORD_WEBHOOK_URL` | Discord webhook pre notifikácie o nových dopytoch |
| `BLOB_READ_WRITE_TOKEN` | token pre Vercel Blob (upload obrázkov blogu na produkcii) |

> `WP_AUTH` (pre-encoded base64 `user:pass`) je alternatíva k `WP_USERNAME`/`WP_PASSWORD`.

## Lokálny vývoj

```bash
# 1) Postgres v Dockeri (port 54329)
docker start dobrapartia-pg

# 2) schéma do DB + Prisma client
npx prisma db push

# 3) dev server (port 3457)
npm run dev
```

App beží na **http://localhost:3457**.

## Deploy

Hostované na **Verceli**, push na `main` deployne produkciu.
Next.js verzia je naživo od **11. 7. 2026** (nahradila statický HTML web).

- Doména: `www.dobrapartia.sk`
- GitHub: `erikmeliska/dobra-partia` (git remote sa volá `dobra-partia`)

Build script (`package.json`) spúšťa `prisma generate && prisma db push --skip-generate && next build`
— `prisma db push` je idempotentný a v každom prostredí cieli na správnu DB
(lokálne Docker, na Verceli Prisma Postgres).

> **Dôležité:** `vercel.json` s `"framework": "nextjs"` je nutný — Vercel projekt
> má z čias statického webu preset „Other" a bez neho deploy servuje len `public/`
> (všetky routes vracajú 404). Nemazať.
>
> **Sensitive env:** `DATABASE_URL` na Verceli je *sensitive* (write-only) —
> `vercel env pull` ju vráti prázdnu. Lokálne sa na produkčnú DB pripojíš len
> connection stringom skopírovaným z dashboardu (Storage → prisma-postgres-dobrapartia).

### Otvorené follow-upy

- [ ] `BLOB_READ_WRITE_TOKEN` pridať na Vercel (dashboard → Storage → Blob) — bez neho
  padá upload obrázkov cez `/api/wp-json/wp/v2/media` na produkcii
- [ ] Import 11 historických dopytov z n8n exportu do produkčnej DB
  (`node scripts/import-dopyty.mjs <csv>` s produkčným `DATABASE_URL`) + zmazať
  testovací dopyt „TEST Claude — ignorovať" z 11. 7. 2026
- [ ] Deaktivovať n8n workflow „dobra-partia-dopyt" na n8n.ixy.sk
- [ ] Prekresliť `public/assets/mapa.jpg` na nové územie (Košice + 20 min / Prešov)
