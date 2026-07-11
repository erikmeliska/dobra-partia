export async function notifyAppNovyDopyt(dopyt) {
  const url = process.env.APP_URL
  const token = process.env.INTERNAL_API_TOKEN
  if (!url || !token) return
  try {
    await fetch(`${url}/api/notify/dopyt`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-token': token },
      body: JSON.stringify({ meno: dopyt.meno, sluzba: dopyt.sluzba, adresa: dopyt.adresa }),
      signal: AbortSignal.timeout(3000),
    })
  } catch (e) {
    console.error('Push notify error:', e)
  }
}
