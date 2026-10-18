import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { formatPrice, toLocalIsoDate } from '@/lib/labels'
import { ExtrasPicker } from '@/components/booking/ExtrasPicker'
import { PriceSummary } from '@/components/booking/PriceSummary'
import { PoliciesNotice } from '@/components/booking/PoliciesNotice'
import { hasPolicies } from '@/lib/policies'
import { publicApi } from '@/api/public'
import { getBusinessConfig } from '@/lib/businessIcons'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import type { PublicBooking as PublicBookingResult, PublicBusiness, PublicService, PublicStaff, TimeSlot } from '@/types'
import {
  Calendar, Clock, User, Scissors, CheckCircle,
  Phone, MapPin, ChevronRight, ChevronLeft
} from 'lucide-react'

type Step = 1 | 2 | 3 | 4

export function PublicBookingPage() {
  const { subdomain } = useParams<{ subdomain: string }>()
  const [step, setStep] = useState<Step>(1)
  const [selectedBusiness, setSelectedBusiness] = useState<PublicBusiness | null>(null)
  const [selectedService, setSelectedService] = useState<PublicService | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<PublicStaff | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', notes: '' })
  const [confirmed, setConfirmed] = useState<PublicBookingResult | null>(null)
  const [bookingError, setBookingError] = useState('')
  const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([])
  const [acceptPolicies, setAcceptPolicies] = useState(false)
  const queryClient = useQueryClient()

  const { data: businesses, isLoading, error } = useQuery({
    queryKey: ['public-business', subdomain],
    queryFn: () => publicApi.getBusiness(subdomain!),
    enabled: !!subdomain,
    // Servicios, extras y normas pueden cambiar en cualquier momento: siempre datos frescos
    staleTime: 0,
    refetchOnWindowFocus: true,
  })

  // La disponibilidad cambia con cada reserva: nunca se reutiliza una copia antigua
  const { data: slots, isFetching: slotsFetching } = useQuery({
    queryKey: ['public-slots', selectedService?.id, selectedStaff?.id, selectedDate, selectedExtraIds.join(',')],
    queryFn: () => publicApi.getAvailability(selectedService!.id, selectedStaff!.id, selectedDate, selectedExtraIds),
    enabled: !!selectedService && !!selectedStaff && !!selectedDate,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
    refetchInterval: step === 2 ? 30_000 : false,
  })

  const bookMutation = useMutation({
    mutationFn: () => publicApi.book({
      serviceId: selectedService!.id,
      staffId:   selectedStaff!.id,
      startTime: selectedSlot!.startTime,
      fullName:  form.fullName,
      email:     form.email,
      phone:     form.phone || undefined,
      notes:     form.notes || undefined,
      extraIds:  chosenExtras.map(e => e.id),
      acceptPolicies,
    }),
    onSuccess: (data) => {
      // Borra los huecos guardados: la hora recién reservada ya no está libre
      queryClient.removeQueries({ queryKey: ['public-slots'] })
      setConfirmed(data)
    },
    onError: (err) => {
      const message = isAxiosError<{ message?: string }>(err) ? err.response?.data?.message : undefined
      setBookingError(message ?? 'No se pudo crear la reserva. Revisa tu conexión e inténtalo de nuevo.')
      // Si la hora se ha ocupado mientras tanto, vuelve a elegir con la lista actualizada
      if (message?.includes('reservado') || message?.includes('pasada') || message?.includes('horario')) {
        setSelectedSlot(null)
        queryClient.invalidateQueries({ queryKey: ['public-slots'] })
        setStep(2)
      }
    },
  })

  const business = selectedBusiness ?? businesses?.[0]
  const config = business ? getBusinessConfig(business.category) : null
  // Se usa el servicio tal como llega ahora de la API (no la copia guardada al elegirlo)
  const currentService = business?.services.find(s => s.id === selectedService?.id) ?? selectedService
  const serviceExtras = currentService?.extras ?? []
  const chosenExtras = serviceExtras.filter(e => selectedExtraIds.includes(e.id))
  const mustAccept = hasPolicies(business?.policies)

  if (isLoading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="flex items-center gap-3 text-slate-400">
        <span className="w-5 h-5 border-2 border-slate-600 border-t-violet-500 rounded-full animate-spin" />
        Cargando...
      </div>
    </div>
  )

  if (error || !businesses?.length) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-white/[0.03] border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Scissors size={24} className="text-slate-600" />
        </div>
        <p className="text-white font-medium">Negocio no encontrado</p>
        <p className="text-slate-500 text-sm mt-1">Verifica la URL e inténtalo de nuevo</p>
      </div>
    </div>
  )

  // Confirmación
  if (confirmed) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      <div className="app-backdrop fixed inset-0 pointer-events-none" aria-hidden />
      <div className="page-enter login-card w-full max-w-md rounded-2xl p-8 text-center relative z-10">
        <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={28} className="text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">¡Reserva confirmada!</h2>
        <p className="text-slate-400 text-sm mb-6">Recibirás un email de confirmación en breve</p>
        <div className="space-y-3 text-left bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 mb-6">
          {[
            { label: 'Servicio', value: confirmed.serviceName },
            { label: 'Fecha', value: new Date(confirmed.startTime).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) },
            { label: 'Hora', value: new Date(confirmed.startTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) },
            ...confirmed.extras.map(e => ({ label: `+ ${e.name}`, value: formatPrice(e.price) })),
            { label: 'Total a pagar', value: formatPrice(confirmed.totalPrice) },
          ].map(item => (
            <div key={item.label} className="flex justify-between text-sm">
              <span className="text-slate-500">{item.label}</span>
              <span className="text-white font-medium">{item.value}</span>
            </div>
          ))}
        </div>
        <Button
          onClick={() => { setConfirmed(null); setStep(1); setSelectedService(null); setSelectedStaff(null); setSelectedDate(''); setSelectedSlot(null); setSelectedExtraIds([]); setAcceptPolicies(false); setForm({ fullName: '', email: '', phone: '', notes: '' }) }}
          className="w-full bg-violet-600 hover:bg-violet-500 text-white rounded-xl h-10"
        >
          Hacer otra reserva
        </Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Fondo estático */}
      <div className="app-backdrop fixed inset-0 pointer-events-none" aria-hidden />

      <div className="page-enter relative z-10 max-w-2xl mx-auto px-4 py-12">

        {/* Header del negocio */}
        {business && config && (
          <div className="text-center mb-10">
            <div className={`w-16 h-16 ${config.bg} border ${config.border} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
              <config.icon size={28} className={config.color} />
            </div>
            <h1 className="text-3xl font-bold text-white">{business.name}</h1>
            <p className={`text-sm font-medium mt-1 ${config.color}`}>{config.label}</p>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-3 text-slate-400 text-xs">
              {business.address && (
                <span className="flex items-center gap-1">
                  <MapPin size={11} /> {business.address}
                </span>
              )}
              {business.phone && (
                <span className="flex items-center gap-1">
                  <Phone size={11} /> {business.phone}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock size={11} /> {business.openTime} - {business.closeTime}
              </span>
            </div>
          </div>
        )}

        {/* Selector de negocio si hay varios */}
        {businesses.length > 1 && (
          <div className="flex gap-2 mb-6 flex-wrap justify-center">
            {businesses.map((b: PublicBusiness) => {
              const c = getBusinessConfig(b.category)
              return (
                <button
                  key={b.id}
                  onClick={() => setSelectedBusiness(b)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                    business?.id === b.id
                      ? `${c.bg} ${c.border} ${c.color}`
                      : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <c.icon size={14} />
                  {b.name}
                </button>
              )
            })}
          </div>
        )}

        {/* Steps indicator */}
        <div className="flex items-center gap-1.5 sm:gap-2 mb-8 justify-center" aria-label={`Paso ${step} de 4`}>
          {[
            { n: 1, label: 'Servicio' },
            { n: 2, label: 'Fecha y hora' },
            { n: 3, label: 'Tus datos' },
            { n: 4, label: 'Confirmar' },
          ].map((s, i) => (
            <div key={s.n} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                step === s.n
                  ? 'bg-violet-600 text-white'
                  : step > s.n
                    ? 'bg-violet-600/20 text-violet-400'
                    : 'bg-white/[0.03] text-slate-500'
              }`}>
                {step > s.n ? <CheckCircle size={12} /> : <span>{s.n}</span>}
                <span className={step === s.n ? '' : 'hidden sm:inline'}>{s.label}</span>
              </div>
              {i < 3 && <div className={`w-4 sm:w-8 h-px ${step > s.n ? 'bg-violet-500' : 'bg-white/10'}`} />}
            </div>
          ))}
        </div>

        {/* Contenido del step */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-sm">

          {/* Step 1 — Servicio y staff */}
          {step === 1 && business && (
            <div className="space-y-6">
              <div>
                <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Scissors size={16} className="text-violet-400" /> Elige un servicio
                </h2>
                <div className="space-y-2">
                  {business.services.map((s: PublicService) => (
                    <button
                      key={s.id}
                      onClick={() => { if (selectedService?.id !== s.id) { setSelectedExtraIds([]); setSelectedSlot(null) } setSelectedService(s) }}
                      className={`w-full p-4 rounded-xl border text-left transition-all ${
                        selectedService?.id === s.id
                          ? 'bg-violet-600/20 border-violet-500/40'
                          : 'bg-white/[0.02] border-white/[0.06] hover:border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`font-medium text-sm ${selectedService?.id === s.id ? 'text-violet-300' : 'text-white'}`}>
                            {s.name}
                          </p>
                          {s.description && <p className="text-slate-500 text-xs mt-0.5">{s.description}</p>}
                          <p className="text-slate-500 text-xs mt-1 flex items-center gap-1">
                            <Clock size={10} /> {s.durationMinutes} min
                          </p>
                        </div>
                        <p className={`font-bold ${selectedService?.id === s.id ? 'text-violet-300' : 'text-white'}`}>
                          {s.price.toFixed(2)}€
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {currentService && serviceExtras.length > 0 && (
                <div className="space-y-3">
                  <ExtrasPicker extras={serviceExtras} selected={selectedExtraIds} onChange={ids => { setSelectedExtraIds(ids); setSelectedSlot(null) }} />
                  <p className="text-right text-sm text-slate-400">
                    Total: <span className="font-semibold text-white">{formatPrice(currentService.price + chosenExtras.reduce((t, e) => t + e.price, 0))}</span>
                  </p>
                </div>
              )}

              {selectedService && (
                <div>
                  <h2 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <User size={16} className="text-violet-400" /> Elige un profesional
                  </h2>
                  <div className="grid grid-cols-2 gap-2">
                    {business.staff.map((s: PublicStaff) => (
                      <button
                        key={s.id}
                        onClick={() => setSelectedStaff(s)}
                        className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
                          selectedStaff?.id === s.id
                            ? 'bg-violet-600/20 border-violet-500/40'
                            : 'bg-white/[0.02] border-white/[0.06] hover:border-white/10'
                        }`}
                      >
                        <div className="w-8 h-8 bg-violet-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-violet-400 text-xs font-bold">{s.name.charAt(0)}</span>
                        </div>
                        <span className={`text-sm font-medium ${selectedStaff?.id === s.id ? 'text-violet-300' : 'text-white'}`}>
                          {s.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={() => setStep(2)}
                  disabled={!selectedService || !selectedStaff}
                  className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl h-10 flex items-center gap-2"
                >
                  Siguiente <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2 — Fecha y hora */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <Calendar size={16} className="text-violet-400" /> Elige fecha y hora
              </h2>

              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Fecha</Label>
                <Input
                  type="date"
                  value={selectedDate}
                  min={toLocalIsoDate(new Date())}
                  onChange={e => { setSelectedDate(e.target.value); setSelectedSlot(null); setBookingError('') }}
                  className="bg-white/5 border-white/10 text-white h-10 rounded-xl"
                />
              </div>

              {bookingError && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3" role="alert">
                  <p className="text-rose-300 text-sm">{bookingError} Elige otra hora.</p>
                </div>
              )}

              {selectedDate && !slots && slotsFetching && (
                <div className="grid grid-cols-4 gap-2" aria-label="Cargando horas disponibles">
                  {Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton h-9 !rounded-xl" />)}
                </div>
              )}

              {selectedDate && slots && (
                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">
                    Hora disponible
                    {(slots as TimeSlot[]).filter(s => s.isAvailable).length > 0 && (
                      <span className="ml-2 text-violet-400 text-xs">
                        {(slots as TimeSlot[]).filter(s => s.isAvailable).length} huecos libres
                      </span>
                    )}
                  </Label>
                  {(slots as TimeSlot[]).filter(s => s.isAvailable).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                      <p className="text-white text-sm font-medium">Sin disponibilidad</p>
                      <p className="text-slate-500 text-xs mt-1">Prueba con otro día</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                      {(slots as TimeSlot[]).filter(s => s.isAvailable).map(slot => (
                        <button
                          key={slot.startTime}
                          onClick={() => { setSelectedSlot(slot); setBookingError('') }}
                          className={`p-2 rounded-xl border text-center transition-all ${
                            selectedSlot?.startTime === slot.startTime
                              ? 'bg-violet-600/20 border-violet-500/40 text-violet-300'
                              : 'bg-white/[0.02] border-white/[0.06] text-slate-300 hover:border-white/10'
                          }`}
                        >
                          <p className="text-xs font-medium">
                            {new Date(slot.startTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}
                  className="border-white/10 text-slate-300 hover:bg-white/5 rounded-xl h-10 flex items-center gap-2">
                  <ChevronLeft size={16} /> Atrás
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!selectedSlot}
                  className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl h-10 flex items-center gap-2"
                >
                  Siguiente <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3 — Datos del cliente */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <User size={16} className="text-violet-400" /> Tus datos
              </h2>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Nombre completo *</Label>
                <Input
                  value={form.fullName}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                  placeholder="Carlos García"
                  required
                  className="bg-white/5 border-white/10 text-white h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Email *</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="tu@email.com"
                  required
                  className="bg-white/5 border-white/10 text-white h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Teléfono (opcional)</Label>
                <Input
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+34 600 000 000"
                  className="bg-white/5 border-white/10 text-white h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Notas (opcional)</Label>
                <Input
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Alguna indicación especial..."
                  className="bg-white/5 border-white/10 text-white h-10 rounded-xl"
                />
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(2)}
                  className="border-white/10 text-slate-300 hover:bg-white/5 rounded-xl h-10 flex items-center gap-2">
                  <ChevronLeft size={16} /> Atrás
                </Button>
                <Button
                  onClick={() => setStep(4)}
                  disabled={!form.fullName || !form.email}
                  className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl h-10 flex items-center gap-2"
                >
                  Siguiente <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}

          {/* Step 4 — Confirmar */}
          {step === 4 && (
            <div className="space-y-5">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <CheckCircle size={16} className="text-violet-400" /> Confirma tu reserva
              </h2>

              <div className="space-y-3 bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                {[
                  { label: 'Servicio',    value: selectedService?.name },
                  { label: 'Profesional', value: selectedStaff?.name },
                  { label: 'Fecha',       value: selectedDate ? new Date(`${selectedDate}T00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : '' },
                  { label: 'Hora',        value: selectedSlot ? new Date(selectedSlot.startTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '' },
                  { label: 'Nombre',      value: form.fullName },
                  { label: 'Email',       value: form.email },
                ].map(item => (
                  <div key={item.label} className="flex justify-between text-sm">
                    <span className="text-slate-500">{item.label}</span>
                    <span className="text-white font-medium">{item.value}</span>
                  </div>
                ))}
              </div>

              {selectedService && (
                <PriceSummary
                  serviceName={selectedService.name}
                  servicePrice={selectedService.price}
                  serviceMinutes={selectedService.durationMinutes}
                  extras={chosenExtras}
                />
              )}

              {business && (
                <PoliciesNotice policies={business.policies} accepted={acceptPolicies} onAcceptedChange={setAcceptPolicies} />
              )}

              {bookingError && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3" role="alert">
                  <p className="text-rose-300 text-sm">{bookingError}</p>
                </div>
              )}

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(3)}
                  className="border-white/10 text-slate-300 hover:bg-white/5 rounded-xl h-10 flex items-center gap-2">
                  <ChevronLeft size={16} /> Atrás
                </Button>
                <Button
                  onClick={() => { setBookingError(''); bookMutation.mutate() }}
                  disabled={bookMutation.isPending || (mustAccept && !acceptPolicies)}
                  className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl h-10 shadow-lg shadow-violet-600/20"
                >
                  {bookMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Reservando...
                    </span>
                  ) : '✓ Confirmar reserva'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-slate-600 text-xs mt-6">
          Powered by <span className="text-violet-400">BookingApp</span>
        </p>
      </div>
    </div>
  )
}