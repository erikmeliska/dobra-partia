import webpush from 'web-push'
import prisma from '@dobra-partia/db'

let configured = false
function setup() {
  if (configured) return
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
  configured = true
}

export async function sendPushAll(payload) {
  setup()
  const subs = await prisma.pushSubscription.findMany()
  const body = JSON.stringify(payload)
  const results = await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        body
      )
    )
  )
  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    if (r.status === 'rejected' && [404, 410].includes(r.reason?.statusCode)) {
      await prisma.pushSubscription.delete({ where: { id: subs[i].id } }).catch(() => {})
    }
  }
  return { sent: results.filter((r) => r.status === 'fulfilled').length }
}
