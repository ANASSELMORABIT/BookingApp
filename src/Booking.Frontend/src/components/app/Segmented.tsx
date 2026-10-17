import type { ComponentType, CSSProperties } from 'react'
import { cn } from '@/lib/utils'

export interface SegmentedOption<T extends string> {
  id: T
  label: string
  icon?: ComponentType<{ size?: number; className?: string }>
  count?: number
}

/**
 * Selector de pestañas o vistas con un indicador que se desliza entre opciones.
 * Con `asTabs` se comporta como pestañas (role="tab"); si no, como grupo de botones.
 */
export function Segmented<T extends string>({
  options, value, onChange, label, asTabs, className, size = 'md',
}: {
  options: readonly SegmentedOption<T>[]
  value: T
  onChange: (id: T) => void
  label: string
  asTabs?: boolean
  className?: string
  size?: 'sm' | 'md'
}) {
  const index = Math.max(0, options.findIndex(o => o.id === value))
  return (
    <div
      className={cn('segmented relative inline-grid rounded-xl p-1', className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`, '--n': options.length, '--i': index } as CSSProperties}
      role={asTabs ? 'tablist' : 'group'}
      aria-label={label}
    >
      <span className="segmented-indicator" aria-hidden />
      {options.map(o => {
        const active = o.id === value
        return (
          <button
            key={o.id}
            type="button"
            role={asTabs ? 'tab' : undefined}
            aria-selected={asTabs ? active : undefined}
            aria-pressed={asTabs ? undefined : active}
            onClick={() => onChange(o.id)}
            className={cn(
              'relative z-10 flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-colors',
              size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm',
              active ? 'text-white' : 'text-slate-400 hover:text-white'
            )}
          >
            {o.icon && <o.icon size={size === 'sm' ? 12 : 14} />}
            {o.label}
            {o.count !== undefined && (
              <span className={cn('text-[11px] tabular-nums', active ? 'text-violet-100/80' : 'text-slate-500')}>{o.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
