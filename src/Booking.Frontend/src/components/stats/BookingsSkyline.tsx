import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { BarChart3, Table2 } from 'lucide-react'
import { useCan3D } from '@/hooks/useCan3D'
import { formatPrice } from '@/lib/labels'
import { cn } from '@/lib/utils'
import { CountUp } from '@/components/app/CountUp'

const StatsSkylineScene = lazy(() => import('@/components/three/StatsSkylineScene'))

export interface DayStats {
  key: string          // "YYYY-MM-DD"
  total: number
  confirmed: number
  cancelled: number
  revenue: number
}

const longDate = (key: string) =>
  new Date(`${key}T00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
const shortDate = (key: string) =>
  new Date(`${key}T00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

/**
 * Cabecera de Estadísticas: reservas por día como un horizonte 3D (escritorio) o barras 2D
 * (móvil, movimiento reducido o sin WebGL). Valores exactos al pasar el ratón y vista de tabla.
 */
export function BookingsSkyline({ days, todayKey, loading, periodLabel }: {
  days: DayStats[]
  todayKey: string
  loading: boolean
  periodLabel: string
}) {
  const can3D = useCan3D(1024)
  const [ready, setReady] = useState(false)
  const [inView, setInView] = useState(true)
  const [showTable, setShowTable] = useState(false)
  const [hovered, setHovered] = useState<number | null>(null)
  const hoveredRef = useRef<number | null>(null)
  const panelRef = useRef<HTMLElement>(null)
  const plotRef = useRef<HTMLDivElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)

  // Pausa la escena fuera de pantalla o con la pestaña oculta
  useEffect(() => {
    const el = panelRef.current
    if (!el) return
    let onScreen = true
    const update = () => setInView(onScreen && document.visibilityState === 'visible')
    const io = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; update() })
    io.observe(el)
    document.addEventListener('visibilitychange', update)
    return () => { io.disconnect(); document.removeEventListener('visibilitychange', update) }
  }, [])

  // El tooltip se mueve escribiendo en el DOM; solo se re-renderiza al cambiar de día
  const handleHover = useCallback((index: number | null, clientX: number, clientY: number) => {
    const plot = plotRef.current
    const tip = tipRef.current
    if (plot && tip && index !== null) {
      const r = plot.getBoundingClientRect()
      const x = Math.min(Math.max(clientX - r.left, 90), r.width - 90)
      tip.style.transform = `translate(${x}px, ${clientY - r.top - 16}px) translate(-50%, -100%)`
    }
    if (hoveredRef.current !== index) {
      hoveredRef.current = index
      setHovered(index)
    }
  }, [])

  const total = days.reduce((s, d) => s + d.total, 0)
  const cancelled = days.reduce((s, d) => s + d.cancelled, 0)
  const best = days.reduce<DayStats | null>((b, d) => (!b || d.total > b.total ? d : b), null)
  const max = Math.max(1, ...days.map(d => d.total))
  const hoveredDay = hovered !== null ? days[hovered] : null

  return (
    <section ref={panelRef} className="skyline-panel relative overflow-hidden rounded-3xl" aria-labelledby="skyline-title">
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-6 p-6 sm:p-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-violet-300">Reservas por día</p>
          <h2 id="skyline-title" className="mt-2 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            <CountUp value={total} />
            <span className="ml-3 text-base font-normal text-slate-400">reservas · {periodLabel}</span>
          </h2>
        </div>
        <dl className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
          <div>
            <dt className="text-xs text-slate-400">Mejor día</dt>
            <dd className="mt-0.5 font-medium text-white">{best && best.total > 0 ? `${shortDate(best.key)} · ${best.total}` : '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Media diaria</dt>
            <dd className="mt-0.5 font-medium text-white tabular-nums">{days.length ? (total / days.length).toLocaleString('es-ES', { maximumFractionDigits: 1 }) : '0'}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">Canceladas</dt>
            <dd className="mt-0.5 font-medium text-white tabular-nums">{cancelled}</dd>
          </div>
          <div className="self-end">
            <button
              onClick={() => setShowTable(v => !v)}
              aria-pressed={showTable}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white"
            >
              {showTable ? <><BarChart3 size={13} /> Ver gráfico</> : <><Table2 size={13} /> Ver como tabla</>}
            </button>
          </div>
        </dl>
      </div>

      {showTable ? (
        <div className="relative z-10 max-h-80 overflow-y-auto px-6 pb-6 sm:px-8">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Reservas por día del periodo</caption>
            <thead className="sticky top-0 bg-[#141224] text-xs text-slate-400">
              <tr>
                <th className="py-2 font-medium">Día</th>
                <th className="py-2 text-right font-medium">Reservas</th>
                <th className="py-2 text-right font-medium">Confirmadas</th>
                <th className="py-2 text-right font-medium">Canceladas</th>
                <th className="py-2 text-right font-medium">Cobrado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05] tabular-nums">
              {days.map(d => (
                <tr key={d.key} className={d.key === todayKey ? 'text-violet-200' : 'text-slate-300'}>
                  <td className="py-2 capitalize">{longDate(d.key)}</td>
                  <td className="py-2 text-right text-white">{d.total}</td>
                  <td className="py-2 text-right">{d.confirmed}</td>
                  <td className="py-2 text-right">{d.cancelled}</td>
                  <td className="py-2 text-right">{formatPrice(d.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={plotRef} className="relative h-64 sm:h-72" onMouseLeave={() => handleHover(null, 0, 0)}>
          {loading && <div className="skeleton absolute inset-x-8 bottom-10 top-4" />}

          {/* Versión 2D: móvil, movimiento reducido, sin WebGL, y mientras carga la escena */}
          {!loading && (!can3D || !ready) && (
            <div className={cn('absolute inset-x-6 bottom-10 top-4 flex items-end gap-[2px] sm:inset-x-8', can3D && 'opacity-40')} aria-hidden>
              {days.map((d, i) => (
                <div
                  key={d.key}
                  className={cn('skyline-bar flex-1', d.key === todayKey && 'is-today', hovered === i && 'is-hover')}
                  style={{ height: `${Math.max(1.5, (d.total / max) * 100)}%`, '--i': i } as React.CSSProperties}
                  onMouseMove={e => !can3D && handleHover(i, e.clientX, e.clientY)}
                />
              ))}
            </div>
          )}

          {can3D && !loading && (
            <div className={cn('absolute inset-0 transition-opacity duration-500', ready ? 'opacity-100' : 'opacity-0')} aria-hidden>
              <Suspense fallback={null}>
                <StatsSkylineScene
                  days={days}
                  todayKey={todayKey}
                  hovered={hovered}
                  onHover={handleHover}
                  active={inView}
                  onReady={() => setReady(true)}
                />
              </Suspense>
            </div>
          )}

          {/* Fechas de los extremos */}
          {days.length > 0 && (
            <div className="pointer-events-none absolute inset-x-6 bottom-3 flex justify-between text-[11px] text-slate-500 sm:inset-x-8">
              <span>{shortDate(days[0].key)}</span>
              <span>Hoy</span>
            </div>
          )}

          {/* Tooltip con los valores exactos del día */}
          <div
            ref={tipRef}
            className={cn('chart-tooltip pointer-events-none absolute left-0 top-0 z-20 min-w-44 transition-opacity duration-150', hoveredDay ? 'opacity-100' : 'opacity-0')}
            role="status"
            aria-live="polite"
          >
            {hoveredDay && (
              <>
                <p className="mb-1.5 text-xs font-medium capitalize text-white">{longDate(hoveredDay.key)}</p>
                <dl className="space-y-0.5 text-xs tabular-nums">
                  <div className="flex justify-between gap-6"><dt className="text-slate-400">Reservas</dt><dd className="text-white">{hoveredDay.total}</dd></div>
                  <div className="flex justify-between gap-6"><dt className="text-slate-400">Confirmadas</dt><dd className="text-white">{hoveredDay.confirmed}</dd></div>
                  <div className="flex justify-between gap-6"><dt className="text-slate-400">Canceladas</dt><dd className="text-white">{hoveredDay.cancelled}</dd></div>
                  <div className="flex justify-between gap-6"><dt className="text-slate-400">Cobrado</dt><dd className="text-white">{formatPrice(hoveredDay.revenue)}</dd></div>
                </dl>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
