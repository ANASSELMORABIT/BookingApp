import { useState, useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { useQuery } from '@tanstack/react-query'
import { businessApi } from '@/api/business'
import { bookingsApi } from '@/api/bookings'
import { getBusinessConfig } from '@/lib/businessIcons'
import { ChevronLeft, ChevronRight, CalendarDays, Clock, User, Euro, StickyNote, CheckCircle2, Hourglass, XCircle, ListChecks } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import type { DatesSetArg, EventClickArg, EventContentArg } from '@fullcalendar/core'
import type { Booking } from '@/types'
import { BOOKING_STATUS, bookingStatus, formatPrice, formatTime, toLocalIsoDate } from '@/lib/labels'
import { PageHeader } from '@/components/app/PageHeader'
import { Segmented } from '@/components/app/Segmented'
import { StatusBadge } from '@/components/app/StatusBadge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type ViewId = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'
const VIEWS = [
  { id: 'dayGridMonth' as const, label: 'Mes' },
  { id: 'timeGridWeek' as const, label: 'Semana' },
  { id: 'timeGridDay' as const, label: 'Día' },
]

/** Contenido de cada reserva en el calendario: barra del color de su estado, hora, servicio y cliente. */
function EventChip({ event, timeText, view }: EventContentArg) {
  const b = event.extendedProps.booking as Booking
  const s = bookingStatus(b.status)
  const compact = view.type === 'dayGridMonth'
  return (
    <div
      className={cn('ev-chip', b.status === 'Cancelled' && 'is-cancelled', compact && 'is-compact')}
      style={{ '--c': s.color } as React.CSSProperties}
      title={`${timeText} · ${b.serviceName} · ${b.clientName} · ${s.label}`}
    >
      <span className="ev-time">{timeText}</span>
      <span className="ev-title">{b.serviceName}</span>
      {!compact && <span className="ev-sub">{b.clientName}</span>}
    </div>
  )
}

export function CalendarPage() {
  const calendarRef = useRef<FullCalendar>(null)
  const [currentTitle, setCurrentTitle] = useState('')
  const [range, setRange] = useState<{ start: Date; end: Date } | null>(null)
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all')
  const [selectedServiceId, setSelectedServiceId] = useState<string>('all')
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null)
  // En móvil la semana no cabe: se abre en vista de día
  const [view, setView] = useState<ViewId>(() => (window.innerWidth < 768 ? 'timeGridDay' : 'timeGridWeek'))
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)

  const { data: businesses } = useQuery({
    queryKey: ['businesses'],
    queryFn: businessApi.getAll,
  })

  const activeBusiness = selectedBusinessId
    ? businesses?.find(b => b.id === selectedBusinessId)
    : businesses?.[0]

  const { data: staff } = useQuery({
    queryKey: ['staff', activeBusiness?.id],
    queryFn: () => businessApi.getStaff(activeBusiness!.id),
    enabled: !!activeBusiness,
  })

  const { data: services } = useQuery({
    queryKey: ['services', activeBusiness?.id],
    queryFn: () => businessApi.getServices(activeBusiness!.id),
    enabled: !!activeBusiness,
  })

  const { user } = useAuth()
  const canSeeBusinessBookings = ['SuperAdmin', 'Owner', 'Staff'].includes(user?.role ?? '')

  // Reservas del negocio de los últimos 30 días y los próximos 60, en una sola petición
  const { data: bookings } = useQuery({
    queryKey: ['calendar-bookings', activeBusiness?.id, user?.role],
    queryFn: () => {
      if (!canSeeBusinessBookings) return bookingsApi.getMyBookings()
      const toIsoDate = (offsetDays: number) => {
        const d = new Date()
        d.setDate(d.getDate() + offsetDays)
        return toLocalIsoDate(d)
      }
      return bookingsApi.getByBusiness(activeBusiness!.id, toIsoDate(-30), toIsoDate(60))
    },
    enabled: !canSeeBusinessBookings || !!activeBusiness,
    // Siempre al día: al entrar, al volver a la pestaña y cada minuto (además del aviso en tiempo real)
    staleTime: 0,
    refetchInterval: 60_000,
  })

  const filtered = (bookings ?? [])
    .filter(b => selectedStaffId === 'all' || b.staffName === staff?.find(s => s.id === selectedStaffId)?.name)
    .filter(b => selectedServiceId === 'all' || b.serviceName === services?.find(s => s.id === selectedServiceId)?.name)

  const events = filtered.map(b => ({
    id: b.id,
    title: `${b.serviceName} — ${b.clientName}`,
    start: b.startTime,
    end: b.endTime,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    extendedProps: { booking: b },
  }))

  // Resumen de lo que se ve en pantalla (semana, día o mes actual)
  const visible = range
    ? filtered.filter(b => new Date(b.startTime) < range.end && new Date(b.endTime) > range.start)
    : []
  const summary = [
    { label: 'En pantalla', value: visible.length, icon: ListChecks, color: 'text-violet-300' },
    { label: 'Confirmadas', value: visible.filter(b => b.status === 'Confirmed').length, icon: CheckCircle2, color: 'text-emerald-300' },
    { label: 'Pendientes', value: visible.filter(b => b.status === 'Pending').length, icon: Hourglass, color: 'text-amber-300' },
    { label: 'Canceladas', value: visible.filter(b => b.status === 'Cancelled').length, icon: XCircle, color: 'text-rose-300' },
  ]

  const navigate = (action: 'prev' | 'next' | 'today') => {
    const api = calendarRef.current?.getApi()
    if (!api) return
    if (action === 'prev') api.prev()
    else if (action === 'next') api.next()
    else api.today()
  }

  const changeView = (v: ViewId) => {
    setView(v)
    calendarRef.current?.getApi().changeView(v)
  }

  const selectClass = 'h-9 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs text-slate-300 outline-none transition-colors hover:bg-white/[0.06] focus:border-violet-500'

  return (
    <div className="space-y-5 max-w-7xl">

      {/* Cabecera */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <PageHeader title="Calendario" subtitle="Todas las reservas de tu negocio" />

        {businesses && businesses.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Negocio">
            {businesses.map(b => {
              const config = getBusinessConfig(b.category)
              const isActive = (selectedBusinessId ?? businesses[0].id) === b.id
              return (
                <button
                  key={b.id}
                  onClick={() => setSelectedBusinessId(b.id)}
                  aria-pressed={isActive}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
                    isActive ? `${config.bg} ${config.border} ${config.color}` : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <config.icon size={12} /> {b.name}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Resumen de lo visible */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {summary.map((s, i) => (
          <div key={s.label} className="list-in glass-panel flex items-center gap-3 p-4" style={{ '--i': i } as React.CSSProperties}>
            <s.icon size={16} className={s.color} />
            <div>
              <p className="text-lg font-semibold text-white tabular-nums">{s.value}</p>
              <p className="text-xs text-slate-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Controles */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('prev')} aria-label="Anterior" className="cal-nav"><ChevronLeft size={16} /></button>
          <button onClick={() => navigate('today')} className="cal-nav !w-auto px-3 text-xs font-medium">Hoy</button>
          <button onClick={() => navigate('next')} aria-label="Siguiente" className="cal-nav"><ChevronRight size={16} /></button>
          <h2 key={currentTitle} className="cal-title ml-2 text-sm font-semibold capitalize text-white sm:text-base" aria-live="polite">{currentTitle}</h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select value={selectedStaffId} onChange={e => setSelectedStaffId(e.target.value)} aria-label="Filtrar por persona" className={selectClass}>
            <option value="all">Todo el equipo</option>
            {staff?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={selectedServiceId} onChange={e => setSelectedServiceId(e.target.value)} aria-label="Filtrar por servicio" className={selectClass}>
            <option value="all">Todos los servicios</option>
            {services?.filter(s => s.isActive).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <Segmented options={VIEWS} value={view} onChange={changeView} label="Vista del calendario" size="sm" />
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-4 flex-wrap" aria-label="Leyenda de estados">
        {Object.entries(BOOKING_STATUS).map(([status, s]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            <span className="text-xs text-slate-400">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Calendario */}
      <div className="calendar-dark glass-panel relative overflow-x-auto p-2 sm:p-4">
        {range && visible.length === 0 && (
          <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 mx-auto w-fit -translate-y-1/2 rounded-xl border border-white/10 bg-[#141224]/90 px-4 py-2.5 text-sm text-slate-300 backdrop-blur">
            No hay reservas {view === 'timeGridDay' ? 'este día' : view === 'timeGridWeek' ? 'esta semana' : 'este mes'}
          </div>
        )}
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={view}
          locale="es"
          firstDay={1}
          events={events}
          eventContent={arg => <EventChip {...arg} />}
          eventDisplay="block"
          headerToolbar={false}
          height="auto"
          slotMinTime="08:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={false}
          nowIndicator
          dayMaxEvents={3}
          moreLinkText={n => `+${n} más`}
          eventClick={(info: EventClickArg) => setSelectedBooking(info.event.extendedProps.booking as Booking)}
          datesSet={(info: DatesSetArg) => {
            setCurrentTitle(info.view.title)
            setRange({ start: info.start, end: info.end })
          }}
          slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        />
      </div>

      {/* Detalle de la reserva (diálogo accesible: Escape, foco atrapado) */}
      <Dialog open={!!selectedBooking} onOpenChange={open => { if (!open) setSelectedBooking(null) }}>
        <DialogContent className="app-dialog max-w-sm">
          {selectedBooking && (
            <>
              <DialogHeader>
                <div className="mb-1 flex items-center gap-2">
                  <StatusBadge status={selectedBooking.status} />
                  <StatusBadge status={selectedBooking.paymentStatus} kind="payment" />
                </div>
                <DialogTitle className="text-white">{selectedBooking.serviceName}</DialogTitle>
                <DialogDescription className="text-slate-400">con {selectedBooking.staffName}</DialogDescription>
              </DialogHeader>
              <dl className="mt-2 space-y-2">
                {[
                  { icon: User, label: 'Cliente', value: selectedBooking.clientName },
                  { icon: CalendarDays, label: 'Fecha', value: new Date(selectedBooking.startTime).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) },
                  { icon: Clock, label: 'Hora', value: `${formatTime(selectedBooking.startTime)} – ${formatTime(selectedBooking.endTime)}` },
                  { icon: Euro, label: 'Precio', value: formatPrice(selectedBooking.price) },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5">
                    <dt className="flex items-center gap-2 text-xs text-slate-400"><item.icon size={13} /> {item.label}</dt>
                    <dd className="text-right text-sm font-medium capitalize text-white">{item.value}</dd>
                  </div>
                ))}
              </dl>
              {selectedBooking.notes && (
                <div className="mt-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5">
                  <p className="flex items-center gap-2 text-xs text-slate-400"><StickyNote size={13} /> Notas</p>
                  <p className="mt-1 text-sm text-white">{selectedBooking.notes}</p>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
