import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bookingsApi } from '@/api/bookings'
import { businessApi } from '@/api/business'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Calendar, Clock, User, Scissors, XCircle, Plus, CheckCircle } from 'lucide-react'
import type { TimeSlot } from '@/types'

export function BookingsPage() {
  const queryClient = useQueryClient()
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [selectedStaffId, setSelectedStaffId] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [notes, setNotes] = useState('')

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
    staleTime: 0,        // ← siempre considera los datos obsoletos
    refetchOnMount: true // ← refresca cada vez que el componente monta
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
        queryClient.invalidateQueries({ queryKey: ['calendar-bookings'] }) // NUEVA
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })         // NUEVA
        queryClient.invalidateQueries({ queryKey: ['bookings-period'] })   // NUEVA
        setShowBookingModal(false)
        setStep(1)
        setSelectedServiceId('')
        setSelectedStaffId('')
        setSelectedDate('')
        setSelectedSlot(null)
        setNotes('')
      }
    })
  const cancelMutation = useMutation({
      mutationFn: (id: string) => bookingsApi.cancel(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['my-bookings'] })
        queryClient.invalidateQueries({ queryKey: ['availability'] })
      },
      onError: (error: unknown) => {
        console.error('Error cancelando:', error)
      }
  })
  const statusColor: Record<string, string> = {
    Pending:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
    Confirmed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    Cancelled: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    Completed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-3 text-slate-400">
        <span className="w-5 h-5 border-2 border-slate-600 border-t-violet-500 rounded-full animate-spin" />
        Cargando reservas...
      </div>
    </div>
  )

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Mis reservas</h1>
          <p className="text-slate-400 mt-1 text-sm">{myBookings?.length ?? 0} reservas en total</p>
        </div>
        <Button
          onClick={() => setShowBookingModal(true)}
          className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl px-4 h-10 flex items-center gap-2 shadow-lg shadow-violet-600/20"
        >
          <Plus size={16} /> Nueva reserva
        </Button>
      </div>

      {/* Bookings list */}
      <div className="space-y-3">
        {myBookings?.map(b => (
          <div key={b.id} className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 backdrop-blur-sm hover:border-white/15 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-violet-500/20 to-indigo-500/20 rounded-xl flex items-center justify-center border border-violet-500/20 flex-shrink-0">
                  <Scissors size={18} className="text-violet-400" />
                </div>
                <div>
                  <p className="text-white font-semibold">{b.serviceName}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-slate-500 text-xs">
                      <User size={11} /> {b.staffName}
                    </span>
                    <span className="flex items-center gap-1 text-slate-500 text-xs">
                      <Calendar size={11} />
                      {new Date(b.startTime).toLocaleDateString('es-ES', {
                        day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </span>
                    <span className="flex items-center gap-1 text-slate-500 text-xs">
                      <Clock size={11} />
                      {new Date(b.startTime).toLocaleTimeString('es-ES', {
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-white font-bold">{b.price.toFixed(2)}€</p>
                  <span className={`text-[10px] border px-2 py-0.5 rounded-md font-medium ${statusColor[b.status] ?? 'bg-slate-500/10 text-slate-400'}`}>
                    {b.status}
                  </span>
                </div>
                {b.status === 'Pending' || b.status === 'Confirmed' ? (
                  <button
                    onClick={() => cancelMutation.mutate(b.id)}
                    className="w-8 h-8 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 flex items-center justify-center transition-colors"
                  >
                    <XCircle size={14} className="text-rose-400" />
                  </button>
                ) : null}
              </div>
            </div>
            {b.notes && (
              <p className="text-slate-500 text-xs mt-3 pt-3 border-t border-white/[0.05]">
                📝 {b.notes}
              </p>
            )}
          </div>
        ))}
        {!myBookings?.length && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-white/[0.03] border border-white/10 rounded-2xl flex items-center justify-center mb-4">
              <Calendar size={24} className="text-slate-600" />
            </div>
            <p className="text-white font-medium">Sin reservas todavía</p>
            <p className="text-slate-500 text-sm mt-1">Crea tu primera reserva pulsando el botón</p>
          </div>
        )}
      </div>

      {/* Modal nueva reserva */}
      <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
        <DialogContent className="bg-[#0d0d14] border border-white/10 text-white rounded-2xl max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Nueva reserva</DialogTitle>
          </DialogHeader>

          {/* Steps indicator */}
          <div className="flex items-center gap-2 my-4">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step >= s ? 'bg-violet-600 text-white' : 'bg-white/5 text-slate-500'
                }`}>
                  {step > s ? <CheckCircle size={14} /> : s}
                </div>
                <span className={`text-xs ${step >= s ? 'text-white' : 'text-slate-600'}`}>
                  {s === 1 ? 'Servicio' : s === 2 ? 'Fecha y hora' : 'Confirmar'}
                </span>
                {s < 3 && <div className={`flex-1 h-px ${step > s ? 'bg-violet-600' : 'bg-white/5'}`} />}
              </div>
            ))}
          </div>

          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-4">
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
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Fecha</Label>
                <Input
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().split('T')[0]}
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
                    <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
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
            <div className="space-y-4">
              <div className="p-4 bg-white/[0.03] border border-white/10 rounded-xl space-y-3">
                <h4 className="text-white font-medium text-sm">Resumen de tu reserva</h4>
                {[
                  { label: 'Servicio', value: services?.find(s => s.id === selectedServiceId)?.name },
                  { label: 'Staff', value: staff?.find(s => s.id === selectedStaffId)?.name },
                  { label: 'Fecha', value: new Date(selectedDate).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) },
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