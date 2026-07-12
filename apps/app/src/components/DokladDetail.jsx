'use client'

import { useState, useTransition } from 'react'
import { overitDoklad, upravDoklad, zmazDoklad } from '@/actions/doklady'
import { STAV_DOKLADU_LABEL, OVERENIE_IKONA } from '@/lib/doklady-ui'

export default function DokladDetail({ doklad }) {
  const [pending, start] = useTransition()
  const [editujem, setEditujem] = useState(false)
  const [chyba, setChyba] = useState('')

  function akcia(fn) {
    setChyba('')
    start(async () => {
      try {
        await fn()
      } catch (e) {
        setChyba(e?.message || 'Akcia zlyhala')
      }
    })
  }

  return (
    <div className={`space-y-4 ${pending ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">{doklad.predajca || 'Neznámy bloček'}</h1>
          <p className="text-sm text-navy/60">
            {doklad.datum ? new Date(doklad.datum).toLocaleString('sk-SK') : 'bez dátumu'}
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-sm font-bold shadow-sm">
          {OVERENIE_IKONA[doklad.overenie]} {STAV_DOKLADU_LABEL[doklad.stav] || doklad.stav}
        </span>
      </div>

      {chyba && <p className="rounded-xl bg-terracotta/10 p-3 text-terracotta">{chyba}</p>}

      {doklad.fotoUrl && (
        <a href={doklad.fotoUrl} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={doklad.fotoUrl} alt="Fotka bločku" className="max-h-72 w-full rounded-2xl object-contain bg-white" />
        </a>
      )}

      <p className="text-3xl font-bold">{doklad.suma != null ? `${doklad.suma.toFixed(2)} €` : '—'}</p>

      {doklad.polozky.length > 0 && (
        <div className="rounded-2xl bg-white p-3 shadow-sm">
          {doklad.polozky.map((p) => (
            <div key={p.id} className="flex justify-between border-b border-sand py-2 last:border-0">
              <span className="min-w-0 truncate pr-2">
                {p.nazov}
                {p.mnozstvo !== 1 && <span className="text-navy/50"> ×{p.mnozstvo}</span>}
              </span>
              <span className="shrink-0 font-bold">{p.suma.toFixed(2)} €</span>
            </div>
          ))}
        </div>
      )}

      {editujem ? (
        <form
          action={(fd) =>
            akcia(async () => {
              await upravDoklad(doklad.id, {
                predajca: fd.get('predajca'),
                suma: fd.get('suma'),
                datum: fd.get('datum'),
              })
              setEditujem(false)
            })
          }
          className="space-y-2 rounded-2xl bg-white p-3 shadow-sm"
        >
          <input name="predajca" defaultValue={doklad.predajca} placeholder="Predajca" className="w-full rounded-xl border border-navy/20 p-3" />
          <input name="suma" defaultValue={doklad.suma ?? ''} placeholder="Suma €" inputMode="decimal" className="w-full rounded-xl border border-navy/20 p-3" />
          <input name="datum" type="date" defaultValue={doklad.datum ? String(doklad.datum).slice(0, 10) : ''} className="w-full rounded-xl border border-navy/20 p-3" />
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="flex-1 rounded-xl bg-navy p-3 font-bold text-white">Uložiť</button>
            <button type="button" onClick={() => setEditujem(false)} className="rounded-xl bg-sand p-3">Zrušiť</button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {['inbox', 'rucne'].includes(doklad.stav) && doklad.qrData && (
            <button onClick={() => akcia(() => overitDoklad(doklad.id))} disabled={pending} className="rounded-xl bg-teal p-3 font-bold text-white">
              Overiť znova
            </button>
          )}
          <button onClick={() => setEditujem(true)} className="rounded-xl bg-white p-3 font-bold shadow-sm">
            Upraviť
          </button>
          <button
            onClick={() => window.confirm('Zmazať doklad aj s položkami?') && akcia(() => zmazDoklad(doklad.id))}
            disabled={pending}
            className="col-span-2 rounded-xl border border-terracotta p-3 font-bold text-terracotta"
          >
            Zmazať
          </button>
        </div>
      )}
    </div>
  )
}
