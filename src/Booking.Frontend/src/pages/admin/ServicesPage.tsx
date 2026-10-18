import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { businessApi } from '@/api/business'
import { getBusinessConfig } from '@/lib/businessIcons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Clock, Scissors, Search, ChevronRight } from 'lucide-react'
import type { Service } from '@/types'
import { toast } from 'sonner'
import { PageHeader } from '@/components/app/PageHeader'
import { PageLoader } from '@/components/app/PageLoader'
import { EmptyState } from '@/components/app/EmptyState'
import { Segmented } from '@/components/app/Segmented'
import { Switch } from '@/components/app/Switch'
import { formatPrice } from '@/lib/labels'
import { ExtrasDialog } from '@/components/booking/ExtrasDialog'
import { useAuth } from '@/context/AuthContext'
import { Sparkles } from 'lucide-react'

const onError = () => toast.error('No se pudo guardar. Revisa los datos e inténtalo de nuevo.')

export function ServicesPage() {
  const queryClient = useQueryClient()
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [extrasServiceId, setExtrasServiceId] = useState<string | null>(null)
  const { user } = useAuth()
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'name' | 'price' | 'duration'>('name')

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
      toast.success('Servicio creado')
    },
    onError,
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
      toast.success('Cambios guardados')
    },
    onError,
  })

  const deleteMutation = useMutation({
    mutationFn: () => businessApi.deleteService(selectedService!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', activeBusiness?.id] })
      queryClient.invalidateQueries({ queryKey: ['businesses'] })
      setShowDeleteModal(false)
      setSelectedService(null)
      toast.success('Servicio eliminado')
    },
    onError: () => toast.error('No se pudo eliminar el servicio.'),
  })

  const toggleMutation = useMutation({
    mutationFn: (service: Service) => businessApi.updateService(service.id, {
      name: service.name,
      description: service.description,
      durationMinutes: service.durationMinutes,
      price: service.price,
      isActive: !service.isActive,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['services', activeBusiness?.id] }),
    onError,
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

  if (bizLoading) return <PageLoader label="Cargando servicios…" cards={2} />

  const activeServices = services?.filter(s => s.isActive) ?? []
  const inactiveServices = services?.filter(s => !s.isActive) ?? []

  const q = search.trim().toLowerCase()
  const arrange = (list: Service[]) => list
    .filter(s => !q || s.name.toLowerCase().includes(q) || (s.description ?? '').toLowerCase().includes(q))
    .sort((a, b) => sort === 'price' ? b.price - a.price
      : sort === 'duration' ? a.durationMinutes - b.durationMinutes
      : a.name.localeCompare(b.name, 'es'))
  const shownActive = arrange(activeServices)
  const shownInactive = arrange(inactiveServices)

  return (
    <div className="space-y-6 max-w-5xl">

      {/* Header */}
      <PageHeader
        title="Servicios"
        subtitle="Gestiona los servicios de tus negocios"
        actions={
          <Button
            onClick={() => setShowCreateModal(true)}
            disabled={!activeBusiness}
            className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl px-4 h-10 flex items-center gap-2 shadow-lg shadow-violet-600/20"
          >
            <Plus size={16} /> Nuevo servicio
          </Button>
        }
      />

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

      {/* Búsqueda y orden */}
      {!!services?.length && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="profile-field relative block sm:w-80">
            <span className="sr-only">Buscar servicios</span>
            <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar servicio"
              className="h-10 w-full rounded-xl bg-transparent pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-500"
            />
          </label>
          <Segmented
            label="Ordenar servicios"
            size="sm"
            value={sort}
            onChange={setSort}
            options={[
              { id: 'name', label: 'Nombre' },
              { id: 'price', label: 'Precio' },
              { id: 'duration', label: 'Duración' },
            ]}
          />
        </div>
      )}

      {servicesLoading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton h-40" />)}
        </div>
      ) : (
        <div className="space-y-6">
          {shownActive.length > 0 && (
            <section className="space-y-3" aria-label="Servicios activos">
              <h2 className="text-sm font-semibold text-white">
                Activos <span className="font-normal text-slate-500">· {shownActive.length}</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {shownActive.map((s, i) => (
                  <ServiceCard
                    key={s.id}
                    index={i}
                    service={s}
                    toggling={toggleMutation.isPending && toggleMutation.variables?.id === s.id}
                    onEdit={() => openEdit(s)}
                    onDelete={() => openDelete(s)}
                    onExtras={() => setExtrasServiceId(s.id)}
                    onToggle={() => toggleMutation.mutate(s)}
                  />
                ))}
              </div>
            </section>
          )}

          {shownInactive.length > 0 && (
            <details className="inactive-group group" open={!!q}>
              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-white">
                <ChevronRight size={15} className="text-slate-400 transition-transform duration-300 group-open:rotate-90" />
                Inactivos <span className="font-normal text-slate-500">· {shownInactive.length} · ocultos para tus clientes</span>
              </summary>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                {shownInactive.map((s, i) => (
                  <ServiceCard
                    key={s.id}
                    index={i}
                    service={s}
                    toggling={toggleMutation.isPending && toggleMutation.variables?.id === s.id}
                    onEdit={() => openEdit(s)}
                    onDelete={() => openDelete(s)}
                    onExtras={() => setExtrasServiceId(s.id)}
                    onToggle={() => toggleMutation.mutate(s)}
                  />
                ))}
              </div>
            </details>
          )}

          {!!services?.length && shownActive.length + shownInactive.length === 0 && (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02]">
              <EmptyState icon={Search} title="Ningún servicio coincide" text={`No hay resultados para "${search.trim()}".`} />
            </div>
          )}

          {!services?.length && (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02]">
              <EmptyState
                icon={Scissors}
                title="Sin servicios todavía"
                text="Crea tu primer servicio con su duración y precio para que tus clientes puedan reservarlo."
                action={
                  <Button onClick={() => setShowCreateModal(true)} disabled={!activeBusiness}
                    className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl px-4 h-10 flex items-center gap-2">
                    <Plus size={16} /> Crear servicio
                  </Button>
                }
              />
            </div>
          )}
        </div>
      )}

      {/* Extras del servicio (se leen de la lista para verlos siempre actualizados) */}
      <ExtrasDialog
        service={services?.find(s => s.id === extrasServiceId) ?? null}
        businessId={activeBusiness?.id}
        open={!!extrasServiceId}
        onOpenChange={open => { if (!open) setExtrasServiceId(null) }}
        canDelete={user?.role === 'Owner' || user?.role === 'SuperAdmin'}
      />

      {/* Modal crear */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="app-dialog max-w-md">
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
        <DialogContent className="app-dialog max-w-md">
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
              <Switch
                checked={form.isActive}
                onChange={v => setForm(f => ({ ...f, isActive: v }))}
                label={form.isActive ? 'Desactivar servicio' : 'Activar servicio'}
              />
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
        <DialogContent className="app-dialog max-w-sm">
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

/** Tarjeta de servicio: nombre, descripción, precio destacado, duración y acciones. */
function ServiceCard({
  service, index, toggling, onEdit, onDelete, onToggle, onExtras,
}: {
  service: Service
  index: number
  toggling: boolean
  onEdit: () => void
  onDelete: () => void
  onToggle: () => void
  onExtras: () => void
}) {
  return (
    <article
      style={{ '--i': index } as React.CSSProperties}
      className={`list-in lift-card group/card flex flex-col rounded-2xl border p-5 ${
        service.isActive ? 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.045]' : 'border-white/[0.06] bg-white/[0.015]'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={`font-semibold ${service.isActive ? 'text-white' : 'text-slate-300'}`}>{service.name}</h3>
          {service.description
            ? <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">{service.description}</p>
            : <p className="mt-1 text-xs italic text-slate-500">Sin descripción</p>}
        </div>
        <Switch
          checked={service.isActive}
          onChange={onToggle}
          disabled={toggling}
          label={service.isActive ? `Desactivar ${service.name}` : `Activar ${service.name}`}
        />
      </div>

      {/* Extras: el cliente los añade al reservar */}
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {service.extras.filter(e => e.isActive).slice(0, 3).map(e => (
          <span key={e.id} className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 text-[11px] text-violet-200">
            {e.name} · +{formatPrice(e.price)}
          </span>
        ))}
        {service.extras.filter(e => e.isActive).length > 3 && (
          <span className="text-[11px] text-slate-400">+{service.extras.filter(e => e.isActive).length - 3} más</span>
        )}
        <button
          onClick={onExtras}
          className="flex items-center gap-1 rounded-full border border-dashed border-white/15 px-2 py-0.5 text-[11px] text-slate-300 transition-colors hover:border-violet-400/50 hover:text-white"
        >
          <Sparkles size={11} /> {service.extras.length ? 'Gestionar extras' : 'Añadir extras'}
        </button>
      </div>

      <div className="mt-5 flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <span className={`text-2xl font-semibold tracking-tight tabular-nums ${service.isActive ? 'text-white' : 'text-slate-400'}`}>
            {formatPrice(service.price)}
          </span>
          <span className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs text-slate-300 tabular-nums">
            <Clock size={11} className="text-violet-300" /> {service.durationMinutes} min
          </span>
        </div>
        <div className="flex gap-1.5 opacity-80 transition-opacity group-hover/card:opacity-100">
          <button
            onClick={onEdit}
            aria-label={`Editar ${service.name}`}
            title="Editar"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-slate-400 transition-colors hover:border-violet-500/30 hover:bg-violet-500/10 hover:text-violet-300"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={onDelete}
            aria-label={`Eliminar ${service.name}`}
            title="Eliminar"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-slate-400 transition-colors hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </article>
  )
}