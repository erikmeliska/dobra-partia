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

// Validácia ručnej úpravy dokladu (formulár DokladDetail).
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
