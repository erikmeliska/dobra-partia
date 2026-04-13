# Dobrá Partia - Web

Webová stránka pre firmu **Dobrá Partia s.r.o.** - kompletný servis pre domov a záhradu v Košickom kraji.

## Štruktúra

```
web/
├── index.html              # Hlavná stránka (služby, formulár, mapa)
├── o-nas.html              # O nás (príbeh, hodnoty, mapa pokrytia)
├── ochrana-sukromia.html    # GDPR / ochrana osobných údajov
├── obchodne-podmienky.html # Obchodné podmienky
└── assets/
    ├── logo.png            # Logo (transparentné, 18KB)
    ├── auto.jpg            # Firemné auto hero (103KB)
    ├── hero-logo.jpg       # Veľké logo (29KB)
    └── mapa.jpg            # Mapa pokrytia okresov (200KB)
```

## Funkcie

- **Kontaktný formulár** s validáciou a GDPR súhlasom
- **Vyhľadávanie adries** cez OpenStreetMap Nominatim API (prioritne SK)
- **Leaflet mapa** s markerom po výbere adresy
- **Odosielanie dopytov** na n8n webhook (JSON POST)
- Responzívny dizajn s mobilným menu

## Formulár - n8n integrácia

Formulár odosiela POST request na n8n webhook. Payload:

```json
{
  "meno": "Jozef Kováč",
  "telefon": "+421 911 222 333",
  "email": "jozef@email.sk",
  "adresa": "Hlavná 12, Košice...",
  "lat": 48.72,
  "lon": 21.26,
  "sluzba": "zahradne-prace",
  "popis": "Kosenie trávnika",
  "zdroj": "web-formular"
}
```

Webhook URL sa nastavuje v `index.html` v premennej `N8N_WEBHOOK_URL`.

### n8n Data Table stĺpce

| Stĺpec | Typ | Popis |
|---------|-----|-------|
| meno | string | Meno zákazníka |
| telefon | string | Telefónne číslo |
| email | string | E-mail (voliteľné) |
| adresa | string | Plná adresa z OSM |
| lat | number | GPS šírka |
| lon | number | GPS dĺžka |
| sluzba | string | Typ služby |
| popis | string | Popis práce |
| stav | string | novy / kontaktovany / dokonceny |
| vybavene | boolean | false / true |

`createdAt` a `updatedAt` pridáva n8n automaticky.

## Deploy

Statický HTML hostovaný na Verceli. Každý push na `main` automaticky deployne novú verziu.

## Technológie

- HTML5 + Tailwind CSS (CDN)
- Leaflet.js (mapy)
- OpenStreetMap Nominatim (geocoding)
- Font Awesome (ikony)
- n8n (backend / automatizácia)
