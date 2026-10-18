import { CalendarX2, Info, Timer, UserX } from 'lucide-react'
import type { BusinessPolicies } from '@/types'

export function hasPolicies(p?: BusinessPolicies | null): boolean {
  return !!p && (p.noCompanionsPolicy || p.autoCancelLate || p.blockLateCancellations || !!p.extraPolicy?.trim())
}

/** Textos de las normas del negocio tal como las ve el cliente. */
export function policyItems(p: BusinessPolicies) {
  const items: { icon: typeof Info; title: string; text: string }[] = []
  if (p.noCompanionsPolicy)
    items.push({ icon: UserX, title: 'Ven sin acompañantes', text: 'Por espacio y comodidad, acude solo o sola a tu cita.' })
  if (p.autoCancelLate)
    items.push({
      icon: Timer,
      title: `Llega a tu hora (${p.lateToleranceMinutes} min de margen)`,
      text: `Si pasan ${p.lateToleranceMinutes} minutos de la hora y no has llegado, la reserva se cancela automáticamente y quedarás en la lista de avisos del negocio para tus próximas reservas.`,
    })
  if (p.blockLateCancellations)
    items.push({
      icon: CalendarX2,
      title: `Cancela con ${p.cancellationNoticeHours} h de antelación`,
      text: `Si cancelas con menos de ${p.cancellationNoticeHours} horas, no podrás volver a reservar en este negocio.`,
    })
  if (p.extraPolicy?.trim())
    items.push({ icon: Info, title: 'Otras normas', text: p.extraPolicy.trim() })
  return items
}
