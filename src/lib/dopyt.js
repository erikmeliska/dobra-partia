import prisma from '@/lib/prisma'
import { sendDiscordMessage } from '@/lib/discord'

export async function createDopyt(body) {
  const { meno, telefon, email, adresa, lat, lon, sluzba, popis } = body

  if (!meno || !telefon || !adresa || !sluzba) {
    return { success: false, message: 'Chýbajú povinné polia', status: 400 }
  }

  try {
    const dopyt = await prisma.dopyt.create({
      data: {
        meno,
        telefon,
        email: email || '',
        adresa,
        lat: lat ? parseFloat(lat) : null,
        lon: lon ? parseFloat(lon) : null,
        sluzba,
        popis: popis || '',
      },
    })

    await sendDiscordMessage(
      `🔔 **NOVÝ DOPYT z webu**

👤 **Meno:** ${dopyt.meno}
📞 **Telefón:** ${dopyt.telefon}
📧 **E-mail:** ${dopyt.email || 'neuvedený'}

📍 **Adresa:** ${dopyt.adresa}
🔧 **Služba:** ${dopyt.sluzba}
📝 **Popis:** ${dopyt.popis || 'bez popisu'}

🗺️ **Mapa:** https://www.google.com/maps?q=${dopyt.lat},${dopyt.lon}

⏰ ${dopyt.createdAt.toISOString()}`
    )

    return { success: true, message: 'Dopyt bol prijatý', status: 200 }
  } catch (error) {
    console.error('Dopyt error:', error)
    return { success: false, message: 'Chyba pri spracovaní', status: 500 }
  }
}
