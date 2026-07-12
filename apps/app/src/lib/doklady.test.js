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
