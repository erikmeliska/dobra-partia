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
