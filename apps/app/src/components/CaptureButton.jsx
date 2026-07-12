'use client'

import { useEffect, useRef, useState } from 'react'
import { spracujFotku } from '@/lib/capture'
import { pridajDoFronty, flushFrontu, pocetVoFronte } from '@/lib/fronta'
import { useRouter } from 'next/navigation'

async function posliZaznam(zaznam) {
  const fd = new FormData()
  fd.set('foto', zaznam.blob, 'blocek.jpg')
  if (zaznam.qrText) fd.set('qrText', zaznam.qrText)
  const res = await fetch('/api/doklady', { method: 'POST', body: fd })
  if (!res.ok) throw new Error(`upload ${res.status}`)
  return res.json()
}

export default function CaptureButton() {
  const inputRef = useRef(null)
  const router = useRouter()
  const [pocet, setPocet] = useState(0)
  const [sprava, setSprava] = useState('')

  async function obnovPocet() {
    setPocet(await pocetVoFronte())
  }

  async function flush() {
    if (!navigator.onLine) return
    const r = await flushFrontu(posliZaznam)
    await obnovPocet()
    if (r.odoslane > 0) {
      setSprava(`Odoslané: ${r.odoslane} ✓`)
      router.refresh()
    } else if (!r.preskocene && r.zostava > 0) {
      setSprava('Odoslanie zlyhalo — skúsim neskôr')
    } else if (!r.preskocene) {
      setSprava('')
    }
    if (r.odoslane > 0 || r.zostava > 0) setTimeout(() => setSprava(''), 3000)
  }

  useEffect(() => {
    obnovPocet()
    flush()
    window.addEventListener('online', flush)
    return () => window.removeEventListener('online', flush)
  }, [])

  async function naFotku(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setSprava('Spracúvam…')
    try {
      const { blob, qrText } = await spracujFotku(file)
      await pridajDoFronty({ blob, qrText })
      await obnovPocet()
      setSprava(qrText ? 'QR nájdené, odosielam…' : 'Bez QR, odosielam…')
      await flush()
    } catch (err) {
      console.error(err)
      setSprava('Nepodarilo sa spracovať fotku')
      setTimeout(() => setSprava(''), 4000)
    }
  }

  return (
    <>
      {sprava && (
        <div className="fixed bottom-24 left-1/2 z-30 -translate-x-1/2 rounded-full bg-navy px-4 py-2 text-sm text-white shadow-lg">
          {sprava}
        </div>
      )}
      <button
        onClick={() => inputRef.current?.click()}
        aria-label="Odfotiť bloček"
        className="fixed bottom-6 right-6 z-30 flex h-16 w-16 items-center justify-center rounded-full bg-terracotta text-3xl text-white shadow-xl active:scale-95"
      >
        📷
        {pocet > 0 && (
          <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-navy text-xs font-bold">
            {pocet}
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={naFotku}
      />
    </>
  )
}
