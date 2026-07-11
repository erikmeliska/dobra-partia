'use client'

import { useTransition } from 'react'
import { zmenStavDopytu } from '@/actions/dopyty'
import { STAVY_DOPYTU, STAV_LABEL } from '@/lib/dopyty'

const STAV_FARBA = {
  novy: 'bg-terracotta text-white',
  kontaktovany: 'bg-teal text-white',
  dokonceny: 'bg-navy/20 text-navy',
}

export default function DopytKarta({ dopyt }) {
  const [pending, startTransition] = useTransition()
  return (
    <div className={`rounded-2xl bg-white p-4 shadow-sm ${pending ? 'opacity-50' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-lg font-bold">{dopyt.meno}</p>
          <p className="text-sm text-navy/60">
            {dopyt.sluzba} · {new Date(dopyt.createdAt).toLocaleDateString('sk-SK')}
          </p>
          <p className="mt-1 text-sm">{dopyt.adresa}</p>
          {dopyt.popis && <p className="mt-1 text-sm text-navy/80">{dopyt.popis}</p>}
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${STAV_FARBA[dopyt.stav] || STAV_FARBA.novy}`}>
          {STAV_LABEL[dopyt.stav] || dopyt.stav}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <a href={`tel:${dopyt.telefon}`} className="rounded-xl bg-navy p-3 text-center font-bold text-white">
          Volať
        </a>
        <a href={`sms:${dopyt.telefon}`} className="rounded-xl bg-teal p-3 text-center font-bold text-white">
          SMS
        </a>
        {dopyt.lat != null && dopyt.lon != null ? (
          <a
            href={`https://www.google.com/maps?q=${dopyt.lat},${dopyt.lon}`}
            target="_blank" rel="noreferrer"
            className="rounded-xl bg-sand p-3 text-center font-bold"
          >
            Mapa
          </a>
        ) : (
          <span className="rounded-xl bg-sand p-3 text-center text-navy/40">Mapa</span>
        )}
      </div>
      <div className="mt-2 flex gap-2">
        {STAVY_DOPYTU.filter((s) => s !== dopyt.stav).map((s) => (
          <button
            key={s}
            disabled={pending}
            onClick={() => startTransition(() => zmenStavDopytu(dopyt.id, s))}
            className="flex-1 rounded-xl border border-navy/20 p-3 text-sm font-bold"
          >
            → {STAV_LABEL[s]}
          </button>
        ))}
      </div>
    </div>
  )
}
