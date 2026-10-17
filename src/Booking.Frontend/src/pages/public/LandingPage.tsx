import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, BarChart3, BellRing, CalendarDays, CreditCard, Globe, Zap,
} from 'lucide-react'
import { useCan3D } from '@/hooks/useCan3D'
import { useScrollProgress } from '@/hooks/useScrollProgress'
import { businessConfigs } from '@/lib/businessIcons'
import { LandingNav } from '@/components/landing/LandingNav'
import { Reveal } from '@/components/landing/Reveal'
import { TiltCard } from '@/components/landing/TiltCard'
import { cn } from '@/lib/utils'

/** Ancho mínimo para mostrar la escena 3D (por debajo se ve la versión estática). */
const MIN_WIDTH_3D = 1024
/** Retraso entre elementos al aparecer (ms). */
const STAGGER_MS = 70

// La escena va en un archivo aparte. Si se abre la página de inicio en escritorio,
// se empieza a descargar en cuanto carga la app, en paralelo con el primer pintado.
const loadHeroScene = () => import('@/components/three/HeroScene')
const heroScenePreload =
  typeof window !== 'undefined' &&
  window.location.pathname === '/' &&
  window.matchMedia(`(min-width: ${MIN_WIDTH_3D}px) and (prefers-reduced-motion: no-preference)`).matches
    ? loadHeroScene()
    : null
const HeroScene = lazy(() => heroScenePreload ?? loadHeroScene())

const AUDIENCES = [
  { key: 'peluquería', text: 'Citas por profesional y servicio, sin solapes ni huecos perdidos.' },
  { key: 'gimnasio', text: 'Sesiones con entrenador y clases por franjas horarias.' },
  { key: 'clínica', text: 'Consultas con recordatorio automático para reducir ausencias.' },
  { key: 'coworking', text: 'Salas y puestos por horas, con pago por adelantado.' },
]

const STEPS = [
  { title: 'Crea tu negocio', text: 'Regístrate y elige el subdominio que identificará a tu negocio.' },
  { title: 'Configura servicios y equipo', text: 'Define duración, precio y qué persona atiende cada servicio.' },
  { title: 'Comparte tu enlace', text: 'Tus clientes reservan desde /book/tu-negocio y tú lo ves al momento.' },
]

function Hero() {
  const can3D = useCan3D(MIN_WIDTH_3D)
  const [ready, setReady] = useState(false)
  const [inView, setInView] = useState(true)
  const sectionRef = useRef<HTMLElement>(null)
  const progress = useScrollProgress(sectionRef, 'sticky')

  // Pausa la escena cuando el hero sale de pantalla o la pestaña está oculta
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    let onScreen = true
    const update = () => setInView(onScreen && document.visibilityState === 'visible')
    const io = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; update() })
    io.observe(el)
    document.addEventListener('visibilitychange', update)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', update)
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      data-3d={can3D ? 'on' : 'off'}
      className={cn('hero relative', can3D ? 'h-[220vh]' : 'min-h-screen')}
    >
      <div className={cn('top-0 overflow-hidden', can3D ? 'sticky h-screen' : 'relative min-h-screen')}>
        {/* Resplandor de fondo: se ve al instante, también mientras carga la escena */}
        <div className="hero-glow absolute inset-0" aria-hidden />

        {can3D && (
          <div className={cn('absolute inset-0 transition-opacity duration-300', ready ? 'opacity-100' : 'opacity-0')} aria-hidden>
            <Suspense fallback={null}>
              <HeroScene progress={progress} active={inView} onReady={() => setReady(true)} />
            </Suspense>
          </div>
        )}

        <div className="relative z-10 mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-4 pb-16 pt-28 sm:px-6 lg:grid-cols-2 lg:pt-16">
          <div className="max-w-xl">
            <p className="hero-rise mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300" style={{ animationDelay: '0ms' }}>
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              Reservas para negocios de servicios
            </p>
            <h1 className="hero-rise text-5xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl" style={{ animationDelay: `${STAGGER_MS}ms` }}>
              Tus reservas,<br />del caos{' '}
              <span className="bg-gradient-to-r from-violet-300 via-violet-400 to-indigo-400 bg-clip-text text-transparent">al orden.</span>
            </h1>
            <p className="hero-rise mt-6 max-w-md text-lg leading-relaxed text-slate-400" style={{ animationDelay: `${STAGGER_MS * 2}ms` }}>
              Deja atrás las llamadas, los mensajes y las notas sueltas. BookingApp reúne citas, equipo, pagos y recordatorios en una sola agenda.
            </p>
            <div className="hero-rise mt-10 flex flex-wrap items-center gap-3" style={{ animationDelay: `${STAGGER_MS * 3}ms` }}>
              <Link to="/register" className="btn-primary group">
                Empieza gratis
                <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
              <Link to="/login" className="btn-ghost">Ya tengo cuenta</Link>
            </div>
          </div>

          {/* Versión estática (móvil, movimiento reducido o sin WebGL): la agenda ya ordenada */}
          {!can3D && (
            <div className="hero-static mx-auto" aria-hidden>
              <div className="hero-static-ring" />
              <div className="hero-static-grid">
                {Array.from({ length: 24 }, (_, i) => (
                  <span key={i} className={cn([3, 8, 14, 19].includes(i) && 'is-on')} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Texto que acompaña al scroll: antes / después */}
        {can3D && (
          <div className="pointer-events-none absolute inset-x-0 bottom-10 z-10 mx-auto max-w-6xl px-6">
            <div className="relative ml-auto h-12 w-fit text-right">
              <p className="hero-caption-before text-sm text-slate-400">
                <span className="text-slate-200">Antes:</span> llamadas, WhatsApp y papel.
              </p>
              <p className="hero-caption-after absolute right-0 top-0 whitespace-nowrap text-sm text-slate-400">
                <span className="text-violet-300">Con BookingApp:</span> una agenda clara, en tiempo real.
              </p>
            </div>
            <div className="hero-scroll-hint absolute bottom-0 left-6 flex items-center gap-3 text-xs text-slate-500">
              <span className="hero-scroll-line" />
              Desliza para ordenar
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <Reveal className="mx-auto mb-14 max-w-2xl text-center">
      <p className="mb-3 text-sm font-medium text-violet-400">{eyebrow}</p>
      <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h2>
      {text && <p className="mt-4 text-lg leading-relaxed text-slate-400">{text}</p>}
    </Reveal>
  )
}

function Audiences() {
  return (
    <section id="para-quien" className="scroll-mt-20 px-4 py-28 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <SectionHeading eyebrow="Para quién" title="Hecho para negocios que viven de su agenda" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {AUDIENCES.map((a, i) => {
            const cfg = businessConfigs[a.key]
            return (
              <Reveal key={a.key} delay={i * STAGGER_MS}>
                <TiltCard>
                  <div className="p-6">
                    <span className={cn('mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl border', cfg.bg, cfg.border)}>
                      <cfg.icon size={20} className={cfg.color} />
                    </span>
                    <h3 className="font-medium text-white">{cfg.label}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">{a.text}</p>
                  </div>
                </TiltCard>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function FeatureCard({ icon: Icon, title, text, children, className, delay }: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  title: string
  text: string
  children?: React.ReactNode
  className?: string
  delay: number
}) {
  return (
    <Reveal delay={delay} className={className}>
      <div className="glass-panel flex h-full flex-col p-6">
        <Icon size={20} className="text-violet-400" />
        <h3 className="mt-4 font-medium text-white">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{text}</p>
        {children && <div className="mt-6 flex-1">{children}</div>}
      </div>
    </Reveal>
  )
}

function Features() {
  return (
    <section id="funciones" className="scroll-mt-20 px-4 py-28 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          eyebrow="Funciones"
          title="Todo lo que necesitas, nada que sobre"
          text="Desde la primera reserva hasta el informe de final de mes."
        />
        <div className="grid gap-5 md:grid-cols-3">
          <FeatureCard icon={CalendarDays} title="Calendario visual" text="Vista diaria, semanal y mensual de todo tu equipo." className="md:col-span-2" delay={0}>
            <div className="mock-week" aria-hidden>
              {['L', 'M', 'X', 'J', 'V'].map((d, col) => (
                <div key={d} className="flex flex-col gap-2">
                  <span className="text-center text-[11px] text-slate-500">{d}</span>
                  {Array.from({ length: 3 }, (_, row) => (
                    <span key={row} className={cn('mock-slot', (col + row) % 3 === 0 && 'is-on')} />
                  ))}
                </div>
              ))}
            </div>
          </FeatureCard>
          <FeatureCard icon={Zap} title="Tiempo real" text="Te avisamos al instante cuando entra, cambia o se cancela una reserva." delay={STAGGER_MS} />
          <FeatureCard icon={Globe} title="Página pública" text="Tus clientes reservan desde tu enlace, sin crear cuenta." delay={0}>
            <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs text-slate-400" aria-hidden>
              bookingapp.com/book/<span className="text-violet-300">tu-negocio</span>
            </div>
          </FeatureCard>
          <FeatureCard icon={CreditCard} title="Pagos con Stripe" text="Cobra por adelantado de forma segura." delay={STAGGER_MS} />
          <FeatureCard icon={BellRing} title="Recordatorios" text="Emails automáticos antes de cada cita para reducir ausencias." delay={STAGGER_MS * 2} />
          <FeatureCard icon={BarChart3} title="Estadísticas y exportación" text="KPIs, gráficas por servicio y por persona, y exportación a Excel y PDF." className="md:col-span-3" delay={0}>
            <div className="mock-bars" aria-hidden>
              {[38, 56, 44, 72, 60, 88, 66, 94, 78, 70, 84, 100].map((h, i) => (
                <span key={i} style={{ '--h': `${h}%`, '--i': i } as React.CSSProperties} />
              ))}
            </div>
          </FeatureCard>
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const ref = useRef<HTMLElement>(null)
  useScrollProgress(ref, 'pass')

  return (
    <section id="como-funciona" ref={ref} className="steps scroll-mt-20 px-4 py-28 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <SectionHeading eyebrow="Cómo funciona" title="En marcha en tres pasos" />
        <ol className="relative space-y-12 pl-12">
          {/* Línea que se dibuja con el scroll */}
          <span className="steps-line absolute bottom-2 left-[15px] top-2 w-px" aria-hidden />
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative">
              <Reveal delay={i * STAGGER_MS}>
                <span className="absolute -left-12 flex h-8 w-8 items-center justify-center rounded-full border border-violet-500/40 bg-[#0a0a0f] text-sm font-medium text-violet-300">
                  {i + 1}
                </span>
                <h3 className="text-lg font-medium text-white">{s.title}</h3>
                <p className="mt-1.5 leading-relaxed text-slate-400">{s.text}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="px-4 pb-28 pt-12 sm:px-6">
      <Reveal className="mx-auto max-w-5xl">
        <div className="cta-panel relative overflow-hidden rounded-3xl px-6 py-20 text-center sm:px-12">
          <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-5xl">
            Empieza a ordenar tu agenda hoy
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-lg text-slate-300">
            Crea tu cuenta gratis y recibe tu primera reserva en minutos.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link to="/register" className="btn-primary group">
              Crear cuenta gratis
              <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
            <Link to="/login" className="btn-ghost">Iniciar sesión</Link>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

export function LandingPage() {
  return (
    <div className="landing relative min-h-screen overflow-x-clip bg-[#0a0a0f] text-white">
      <div className="landing-grain pointer-events-none fixed inset-0 z-[60]" aria-hidden />
      <LandingNav />
      <main>
        <Hero />
        <Audiences />
        <Features />
        <HowItWorks />
        <FinalCta />
      </main>
      <footer className="border-t border-white/5 px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-slate-500 sm:flex-row">
          <p>© 2026 BookingApp. Todos los derechos reservados.</p>
          <div className="flex gap-6">
            <Link to="/login" className="transition-colors hover:text-slate-300">Iniciar sesión</Link>
            <Link to="/register" className="transition-colors hover:text-slate-300">Crear cuenta</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
