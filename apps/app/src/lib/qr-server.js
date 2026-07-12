import jsQR from 'jsqr'
import sharp from 'sharp'

export async function decodeQrZBuffra(buffer) {
  try {
    const plny = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const kod = jsQR(new Uint8ClampedArray(plny.data), plny.info.width, plny.info.height)
    if (kod) return kod.data
    const polovica = await sharp(buffer)
      .resize({ width: Math.round(plny.info.width / 2) })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    const kod2 = jsQR(new Uint8ClampedArray(polovica.data), polovica.info.width, polovica.info.height)
    return kod2 ? kod2.data : null
  } catch (e) {
    console.error('QR decode zlyhal:', e)
    return null
  }
}
