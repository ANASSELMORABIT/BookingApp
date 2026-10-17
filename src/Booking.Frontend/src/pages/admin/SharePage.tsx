import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Camera, CheckCircle2, Circle, Copy, ExternalLink, Globe, MapPin, MessageCircle, Share2,
} from 'lucide-react'
import { profileApi } from '@/api/profile'
import { publicApi } from '@/api/public'
import { getBusinessConfig } from '@/lib/businessIcons'
import { formatPrice } from '@/lib/labels'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/app/PageHeader'
import { PageLoader } from '@/components/app/PageLoader'

const TIPS = [
  { icon: Camera, title: 'En tu biografía', text: 'Pon el enlace en Instagram o TikTok para que reserven sin escribirte.' },
  { icon: MessageCircle, title: 'Como respuesta rápida', text: 'Guárdalo en WhatsApp Business y envíalo cuando te pidan cita.' },
  { icon: MapPin, title: 'En Google', text: 'Añádelo como enlace de reservas en tu ficha de Google Business.' },
]

/** Página pública: el enlace que comparten los negocios para recibir reservas, y cómo lo ven sus clientes. */
export function SharePage() {
  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: profileApi.get,
  })
  const subdomain = profile?.tenantSubdomain

  // Se pide igual que la página pública, para enseñar exactamente lo que verá el cliente
  const { data: publicBusinesses, isLoading: previewLoading } = useQuery({
    queryKey: ['public-business', subdomain],
    queryFn: () => publicApi.getBusiness(subdomain!),
    enabled: !!subdomain,
    retry: false,
  })

  if (isLoading) return <PageLoader label="Cargando tu página pública…" cards={0} />

  const link = subdomain ? `${window.location.origin}/book/${subdomain}` : ''
  const hasBusiness = !!publicBusinesses?.length
  const hasServices = !!publicBusinesses?.some(b => b.services.length > 0)
  const hasStaff = !!publicBusinesses?.some(b => b.staff.length > 0)
  const ready = hasBusiness && hasServices && hasStaff

  const checklist = [
    { done: hasBusiness, label: 'Tienes al menos un negocio', to: '/business' },
    { done: hasServices, label: 'Hay algún servicio activo para reservar', to: '/services' },
    { done: hasStaff, label: 'Hay alguien del equipo que atienda', to: '/business' },
  ]

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      toast.success('Enlace copiado')
    } catch {
      toast.error('No se pudo copiar. Selecciona el enlace y cópialo a mano.')
    }
  }

  const share = async () => {
    try {
      await navigator.share({ title: 'Reserva tu cita', url: link })
    } catch {
      // El usuario cerró el diálogo de compartir: no hay nada que hacer
    }
  }
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator

  return (
    <div className="space-y-6">
      <PageHeader title="Página pública" subtitle="Comparte este enlace y tus clientes reservarán sin crear cuenta." />

      {/* Enlace */}
      <div className="share-hero relative overflow-hidden rounded-3xl p-6 sm:p-8">
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex items-center gap-2">
              <span className={cn('h-2 w-2 rounded-full', ready ? 'bg-emerald-400' : 'bg-amber-400')} />
              <span className={cn('text-xs font-medium', ready ? 'text-emerald-300' : 'text-amber-300')}>
                {ready ? 'Lista para recibir reservas' : 'Le falta algún paso para recibir reservas'}
              </span>
            </div>
            <p className="text-sm text-slate-400">Tu enlace de reservas</p>
            <p className="mt-1 break-all font-mono text-lg text-white sm:text-xl">
              {window.location.host}/book/<span className="text-violet-300">{subdomain}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={copy} className="btn-primary !h-11 text-sm">
              <Copy size={15} /> Copiar enlace
            </button>
            {canShare && (
              <button onClick={share} className="btn-ghost !h-11 text-sm">
                <Share2 size={15} /> Compartir
              </button>
            )}
            <a href={link} target="_blank" rel="noreferrer" className="btn-ghost !h-11 text-sm">
              <ExternalLink size={15} /> Abrir
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Vista previa */}
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 lg:col-span-3" aria-labelledby="preview-title">
          <h2 id="preview-title" className="flex items-center gap-2 text-sm font-semibold text-white">
            <Globe size={15} className="text-violet-400" /> Lo que verán tus clientes
          </h2>
          {previewLoading ? (
            <div className="mt-5 space-y-3">
              <div className="skeleton h-16" />
              <div className="skeleton h-12" />
              <div className="skeleton h-12" />
            </div>
          ) : !hasBusiness ? (
            <p className="mt-5 text-sm text-slate-400">
              Todavía no hay nada que mostrar. <Link to="/business" className="text-violet-300 hover:text-violet-200">Crea tu primer negocio</Link>.
            </p>
          ) : (
            <div className="mt-5 space-y-6">
              {publicBusinesses!.map(b => {
                const config = getBusinessConfig(b.category)
                return (
                  <div key={b.id}>
                    <div className="flex items-center gap-3">
                      <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl border', config.bg, config.border)}>
                        <config.icon size={18} className={config.color} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">{b.name}</p>
                        <p className="text-xs text-slate-400">{config.label} · {b.openTime} – {b.closeTime} · {b.staff.length} en el equipo</p>
                      </div>
                    </div>
                    {b.services.length ? (
                      <ul className="mt-3 divide-y divide-white/[0.05] rounded-xl border border-white/[0.06]">
                        {b.services.map(s => (
                          <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                            <span className="min-w-0 truncate text-slate-200">{s.name}</span>
                            <span className="flex-shrink-0 text-xs text-slate-400 tabular-nums">{s.durationMinutes} min · <span className="text-white">{formatPrice(s.price)}</span></span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 rounded-xl border border-dashed border-amber-500/30 px-4 py-3 text-xs text-amber-200">
                        Este negocio no tiene servicios activos, así que sus clientes no podrán reservar.
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <div className="space-y-6 lg:col-span-2">
          {/* Lista de comprobación */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6" aria-labelledby="checklist-title">
            <h2 id="checklist-title" className="text-sm font-semibold text-white">Antes de compartirla</h2>
            <ul className="mt-4 space-y-3">
              {checklist.map(item => (
                <li key={item.label} className="flex items-start gap-3 text-sm">
                  {item.done
                    ? <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-emerald-400" aria-label="Hecho" />
                    : <Circle size={18} className="mt-0.5 flex-shrink-0 text-slate-600" aria-label="Pendiente" />}
                  <span className={item.done ? 'text-slate-300' : 'text-white'}>
                    {item.label}
                    {!item.done && <> · <Link to={item.to} className="text-violet-300 hover:text-violet-200">Resolver</Link></>}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* Ideas */}
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6" aria-labelledby="tips-title">
            <h2 id="tips-title" className="text-sm font-semibold text-white">Dónde ponerla</h2>
            <ul className="mt-4 space-y-4">
              {TIPS.map(t => (
                <li key={t.title} className="flex gap-3">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                    <t.icon size={15} className="text-violet-300" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-white">{t.title}</p>
                    <p className="text-xs leading-relaxed text-slate-400">{t.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
