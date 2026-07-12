import { get, set } from 'idb-keyval'

const KLUC = 'doklady-fronta'

async function nacitaj() {
  return (await get(KLUC)) || []
}

// Zámok: reťaz promisov zaisťuje, že read-modify-write nad frontou je atomický
// aj keď sa pridávanie a mazanie (flush) prekrývajú v čase.
let zamok = Promise.resolve()
function soZamkom(fn) {
  const r = zamok.then(fn)
  zamok = r.catch(() => {})
  return r
}

export async function pridajDoFronty({ blob, qrText }) {
  await soZamkom(async () => {
    const fronta = await nacitaj()
    fronta.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, blob, qrText, createdAt: Date.now() })
    await set(KLUC, fronta)
  })
}

export async function pocetVoFronte() {
  return (await nacitaj()).length
}

let flushBezi = false

// Sekvenčný flush: posli(zaznam) — resolve = hotovo (odstráni sa), reject = stop (skúsi sa nabudúce).
// Re-entrancy guard: ak už flush beží, táto volanie sa okamžite preskočí — bežiaci flush
// každú iteráciu znovu načíta frontu z úložiska, takže odčerpá aj medzičasom pridané záznamy.
export async function flushFrontu(posli) {
  if (flushBezi) {
    return { odoslane: 0, zostava: await pocetVoFronte(), preskocene: true }
  }
  flushBezi = true
  try {
    let odoslane = 0
    while (true) {
      const fronta = await nacitaj()
      if (!fronta.length) return { odoslane, zostava: 0 }
      const prvy = fronta[0]
      try {
        await posli(prvy)
      } catch {
        return { odoslane, zostava: fronta.length }
      }
      await soZamkom(async () => {
        const aktualna = await nacitaj()
        await set(KLUC, aktualna.filter((z) => z.id !== prvy.id))
      })
      odoslane++
    }
  } finally {
    flushBezi = false
  }
}
