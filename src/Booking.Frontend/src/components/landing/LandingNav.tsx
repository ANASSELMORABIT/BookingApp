import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '#para-quien', label: 'Para quién' },
  { href: '#funciones', label: 'Funciones' },
  { href: '#como-funciona', label: 'Cómo funciona' },
]

/** Barra superior fija: transparente arriba, de vidrio al bajar. */
export function LandingNav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={cn('landing-nav fixed inset-x-0 top-0 z-50', scrolled && 'is-scrolled')}>
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6" aria-label="Principal">
        <Link to="/" className="flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-400">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
            <Calendar size={16} className="text-white" />
          </span>
          <span className="font-semibold tracking-tight text-white">BookingApp</span>
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {LINKS.map(l => (
            <li key={l.href}>
              <a href={l.href} className="text-sm text-slate-400 transition-colors hover:text-white">{l.label}</a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="rounded-xl px-3.5 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-violet-400"
          >
            Iniciar sesión
          </Link>
          <Link
            to="/register"
            className="rounded-xl bg-violet-600 px-3.5 py-2 text-sm font-medium text-white shadow-lg shadow-violet-600/25 transition-colors hover:bg-violet-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
          >
            Crear cuenta
          </Link>
        </div>
      </nav>
    </header>
  )
}
