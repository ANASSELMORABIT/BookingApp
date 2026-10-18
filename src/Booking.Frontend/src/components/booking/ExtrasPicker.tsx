import { Check, Clock, Sparkles } from 'lucide-react'
import { formatPrice } from '@/lib/labels'
import { cn } from '@/lib/utils'

export interface ExtraOption {
  id: string
  name: string
  price: number
  extraMinutes: number
}

/** Lista de extras opcionales de un servicio; cada uno se marca o desmarca con un toque. */
export function ExtrasPicker({ extras, selected, onChange }: {
  extras: ExtraOption[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  if (!extras.length) return null
  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])

  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 flex items-center gap-2 text-sm text-slate-300">
        <Sparkles size={14} className="text-violet-300" /> Añade extras <span className="text-xs text-slate-500">(opcional)</span>
      </legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {extras.map(e => {
          const on = selected.includes(e.id)
          return (
            <button
              key={e.id}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => toggle(e.id)}
              className={cn('extra-option flex items-center gap-3 rounded-xl border p-3 text-left', on ? 'is-on' : '')}
            >
              <span className={cn('flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border transition-colors',
                on ? 'border-violet-400 bg-violet-500 text-white' : 'border-white/20')}>
                {on && <Check size={12} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-white">{e.name}</span>
                {e.extraMinutes > 0 && (
                  <span className="flex items-center gap-1 text-xs text-slate-400"><Clock size={10} /> +{e.extraMinutes} min</span>
                )}
              </span>
              <span className="text-sm font-semibold text-violet-200 tabular-nums">+{formatPrice(e.price)}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
