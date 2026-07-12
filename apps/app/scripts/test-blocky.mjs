// Spustenie z repo rootu: node --env-file=apps/app/.env apps/app/scripts/test-blocky.mjs <adresár s fotkami>
// Prejde fotky cez QR decode → eKasa → mapper (bez Blob a bez DB zápisu — čisto overenie pipeline logiky
// na reálnych dátach). POZOR: živé volania eKasa API — sekvenčne, s pauzou (rate limiter).
import fs from 'node:fs'
import path from 'node:path'

const { decodeQrZBuffra } = await import('../src/lib/qr-server.js')
const { fetchReceipt } = await import('../src/lib/ekasa.js')
const { mapEkasaReceipt } = await import('../src/lib/doklady.js')

const dir = process.argv[2]
if (!dir) {
  console.error('Použitie: node apps/app/scripts/test-blocky.mjs <adresár>')
  process.exit(1)
}

for (const subor of fs.readdirSync(dir).filter((f) => /\.jpe?g$/i.test(f))) {
  const buffer = fs.readFileSync(path.join(dir, subor))
  const qr = await decodeQrZBuffra(buffer)
  process.stdout.write(`${subor}: QR=${qr ? qr.slice(0, 22) + '…' : 'NIE'}`)
  if (!qr) {
    console.log(' → OCR vetva (tu sa netestuje)')
    continue
  }
  const r = await fetchReceipt(qr)
  if (!r.ok) {
    console.log(` → eKasa: ${r.reason}`)
  } else {
    const { doklad, polozky } = mapEkasaReceipt(r.receipt)
    console.log(` → ${doklad.predajca} ${doklad.suma} € (${polozky.length} položiek)`)
  }
  await new Promise((res) => setTimeout(res, 1500)) // rate limiter!
}
