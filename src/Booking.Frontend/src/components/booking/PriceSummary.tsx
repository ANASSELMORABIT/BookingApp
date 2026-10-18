import { Receipt } from 'lucide-react'
import { formatPrice } from '@/lib/labels'

/** Desglose de la reserva: servicio, cada extra y el total a pagar con la duración total. */
export function PriceSummary({ serviceName, servicePrice, serviceMinutes, extras }: {
  serviceName: string
  servicePrice: number
  serviceMinutes: number
  extras: { name: string; price: number; extraMinutes: number }[]
}) {
  const total = servicePrice + extras.reduce((s, e) => s + e.price, 0)
  const minutes = serviceMinutes + extras.reduce((s, e) => s + e.extraMinutes, 0)
  return (
    <div className="receipt rounded-xl p-4" aria-label="Resumen del precio">
      <p className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-slate-400">
        <Receipt size={13} /> Tu factura
      </p>
      <dl className="space-y-1.5 text-sm tabular-nums">
        <div className="flex justify-between gap-4">
          <dt className="text-slate-300">{serviceName}</dt>
          <dd className="text-white">{formatPrice(servicePrice)}</dd>
        </div>
        {extras.map(e => (
          <div key={e.name} className="flex justify-between gap-4">
            <dt className="text-slate-400">+ {e.name}{e.extraMinutes > 0 && <span className="text-slate-500"> · {e.extraMinutes} min</span>}</dt>
            <dd className="text-slate-200">{formatPrice(e.price)}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 flex items-end justify-between border-t border-dashed border-white/15 pt-3">
        <div>
          <p className="text-xs text-slate-400">Total a pagar</p>
          <p className="text-xs text-slate-500">{minutes} min en total</p>
        </div>
        <p className="text-2xl font-semibold tracking-tight text-white">{formatPrice(total)}</p>
      </div>
    </div>
  )
}
