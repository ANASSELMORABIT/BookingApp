import { Check, ShieldAlert } from 'lucide-react'
import type { BusinessPolicies } from '@/types'
import { hasPolicies, policyItems } from '@/lib/policies'
import { cn } from '@/lib/utils'

/** Normas del negocio y casilla para aceptarlas (obligatoria para reservar). */
export function PoliciesNotice({ policies, accepted, onAcceptedChange }: {
  policies: BusinessPolicies
  accepted: boolean
  onAcceptedChange: (accepted: boolean) => void
}) {
  if (!hasPolicies(policies)) return null
  return (
    <div className="policies-box rounded-xl p-4" role="region" aria-labelledby="policies-title">
      <p id="policies-title" className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-100">
        <ShieldAlert size={15} className="text-amber-300" /> Antes de reservar, ten en cuenta
      </p>
      <ul className="space-y-3">
        {policyItems(policies).map(item => (
          <li key={item.title} className="flex gap-3">
            <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300">
              <item.icon size={14} />
            </span>
            <div>
              <p className="text-sm font-medium text-white">{item.title}</p>
              <p className="text-xs leading-relaxed text-slate-300">{item.text}</p>
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        role="checkbox"
        aria-checked={accepted}
        onClick={() => onAcceptedChange(!accepted)}
        className={cn('mt-4 flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors',
          accepted ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100' : 'border-white/15 bg-white/[0.03] text-slate-200 hover:bg-white/[0.06]')}
      >
        <span className={cn('flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border transition-colors',
          accepted ? 'border-emerald-400 bg-emerald-500 text-white' : 'border-white/25')}>
          {accepted && <Check size={12} />}
        </span>
        He leído y acepto las normas del negocio
      </button>
    </div>
  )
}
