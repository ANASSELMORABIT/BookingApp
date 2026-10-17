import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { businessApi } from '@/api/business'
import { getBusinessConfig } from '@/lib/businessIcons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Users, Scissors, Clock, Phone, MapPin, Pencil, UserPlus, Power } from 'lucide-react'
import type { Business } from '@/types'
import { toast } from 'sonner'
import { PageHeader } from '@/components/app/PageHeader'
import { PageLoader } from '@/components/app/PageLoader'
import { EmptyState } from '@/components/app/EmptyState'
import { Building2 } from 'lucide-react'

const onError = () => toast.error('No se pudo guardar. Revisa los datos e inténtalo de nuevo.')

export function BusinessPage() {
  const queryClient = useQueryClient()
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showStaffModal, setShowStaffModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'services' | 'staff'>('services')

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
      onSuccess: (updatedBusiness) => {
        queryClient.invalidateQueries({ queryKey: ['businesses'] })
        // Actualiza el negocio seleccionado inmediatamente
        setSelectedBusiness(prev => prev ? { ...prev, ...updatedBusiness } : null)
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
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">
            Negocios ({businesses?.length ?? 0})
          </p>
          {businesses?.map(b => {
            const config = getBusinessConfig(b.category)
            return (
              <button
                key={b.id}
                onClick={() => setSelectedBusiness(b)}
                className={`w-full text-left p-4 rounded-2xl border transition-all duration-150 ${
                  selectedBusiness?.id === b.id
                    ? `${config.bg} ${config.border}`
                    : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${config.bg} rounded-xl flex items-center justify-center border ${config.border}`}>
                    <config.icon size={18} className={config.color} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{b.name}</p>
                    <p className={`text-xs font-medium ${config.color}`}>{config.label}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/[0.05]">
                  <span className="flex items-center gap-1 text-slate-500 text-xs">
                    <Scissors size={11} /> {b.totalServices} servicios
                  </span>
                  <span className="flex items-center gap-1 text-slate-500 text-xs">
                    <Users size={11} /> {b.totalStaff} staff
                  </span>
                  <span className="flex items-center gap-1 text-slate-500 text-xs">
                    <Clock size={11} /> {b.openTime}-{b.closeTime}
                  </span>
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
        {selectedBusiness ? (
          <div className="lg:col-span-2 space-y-4">
            {(() => {
              const config = getBusinessConfig(selectedBusiness.category)
              return (
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 ${config.bg} rounded-xl flex items-center justify-center border ${config.border}`}>
                        <config.icon size={22} className={config.color} />
                      </div>
                      <div>
                        <h2 className="text-white font-bold text-lg">{selectedBusiness.name}</h2>
                        <p className={`text-sm font-medium ${config.color}`}>{config.label}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
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
                      className="border-white/10 text-slate-300 hover:bg-white/5 rounded-xl h-8 text-xs"
                    >
                      <Pencil size={12} className="mr-1" /> Editar
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { icon: Clock, label: 'Horario', value: `${selectedBusiness.openTime} - ${selectedBusiness.closeTime}` },
                      { icon: Phone, label: 'Teléfono', value: selectedBusiness.phone ?? 'No especificado' },
                      { icon: MapPin, label: 'Dirección', value: selectedBusiness.address ?? 'No especificada' },
                    ].map(item => (
                      <div key={item.label} className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                        <item.icon size={13} className={`${config.color} mb-1.5`} />
                        <p className="text-slate-500 text-[10px]">{item.label}</p>
                        <p className="text-white text-xs font-medium mt-0.5 truncate">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}

            {/* Tabs */}
            <div className="flex gap-1 bg-white/[0.03] border border-white/10 rounded-xl p-1 w-fit">
              {[
                { id: 'services', label: 'Servicios', icon: Scissors },
                { id: 'staff', label: 'Staff', icon: Users },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'services' | 'staff')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <tab.icon size={13} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Services */}
            {activeTab === 'services' && (
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                    <Scissors size={15} className="text-violet-400" /> Servicios
                  </h3>
                  <Button
                    size="sm"
                    onClick={() => setShowServiceModal(true)}
                    className="bg-violet-600/20 hover:bg-violet-600/30 text-violet-400 border border-violet-500/20 rounded-xl h-8 text-xs"
                  >
                    <Plus size={12} className="mr-1" /> Añadir
                  </Button>
                </div>
                <div className="space-y-2">
                  {services?.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                      <div>
                        <p className="text-white text-sm font-medium">{s.name}</p>
                        <p className="text-slate-500 text-xs mt-0.5">{s.durationMinutes} min</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white text-sm font-semibold">{s.price.toFixed(2)}€</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded-md ${
                          s.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {s.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                  ))}
                  {!services?.length && (
                    <p className="text-slate-600 text-sm text-center py-6">Sin servicios</p>
                  )}
                </div>
              </div>
            )}

            {/* Staff */}
            {activeTab === 'staff' && (
              <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                    <Users size={15} className="text-violet-400" /> Staff
                  </h3>
                  <Button
                    size="sm"
                    onClick={() => setShowStaffModal(true)}
                    className="bg-violet-600/20 hover:bg-violet-600/30 text-violet-400 border border-violet-500/20 rounded-xl h-8 text-xs"
                  >
                    <UserPlus size={12} className="mr-1" /> Añadir
                  </Button>
                </div>
                <div className="space-y-2">
                  {staff?.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-violet-500/20 rounded-lg flex items-center justify-center">
                          <span className="text-violet-400 text-xs font-bold">{s.name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{s.name}</p>
                          <p className="text-slate-500 text-xs">{s.email ?? 'Sin email'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded-md ${
                          s.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {s.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                        <button
                          onClick={() => toggleStaffMutation.mutate(s.id)}
                          aria-label={s.isActive ? `Desactivar a ${s.name}` : `Activar a ${s.name}`}
                          title={s.isActive ? 'Desactivar' : 'Activar'}
                          className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                        >
                          <Power size={12} className="text-slate-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {!staff?.length && (
                    <p className="text-slate-600 text-sm text-center py-6">Sin staff</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="lg:col-span-2 flex items-center justify-center h-64 rounded-2xl border border-dashed border-white/10 text-slate-400 text-sm">
            Selecciona un negocio para ver sus detalles
          </div>
        )}
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