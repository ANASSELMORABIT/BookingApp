import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { Clock, Plus, Sparkles, Trash2 } from 'lucide-react'
import { businessApi } from '@/api/business'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/app/Switch'
import { formatPrice } from '@/lib/labels'
import type { Service, ServiceExtra } from '@/types'

const apiMessage = (err: unknown, fallback: string) =>
  (isAxiosError<{ message?: string }>(err) && err.response?.data?.message) || fallback

const fieldClass = 'h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-violet-500'

/** Extras de un servicio: el cliente los elige al reservar y suman precio (y minutos, si tienen). */
export function ExtrasDialog({ service, businessId, open, onOpenChange, canDelete }: {
  service: Service | null
  businessId?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  canDelete: boolean
}) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ name: '', price: '', extraMinutes: '0' })
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['services', businessId] })
    // La página pública también muestra los extras
    queryClient.invalidateQueries({ queryKey: ['public-business'] })
  }

  const add = useMutation({
    mutationFn: () => businessApi.addExtra(service!.id, {
      name: form.name.trim(),
      price: Number(form.price.replace(',', '.')) || 0,
      extraMinutes: Number(form.extraMinutes) || 0,
      isActive: true,
    }),
    onSuccess: () => {
      refresh()
      setForm({ name: '', price: '', extraMinutes: '0' })
      toast.success('Extra añadido')
    },
    onError: (err) => toast.error(apiMessage(err, 'No se pudo añadir el extra.')),
  })

  const update = useMutation({
    mutationFn: (e: ServiceExtra) => businessApi.updateExtra(e.id, { name: e.name, price: e.price, extraMinutes: e.extraMinutes, isActive: e.isActive }),
    onSuccess: refresh,
    onError: (err) => toast.error(apiMessage(err, 'No se pudo guardar el extra.')),
  })

  const remove = useMutation({
    mutationFn: (id: string) => businessApi.deleteExtra(id),
    onSuccess: () => { refresh(); toast.success('Extra eliminado') },
    onError: (err) => toast.error(apiMessage(err, 'No se pudo eliminar el extra.')),
  })

  const price = Number(form.price.replace(',', '.'))
  const valid = form.name.trim().length > 0 && form.price !== '' && price >= 0 && Number(form.extraMinutes) >= 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="app-dialog max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white"><Sparkles size={16} className="text-violet-300" /> Extras de {service?.name}</DialogTitle>
          <DialogDescription className="text-slate-400">
            Opciones que el cliente puede añadir al reservar. Suman al precio de {service ? formatPrice(service.price) : ''} y, si tienen minutos, alargan la cita.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2">
          {service?.extras.length ? service.extras.map(e => (
            <li key={e.id} className={`flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 ${e.isActive ? '' : 'opacity-60'}`}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{e.name}</p>
                <p className="flex items-center gap-2 text-xs text-slate-400 tabular-nums">
                  +{formatPrice(e.price)}
                  {e.extraMinutes > 0 && <span className="flex items-center gap-1"><Clock size={10} /> +{e.extraMinutes} min</span>}
                </p>
              </div>
              <Switch
                checked={e.isActive}
                onChange={v => update.mutate({ ...e, isActive: v })}
                disabled={update.isPending && update.variables?.id === e.id}
                label={e.isActive ? `Desactivar ${e.name}` : `Activar ${e.name}`}
              />
              {canDelete && (
                <button
                  onClick={() => remove.mutate(e.id)}
                  disabled={remove.isPending && remove.variables === e.id}
                  aria-label={`Eliminar ${e.name}`}
                  title="Eliminar"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] text-slate-400 transition-colors hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </li>
          )) : (
            <li className="rounded-xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-400">
              Este servicio aún no tiene extras.
            </li>
          )}
        </ul>

        <form
          onSubmit={e => { e.preventDefault(); if (valid) add.mutate() }}
          className="mt-2 grid grid-cols-1 gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 sm:grid-cols-[1fr_6rem_6rem_auto]"
        >
          <label className="sr-only" htmlFor="extra-name">Nombre del extra</label>
          <input id="extra-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Nombre (p. ej. Mascarilla)" maxLength={100} className={fieldClass} />
          <label className="sr-only" htmlFor="extra-price">Precio en euros</label>
          <input id="extra-price" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
            placeholder="€" inputMode="decimal" className={fieldClass} />
          <label className="sr-only" htmlFor="extra-min">Minutos extra</label>
          <input id="extra-min" value={form.extraMinutes} onChange={e => setForm(f => ({ ...f, extraMinutes: e.target.value.replace(/\D/g, '') }))}
            placeholder="min" inputMode="numeric" title="Minutos que añade a la cita (0 si no alarga)" className={fieldClass} />
          <button type="submit" disabled={!valid || add.isPending}
            className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-4 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-40">
            <Plus size={14} /> {add.isPending ? 'Añadiendo…' : 'Añadir'}
          </button>
          <p className="text-[11px] text-slate-500 sm:col-span-4">Precio en euros · minutos que añade a la cita (0 si no la alarga).</p>
        </form>
      </DialogContent>
    </Dialog>
  )
}
