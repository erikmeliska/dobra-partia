import prisma from '@/lib/prisma'
import { sendDiscordMessage } from '@/lib/discord'

export async function createDopyt(body) {
  const { meno, telefon, email, adresa, lat, lon, sluzba, popis } = body

  if (!meno || !telefon || !adresa || !sluzba) {
    return { success: false, message: 'Chýbajú povinné polia', status: 400 }
  }

  if (
    (meno && meno.length > 200) ||
    (telefon && telefon.length > 50) ||
    (email && email.length > 200) ||
    (adresa && adresa.length > 500) ||
    (sluzba && sluzba.length > 100) ||
    (popis && popis.length > 3000)
  ) {
    return { success: false, message: 'Neplatný dopyt', status: 400 }
  }

  const latNum = lat != null && lat !== '' ? parseFloat(lat) : null
  const lonNum = lon != null && lon !== '' ? parseFloat(lon) : null
  const safeLat = latNum != null && !Number.isNaN(latNum) ? latNum : null
  const safeLon = lonNum != null && !Number.isNaN(lonNum) ? lonNum : null

  try {
    const dopyt = await prisma.dopyt.create({
      data: {
        meno,
        telefon,
        email: email || '',
        adresa,
        lat: safeLat,
        lon: safeLon,
        sluzba,
        popis: popis || '',
      },
    })

    const mapLine =
      dopyt.lat != null && dopyt.lon != null
        ? `\n\n🗺️ **Mapa:** https://www.google.com/maps?q=${dopyt.lat},${dopyt.lon}`
        : ''

    await sendDiscordMessage(
      `🔔 **NOVÝ DOPYT z webu**

👤 **Meno:** ${dopyt.meno}
📞 **Telefón:** ${dopyt.telefon}
📧 **E-mail:** ${dopyt.email || 'neuvedený'}

📍 **Adresa:** ${dopyt.adresa}
🔧 **Služba:** ${dopyt.sluzba}
📝 **Popis:** ${dopyt.popis || 'bez popisu'}${mapLine}

⏰ ${dopyt.createdAt.toISOString()}`
    )

    return { success: true, message: 'Dopyt bol prijatý', status: 200 }
  } catch (error) {
    console.error('Dopyt error:', error)
    return { success: false, message: 'Chyba pri spracovaní', status: 500 }
  }
}
