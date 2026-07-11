import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../../../lib/push', () => ({ sendPushAll: vi.fn(async () => ({ sent: 2 })) }))

import { POST } from './route'
import { sendPushAll } from '../../../../lib/push'

beforeEach(() => {
  process.env.INTERNAL_API_TOKEN = 'tajny'
  vi.clearAllMocks()
})

function req(token, body) {
  return new Request('http://x/api/notify/dopyt', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { 'x-internal-token': token } : {}) },
    body: JSON.stringify(body),
  })
}

describe('POST /api/notify/dopyt', () => {
  it('odmietne bez tokenu (401)', async () => {
    const res = await POST(req(null, { meno: 'X' }))
    expect(res.status).toBe(401)
    expect(sendPushAll).not.toHaveBeenCalled()
  })
  it('odmietne zlý token (401)', async () => {
    const res = await POST(req('zly', { meno: 'X' }))
    expect(res.status).toBe(401)
  })
  it('pošle push so správnym tokenom', async () => {
    const res = await POST(req('tajny', { meno: 'Marek', sluzba: 'kosenie', adresa: 'Hlavná 1' }))
    expect(res.status).toBe(200)
    expect(sendPushAll).toHaveBeenCalledWith({
      title: 'Nový dopyt: kosenie',
      body: 'Marek — Hlavná 1',
      url: '/dopyty',
    })
  })
})
