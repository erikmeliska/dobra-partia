import { Image } from '@boundaryml/baml'
import { b } from './baml_client'

// Gemini extrakcia bločku z fotky. Vráti BAML Receipt alebo null (chyba/nečitateľné).
export async function extractReceiptZFotky(buffer, mimeType = 'image/jpeg') {
  if (!process.env.GOOGLE_API_KEY) return null
  try {
    const img = Image.fromBase64(mimeType, buffer.toString('base64'))
    return await b.ExtractReceipt(img)
  } catch (e) {
    console.error('OCR extrakcia zlyhala:', e?.message)
    return null
  }
}
