import { cn } from '@/lib/utils'

/** Interruptor animado (activar / desactivar). */
export function Switch({ checked, onChange, label, disabled, className }: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn('app-switch', checked && 'is-on', className)}
    >
      <span className="app-switch-thumb" aria-hidden />
    </button>
  )
}
