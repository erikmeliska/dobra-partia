// Nedokumentované API Finančnej správy „Over doklad".
// Server má rate limiter — volať sekvenčne, s backoffom, nikdy v paralelnej dávke.
const EKASA_URL = 'https://ekasa.financnasprava.sk/mdu/api/v1/opd/receipt/find'
const DELAYS_MS = [0, 1000, 3000]
const TIMEOUT_MS = 10000

const spanok = (ms) => new Promise((r) => setTimeout(r, ms))

export async function fetchReceipt(qrText) {
  for (let pokus = 0; pokus < DELAYS_MS.length; pokus++) {
    if (DELAYS_MS[pokus]) await spanok(DELAYS_MS[pokus])
    try {
      const res = await fetch(EKASA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptId: qrText }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      if (res.status === 429 || res.status >= 500) continue // dočasné → retry
      if (!res.ok) return { ok: false, reason: 'nenajdene' } // 4xx = trvalé
      const data = await res.json()
      if (data.returnValue === 0 && data.receipt) return { ok: true, receipt: data.receipt }
      return { ok: false, reason: 'nenajdene' }
    } catch {
      // network/timeout → retry
    }
  }
  return { ok: false, reason: 'nedostupne' }
}
