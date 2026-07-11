'use client'

import { useEffect, useState } from 'react'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export default function PushNastavenie() {
  const [stav, setStav] = useState('nezname') // nezname | vypnute | zapnute | nepodporovane

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStav('nepodporovane')
      return
    }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setStav(sub ? 'zapnute' : 'vypnute'))
  }, [])

  async function zapni() {
    const povolenie = await Notification.requestPermission()
    if (povolenie !== 'granted') return
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
    })
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(sub.toJSON()),
    })
    setStav('zapnute')
  }

  if (stav === 'nepodporovane' || stav === 'zapnute' || stav === 'nezname') return null
  return (
    <button onClick={zapni} className="rounded-lg bg-terracotta px-3 py-2 text-sm font-bold text-white">
      🔔 Zapnúť notifikácie
    </button>
  )
}
