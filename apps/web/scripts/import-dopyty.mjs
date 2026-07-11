import { readFileSync } from 'fs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function parseCsv(text) {
  const rows = []
  let row = [], field = '', inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') inQuotes = false
      else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (field !== '' || row.length) { row.push(field); rows.push(row); row = []; field = '' }
    } else field += c
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
  return rows
}

const path = process.argv[2]
if (!path) { console.error('Použitie: node scripts/import-dopyty.mjs <cesta-k-csv>'); process.exit(1) }

const text = readFileSync(path, 'utf8').replace(/^﻿/, '')
const [header, ...rows] = parseCsv(text)
console.log('Stĺpce:', header.join(', '))

for (const r of rows) {
  const rec = Object.fromEntries(header.map((h, i) => [h, r[i] ?? '']))
  await prisma.dopyt.create({
    data: {
      meno: rec.meno,
      telefon: rec.telefon,
      email: rec.email || '',
      adresa: rec.adresa,
      lat: rec.lat ? parseFloat(rec.lat) : null,
      lon: rec.lon ? parseFloat(rec.lon) : null,
      sluzba: rec.sluzba,
      popis: rec.popis || '',
      stav: rec.stav || 'novy',
      vybavene: rec.vybavene === 'true',
    },
  })
  console.log('Importované:', rec.meno)
}

console.log(`Hotovo: ${rows.length} dopytov`)
await prisma.$disconnect()
