import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Clock, Euro, ListChecks, Search, User } from 'lucide-react'
import { businessApi } from '@/api/business'
import { bookingsApi } from '@/api/bookings'
import { getBusinessConfig } from '@/lib/businessIcons'
import { BOOKING_STATUS, formatPrice, formatTime, toLocalIsoDate } from '@/lib/labels'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/app/PageHeader'
import { PageLoader } from '@/components/app/PageLoader'
import { EmptyState } from '@/components/app/EmptyState'
import { StatusBadge } from '@/components/app/StatusBadge'
import type { Booking } from '@/types'

const RANGES = [
  { id: 'today', label: 'Hoy', days: 0 },
  { id: 'week', label: '7 días', days: 6 },
  { id: 'month', label: '30 días', days: 29 },
] as const
type RangeId = typeof RANGES[number]['id']

function dayLabel(dateKey: string): string {
  const today = toLocalIsoDate(new Date())
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (dateKey === today) return 'Hoy'
  if (dateKey === toLocalIsoDate(tomorrow)) return 'Mañana'
  const label = new Date(`${dateKey}T00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/** Agenda del negocio: reservas de hoy y de los próximos días, agrupadas por día y con filtros. */
export function AgendaPage() {
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [range, setRange] = useState<RangeId>('week')
  const [status, setStatus] = useState<string>('all')
  const [staffName, setStaffName] = useState<string>('all')
  const [search, setSearch] = useState('')

  // Hora actual, refrescada cada minuto (marca "En curso" y "Siguiente")
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

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

  const active = (bookings ?? []).filter(b => b.status !== 'Cancelled')
  const nextBooking = active
    .filter(b => new Date(b.startTime).getTime() > now)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))[0]

  const summary = [
    { label: 'Reservas', value: active.length, icon: ListChecks, color: 'text-violet-300' },
    { label: 'Pendientes', value: active.filter(b => b.status === 'Pending').length, icon: Clock, color: 'text-amber-300' },
    { label: 'Confirmadas', value: active.filter(b => b.status === 'Confirmed').length, icon: CalendarDays, color: 'text-emerald-300' },
    { label: 'Ingresos previstos', value: formatPrice(active.reduce((sum, b) => sum + b.price, 0)), icon: Euro, color: 'text-blue-300' },
  ]

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
      <PageHeader
        title="Agenda"
        subtitle={nextBooking
          ? <>Próxima cita: <span className="text-white">{nextBooking.clientName}</span> · {nextBooking.serviceName} · {dayLabel(toLocalIsoDate(new Date(nextBooking.startTime))).toLowerCase()} a las {formatTime(nextBooking.startTime)}</>
          : 'Las reservas de tu negocio, día a día'}
        actions={
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1" role="group" aria-label="Periodo">
            {RANGES.map(r => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                aria-pressed={range === r.id}
                className={cn('rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  range === r.id ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white')}
              >
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      {businesses.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
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

      {/* Resumen del periodo */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summary.map(s => (
          <div key={s.label} className="stat-card rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <s.icon size={16} className={s.color} />
            <p className="mt-3 text-2xl font-semibold tracking-tight text-white tabular-nums">{s.value}</p>
            <p className="text-xs text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Estado">
          {[{ id: 'all', label: 'Todas' }, ...Object.entries(BOOKING_STATUS).map(([id, s]) => ({ id, label: s.label }))].map(s => (
            <button
              key={s.id}
              onClick={() => setStatus(s.id)}
              aria-pressed={status === s.id}
              className={cn('rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                status === s.id ? 'border-violet-500/40 bg-violet-600/20 text-violet-200' : 'border-white/10 text-slate-400 hover:text-white')}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <span className="sr-only">Buscar por cliente o servicio</span>
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar cliente o servicio"
              className="h-9 w-56 rounded-xl border border-white/10 bg-white/[0.03] pl-9 pr-3 text-xs text-white outline-none placeholder:text-slate-500 focus:border-violet-500"
            />
          </label>
          <select
            value={staffName}
            onChange={e => setStaffName(e.target.value)}
            aria-label="Filtrar por persona del equipo"
            className="h-9 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs text-slate-300 outline-none focus:border-violet-500"
          >
            <option value="all">Todo el equipo</option>
            {staffNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {/* Lista agrupada por día */}
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
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-sm font-semibold text-white">{dayLabel(day)}</h2>
                <span className="text-xs text-slate-500">{items.length} {items.length === 1 ? 'reserva' : 'reservas'}</span>
              </div>
              <ol className="space-y-2">
                {items.map(b => {
                  const start = new Date(b.startTime).getTime()
                  const end = new Date(b.endTime).getTime()
                  const inProgress = start <= now && now < end && b.status !== 'Cancelled'
                  const isNext = nextBooking?.id === b.id
                  return (
                    <li
                      key={b.id}
                      className={cn(
                        'flex flex-col gap-3 rounded-2xl border bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.05] sm:flex-row sm:items-center',
                        inProgress ? 'border-emerald-500/30' : isNext ? 'border-violet-500/30' : 'border-white/[0.07]',
                        b.status === 'Cancelled' && 'opacity-60'
                      )}
                    >
                      <div className="flex w-28 flex-shrink-0 items-center gap-2 sm:flex-col sm:items-start sm:gap-0">
                        <span className="text-base font-semibold text-white tabular-nums">{formatTime(b.startTime)}</span>
                        <span className="text-xs text-slate-500 tabular-nums">hasta {formatTime(b.endTime)}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-white">{b.clientName}</p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
                          <span>{b.serviceName}</span>
                          <span className="flex items-center gap-1"><User size={11} /> {b.staffName}</span>
                          {b.notes && <span className="truncate">📝 {b.notes}</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 sm:justify-end">
                        {inProgress && <span className="text-[11px] font-medium text-emerald-300">● En curso</span>}
                        {!inProgress && isNext && <span className="text-[11px] font-medium text-violet-300">Siguiente</span>}
                        <span className="text-sm font-medium text-white tabular-nums">{formatPrice(b.price)}</span>
                        <StatusBadge status={b.status} />
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
