import Link from 'next/link'
import { STAV_DOKLADU_LABEL, OVERENIE_IKONA } from '@/lib/doklady-ui'

const STAV_FARBA = {
  inbox: 'bg-terracotta text-white',
  spracovany: 'bg-teal text-white',
  rucne: 'bg-white text-navy border border-navy/30',
  priradeny: 'bg-navy/20 text-navy',
}

export default function DokladKarta({ doklad }) {
  return (
    <Link href={`/doklady/${doklad.id}`} className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm">
      {doklad.fotoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/doklady/${doklad.id}/foto`} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
      ) : (
        <div className="h-16 w-16 shrink-0 rounded-xl bg-sand" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">{doklad.predajca || 'Neznámy bloček'}</p>
        <p className="text-sm text-navy/60">
          {doklad.datum ? new Date(doklad.datum).toLocaleDateString('sk-SK') : '—'}
        </p>
        <p className="text-lg font-bold">{doklad.suma != null ? `${Number(doklad.suma).toFixed(2)} €` : '—'}</p>
      </div>
      <span
        className={`h-fit shrink-0 rounded-full px-3 py-1 text-xs font-bold ${STAV_FARBA[doklad.stav] || STAV_FARBA.inbox}`}
      >
        {OVERENIE_IKONA[doklad.overenie] || ''} {STAV_DOKLADU_LABEL[doklad.stav] || doklad.stav}
      </span>
    </Link>
  )
}
