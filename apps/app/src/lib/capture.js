import jsQR from 'jsqr'

const MAX_ROZMER = 2000

// Fotka z inputu → zmenšený JPEG blob + pokus o QR (plná a polovičná mierka).
export async function spracujFotku(file) {
  const bitmap = await createImageBitmap(file)
  const pomer = Math.min(1, MAX_ROZMER / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * pomer)
  const h = Math.round(bitmap.height * pomer)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, w, h)

  let qrText = null
  const plne = ctx.getImageData(0, 0, w, h)
  const kod = jsQR(plne.data, w, h)
  if (kod) qrText = kod.data
  else {
    const c2 = document.createElement('canvas')
    c2.width = Math.round(w / 2)
    c2.height = Math.round(h / 2)
    const ctx2 = c2.getContext('2d')
    ctx2.drawImage(bitmap, 0, 0, c2.width, c2.height)
    const pol = ctx2.getImageData(0, 0, c2.width, c2.height)
    const kod2 = jsQR(pol.data, c2.width, c2.height)
    if (kod2) qrText = kod2.data
  }

  const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.8))
  return { blob, qrText }
}
