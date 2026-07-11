import { describe, it, expect } from 'vitest'
import bcrypt from 'bcryptjs'
import { verifyCredentials } from './auth-helpers'

const hash = bcrypt.hashSync('spravne-heslo', 4)
const fakeDb = {
  uzivatel: {
    findUnique: async ({ where }) =>
      where.email === 'erik@dobrapartia.sk'
        ? { id: 'u1', meno: 'Erik', email: where.email, partiaId: 'p1', passwordHash: hash }
        : null,
  },
}

describe('verifyCredentials', () => {
  it('vráti užívateľa pri správnom hesle', async () => {
    const u = await verifyCredentials(fakeDb, 'erik@dobrapartia.sk', 'spravne-heslo')
    expect(u).toEqual({ id: 'u1', name: 'Erik', email: 'erik@dobrapartia.sk', partiaId: 'p1' })
  })
  it('vráti null pri zlom hesle', async () => {
    expect(await verifyCredentials(fakeDb, 'erik@dobrapartia.sk', 'zle')).toBeNull()
  })
  it('vráti null pre neexistujúci email', async () => {
    expect(await verifyCredentials(fakeDb, 'x@x.sk', 'spravne-heslo')).toBeNull()
  })
  it('vráti null pre prázdne vstupy', async () => {
    expect(await verifyCredentials(fakeDb, '', '')).toBeNull()
  })
})
