import { get, set } from 'idb-keyval'

const KLUC = 'doklady-fronta'

async function nacitaj() {
  return (await get(KLUC)) || []
}

export async function pridajDoFronty({ blob, qrText }) {
  const fronta = await nacitaj()
  fronta.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, blob, qrText, createdAt: Date.now() })
  await set(KLUC, fronta)
}

export async function pocetVoFronte() {
  return (await nacitaj()).length
}

// Sekvenčný flush: posli(zaznam) — resolve = hotovo (odstráni sa), reject = stop (skúsi sa nabudúce).
export async function flushFrontu(posli) {
  let fronta = await nacitaj()
  let odoslane = 0
  while (fronta.length) {
    try {
      await posli(fronta[0])
      fronta = fronta.slice(1)
      await set(KLUC, fronta)
      odoslane++
    } catch {
      break
    }
  }
  return { odoslane, zostava: fronta.length }
}
