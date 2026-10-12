import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { businessApi } from '@/api/business'
import { getBusinessConfig } from '@/lib/businessIcons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Clock, DollarSign, ToggleLeft, ToggleRight, Scissors } from 'lucide-react'
import type { Service } from '@/types'

export function ServicesPage() {
  const queryClient = useQueryClient()
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedService, setSelectedService] = useState<Service | null>(null)

  const [form, setForm] = useState({
    name: '', description: '', durationMinutes: 30, price: 0, isActive: true
  })

  const { data: businesses, isLoading: bizLoading } = useQuery({
    queryKey: ['businesses'],
    queryFn: businessApi.getAll,
  })

  const activeBusiness = selectedBusinessId
    ? businesses?.find(b => b.id === selectedBusinessId)
    : businesses?.[0]

  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ['services', activeBusiness?.id],
    queryFn: () => businessApi.getServices(activeBusiness!.id),
    enabled: !!activeBusiness,
  })

  const createMutation = useMutation({
    mutationFn: () => businessApi.createService(activeBusiness!.id, {
      name: form.name,
      description: form.description,
      durationMinutes: form.durationMinutes,
      price: form.price,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', activeBusiness?.id] })
      queryClient.invalidateQueries({ queryKey: ['businesses'] })
      setShowCreateModal(false)
      setForm({ name: '', description: '', durationMinutes: 30, price: 0, isActive: true })
    }
  })

  const updateMutation = useMutation({
    mutationFn: () => businessApi.updateService(selectedService!.id, {
      name: form.name,
      description: form.description,
      durationMinutes: form.durationMinutes,
      price: form.price,
      isActive: form.isActive,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', activeBusiness?.id] })
      setShowEditModal(false)
      setSelectedService(null)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: () => businessApi.deleteService(selectedService!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', activeBusiness?.id] })
      queryClient.invalidateQueries({ queryKey: ['businesses'] })
      setShowDeleteModal(false)
      setSelectedService(null)
    }
  })

  const toggleMutation = useMutation({
    mutationFn: (service: Service) => businessApi.updateService(service.id, {
      name: service.name,
      description: service.description,
      durationMinutes: service.durationMinutes,
      price: service.price,
      isActive: !service.isActive,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services', activeBusiness?.id] })
  })

  const openEdit = (s: Service) => {
    setSelectedService(s)
    setForm({
      name: s.name,
      description: s.description ?? '',
      durationMinutes: s.durationMinutes,
      price: s.price,
      isActive: s.isActive,
    })
    setShowEditModal(true)
  }

  const openDelete = (s: Service) => {
    setSelectedService(s)
    setShowDeleteModal(true)
  }

  if (bizLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-3 text-slate-400">
        <span className="w-5 h-5 border-2 border-slate-600 border-t-violet-500 rounded-full animate-spin" />
        Cargando...
      </div>
    </div>
  )

  const activeServices = services?.filter(s => s.isActive) ?? []
  const inactiveServices = services?.filter(s => !s.isActive) ?? []

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Servicios</h1>
          <p className="text-slate-400 mt-1 text-sm">Gestiona los servicios de tus negocios</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          disabled={!activeBusiness}
          className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl px-4 h-10 flex items-center gap-2 shadow-lg shadow-violet-600/20"
        >
          <Plus size={16} /> Nuevo servicio
        </Button>
      </div>

      {/* Selector de negocio */}
      {businesses && businesses.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          {businesses.map(b => {
            const config = getBusinessConfig(b.category)
            const isActive = (selectedBusinessId ?? businesses[0].id) === b.id
            return (
              <button
                key={b.id}
                onClick={() => setSelectedBusinessId(b.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                  isActive
                    ? `${config.bg} ${config.border} ${config.color}`
                    : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <config.icon size={14} />
                {b.name}
              </button>
            )
          })}
        </div>
      )}

      {/* Business info */}
      {activeBusiness && (() => {
        const config = getBusinessConfig(activeBusiness.category)
        return (
          <div className={`flex items-center gap-3 p-4 rounded-2xl border ${config.border} ${config.bg}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${config.border} ${config.bg}`}>
              <config.icon size={18} className={config.color} />
            </div>
            <div>
              <p className="text-white font-semibold">{activeBusiness.name}</p>
              <p className={`text-xs font-medium ${config.color}`}>{config.label} · {activeBusiness.totalServices} servicios</p>
            </div>
            <div className="ml-auto flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                {activeServices.length} activos
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-rose-500 rounded-full" />
                {inactiveServices.length} inactivos
              </span>
            </div>
          </div>
        )
      })()}

      {/* Servicios activos */}
      {servicesLoading ? (
        <div className="flex items-center justify-center h-32 text-slate-500 text-sm">Cargando servicios...</div>
      ) : (
        <div className="space-y-4">
          {activeServices.length > 0 && (
            <div className="space-y-2">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">
                Activos ({activeServices.length})
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeServices.map(s => (
                  <ServiceCard
                    key={s.id}
                    service={s}
                    onEdit={() => openEdit(s)}
                    onDelete={() => openDelete(s)}
                    onToggle={() => toggleMutation.mutate(s)}
                  />
                ))}
              </div>
            </div>
          )}

          {inactiveServices.length > 0 && (
            <div className="space-y-2">
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest">
                Inactivos ({inactiveServices.length})
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {inactiveServices.map(s => (
                  <ServiceCard
                    key={s.id}
                    service={s}
                    onEdit={() => openEdit(s)}
                    onDelete={() => openDelete(s)}
                    onToggle={() => toggleMutation.mutate(s)}
                  />
                ))}
              </div>
            </div>
          )}

          {!services?.length && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-white/[0.03] border border-white/10 rounded-2xl flex items-center justify-center mb-4">
                <Scissors size={24} className="text-slate-600" />
              </div>
              <p className="text-white font-medium">Sin servicios todavía</p>
              <p className="text-slate-500 text-sm mt-1">Crea tu primer servicio pulsando el botón</p>
            </div>
          )}
        </div>
      )}

      {/* Modal crear */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-[#0d0d14] border border-white/10 text-white rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Nuevo servicio</DialogTitle>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); createMutation.mutate() }} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Nombre</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Corte de pelo..." required
                className="bg-white/5 border-white/10 text-white h-10 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Descripción (opcional)</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="bg-white/5 border-white/10 text-white h-10 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Duración (min)</Label>
                <Input type="number" min={5} value={form.durationMinutes}
                  onChange={e => setForm(f => ({ ...f, durationMinutes: parseInt(e.target.value) || 30 }))}
                  required className="bg-white/5 border-white/10 text-white h-10 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Precio (€)</Label>
                <Input type="number" min={0} step={0.01} value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                  required className="bg-white/5 border-white/10 text-white h-10 rounded-xl" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}
                className="border-white/10 text-slate-300 hover:bg-white/5 rounded-xl h-10">
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}
                className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl h-10 shadow-lg shadow-violet-600/20">
                {createMutation.isPending ? 'Creando...' : 'Crear servicio'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal editar */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="bg-[#0d0d14] border border-white/10 text-white rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Editar servicio</DialogTitle>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); updateMutation.mutate() }} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Nombre</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required className="bg-white/5 border-white/10 text-white h-10 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Descripción</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="bg-white/5 border-white/10 text-white h-10 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Duración (min)</Label>
                <Input type="number" min={5} value={form.durationMinutes}
                  onChange={e => setForm(f => ({ ...f, durationMinutes: parseInt(e.target.value) || 30 }))}
                  required className="bg-white/5 border-white/10 text-white h-10 rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Precio (€)</Label>
                <Input type="number" min={0} step={0.01} value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                  required className="bg-white/5 border-white/10 text-white h-10 rounded-xl" />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-white/[0.03] border border-white/10 rounded-xl">
              <div>
                <p className="text-white text-sm font-medium">Estado del servicio</p>
                <p className="text-slate-500 text-xs">{form.isActive ? 'Visible para clientes' : 'Oculto para clientes'}</p>
              </div>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                className="transition-colors"
              >
                {form.isActive
                  ? <ToggleRight size={28} className="text-emerald-400" />
                  : <ToggleLeft size={28} className="text-slate-500" />
                }
              </button>
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

      {/* Modal eliminar */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="bg-[#0d0d14] border border-white/10 text-white rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Eliminar servicio</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
              <p className="text-rose-400 text-sm font-medium">{selectedService?.name}</p>
              <p className="text-slate-400 text-xs mt-1">
                Esta acción no se puede deshacer. Las reservas existentes no se verán afectadas.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowDeleteModal(false)}
                className="border-white/10 text-slate-300 hover:bg-white/5 rounded-xl h-10">
                Cancelar
              </Button>
              <Button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="bg-rose-600 hover:bg-rose-500 text-white rounded-xl h-10"
              >
                {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Componente tarjeta de servicio
function ServiceCard({
  service, onEdit, onDelete, onToggle
}: {
  service: Service
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
}) {
  return (
    <div className={`bg-white/[0.03] border rounded-2xl p-4 transition-all hover:bg-white/[0.05] ${
      service.isActive ? 'border-white/10' : 'border-white/[0.05] opacity-60'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
            service.isActive ? 'bg-violet-500/20 border border-violet-500/20' : 'bg-white/5 border border-white/10'
          }`}>
            <Scissors size={15} className={service.isActive ? 'text-violet-400' : 'text-slate-500'} />
          </div>
          <div>
            <p className="text-white text-sm font-semibold">{service.name}</p>
            {service.description && (
              <p className="text-slate-500 text-xs mt-0.5 truncate max-w-[160px]">{service.description}</p>
            )}
          </div>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
          service.isActive
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
        }`}>
          {service.isActive ? 'Activo' : 'Inactivo'}
        </span>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1.5 text-slate-400 text-xs">
          <Clock size={12} className="text-violet-400" />
          {service.durationMinutes} min
        </div>
        <div className="flex items-center gap-1.5 text-slate-400 text-xs">
          <DollarSign size={12} className="text-emerald-400" />
          {service.price.toFixed(2)}€
        </div>
      </div>

      <div className="flex items-center gap-2 pt-3 border-t border-white/[0.05]">
        <button
          onClick={onToggle}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-1 justify-center ${
            service.isActive
              ? 'bg-white/[0.03] hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 border border-white/[0.06] hover:border-rose-500/20'
              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
          }`}
        >
          {service.isActive
            ? <><ToggleLeft size={13} /> Desactivar</>
            : <><ToggleRight size={13} /> Activar</>
          }
        </button>
        <button
          onClick={onEdit}
          className="w-8 h-8 rounded-lg bg-white/[0.03] hover:bg-violet-500/10 border border-white/[0.06] hover:border-violet-500/20 flex items-center justify-center transition-all group"
        >
          <Pencil size={13} className="text-slate-500 group-hover:text-violet-400" />
        </button>
        <button
          onClick={onDelete}
          className="w-8 h-8 rounded-lg bg-white/[0.03] hover:bg-rose-500/10 border border-white/[0.06] hover:border-rose-500/20 flex items-center justify-center transition-all group"
        >
          <Trash2 size={13} className="text-slate-500 group-hover:text-rose-400" />
        </button>
      </div>
    </div>
  )
}