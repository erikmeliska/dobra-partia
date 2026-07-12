import { del } from '@vercel/blob'
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
      if (doklad.fotoUrl) await del(doklad.fotoUrl).catch(() => {})
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
