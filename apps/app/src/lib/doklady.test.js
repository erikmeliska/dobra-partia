import { describe, it, expect } from 'vitest'
import { mapEkasaReceipt, mapOcrReceipt, parseEkasaDatum, validujUpravu } from './doklady'
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

describe('mapOcrReceipt', () => {
  it('mapuje BAML Receipt na doklad + položky', () => {
    const { doklad, polozky } = mapOcrReceipt({
      supplierName: 'Hornbach',
      totalAmount: 55.5,
      currency: 'EUR',
      issueDate: '2026-04-04',
      items: [{ name: 'Silikón', quantity: 2, unitPrice: 5, totalPrice: 10, vatRate: 23 }],
    })
    expect(doklad.predajca).toBe('Hornbach')
    expect(doklad.suma).toBe(55.5)
    expect(doklad.overenie).toBe('ocr')
    expect(doklad.stav).toBe('spracovany')
    expect(doklad.datum.getFullYear()).toBe(2026)
    expect(polozky[0]).toEqual({
      nazov: 'Silikón', mnozstvo: 2, suma: 10, jednotkovaCena: 5, kategoria: 'material',
    })
  })
  it('prázdne items a chýbajúci dátum nepadnú', () => {
    const { doklad, polozky } = mapOcrReceipt({ totalAmount: 3, currency: 'EUR' })
    expect(polozky).toEqual([])
    expect(doklad.datum).toBeNull()
  })
})

describe('validujUpravu', () => {
  it('prijme platné hodnoty a znormalizuje typy', () => {
    const r = validujUpravu({ predajca: 'Hornbach', suma: '12,50', datum: '2026-07-12' })
    expect(r.ok).toBe(true)
    expect(r.data.suma).toBe(12.5)
    expect(r.data.datum.getFullYear()).toBe(2026)
    expect(r.data.predajca).toBe('Hornbach')
  })
  it('odmietne zápornú a nečíselnú sumu', () => {
    expect(validujUpravu({ predajca: 'X', suma: '-1', datum: '' }).ok).toBe(false)
    expect(validujUpravu({ predajca: 'X', suma: 'abc', datum: '' }).ok).toBe(false)
  })
  it('prázdny dátum je OK (null), predajca sa oreže', () => {
    const r = validujUpravu({ predajca: '  Obchod  ', suma: '5', datum: '' })
    expect(r.ok).toBe(true)
    expect(r.data.datum).toBeNull()
    expect(r.data.predajca).toBe('Obchod')
  })
})
