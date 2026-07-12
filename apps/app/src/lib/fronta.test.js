import { describe, it, expect, vi, beforeEach } from 'vitest'

const sklad = new Map()
vi.mock('idb-keyval', () => ({
  get: vi.fn(async (k) => sklad.get(k)),
  set: vi.fn(async (k, v) => void sklad.set(k, v)),
}))

import { pridajDoFronty, flushFrontu, pocetVoFronte } from './fronta'

beforeEach(() => sklad.clear())

function odlozene() {
  let resolve
  const promise = new Promise((r) => { resolve = r })
  return { promise, resolve }
}

describe('fronta', () => {
  it('pridá záznam a spočíta ho', async () => {
    await pridajDoFronty({ blob: 'b1', qrText: 'O-1' })
    expect(await pocetVoFronte()).toBe(1)
  })

  it('flush odošle sekvenčne a úspešné odstráni', async () => {
    await pridajDoFronty({ blob: 'b1', qrText: 'O-1' })
    await pridajDoFronty({ blob: 'b2', qrText: 'O-2' })
    const posli = vi.fn(async () => {})
    const r = await flushFrontu(posli)
    expect(posli).toHaveBeenCalledTimes(2)
    expect(r).toEqual({ odoslane: 2, zostava: 0 })
    expect(await pocetVoFronte()).toBe(0)
  })

  it('pri zlyhaní sa zastaví a zvyšok ostane', async () => {
    await pridajDoFronty({ blob: 'b1', qrText: 'O-1' })
    await pridajDoFronty({ blob: 'b2', qrText: 'O-2' })
    const posli = vi.fn(async () => { throw new Error('offline') })
    const r = await flushFrontu(posli)
    expect(posli).toHaveBeenCalledTimes(1)
    expect(r).toEqual({ odoslane: 0, zostava: 2 })
    expect(await pocetVoFronte()).toBe(2)
  })

  it('súbežný flush sa preskočí', async () => {
    await pridajDoFronty({ blob: 'b1', qrText: 'O-1' })
    await pridajDoFronty({ blob: 'b2', qrText: 'O-2' })
    const d = odlozene()
    const started = odlozene()
    const posli = vi.fn(async () => {
      if (posli.mock.calls.length === 1) {
        started.resolve()
        return d.promise
      }
    })

    const prvy = flushFrontu(posli)
    await started.promise

    const druhy = await flushFrontu(posli)
    expect(druhy).toEqual({ odoslane: 0, zostava: 2, preskocene: true })
    expect(posli).toHaveBeenCalledTimes(1)

    d.resolve()
    const r = await prvy
    expect(r).toEqual({ odoslane: 2, zostava: 0 })
    expect(posli).toHaveBeenCalledTimes(2)
    expect(await pocetVoFronte()).toBe(0)
  })

  it('záznam pridaný počas flushu sa nestratí ani nepreskočí', async () => {
    await pridajDoFronty({ blob: 'b1', qrText: 'O-1' })
    const d = odlozene()
    const started = odlozene()
    const posli = vi.fn(async () => {
      if (posli.mock.calls.length === 1) {
        started.resolve()
        return d.promise
      }
    })

    const beh = flushFrontu(posli)
    await started.promise

    await pridajDoFronty({ blob: 'b2', qrText: 'O-2' })
    d.resolve()

    const r = await beh
    expect(posli).toHaveBeenCalledTimes(2)
    expect(r.odoslane).toBe(2)
    expect(await pocetVoFronte()).toBe(0)
  })
})
