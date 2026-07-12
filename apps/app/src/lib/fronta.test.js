import { describe, it, expect, vi, beforeEach } from 'vitest'

const sklad = new Map()
vi.mock('idb-keyval', () => ({
  get: vi.fn(async (k) => sklad.get(k)),
  set: vi.fn(async (k, v) => void sklad.set(k, v)),
}))

import { pridajDoFronty, flushFrontu, pocetVoFronte } from './fronta'

beforeEach(() => sklad.clear())

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
})
