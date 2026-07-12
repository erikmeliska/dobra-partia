import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockDb } = vi.hoisted(() => ({
  mockDb: { doklad: { findFirst: vi.fn(), create: vi.fn() } },
}))
vi.mock('@dobra-partia/db', () => ({ default: mockDb }))
vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@vercel/blob', () => ({ put: vi.fn(async () => ({ url: 'https://blob/x.jpg' })) }))
vi.mock('../../../lib/qr-server', () => ({ decodeQrZBuffra: vi.fn(async () => null) }))
vi.mock('../../../lib/pipeline', () => ({
  spracujDoklad: vi.fn(async () => ({ id: 'd1', stav: 'spracovany' })),
}))

import { POST } from './route'
import { auth } from '@/auth'

function requestSFotkou(qrText) {
  const fd = new FormData()
  fd.set('foto', new File([new Uint8Array([1, 2, 3])], 'blocek.jpg', { type: 'image/jpeg' }))
  if (qrText) fd.set('qrText', qrText)
  return { formData: async () => fd }
}

beforeEach(() => {
  vi.clearAllMocks()
  auth.mockResolvedValue({ user: { id: 'u1', partiaId: 'p1' } })
  mockDb.doklad.findFirst.mockResolvedValue(null)
  mockDb.doklad.create.mockResolvedValue({ id: 'd1', partiaId: 'p1', qrData: 'O-X', fotoUrl: 'https://blob/x.jpg' })
})

describe('POST /api/doklady', () => {
  it('bez session → 401', async () => {
    auth.mockResolvedValue(null)
    const res = await POST(requestSFotkou('O-X'))
    expect(res.status).toBe(401)
  })

  it('duplicitné QR → vráti existujúci doklad, nič nezakladá', async () => {
    mockDb.doklad.findFirst.mockResolvedValue({ id: 'existujuci' })
    const res = await POST(requestSFotkou('O-X'))
    const body = await res.json()
    expect(body).toEqual({ duplicita: true, dokladId: 'existujuci' })
    expect(mockDb.doklad.create).not.toHaveBeenCalled()
  })

  it('nový doklad → create so scopovaným partiaId + spustí pipeline', async () => {
    const res = await POST(requestSFotkou('O-X'))
    const body = await res.json()
    expect(mockDb.doklad.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ partiaId: 'p1', qrData: 'O-X', stav: 'inbox' }),
      })
    )
    expect(body.dokladId).toBe('d1')
    expect(body.stav).toBe('spracovany')
  })

  it('bez fotky → 400', async () => {
    const fd = new FormData()
    const res = await POST({ formData: async () => fd })
    expect(res.status).toBe(400)
  })
})
