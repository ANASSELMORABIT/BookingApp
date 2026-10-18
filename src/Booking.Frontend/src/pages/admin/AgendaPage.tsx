import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { AlertTriangle, CalendarDays, Clock, DoorOpen, Euro, Hourglass, ListChecks, Search, Sparkles, User } from 'lucide-react'
import { businessApi } from '@/api/business'
import { bookingsApi } from '@/api/bookings'
import { getBusinessConfig } from '@/lib/businessIcons'
import { BOOKING_STATUS, formatPrice, formatTime, toLocalIsoDate } from '@/lib/labels'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/app/PageHeader'
import { PageLoader } from '@/components/app/PageLoader'
import { EmptyState } from '@/components/app/EmptyState'
import { StatusBadge } from '@/components/app/StatusBadge'
import { Segmented } from '@/components/app/Segmented'
import { CountUp } from '@/components/app/CountUp'
import { DateBlock } from '@/components/app/DateBlock'
import type { Booking } from '@/types'

const RANGES = [
  { id: 'today', label: 'Hoy', days: 0 },
  { id: 'week', label: '7 días', days: 6 },
  { id: 'month', label: '30 días', days: 29 },
] as const
type RangeId = typeof RANGES[number]['id']

/** Cada cuánto se actualiza la hora para "En curso", "Siguiente" y la cuenta atrás (ms). */
const CLOCK_TICK_MS = 30_000

function dayLabel(dateKey: string): string {
  const today = toLocalIsoDate(new Date())
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (dateKey === today) return 'Hoy'
  if (dateKey === toLocalIsoDate(tomorrow)) return 'Mañana'
  const label = new Date(`${dateKey}T00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/** "dentro de 25 min", "dentro de 2 h 10 min", "mañana a las 10:00"… */
function countdown(fromMs: number, toIso: string): string {
  const diff = Math.max(0, new Date(toIso).getTime() - fromMs)
  const mins = Math.round(diff / 60_000)
  if (mins < 1) return 'ahora mismo'
  if (mins < 60) return `dentro de ${mins} min`
  if (mins < 24 * 60) {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `dentro de ${h} h${m ? ` ${m} min` : ''}`
  }
  return `${dayLabel(toLocalIsoDate(new Date(toIso))).toLowerCase()} a las ${formatTime(toIso)}`
}

/** Se puede marcar la llegada desde 2 h antes hasta el final de la cita, si sigue activa. */
const canMarkArrival = (b: Booking, now: number) =>
  (b.status === 'Pending' || b.status === 'Confirmed') && !b.arrivedAt &&
  now >= new Date(b.startTime).getTime() - 2 * 3600_000 && now < new Date(b.endTime).getTime()

function ArrivalControl({ booking, now, onArrive, pending }: {
  booking: Booking
  now: number
  onArrive: (id: string) => void
  pending: boolean
}) {
  if (booking.arrivedAt)
    return (
      <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
        <DoorOpen size={12} /> Llegó a las {formatTime(booking.arrivedAt)}
      </span>
    )
  if (!canMarkArrival(booking, now)) return null
  return (
    <button
      onClick={() => onArrive(booking.id)}
      disabled={pending}
      className="arrive-btn flex h-8 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-white disabled:opacity-60"
    >
      <DoorOpen size={13} /> {pending ? 'Marcando…' : 'Ha llegado'}
    </button>
  )
}

/** Tarjeta "Ahora": la cita en curso con su progreso, o la próxima con cuenta atrás. */
function NowCard({ current, next, now, onArrive, arriving }: {
  current?: Booking; next?: Booking; now: number; onArrive: (id: string) => void; arriving: string | null
}) {
  const b = current ?? next
  if (!b) {
    return (
      <div className="agenda-now relative overflow-hidden rounded-3xl p-6">
        <div className="relative z-10 flex items-center gap-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.06]"><Sparkles size={18} className="text-violet-300" /></span>
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-violet-300">Ahora</p>
            <p className="mt-1 text-lg font-semibold text-white">No hay más citas en este periodo</p>
          </div>
        </div>
      </div>
    )
  }
  const start = new Date(b.startTime).getTime()
  const end = new Date(b.endTime).getTime()
  const progress = current ? Math.min(1, Math.max(0, (now - start) / (end - start))) : 0
  const leftMin = Math.max(0, Math.round((end - now) / 60_000))

  return (
    <div className={cn('agenda-now relative overflow-hidden rounded-3xl p-6 sm:p-7', current && 'is-live')}>
      <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 min-w-0">
          <DateBlock iso={b.startTime} highlight />
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest">
              {current
                ? <><span className="live-dot" aria-hidden /> <span className="text-emerald-300">En curso</span></>
                : <span className="text-violet-300">Próxima cita</span>}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">
              <span className="truncate">{b.clientName}</span>
              {b.clientFlagged && (
                <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium tracking-normal text-amber-300">
                  <AlertTriangle size={11} /> Cliente con aviso
                </span>
              )}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-slate-400">
              <span>{b.serviceName}</span>
              <span className="flex items-center gap-1"><User size={12} /> {b.staffName}</span>
              <span className="flex items-center gap-1 tabular-nums"><Clock size={12} /> {formatTime(b.startTime)} – {formatTime(b.endTime)}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:items-end sm:text-right">
          <ArrivalControl booking={b} now={now} onArrive={onArrive} pending={arriving === b.id} />
          <p className="text-2xl font-semibold tracking-tight text-white sm:text-3xl" aria-live="polite">
            {current ? `${leftMin} min` : countdown(now, b.startTime).replace('dentro de ', '')}
          </p>
          <p className="text-xs text-slate-400">{current ? 'para terminar' : countdown(now, b.startTime).startsWith('dentro') ? 'para empezar' : ''}</p>
        </div>
      </div>
      {current && (
        <div className="relative z-10 mt-5">
          <div className="agenda-progress" role="progressbar" aria-label="Progreso de la cita" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
            <span style={{ '--p': progress } as React.CSSProperties} />
          </div>
        </div>
      )}
    </div>
  )
}

/** Agenda del negocio: reservas de hoy y de los próximos días como línea de tiempo, con filtros. */
export function AgendaPage() {
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [range, setRange] = useState<RangeId>('week')
  const [status, setStatus] = useState<string>('all')
  const [staffName, setStaffName] = useState<string>('all')
  const [search, setSearch] = useState('')

  // Hora actual, refrescada cada 30 s (En curso, Siguiente y cuenta atrás)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), CLOCK_TICK_MS)
    return () => window.clearInterval(id)
  }, [])

  const queryClient = useQueryClient()
  const arrive = useMutation({
    mutationFn: (id: string) => bookingsApi.markArrived(id),
    onSuccess: (b) => {
      queryClient.invalidateQueries({ queryKey: ['agenda'] })
      queryClient.invalidateQueries({ queryKey: ['business-bookings'] })
      queryClient.invalidateQueries({ queryKey: ['calendar-bookings'] })
      toast.success(`${b.clientName} ha llegado`)
    },
    onError: (err) => toast.error(
      (isAxiosError<{ message?: string }>(err) && err.response?.data?.message) || 'No se pudo marcar la llegada.'),
  })
  const arriving = arrive.isPending ? (arrive.variables ?? null) : null

  const { data: businesses, isLoading: bizLoading } = useQuery({
    queryKey: ['businesses'],
    queryFn: businessApi.getAll,
  })
  const business = businessId ? businesses?.find(b => b.id === businessId) : businesses?.[0]

  const { from, to } = useMemo(() => {
    const start = new Date()
    const end = new Date()
    end.setDate(end.getDate() + (RANGES.find(r => r.id === range)?.days ?? 0))
    return { from: toLocalIsoDate(start), to: toLocalIsoDate(end) }
  }, [range])

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['agenda', business?.id, from, to],
    queryFn: () => bookingsApi.getByBusiness(business!.id, from, to),
    enabled: !!business,
    staleTime: 0,
    refetchInterval: 60_000,
  })

  const staffNames = useMemo(
    () => [...new Set((bookings ?? []).map(b => b.staffName))].sort(),
    [bookings]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (bookings ?? [])
      .filter(b => status === 'all' || b.status === status)
      .filter(b => staffName === 'all' || b.staffName === staffName)
      .filter(b => !q || b.clientName.toLowerCase().includes(q) || b.serviceName.toLowerCase().includes(q))
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }, [bookings, status, staffName, search])

  const groups = useMemo(() => {
    const map = new Map<string, Booking[]>()
    for (const b of filtered) {
      const key = toLocalIsoDate(new Date(b.startTime))
      map.set(key, [...(map.get(key) ?? []), b])
    }
    return [...map.entries()]
  }, [filtered])

  const active = (bookings ?? []).filter(b => b.status !== 'Cancelled' && b.status !== 'NoShow')
  const current = active.find(b => new Date(b.startTime).getTime() <= now && now < new Date(b.endTime).getTime())
  const nextBooking = active
    .filter(b => new Date(b.startTime).getTime() > now)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))[0]

  const summary = [
    { label: 'Reservas', value: active.length, kind: 'int' as const, icon: ListChecks, color: 'text-violet-300', glow: 'rgb(139 92 246 / 0.3)' },
    { label: 'Pendientes', value: active.filter(b => b.status === 'Pending').length, kind: 'int' as const, icon: Hourglass, color: 'text-amber-300', glow: 'rgb(245 158 11 / 0.25)' },
    { label: 'Confirmadas', value: active.filter(b => b.status === 'Confirmed').length, kind: 'int' as const, icon: CalendarDays, color: 'text-emerald-300', glow: 'rgb(16 185 129 / 0.25)' },
    { label: 'Ingresos previstos', value: active.reduce((sum, b) => sum + b.price, 0), kind: 'eur' as const, icon: Euro, color: 'text-blue-300', glow: 'rgb(59 130 246 / 0.25)' },
  ]

  const statusOptions = [{ id: 'all', label: 'Todas', color: '#a78bfa' }, ...Object.entries(BOOKING_STATUS).map(([id, s]) => ({ id, label: s.label, color: s.color }))]

  if (bizLoading) return <PageLoader label="Cargando agenda…" />

  if (!businesses?.length) return (
    <div className="space-y-6">
      <PageHeader title="Agenda" subtitle="Las reservas de tu negocio, día a día" />
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02]">
        <EmptyState
          icon={ListChecks}
          title="Primero crea un negocio"
          text="La agenda muestra las reservas de tus negocios. Crea uno para empezar."
          action={<Link to="/business" className="btn-primary !h-10 text-sm">Ir a Negocios</Link>}
        />
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader
          title="Agenda"
          subtitle={new Date(now).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, c => c.toUpperCase())}
        />
        <Segmented options={RANGES} value={range} onChange={setRange} label="Periodo" size="sm" />
      </div>

      {businesses.length > 1 && (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Negocio">
          {businesses.map(b => {
            const config = getBusinessConfig(b.category)
            const isActive = business?.id === b.id
            return (
              <button
                key={b.id}
                onClick={() => setBusinessId(b.id)}
                aria-pressed={isActive}
                className={cn('flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors',
                  isActive ? `${config.bg} ${config.border} ${config.color}` : 'border-white/10 bg-white/[0.03] text-slate-400 hover:text-white')}
              >
                <config.icon size={12} /> {b.name}
              </button>
            )
          })}
        </div>
      )}

      {/* Ahora: cita en curso o la siguiente */}
      {isLoading ? <div className="skeleton h-32 !rounded-3xl" /> : <NowCard current={current} next={nextBooking} now={now} onArrive={id => arrive.mutate(id)} arriving={arriving} />}

      {/* Resumen del periodo */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summary.map((s, i) => (
          <div key={s.label} className="list-in glass-panel relative overflow-hidden p-4" style={{ '--i': i } as React.CSSProperties}>
            <span className="kpi-glow" style={{ '--glow': s.glow } as React.CSSProperties} aria-hidden />
            <s.icon size={16} className={s.color} />
            <p className="mt-3 text-2xl font-semibold tracking-tight text-white"><CountUp value={s.value} kind={s.kind} /></p>
            <p className="text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Estado">
          {statusOptions.map(s => (
            <button
              key={s.id}
              onClick={() => setStatus(s.id)}
              aria-pressed={status === s.id}
              className={cn('status-chip flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium',
                status === s.id ? 'is-on border-white/20 text-white' : 'border-white/10 text-slate-400 hover:text-white')}
              style={{ '--c': s.color } as React.CSSProperties}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} aria-hidden />
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="profile-field relative block">
            <span className="sr-only">Buscar por cliente o servicio</span>
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar cliente o servicio"
              className="h-9 w-56 rounded-xl bg-transparent pl-9 pr-3 text-xs text-white outline-none placeholder:text-slate-500"
            />
          </label>
          <select
            value={staffName}
            onChange={e => setStaffName(e.target.value)}
            aria-label="Filtrar por persona del equipo"
            className="h-9 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs text-slate-300 outline-none transition-colors hover:bg-white/[0.06] focus:border-violet-500"
          >
            <option value="all">Todo el equipo</option>
            {staffNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {/* Línea de tiempo por días */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton h-20" />)}
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          <EmptyState
            icon={CalendarDays}
            title={bookings?.length ? 'Ninguna reserva coincide con los filtros' : 'Sin reservas en este periodo'}
            text={bookings?.length ? 'Prueba a quitar algún filtro o a cambiar la búsqueda.' : 'Comparte tu página pública para que tus clientes reserven.'}
            action={!bookings?.length && <Link to="/share" className="btn-ghost !h-10 text-sm">Compartir mi página</Link>}
          />
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(([day, items]) => (
            <section key={day} aria-label={dayLabel(day)}>
              <div className="agenda-day-head sticky top-14 z-20 -mx-2 mb-3 flex items-center justify-between rounded-xl px-2 py-2 lg:top-0">
                <h2 className="text-sm font-semibold text-white">{dayLabel(day)}</h2>
                <span className="text-xs text-slate-400">{items.length} {items.length === 1 ? 'reserva' : 'reservas'}</span>
              </div>
              <ol className="agenda-timeline relative space-y-2.5">
                {items.map((b, i) => {
                  const start = new Date(b.startTime).getTime()
                  const end = new Date(b.endTime).getTime()
                  const live = start <= now && now < end && b.status !== 'Cancelled'
                  const isNext = nextBooking?.id === b.id
                  const past = end <= now
                  const color = BOOKING_STATUS[b.status]?.color ?? '#94a3b8'
                  return (
                    <li
                      key={b.id}
                      style={{ '--i': i, '--c': color } as React.CSSProperties}
                      className={cn('list-in relative grid grid-cols-[3.5rem_1fr] gap-4 sm:grid-cols-[4.5rem_1fr]', (past || b.status === 'Cancelled' || b.status === 'NoShow') && 'is-past')}
                    >
                      <div className="pt-3 text-right">
                        <p className="text-sm font-semibold text-white tabular-nums">{formatTime(b.startTime)}</p>
                        <p className="text-[11px] text-slate-500 tabular-nums">{formatTime(b.endTime)}</p>
                      </div>
                      <div className="relative">
                        <span className={cn('timeline-dot', live && 'is-live', isNext && 'is-next')} aria-hidden />
                        <div className={cn(
                          'lift-card agenda-card flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center',
                          live ? 'border-emerald-500/35' : isNext ? 'border-violet-500/35' : 'border-white/[0.07]'
                        )}>
                          <div className="min-w-0 flex-1">
                            <p className="flex flex-wrap items-center gap-2 font-medium text-white">
                              <span className="truncate">{b.clientName}</span>
                              {b.clientFlagged && (
                                <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-300" title="No se presentó a alguna cita anterior">
                                  <AlertTriangle size={11} /> Cliente con aviso
                                </span>
                              )}
                            </p>
                            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
                              <span>{b.serviceName}</span>
                              <span className="flex items-center gap-1"><User size={11} /> {b.staffName}</span>
                              {b.extras.length > 0 && (
                                <span className="flex items-center gap-1 text-violet-300"><Sparkles size={11} /> {b.extras.map(e => e.name).join(' · ')}</span>
                              )}
                              {b.notes && <span className="truncate">📝 {b.notes}</span>}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 sm:justify-end">
                            <ArrivalControl booking={b} now={now} onArrive={id => arrive.mutate(id)} pending={arriving === b.id} />
                            {live && !b.arrivedAt && <span className="text-[11px] font-medium text-emerald-300">En curso</span>}
                            {!live && isNext && <span className="text-[11px] font-medium text-violet-300">{countdown(now, b.startTime)}</span>}
                            <span className="text-sm font-medium text-white tabular-nums">{formatPrice(b.price)}</span>
                            <StatusBadge status={b.status} />
                          </div>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
