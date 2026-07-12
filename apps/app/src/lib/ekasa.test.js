import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchReceipt } from './ekasa'
import fixture from './fixtures/ekasa-sample.json'

function odpoved(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

async function sBehomCasov(promise) {
  // fetchReceipt spí medzi pokusmi — posúvame fake časovače, kým skončí
  let done = false
  const p = promise.finally(() => { done = true })
  while (!done) {
    await vi.advanceTimersByTimeAsync(1000)
  }
  return p
}

describe('fetchReceipt', () => {
  it('úspech na prvý pokus', async () => {
    global.fetch = vi.fn(async () => odpoved(200, fixture))
    const r = await fetchReceipt('O-ABC')
    expect(r.ok).toBe(true)
    expect(r.receipt.totalPrice).toBe(16.2)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('returnValue != 0 → nenajdene, bez retry', async () => {
    global.fetch = vi.fn(async () => odpoved(200, { returnValue: 3 }))
    const r = await fetchReceipt('O-ZLE')
    expect(r).toEqual({ ok: false, reason: 'nenajdene' })
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('4xx → nenajdene, bez retry', async () => {
    global.fetch = vi.fn(async () => odpoved(400, {}))
    const r = await fetchReceipt('O-ZLE')
    expect(r).toEqual({ ok: false, reason: 'nenajdene' })
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('429 → retry, po 3 pokusoch nedostupne', async () => {
    global.fetch = vi.fn(async () => odpoved(429, {}))
    const r = await sBehomCasov(fetchReceipt('O-ABC'))
    expect(r).toEqual({ ok: false, reason: 'nedostupne' })
    expect(global.fetch).toHaveBeenCalledTimes(3)
  })

  it('network chyba → retry → úspech na druhý pokus', async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('sieť'))
      .mockResolvedValueOnce(odpoved(200, fixture))
    const r = await sBehomCasov(fetchReceipt('O-ABC'))
    expect(r.ok).toBe(true)
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })
})
