import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { CalendarX2, Eye, Save, Timer, UserX, Info } from 'lucide-react'
import { businessApi } from '@/api/business'
import { Switch } from '@/components/app/Switch'
import { policyItems } from '@/lib/policies'
import type { Business, BusinessPolicies } from '@/types'

const numberClass = 'h-9 w-20 rounded-lg border border-white/10 bg-white/5 px-2 text-center text-sm text-white outline-none focus:border-violet-500 tabular-nums'

/** Fila de una norma: icono, texto, interruptor y sus ajustes si está activa. */
function PolicyRow({ icon: Icon, title, text, checked, onChange, children }: {
  icon: typeof Info; title: string; text: string; checked: boolean; onChange: (v: boolean) => void; children?: React.ReactNode
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
      <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300"><Icon size={15} /></span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-white">{title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{text}</p>
          </div>
          <Switch checked={checked} onChange={onChange} label={`${checked ? 'Desactivar' : 'Activar'}: ${title}`} />
        </div>
        {checked && children && <div className="mt-3">{children}</div>}
      </div>
    </div>
  )
}

/** Normas del negocio: qué se muestra al cliente al reservar y qué se aplica automáticamente. */
export function PoliciesForm({ business }: { business: Business }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<BusinessPolicies>(business.policies)
  const dirty = JSON.stringify(form) !== JSON.stringify(business.policies)
  const toleranceOk = form.lateToleranceMinutes >= 5 && form.lateToleranceMinutes <= 60
  const noticeOk = form.cancellationNoticeHours >= 1 && form.cancellationNoticeHours <= 168
  const valid = toleranceOk && noticeOk && (form.extraPolicy ?? '').length <= 500

  const save = useMutation({
    mutationFn: () => businessApi.updatePolicies(business.id, { ...form, extraPolicy: form.extraPolicy?.trim() || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businesses'] })
      toast.success('Normas guardadas')
    },
    onError: (err) => toast.error(
      (isAxiosError<{ message?: string }>(err) && err.response?.data?.message) || 'No se pudieron guardar las normas.'),
  })

  const set = <K extends keyof BusinessPolicies>(key: K, value: BusinessPolicies[K]) => setForm(f => ({ ...f, [key]: value }))

  return (
    <form onSubmit={e => { e.preventDefault(); if (valid && dirty) save.mutate() }} className="space-y-3">
      <PolicyRow icon={UserX} title="Sin acompañantes" text="Se pide al cliente que venga sin acompañantes."
        checked={form.noCompanionsPolicy} onChange={v => set('noCompanionsPolicy', v)} />

      <PolicyRow icon={Timer} title="Cancelación automática por retraso"
        text="Si el cliente no ha llegado pasados unos minutos, la reserva se cancela sola y el cliente pasa a la lista de avisos. Marca «Ha llegado» en la Agenda cuando llegue."
        checked={form.autoCancelLate} onChange={v => set('autoCancelLate', v)}>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          Margen de
          <input type="number" min={5} max={60} value={form.lateToleranceMinutes}
            onChange={e => set('lateToleranceMinutes', Number(e.target.value))} className={numberClass} aria-invalid={!toleranceOk} />
          minutos
        </label>
        {!toleranceOk && <p className="mt-1 text-xs text-rose-300">Entre 5 y 60 minutos.</p>}
      </PolicyRow>

      <PolicyRow icon={CalendarX2} title="Bloquear a quien cancela sin aviso"
        text="Si un cliente cancela con menos antelación, no podrá volver a reservar hasta que lo desbloquees en Clientes."
        checked={form.blockLateCancellations} onChange={v => set('blockLateCancellations', v)}>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          Avisar con al menos
          <input type="number" min={1} max={168} value={form.cancellationNoticeHours}
            onChange={e => set('cancellationNoticeHours', Number(e.target.value))} className={numberClass} aria-invalid={!noticeOk} />
          horas
        </label>
        {!noticeOk && <p className="mt-1 text-xs text-rose-300">Entre 1 y 168 horas.</p>}
      </PolicyRow>

      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
        <label htmlFor="extra-policy" className="flex items-center gap-2 text-sm font-medium text-white">
          <Info size={15} className="text-violet-300" /> Otras normas <span className="text-xs font-normal text-slate-500">(opcional)</span>
        </label>
        <textarea id="extra-policy" rows={2} maxLength={500} value={form.extraPolicy ?? ''}
          onChange={e => set('extraPolicy', e.target.value)}
          placeholder="Ej.: Llega 5 minutos antes. No se admiten mascotas."
          className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-violet-500" />
        <p className="text-right text-[11px] text-slate-500">{(form.extraPolicy ?? '').length}/500</p>
      </div>

      {/* Así lo verá el cliente */}
      <details className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
        <summary className="flex cursor-pointer list-none items-center gap-2 text-sm text-slate-300"><Eye size={14} /> Ver cómo lo verá el cliente</summary>
        <ul className="mt-3 space-y-2">
          {policyItems(form).map(item => (
            <li key={item.title} className="text-xs text-slate-300"><span className="font-medium text-white">{item.title}.</span> {item.text}</li>
          ))}
          {!policyItems(form).length && <li className="text-xs text-slate-400">Sin normas: el cliente reserva sin tener que aceptar nada.</li>}
        </ul>
      </details>

      <div className="flex justify-end">
        <button type="submit" disabled={!dirty || !valid || save.isPending}
          className="flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-medium text-white shadow-lg shadow-violet-600/25 transition-colors hover:bg-violet-500 disabled:opacity-40">
          <Save size={14} /> {save.isPending ? 'Guardando…' : 'Guardar normas'}
        </button>
      </div>
    </form>
  )
}
