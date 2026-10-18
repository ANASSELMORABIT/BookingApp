import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { businessApi } from '@/api/business'
import { getBusinessConfig } from '@/lib/businessIcons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Users, Scissors, Clock, Phone, MapPin, Pencil, UserPlus, Building2, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { profileApi } from '@/api/profile'
import { formatPrice } from '@/lib/labels'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/app/PageHeader'
import { PageLoader } from '@/components/app/PageLoader'
import { EmptyState } from '@/components/app/EmptyState'
import { Segmented } from '@/components/app/Segmented'
import { Switch } from '@/components/app/Switch'
import { PoliciesForm } from '@/components/booking/PoliciesForm'
import { ShieldCheck } from 'lucide-react'

/** "09:00:00" → minutos desde medianoche */
const toMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}
const hhmm = (t: string) => t.slice(0, 5)
const nowMinutes = () => {
  const d = new Date()
  return d.getHours() * 60 + d.getMinutes()
}

/** Etiqueta de abierto o cerrado según la hora actual (los días de cierre aún no existen en el modelo). */
function OpenBadge({ open, close }: { open: string; close: string }) {
  const now = nowMinutes()
  const isOpen = now >= toMinutes(open) && now < toMinutes(close)
  return (
    <span className={cn('flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
      isOpen ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/[0.06] text-slate-400')}>
      <span className={cn('h-1.5 w-1.5 rounded-full', isOpen ? 'bg-emerald-400' : 'bg-slate-500')} />
      {isOpen ? 'Abierto' : 'Cerrado'}
    </span>
  )
}

/** Horario sobre una barra de 24 h, con la hora actual marcada. */
function HoursBar({ open, close }: { open: string; close: string }) {
  const start = toMinutes(open)
  const end = toMinutes(close)
  const now = nowMinutes()
  const isOpen = now >= start && now < end
  const pct = (m: number) => `${(m / 1440) * 100}%`
  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-slate-400"><Clock size={12} /> Horario</span>
        <span className="text-slate-300">
          <span className="font-medium text-white tabular-nums">{hhmm(open)} – {hhmm(close)}</span>
          {' · '}
          <span className={isOpen ? 'text-emerald-300' : 'text-slate-400'}>{isOpen ? 'Abierto ahora' : 'Cerrado ahora'}</span>
        </span>
      </div>
      <div className="hours-track" role="img" aria-label={`Abre a las ${hhmm(open)} y cierra a las ${hhmm(close)}`}>
        <span className="hours-open" style={{ left: pct(start), width: pct(Math.max(0, end - start)) }} />
        <span className="hours-now" style={{ left: pct(now) }} />
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-slate-500 tabular-nums" aria-hidden>
        <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
      </div>
    </div>
  )
}

const initialsOf = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')
/** Tono estable por persona, dentro de la gama violeta–índigo–rosa de la app. */
const hueOf = (name: string) => 230 + ([...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 90)

const onError = () => toast.error('No se pudo guardar. Revisa los datos e inténtalo de nuevo.')

export function BusinessPage() {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showStaffModal, setShowStaffModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'services' | 'staff' | 'policies'>('services')

  const [newBusiness, setNewBusiness] = useState({
    name: '', category: '', phone: '', address: '',
    openTime: '09:00', closeTime: '20:00'
  })
  const [editForm, setEditForm] = useState({
    name: '', phone: '', address: '', openTime: '09:00', closeTime: '20:00'
  })
  const [newStaff, setNewStaff] = useState({ name: '', email: '' })
  const [newService, setNewService] = useState({
    name: '', description: '', durationMinutes: 30, price: 0
  })

  const { data: businesses, isLoading } = useQuery({
    queryKey: ['businesses'],
    queryFn: businessApi.getAll,
  })

  // Se abre con el primer negocio seleccionado; los datos salen siempre de la lista actualizada
  const selectedBusiness = businesses?.find(b => b.id === selectedId) ?? businesses?.[0] ?? null

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: profileApi.get,
  })

  const { data: staff } = useQuery({
    queryKey: ['staff', selectedBusiness?.id],
    queryFn: () => businessApi.getStaff(selectedBusiness!.id),
    enabled: !!selectedBusiness,
    retry: false,
  })

  const { data: services } = useQuery({
    queryKey: ['services', selectedBusiness?.id],
    queryFn: () => businessApi.getServices(selectedBusiness!.id),
    enabled: !!selectedBusiness,
  })

  const createMutation = useMutation({
    mutationFn: (data: typeof newBusiness) => businessApi.create({
      ...data,
      openTime: data.openTime as unknown as string,
      closeTime: data.closeTime as unknown as string,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businesses'] })
      setShowCreateModal(false)
      setNewBusiness({ name: '', category: '', phone: '', address: '', openTime: '09:00', closeTime: '20:00' })
      toast.success('Negocio creado')
    },
    onError,
  })

    const updateMutation = useMutation({
      mutationFn: (data: typeof editForm) => businessApi.update(selectedBusiness!.id, {
        ...data,
        openTime: data.openTime as unknown as string,
        closeTime: data.closeTime as unknown as string,
      }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['businesses'] })
        // Actualiza el negocio seleccionado inmediatamente
        setShowEditModal(false)
        toast.success('Cambios guardados')
      },
      onError,
  })

  const addStaffMutation = useMutation({
    mutationFn: () => businessApi.addStaff(selectedBusiness!.id, newStaff),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', selectedBusiness?.id] })
      setShowStaffModal(false)
      setNewStaff({ name: '', email: '' })
      toast.success('Persona añadida al equipo')
    },
    onError,
  })

  const toggleStaffMutation = useMutation({
    mutationFn: (staffId: string) => businessApi.toggleStaff(staffId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff', selectedBusiness?.id] }),
    onError,
  })

  const createServiceMutation = useMutation({
    mutationFn: () => businessApi.createService(selectedBusiness!.id, newService),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', selectedBusiness?.id] })
      queryClient.invalidateQueries({ queryKey: ['businesses'] })
      setShowServiceModal(false)
      setNewService({ name: '', description: '', durationMinutes: 30, price: 0 })
      toast.success('Servicio añadido')
    },
    onError,
  })

  if (isLoading) return <PageLoader label="Cargando negocios…" cards={3} />

  return (
    <div className="space-y-6 max-w-7xl">
      <PageHeader
        title="Negocios"
        subtitle="Gestiona tus negocios y sus servicios"
        actions={
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl px-4 h-10 flex items-center gap-2 shadow-lg shadow-violet-600/20"
          >
            <Plus size={16} /> Nuevo negocio
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Lista de negocios */}
        <div className="space-y-3">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">
            Negocios · {businesses?.length ?? 0}
          </p>
          {businesses?.map((b, i) => {
            const config = getBusinessConfig(b.category)
            const isSelected = selectedBusiness?.id === b.id
            return (
              <button
                key={b.id}
                onClick={() => setSelectedId(b.id)}
                aria-pressed={isSelected}
                style={{ '--i': i } as React.CSSProperties}
                className={`list-in lift-card w-full text-left p-4 rounded-2xl border ${
                  isSelected
                    ? `${config.bg} ${config.border} shadow-[0_16px_40px_-24px_rgb(124_58_237_/_0.7)]`
                    : 'bg-white/[0.03] border-white/[0.07] hover:bg-white/[0.05] hover:border-white/15'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${config.bg} rounded-xl flex items-center justify-center border ${config.border}`}>
                    <config.icon size={18} className={config.color} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-medium truncate">{b.name}</p>
                    <p className={`text-xs font-medium ${config.color}`}>{config.label}</p>
                  </div>
                  <OpenBadge open={b.openTime} close={b.closeTime} />
                </div>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/[0.06]">
                  <span className="flex items-center gap-1 text-slate-400 text-xs"><Scissors size={11} /> {b.totalServices} servicios</span>
                  <span className="flex items-center gap-1 text-slate-400 text-xs"><Users size={11} /> {b.totalStaff} en el equipo</span>
                </div>
              </button>
            )
          })}
          {!businesses?.length && (
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl">
              <EmptyState
                icon={Building2}
                title="Aún no tienes negocios"
                text="Crea el primero para añadir servicios, equipo y empezar a recibir reservas."
              />
            </div>
          )}
        </div>

        {/* Detalle del negocio */}
        {selectedBusiness && (() => {
          const config = getBusinessConfig(selectedBusiness.category)
          const publicLink = profile ? `${window.location.origin}/book/${profile.tenantSubdomain}` : ''
          const copyLink = async () => {
            try {
              await navigator.clipboard.writeText(publicLink)
              toast.success('Enlace copiado')
            } catch {
              toast.error('No se pudo copiar el enlace.')
            }
          }
          return (
            <div key={selectedBusiness.id} className="page-enter lg:col-span-2 space-y-4">
              <div className="glass-panel p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 ${config.bg} rounded-xl flex items-center justify-center border ${config.border}`}>
                      <config.icon size={22} className={config.color} />
                    </div>
                    <div>
                      <h2 className="text-white font-semibold text-xl tracking-tight">{selectedBusiness.name}</h2>
                      <p className={`text-sm font-medium ${config.color}`}>{config.label}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {publicLink && (
                      <button
                        onClick={copyLink}
                        className="flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs font-medium text-slate-300 transition-colors hover:bg-white/[0.07] hover:text-white"
                      >
                        <Copy size={13} /> Copiar enlace público
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditForm({
                          name: selectedBusiness.name,
                          phone: selectedBusiness.phone ?? '',
                          address: selectedBusiness.address ?? '',
                          openTime: selectedBusiness.openTime,
                          closeTime: selectedBusiness.closeTime,
                        })
                        setShowEditModal(true)
                      }}
                      className="flex h-9 items-center gap-1.5 rounded-xl border border-violet-500/25 bg-violet-600/15 px-3 text-xs font-medium text-violet-200 transition-colors hover:bg-violet-600/25"
                    >
                      <Pencil size={12} /> Editar
                    </button>
                  </div>
                </div>

                {/* Horario como barra del día */}
                <HoursBar open={selectedBusiness.openTime} close={selectedBusiness.closeTime} />

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { icon: Phone, label: 'Teléfono', value: selectedBusiness.phone || 'No especificado' },
                    { icon: MapPin, label: 'Dirección', value: selectedBusiness.address || 'No especificada' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                      <item.icon size={14} className={config.color} />
                      <div className="min-w-0">
                        <p className="text-slate-400 text-[11px]">{item.label}</p>
                        <p className="text-white text-sm truncate">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Segmented
                asTabs
                label="Contenido del negocio"
                value={activeTab}
                onChange={setActiveTab}
                options={[
                  { id: 'services', label: 'Servicios', icon: Scissors, count: services?.length },
                  { id: 'staff', label: 'Equipo', icon: Users, count: staff?.length },
                  { id: 'policies', label: 'Normas', icon: ShieldCheck },
                ]}
              />

              {/* Servicios */}
              {activeTab === 'services' && (
                <div className="profile-panel glass-panel p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-semibold text-sm">Servicios del negocio</h3>
                    <button
                      onClick={() => setShowServiceModal(true)}
                      className="flex h-8 items-center gap-1 rounded-xl border border-violet-500/20 bg-violet-600/15 px-3 text-xs font-medium text-violet-200 transition-colors hover:bg-violet-600/25"
                    >
                      <Plus size={12} /> Añadir
                    </button>
                  </div>
                  <div className="space-y-2">
                    {services?.map((s, i) => (
                      <div key={s.id} style={{ '--i': i } as React.CSSProperties}
                        className={`list-in flex items-center justify-between gap-3 p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl ${s.isActive ? '' : 'opacity-60'}`}>
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate">{s.name}</p>
                          <p className="text-slate-400 text-xs mt-0.5 tabular-nums">{s.durationMinutes} min{s.isActive ? '' : ' · inactivo'}</p>
                        </div>
                        <p className="text-white text-sm font-semibold tabular-nums">{formatPrice(s.price)}</p>
                      </div>
                    ))}
                    {!services?.length && (
                      <p className="text-slate-500 text-sm text-center py-6">Sin servicios todavía</p>
                    )}
                  </div>
                </div>
              )}

              {/* Normas */}
              {activeTab === 'policies' && (
                <div className="profile-panel glass-panel p-5">
                  <div className="mb-4">
                    <h3 className="text-white font-semibold text-sm">Normas del negocio</h3>
                    <p className="mt-0.5 text-xs text-slate-400">El cliente las ve y debe aceptarlas al reservar.</p>
                  </div>
                  <PoliciesForm key={selectedBusiness.id} business={selectedBusiness} />
                </div>
              )}

              {/* Equipo */}
              {activeTab === 'staff' && (
                <div className="profile-panel glass-panel p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-semibold text-sm">Equipo</h3>
                    <button
                      onClick={() => setShowStaffModal(true)}
                      className="flex h-8 items-center gap-1 rounded-xl border border-violet-500/20 bg-violet-600/15 px-3 text-xs font-medium text-violet-200 transition-colors hover:bg-violet-600/25"
                    >
                      <UserPlus size={12} /> Añadir
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {staff?.map((s, i) => (
                      <div key={s.id} style={{ '--i': i } as React.CSSProperties}
                        className="list-in flex items-center justify-between gap-3 p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                        <div className={`flex min-w-0 items-center gap-3 ${s.isActive ? '' : 'opacity-60'}`}>
                          <span className="staff-avatar" style={{ '--h': hueOf(s.name) } as React.CSSProperties} aria-hidden>
                            {initialsOf(s.name)}
                          </span>
                          <div className="min-w-0">
                            <p className="text-white text-sm font-medium truncate">{s.name}</p>
                            <p className="text-slate-400 text-xs truncate">
                              {s.isActive ? `${s.totalBookings} reservas` : 'Inactivo · no recibe reservas'}
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={s.isActive}
                          onChange={() => toggleStaffMutation.mutate(s.id)}
                          disabled={toggleStaffMutation.isPending && toggleStaffMutation.variables === s.id}
                          label={s.isActive ? `Desactivar a ${s.name}` : `Activar a ${s.name}`}
                        />
                      </div>
                    ))}
                    {!staff?.length && (
                      <p className="text-slate-500 text-sm text-center py-6 sm:col-span-2">Sin personas en el equipo todavía</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })()}
      </div>

      {/* Modal crear negocio */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="app-dialog max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Nuevo negocio</DialogTitle>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); createMutation.mutate(newBusiness) }} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Nombre</Label>
                <Input value={newBusiness.name} onChange={e => setNewBusiness(f => ({ ...f, name: e.target.value }))}
                  required className="bg-white/5 border-white/10 text-white h-10 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Categoría</Label>
                <Input value={newBusiness.category} onChange={e => setNewBusiness(f => ({ ...f, category: e.target.value }))}
                  placeholder="peluquería, gimnasio..." required className="bg-white/5 border-white/10 text-white h-10 rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Abre</Label>
                <Input type="time" value={newBusiness.openTime} onChange={e => setNewBusiness(f => ({ ...f, openTime: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white h-10 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Cierra</Label>
                <Input type="time" value={newBusiness.closeTime} onChange={e => setNewBusiness(f => ({ ...f, closeTime: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white h-10 rounded-xl" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Teléfono</Label>
              <Input value={newBusiness.phone} onChange={e => setNewBusiness(f => ({ ...f, phone: e.target.value }))}
                placeholder="+34 600 000 000" className="bg-white/5 border-white/10 text-white h-10 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Dirección</Label>
              <Input value={newBusiness.address} onChange={e => setNewBusiness(f => ({ ...f, address: e.target.value }))}
                className="bg-white/5 border-white/10 text-white h-10 rounded-xl" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}
                className="border-white/10 text-slate-300 hover:bg-white/5 rounded-xl h-10">
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}
                className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl h-10 shadow-lg shadow-violet-600/20">
                {createMutation.isPending ? 'Creando...' : 'Crear negocio'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal editar negocio */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="app-dialog max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Editar negocio</DialogTitle>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); updateMutation.mutate(editForm) }} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Nombre</Label>
              <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                required className="bg-white/5 border-white/10 text-white h-10 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Abre</Label>
                <Input type="time" value={editForm.openTime} onChange={e => setEditForm(f => ({ ...f, openTime: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white h-10 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Cierra</Label>
                <Input type="time" value={editForm.closeTime} onChange={e => setEditForm(f => ({ ...f, closeTime: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white h-10 rounded-xl" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Teléfono</Label>
              <Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+34 600 000 000" className="bg-white/5 border-white/10 text-white h-10 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Dirección</Label>
              <Input value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))}
                className="bg-white/5 border-white/10 text-white h-10 rounded-xl" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}
                className="border-white/10 text-slate-300 hover:bg-white/5 rounded-xl h-10">
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}
                className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl h-10 shadow-lg shadow-violet-600/20">
                {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal añadir staff */}
      <Dialog open={showStaffModal} onOpenChange={setShowStaffModal}>
        <DialogContent className="app-dialog max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Añadir staff</DialogTitle>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); addStaffMutation.mutate() }} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Nombre</Label>
              <Input value={newStaff.name} onChange={e => setNewStaff(f => ({ ...f, name: e.target.value }))}
                required className="bg-white/5 border-white/10 text-white h-10 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Email</Label>
              <Input type="email" value={newStaff.email} onChange={e => setNewStaff(f => ({ ...f, email: e.target.value }))}
                className="bg-white/5 border-white/10 text-white h-10 rounded-xl" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowStaffModal(false)}
                className="border-white/10 text-slate-300 hover:bg-white/5 rounded-xl h-10">
                Cancelar
              </Button>
              <Button type="submit" disabled={addStaffMutation.isPending}
                className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl h-10 shadow-lg shadow-violet-600/20">
                {addStaffMutation.isPending ? 'Añadiendo...' : 'Añadir'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal añadir servicio */}
      <Dialog open={showServiceModal} onOpenChange={setShowServiceModal}>
        <DialogContent className="app-dialog max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Añadir servicio</DialogTitle>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); createServiceMutation.mutate() }} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Nombre</Label>
              <Input
                value={newService.name}
                onChange={e => setNewService(f => ({ ...f, name: e.target.value }))}
                placeholder="Corte de pelo..."
                required
                className="bg-white/5 border-white/10 text-white h-10 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Descripción (opcional)</Label>
              <Input
                value={newService.description}
                onChange={e => setNewService(f => ({ ...f, description: e.target.value }))}
                className="bg-white/5 border-white/10 text-white h-10 rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Duración (min)</Label>
                <Input
                  type="number"
                  min={5}
                  value={newService.durationMinutes}
                  onChange={e => setNewService(f => ({ ...f, durationMinutes: parseInt(e.target.value) || 30 }))}
                  required
                  className="bg-white/5 border-white/10 text-white h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Precio (€)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={newService.price}
                  onChange={e => setNewService(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                  required
                  className="bg-white/5 border-white/10 text-white h-10 rounded-xl"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowServiceModal(false)}
                className="border-white/10 text-slate-300 hover:bg-white/5 rounded-xl h-10">
                Cancelar
              </Button>
              <Button type="submit" disabled={createServiceMutation.isPending}
                className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl h-10 shadow-lg shadow-violet-600/20">
                {createServiceMutation.isPending ? 'Añadiendo...' : 'Añadir servicio'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}