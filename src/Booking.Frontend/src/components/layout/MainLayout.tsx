import { useCallback, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Calendar, Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'

export function MainLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = useCallback(() => setMenuOpen(false), [])
  const location = useLocation()

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Fondo estático: degradados suaves, retícula y grano */}
      <div className="app-backdrop pointer-events-none fixed inset-0" aria-hidden />

      <Sidebar open={menuOpen} onClose={closeMenu} />

      {/* Barra superior en móvil */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/[0.06] bg-[#0a0a0f]/80 px-4 backdrop-blur-lg lg:hidden">
        <Link to="/dashboard" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600">
            <Calendar size={15} className="text-white" />
          </span>
          <span className="font-semibold tracking-tight text-white">BookingApp</span>
        </Link>
        <button
          onClick={() => setMenuOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.07]"
          aria-label="Abrir menú"
          aria-expanded={menuOpen}
        >
          <Menu size={18} />
        </button>
      </header>

      <main className="relative z-10 px-4 py-6 sm:px-6 lg:ml-64 lg:px-10 lg:py-10">
        {/* La clave fuerza la animación de entrada en cada cambio de pantalla */}
        <div key={location.pathname} className="page-enter mx-auto max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  )
}
