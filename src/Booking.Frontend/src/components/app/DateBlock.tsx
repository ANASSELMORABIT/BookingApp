import { cn } from '@/lib/utils'

/** Bloque de fecha tipo calendario: mes arriba, día en grande y día de la semana. */
export function DateBlock({ iso, highlight, muted }: { iso: string; highlight?: boolean; muted?: boolean }) {
  const d = new Date(iso)
  const month = d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '')
  const weekday = d.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '')
  return (
    <div
      className={cn('date-block flex w-14 flex-shrink-0 flex-col items-center overflow-hidden rounded-xl text-center', highlight && 'is-highlight', muted && 'opacity-60')}
      aria-hidden
    >
      <span className="date-block-month w-full py-0.5 text-[10px] font-semibold uppercase tracking-wider">{month}</span>
      <span className="pt-1 text-xl font-semibold leading-none text-white tabular-nums">{d.getDate()}</span>
      <span className="pb-1.5 pt-0.5 text-[10px] capitalize text-slate-400">{weekday}</span>
    </div>
  )
}
