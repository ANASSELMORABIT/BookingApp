import { bookingStatus, paymentStatus } from '@/lib/labels'
import { cn } from '@/lib/utils'

/** Etiqueta de estado de una reserva o de su pago, en español. */
export function StatusBadge({ status, kind = 'booking', className }: {
  status: string
  kind?: 'booking' | 'payment'
  className?: string
}) {
  const s = kind === 'booking' ? bookingStatus(status) : paymentStatus(status)
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium', s.badge, className)}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} aria-hidden />
      {s.label}
    </span>
  )
}
