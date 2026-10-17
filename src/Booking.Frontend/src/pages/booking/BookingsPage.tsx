import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bookingsApi } from '@/api/bookings'
import { businessApi } from '@/api/business'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Calendar, Clock, User, XCircle, Plus, CheckCircle, Search } from 'lucide-react'
import { Segmented } from '@/components/app/Segmented'
import { DateBlock } from '@/components/app/DateBlock'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { PageHeader } from '@/components/app/PageHeader'
import { PageLoader } from '@/components/app/PageLoader'
import { EmptyState } from '@/components/app/EmptyState'
import { StatusBadge } from '@/components/app/StatusBadge'
import { ConfirmDialog } from '@/components/app/ConfirmDialog'
import { formatPrice, formatTime, toLocalIsoDate } from '@/lib/labels'
import { useAuth } from '@/context/AuthContext'
import type { Booking, TimeSlot } from '@/types'

const apiMessage = (err: unknown, fallback: string) =>
  (isAxiosError<{ message?: string }>(err) && err.response?.data?.message) || fallback

export function BookingsPage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [notes, setNotes] = useState('')
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null)

  const { data: myBookings, isLoading } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: bookingsApi.getMyBookings,
  })

  const { data: businesses } = useQuery({
    queryKey: ['businesses'],
    queryFn: businessApi.getAll,
  })

  const firstBusiness = businesses?.[0]

  const { data: services } = useQuery({
    queryKey: ['services', firstBusiness?.id],
    queryFn: () => businessApi.getServices(firstBusiness!.id),
    enabled: !!firstBusiness,
  })

  const { data: staff } = useQuery({
    queryKey: ['staff', firstBusiness?.id],
    queryFn: () => businessApi.getStaff(firstBusiness!.id),
    enabled: !!firstBusiness,
  })

  const { data: slots } = useQuery({
    queryKey: ['availability', selectedServiceId, selectedStaffId, selectedDate],
    queryFn: () => bookingsApi.getAvailability(selectedServiceId, selectedStaffId, selectedDate),
    enabled: !!selectedServiceId && !!selectedStaffId && !!selectedDate,
    // La disponibilidad cambia con cada reserva: nunca se reutiliza una copia antigua
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
  })

 const createMutation = useMutation({
      mutationFn: () => bookingsApi.create({
        serviceId: selectedServiceId,
        staffId: selectedStaffId,
        startTime: selectedSlot!.startTime,
        notes: notes || undefined,
      }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['my-bookings'] })
        queryClient.invalidateQueries({ queryKey: ['availability'] })
        queryClient.invalidateQueries({ queryKey: ['calendar-bookings'] })
        queryClient.invalidateQueries({ queryKey: ['business-bookings'] })
        queryClient.invalidateQueries({ queryKey: ['agenda'] })
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        queryClient.invalidateQueries({ queryKey: ['bookings-period'] })
        setShowBookingModal(false)
        setStep(1)
        setSelectedServiceId('')
        setSelectedStaffId('')
        setSelectedDate('')
        setSelectedSlot(null)
        setNotes('')
        toast.success('Reserva creada')
      },
      onError: (err) => toast.error(apiMessage(err, 'No se pudo crear la reserva. Inténtalo de nuevo.')),
    })
  const cancelMutation = useMutation({
      mutationFn: (id: string) => bookingsApi.cancel(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['my-bookings'] })
        queryClient.invalidateQueries({ queryKey: ['availability'] })
        queryClient.invalidateQueries({ queryKey: ['business-bookings'] })
        queryClient.invalidateQueries({ queryKey: ['calendar-bookings'] })
        queryClient.invalidateQueries({ queryKey: ['agenda'] })
        setCancelTarget(null)
        toast.success('Reserva cancelada')
      },
      onError: (err) => toast.error(apiMessage(err, 'No se pudo cancelar la reserva.')),
  })

  // El equipo del negocio ve también las reservas de sus clientes (incluidas las de la página pública)
  const isTeam = ['Owner', 'Staff', 'SuperAdmin'].includes(user?.role ?? '')
  const [view, setView] = useState<'business' | 'mine'>(isTeam ? 'business' : 'mine')
  const [search, setSearch] = useState('')

  const { data: businessBookings, isLoading: businessLoading } = useQuery({
    queryKey: ['business-bookings', businesses?.map(b => b.id).join(',')],
    queryFn: async () => {
      const from = new Date()
      from.setDate(from.getDate() - 30)
      const to = new Date()
      to.setDate(to.getDate() + 90)
      const lists = await Promise.all(businesses!.map(b =>
        bookingsApi.getByBusiness(b.id, toLocalIsoDate(from), toLocalIsoDate(to))))
      return lists.flat()
    },
    enabled: isTeam && !!businesses?.length,
    staleTime: 0,
    refetchInterval: 60_000,
  })

  if (isLoading || (view === 'business' && businessLoading)) return <PageLoader label="Cargando reservas…" cards={0} />

  const nowIso = new Date().toISOString()
  const todayKey = toLocalIsoDate(new Date())
  const all = view === 'business' ? (businessBookings ?? []) : (myBookings ?? [])
  const q = search.trim().toLowerCase()
  const source = q
    ? all.filter(b => [b.clientName, b.serviceName, b.staffName].some(v => v.toLowerCase().includes(q)))
    : all
  // Próximas primero (la más cercana arriba) y después las anteriores (la más reciente arriba)
  const upcoming = source.filter(b => b.endTime >= nowIso).sort((a, b) => a.startTime.localeCompare(b.startTime))
  const past = source.filter(b => b.endTime < nowIso).sort((a, b) => b.startTime.localeCompare(a.startTime))
  const sections = view === 'business'
    ? [{ title: 'Próximas', items: upcoming }, { title: 'Anteriores', items: past }]
    : [{ title: '', items: [...upcoming, ...past] }]

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title={isTeam ? 'Reservas' : 'Mis reservas'}
        subtitle={view === 'business'
          ? `${upcoming.length} próximas · últimos 30 días y próximos 90 de tus negocios`
          : `${myBookings?.length ?? 0} reservas en total`}
        actions={
          <Button
            onClick={() => setShowBookingModal(true)}
            className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl px-4 h-10 flex items-center gap-2 shadow-lg shadow-violet-600/20"
          >
            <Plus size={16} /> Nueva reserva
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {isTeam ? (
          <Segmented
            asTabs
            label="Qué reservas ver"
            value={view}
            onChange={setView}
            options={[
              { id: 'business', label: 'Del negocio', count: businessBookings?.length },
              { id: 'mine', label: 'Mías', count: myBookings?.length },
            ]}
          />
        ) : <span />}
        {all.length > 0 && (
          <label className="profile-field relative block sm:w-72">
            <span className="sr-only">Buscar reservas</span>
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={view === 'business' ? 'Buscar cliente, servicio o persona' : 'Buscar servicio o persona'}
              className="h-10 w-full rounded-xl bg-transparent pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-500"
            />
          </label>
        )}
      </div>

      {/* Bookings list */}
      <div className="space-y-8">
        {sections.filter(s => s.items.length > 0).map(section => (
        <section key={section.title || 'all'} className="space-y-3">
        {section.title && (
          <h2 className="text-sm font-semibold text-white">
            {section.title} <span className="font-normal text-slate-500">· {section.items.length}</span>
          </h2>
        )}
        {section.items.map((b, i) => (
          <div
            key={b.id}
            style={{ '--i': i } as React.CSSProperties}
            className={`list-in lift-card bg-white/[0.03] border border-white/10 rounded-2xl p-4 sm:p-5 hover:border-white/20 hover:bg-white/[0.045] ${b.status === 'Cancelled' ? 'opacity-60' : ''}`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4 min-w-0">
                <DateBlock iso={b.startTime} highlight={toLocalIsoDate(new Date(b.startTime)) === todayKey} />
                <div className="min-w-0">
                  <p className="text-white font-semibold truncate">{b.serviceName}</p>
                  {view === 'business' && (
                    <p className="text-slate-300 text-sm truncate">{b.clientName}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                    <span className="flex items-center gap-1 text-slate-400 text-xs tabular-nums">
                      <Clock size={11} /> {formatTime(b.startTime)} – {formatTime(b.endTime)}
                    </span>
                    <span className="flex items-center gap-1 text-slate-400 text-xs">
                      <User size={11} /> {b.staffName}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
                  <p className="text-white font-semibold">{formatPrice(b.price)}</p>
                  <StatusBadge status={b.status} />
                </div>
                {/* Solo quien hizo la reserva puede cancelarla (regla del backend) */}
                {view === 'mine' && (b.status === 'Pending' || b.status === 'Confirmed') ? (
                  <button
                    onClick={() => setCancelTarget(b)}
                    aria-label={`Cancelar reserva de ${b.serviceName}`}
                    title="Cancelar reserva"
                    className="w-9 h-9 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 flex items-center justify-center transition-colors"
                  >
                    <XCircle size={15} className="text-rose-300" />
                  </button>
                ) : null}
              </div>
            </div>
            {b.notes && (
              <p className="text-slate-400 text-xs mt-3 pt-3 border-t border-white/[0.05]">
                📝 {b.notes}
              </p>
            )}
          </div>
        ))}
        </section>
        ))}
        {all.length > 0 && source.length === 0 && (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl">
            <EmptyState icon={Search} title="Ninguna reserva coincide" text={`No hay resultados para "${search.trim()}".`} />
          </div>
        )}
        {all.length === 0 && (
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl">
            <EmptyState
              icon={Calendar}
              title="Sin reservas todavía"
              text={view === 'business'
                ? 'Cuando tus clientes reserven, desde la página pública o desde aquí, aparecerán en esta lista.'
                : 'Cuando reserves un servicio aparecerá aquí, con su fecha, hora y estado.'}
              action={
                <Button
                  onClick={() => setShowBookingModal(true)}
                  className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl px-4 h-10 flex items-center gap-2"
                >
                  <Plus size={16} /> Hacer mi primera reserva
                </Button>
              }
            />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={open => { if (!open) setCancelTarget(null) }}
        title="¿Cancelar esta reserva?"
        description={cancelTarget
          ? `${cancelTarget.serviceName} con ${cancelTarget.staffName}, el ${new Date(cancelTarget.startTime).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}. Esta acción no se puede deshacer.`
          : ''}
        confirmLabel="Sí, cancelar"
        loading={cancelMutation.isPending}
        onConfirm={() => cancelTarget && cancelMutation.mutate(cancelTarget.id)}
      />

      {/* Modal nueva reserva */}
      <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
        <DialogContent className="app-dialog max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Nueva reserva</DialogTitle>
          </DialogHeader>

          {/* Steps indicator */}
          <div className="my-3" aria-label={`Paso ${step} de 3`}>
            <div className="wizard-track" aria-hidden>
              <span style={{ '--p': (step - 1) / 2 } as React.CSSProperties} />
            </div>
            <ol className="mt-3 grid grid-cols-3 text-xs">
              {['Servicio', 'Fecha y hora', 'Confirmar'].map((label, i) => {
                const s = i + 1
                return (
                  <li key={label} className={`flex items-center gap-1.5 ${i === 1 ? 'justify-center' : i === 2 ? 'justify-end' : ''} ${step >= s ? 'text-white' : 'text-slate-500'}`}>
                    <span className={`wizard-dot ${step > s ? 'is-done' : step === s ? 'is-current' : ''}`}>
                      {step > s ? <CheckCircle size={11} /> : s}
                    </span>
                    {label}
                  </li>
                )
              })}
            </ol>
          </div>

          {/* Step 1 */}
          {step === 1 && (
            <div className="wizard-step space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300 text-sm">Servicio</Label>
                <div className="grid grid-cols-2 gap-2">
                  {services?.filter(s => s.isActive).map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedServiceId(s.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selectedServiceId === s.id
                          ? 'bg-violet-600/20 border-violet-500/40 '
                          : 'bg-white/[0.02] border-white/[0.06] hover:border-white/10'
                      }`}
                    >
                      <p className={`text-sm font-medium ${selectedServiceId === s.id ? 'text-violet-300' : 'text-white'}`}>
                        {s.name}
                      </p>
                      <p className="text-slate-500 text-xs mt-0.5">{s.durationMinutes} min · {s.price.toFixed(2)}€</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300 text-sm">Staff</Label>
                <div className="grid grid-cols-2 gap-2">
                  {staff?.filter(s => s.isActive).map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStaffId(s.id)}
                      className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2 ${
                        selectedStaffId === s.id
                          ? 'bg-violet-600/20 border-violet-500/40'
                          : 'bg-white/[0.02] border-white/[0.06] hover:border-white/10'
                      }`}
                    >
                      <div className="w-7 h-7 bg-violet-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-violet-400 text-xs font-bold">{s.name.charAt(0)}</span>
                      </div>
                      <span className={`text-sm font-medium ${selectedStaffId === s.id ? 'text-violet-300' : 'text-white'}`}>
                        {s.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => setStep(2)}
                  disabled={!selectedServiceId || !selectedStaffId}
                  className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl h-10 shadow-lg shadow-violet-600/20"
                >
                  Siguiente →
                </Button>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="wizard-step space-y-4">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Fecha</Label>
                <Input
                  type="date"
                  value={selectedDate}
                  min={toLocalIsoDate(new Date())}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="bg-white/5 border-white/10 text-white h-10 rounded-xl"
                />
              </div>
              {selectedDate && slots && (
                <div className="space-y-2">
                    <Label className="text-slate-300 text-sm">
                    Horario disponible
                    {slots.filter(s => s.isAvailable).length > 0 && (
                        <span className="ml-2 text-violet-400 text-xs font-normal">
                        {slots.filter(s => s.isAvailable).length} huecos libres
                        </span>
                    )}
                    </Label>

                    {slots.filter(s => s.isAvailable).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                        <div className="w-10 h-10 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-center mb-3">
                        <XCircle size={18} className="text-rose-400" />
                        </div>
                        <p className="text-white text-sm font-medium">Sin disponibilidad</p>
                        <p className="text-slate-500 text-xs mt-1">No hay huecos libres este día</p>
                        <p className="text-slate-600 text-xs mt-0.5">Prueba con otro día o staff diferente</p>
                    </div>
                    ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1">
                        {slots
                        .filter(s => s.isAvailable)
                        .map(slot => (
                            <button
                            key={slot.startTime}
                            onClick={() => setSelectedSlot(slot)}
                            className={`p-2 rounded-xl border text-center transition-all ${
                                selectedSlot?.startTime === slot.startTime
                                ? 'bg-violet-600/20 border-violet-500/40 text-violet-300 shadow-sm shadow-violet-600/10'
                                : 'bg-white/[0.02] border-white/[0.06] text-slate-300 hover:bg-white/[0.04] hover:border-white/10'
                            }`}
                            >
                            <p className="text-xs font-medium">
                                {new Date(slot.startTime).toLocaleTimeString('es-ES', {
                                hour: '2-digit', minute: '2-digit'
                                })}
                            </p>
                            </button>
                        ))}
                    </div>
                    )}
                </div>
                )}
              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(1)}
                  className="border-white/10 text-slate-300 hover:bg-white/5 rounded-xl h-10">
                  ← Atrás
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!selectedSlot}
                  className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl h-10 shadow-lg shadow-violet-600/20"
                >
                  Siguiente →
                </Button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="wizard-step space-y-4">
              <div className="p-4 bg-white/[0.03] border border-white/10 rounded-xl space-y-3">
                <h4 className="text-white font-medium text-sm">Resumen de tu reserva</h4>
                {[
                  { label: 'Servicio', value: services?.find(s => s.id === selectedServiceId)?.name },
                  { label: 'Staff', value: staff?.find(s => s.id === selectedStaffId)?.name },
                  { label: 'Fecha', value: new Date(`${selectedDate}T00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) },
                  { label: 'Hora', value: new Date(selectedSlot!.startTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) },
                  { label: 'Precio', value: `${services?.find(s => s.id === selectedServiceId)?.price.toFixed(2)}€` },
                ].map(item => (
                  <div key={item.label} className="flex justify-between text-sm">
                    <span className="text-slate-500">{item.label}</span>
                    <span className="text-white font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Notas (opcional)</Label>
                <Input
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Alguna indicación especial..."
                  className="bg-white/5 border-white/10 text-white h-10 rounded-xl placeholder:text-slate-600"
                />
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(2)}
                  className="border-white/10 text-slate-300 hover:bg-white/5 rounded-xl h-10">
                  ← Atrás
                </Button>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending}
                  className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl h-10 shadow-lg shadow-violet-600/20"
                >
                  {createMutation.isPending ? 'Reservando...' : '✓ Confirmar reserva'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}