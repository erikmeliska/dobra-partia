import { describe, it, expect } from 'vitest'
import { STAVY_DOKLADU, jePlatnyStavDokladu } from './doklady-ui'

describe('jePlatnyStavDokladu', () => {
  it('pozná stavy zoznamu', () => {
    expect(STAVY_DOKLADU).toEqual(['inbox', 'spracovany', 'rucne'])
    for (const s of STAVY_DOKLADU) expect(jePlatnyStavDokladu(s)).toBe(true)
  })
  it('odmieta neznáme', () => {
    expect(jePlatnyStavDokladu('priradeny')).toBe(false) // v UI filtri až od časti 2
    expect(jePlatnyStavDokladu(undefined)).toBe(false)
  })
})
