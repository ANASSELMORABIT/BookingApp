/** Textos y colores para los estados que llegan del backend en inglés. */

export interface StatusStyle {
  label: string
  /** Color sólido (calendario, gráficas, puntos de leyenda) */
  color: string
  /** Clases de Tailwind para la etiqueta */
  badge: string
}

export const BOOKING_STATUS: Record<string, StatusStyle> = {
  Pending:   { label: 'Pendiente',  color: '#F59E0B', badge: 'bg-amber-500/10 text-amber-300 border-amber-500/20' },
  Confirmed: { label: 'Confirmada', color: '#10B981', badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' },
  Completed: { label: 'Completada', color: '#3B82F6', badge: 'bg-blue-500/10 text-blue-300 border-blue-500/20' },
  Cancelled: { label: 'Cancelada',  color: '#EF4444', badge: 'bg-rose-500/10 text-rose-300 border-rose-500/20' },
  NoShow:    { label: 'No presentado', color: '#A855F7', badge: 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20' },
}

export const PAYMENT_STATUS: Record<string, StatusStyle> = {
  Unpaid:   { label: 'Sin pagar',   color: '#94A3B8', badge: 'bg-white/5 text-slate-300 border-white/10' },
  Paid:     { label: 'Pagado',      color: '#10B981', badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' },
  Refunded: { label: 'Reembolsado', color: '#A78BFA', badge: 'bg-violet-500/10 text-violet-300 border-violet-500/20' },
}

const FALLBACK: StatusStyle = { label: '', color: '#94A3B8', badge: 'bg-white/5 text-slate-300 border-white/10' }

export function bookingStatus(status: string): StatusStyle {
  return BOOKING_STATUS[status] ?? { ...FALLBACK, label: status }
}

export function paymentStatus(status: string): StatusStyle {
  return PAYMENT_STATUS[status] ?? { ...FALLBACK, label: status }
}

export const ROLE_LABELS: Record<string, string> = {
  SuperAdmin: 'Super admin',
  Owner: 'Propietario',
  Staff: 'Equipo',
  Client: 'Cliente',
}

export const roleLabel = (role?: string) => (role ? ROLE_LABELS[role] ?? role : '')

/** Fecha "YYYY-MM-DD" en hora local (toISOString usa UTC y puede cambiar de día). */
export function toLocalIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

export const formatPrice = (n: number) =>
  n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
