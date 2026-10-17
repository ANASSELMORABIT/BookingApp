import { useState, useRef } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { useQuery } from '@tanstack/react-query'
import { businessApi } from '@/api/business'
import { bookingsApi } from '@/api/bookings'
import { getBusinessConfig } from '@/lib/businessIcons'
import { ChevronLeft, ChevronRight, Calendar, Scissors } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import type { DatesSetArg, EventClickArg } from '@fullcalendar/core'
import type { Booking } from '@/types'

const STATUS_COLORS: Record<string, string> = {
  Pending:   '#7C3AED',
  Confirmed: '#10B981',
  Cancelled: '#EF4444',
  Completed: '#3B82F6',
}

export function CalendarPage() {
  const calendarRef = useRef<FullCalendar>(null)
  const [currentTitle, setCurrentTitle] = useState('')
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all')
  const [selectedServiceId, setSelectedServiceId] = useState<string>('all')
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null)
  const [view, setView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'>('timeGridWeek')
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
        return d.toISOString().split('T')[0]
      }
      return bookingsApi.getByBusiness(activeBusiness!.id, toIsoDate(-30), toIsoDate(60))
    },
    enabled: !canSeeBusinessBookings || !!activeBusiness,
  })

  const events = (bookings ?? [])
    .filter(b => selectedStaffId === 'all' || b.staffName === staff?.find(s => s.id === selectedStaffId)?.name)
    .filter(b => selectedServiceId === 'all' || b.serviceName === services?.find(s => s.id === selectedServiceId)?.name)
    .map(b => ({
      id: b.id,
      title: `${b.serviceName} — ${b.clientName}`,
      start: b.startTime,
      end: b.endTime,
      backgroundColor: STATUS_COLORS[b.status] ?? '#7C3AED',
      borderColor: 'transparent',
      extendedProps: { booking: b },
    }))

  const navigate = (action: 'prev' | 'next' | 'today') => {
    const api = calendarRef.current?.getApi()
    if (!api) return
    if (action === 'prev') api.prev()
    else if (action === 'next') api.next()
    else api.today()
    setCurrentTitle(api.view.title)
  }

  const changeView = (v: typeof view) => {
    setView(v)
    calendarRef.current?.getApi().changeView(v)
    setTimeout(() => setCurrentTitle(calendarRef.current?.getApi().view.title ?? ''), 0)
  }

  return (
    <div className="space-y-4 max-w-7xl">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Calendario</h1>
          <p className="text-slate-400 mt-1 text-sm">Vista de todas las reservas</p>
        </div>

        {businesses && businesses.length > 1 && (
          <div className="flex items-center gap-2">
            {businesses.map(b => {
              const config = getBusinessConfig(b.category)
              const isActive = (selectedBusinessId ?? businesses[0].id) === b.id
              return (
                <button
                  key={b.id}
                  onClick={() => setSelectedBusinessId(b.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                    isActive
                      ? `${config.bg} ${config.border} ${config.color}`
                      : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <config.icon size={12} />
                  {b.name}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Controles */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('prev')}
            className="w-8 h-8 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center hover:bg-white/[0.07] transition-all"
          >
            <ChevronLeft size={16} className="text-slate-400" />
          </button>
          <button
            onClick={() => navigate('today')}
            className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 text-slate-400 text-xs font-medium hover:bg-white/[0.07] transition-all"
          >
            Hoy
          </button>
          <button
            onClick={() => navigate('next')}
            className="w-8 h-8 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center hover:bg-white/[0.07] transition-all"
          >
            <ChevronRight size={16} className="text-slate-400" />
          </button>
          <span className="text-white font-medium text-sm ml-2">{currentTitle}</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedStaffId}
            onChange={e => setSelectedStaffId(e.target.value)}
            className="bg-white/[0.03] border border-white/10 text-slate-300 text-xs rounded-xl px-3 py-2 outline-none focus:border-violet-500"
          >
            <option value="all">Todo el staff</option>
            {staff?.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <select
            value={selectedServiceId}
            onChange={e => setSelectedServiceId(e.target.value)}
            className="bg-white/[0.03] border border-white/10 text-slate-300 text-xs rounded-xl px-3 py-2 outline-none focus:border-violet-500"
          >
            <option value="all">Todos los servicios</option>
            {services?.filter(s => s.isActive).map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <div className="flex items-center gap-1 bg-white/[0.03] border border-white/10 rounded-xl p-1">
            {[
              { id: 'dayGridMonth', label: 'Mes' },
              { id: 'timeGridWeek', label: 'Semana' },
              { id: 'timeGridDay',  label: 'Día' },
            ].map(v => (
              <button
                key={v.id}
                onClick={() => changeView(v.id as typeof view)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  view === v.id
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex items-center gap-4 flex-wrap">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
            <span className="text-slate-500 text-xs">{status}</span>
          </div>
        ))}
      </div>

      {/* Calendario */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 backdrop-blur-sm calendar-dark">
        <style>{`
          .calendar-dark .fc {
            --fc-border-color: rgba(255,255,255,0.06);
            --fc-today-bg-color: rgba(124,58,237,0.08);
            --fc-page-bg-color: transparent;
            color: #94a3b8;
            font-size: 13px;
          }
          .calendar-dark .fc-toolbar { display: none !important; }
          .calendar-dark .fc-col-header-cell-cushion { color: #94a3b8; font-weight: 500; font-size: 12px; text-decoration: none; }
          .calendar-dark .fc-daygrid-day-number { color: #94a3b8; text-decoration: none; }
          .calendar-dark .fc-timegrid-slot-label { color: #64748b; font-size: 11px; }
          .calendar-dark .fc-event { border-radius: 6px; padding: 2px 6px; font-size: 12px; cursor: pointer; border: none !important; }
          .calendar-dark .fc-event-title { font-weight: 500; color: white; }
          .calendar-dark .fc-event-time { color: rgba(255,255,255,0.7); font-size: 11px; }
          .calendar-dark .fc-now-indicator-line { border-color: #7C3AED; }
          .calendar-dark .fc-scrollgrid { border-color: rgba(255,255,255,0.06) !important; }
          .calendar-dark .fc-scrollgrid td,
          .calendar-dark .fc-scrollgrid th { border-color: rgba(255,255,255,0.06) !important; }
          .calendar-dark .fc-daygrid-day:hover { background: rgba(255,255,255,0.02); }
          .calendar-dark a { color: inherit; text-decoration: none; }
        `}</style>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={view}
          locale="es"
          events={events}
          headerToolbar={false}
          height="auto"
          slotMinTime="08:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={false}
          nowIndicator={true}
          eventClick={(info: EventClickArg) => {
            setSelectedBooking(info.event.extendedProps.booking as Booking)
          }}
          datesSet={(info: DatesSetArg) => setCurrentTitle(info.view.title)}
          slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
        />
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total',       value: events.length,                                                          color: 'text-violet-400' },
          { label: 'Confirmadas', value: events.filter(e => e.extendedProps.booking.status === 'Confirmed').length, color: 'text-emerald-400' },
          { label: 'Pendientes',  value: events.filter(e => e.extendedProps.booking.status === 'Pending').length,   color: 'text-amber-400'  },
          { label: 'Canceladas',  value: events.filter(e => e.extendedProps.booking.status === 'Cancelled').length, color: 'text-rose-400'   },
        ].map(stat => (
          <div key={stat.label} className="bg-white/[0.03] border border-white/10 rounded-xl p-4 flex items-center gap-3">
            <Calendar size={16} className={stat.color} />
            <div>
              <p className="text-white font-bold text-lg">{stat.value}</p>
              <p className="text-slate-500 text-xs">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>


        {/* Modal detalle de reserva */}
        {selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedBooking(null)} />
            <div className="relative bg-[#0d0d14] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-violet-500/20 border border-violet-500/20 rounded-xl flex items-center justify-center">
                    <Scissors size={18} className="text-violet-400" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">{selectedBooking.serviceName}</p>
                    <p className="text-slate-500 text-xs">{selectedBooking.staffName}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                >
                  <span className="text-slate-400 text-sm">✕</span>
                </button>
              </div>

              <div className="space-y-3">
                {[
                  { label: 'Cliente',  value: selectedBooking.clientName },
                  { label: 'Fecha',    value: new Date(selectedBooking.startTime).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) },
                  { label: 'Hora',     value: `${new Date(selectedBooking.startTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${new Date(selectedBooking.endTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}` },
                  { label: 'Precio',   value: `${selectedBooking.price?.toFixed(2)}€` },
                  { label: 'Estado',   value: selectedBooking.status },
                  { label: 'Pago',     value: selectedBooking.paymentStatus },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                    <span className="text-slate-500 text-xs">{item.label}</span>
                    <span className={`text-xs font-medium ${
                      item.label === 'Estado' ? (
                        selectedBooking.status === 'Confirmed'  ? 'text-emerald-400' :
                        selectedBooking.status === 'Cancelled'  ? 'text-rose-400' :
                        selectedBooking.status === 'Completed'  ? 'text-blue-400' :
                        'text-amber-400'
                      ) : 'text-white'
                    }`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>

              {selectedBooking.notes && (
                <div className="mt-3 p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                  <p className="text-slate-500 text-xs mb-1">Notas</p>
                  <p className="text-white text-xs">{selectedBooking.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}


    </div>
  )
}