import { describe, it, expect } from 'vitest'
import { STAVY_DOPYTU, jePlatnyStav } from './dopyty'

describe('jePlatnyStav', () => {
  it('pozná všetky tri stavy', () => {
    expect(STAVY_DOPYTU).toEqual(['novy', 'kontaktovany', 'dokonceny'])
    for (const s of STAVY_DOPYTU) expect(jePlatnyStav(s)).toBe(true)
  })
  it('odmieta neznáme hodnoty', () => {
    expect(jePlatnyStav('zaplatene')).toBe(false)
    expect(jePlatnyStav('')).toBe(false)
    expect(jePlatnyStav(undefined)).toBe(false)
  })
})
