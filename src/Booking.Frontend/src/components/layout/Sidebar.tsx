import { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { businessApi } from '@/api/business'
import { getBusinessConfig } from '@/lib/businessIcons'
import { roleLabel } from '@/lib/labels'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, CalendarCheck, CalendarDays, ListChecks, User,
  Building2, LogOut, Scissors, BarChart3, Shield, Globe, Calendar, X,
} from 'lucide-react'
import { NotificationBell } from './NotificationBell'

const navSections = [
  {
    title: 'Día a día',
    items: [
      { label: 'Dashboard',     href: '/dashboard', icon: LayoutDashboard, roles: ['Owner', 'Staff', 'SuperAdmin'] },
      { label: 'Agenda',        href: '/agenda',    icon: ListChecks,      roles: ['Owner', 'Staff', 'SuperAdmin'] },
      { label: 'Calendario',    href: '/calendar',  icon: CalendarDays,    roles: ['Owner', 'Staff', 'SuperAdmin'] },
      { label: 'Mis reservas',  href: '/bookings',  icon: CalendarCheck,   roles: ['Owner', 'Staff', 'Client'] },
    ],
  },
  {
    title: 'Gestión',
    items: [
      { label: 'Negocios',      href: '/business',  icon: Building2,       roles: ['Owner', 'SuperAdmin'] },
      { label: 'Servicios',     href: '/services',  icon: Scissors,        roles: ['Owner', 'Staff', 'SuperAdmin'] },
      { label: 'Estadísticas',  href: '/stats',     icon: BarChart3,       roles: ['Owner', 'SuperAdmin'] },
      { label: 'Página pública', href: '/share',    icon: Globe,           roles: ['Owner', 'SuperAdmin'] },
    ],
  },
  {
    title: 'Cuenta',
    items: [
      { label: 'Perfil',        href: '/profile',   icon: User,            roles: ['Owner', 'Staff', 'Client', 'SuperAdmin'] },
    ],
  },
]

/** Menú lateral: fijo en escritorio, desplegable en móvil (`open` / `onClose`). */
export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const { data: businesses } = useQuery({
    queryKey: ['businesses'],
    queryFn: businessApi.getAll,
    enabled: !!user && user.role !== 'Client',
  })

  const firstBusiness = businesses?.[0]
  const businessConfig = firstBusiness ? getBusinessConfig(firstBusiness.category) : null

  // Cerrar el menú móvil con Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const role = user?.role ?? ''
  const sections = navSections
    .map(s => ({ ...s, items: s.items.filter(i => i.roles.includes(role)) }))
    .filter(s => s.items.length > 0)

  return (
    <>
      {/* Fondo oscuro del menú móvil */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
        aria-hidden
      />

      <aside
        className={cn(
          'app-sidebar fixed left-0 top-0 z-50 flex h-dvh w-64 flex-col text-white transition-[transform,visibility] duration-300 ease-out lg:visible lg:translate-x-0',
          open ? 'visible translate-x-0' : 'invisible -translate-x-full'
        )}
        aria-label="Menú principal"
      >
        {/* Logo + negocio */}
        <div className="border-b border-white/[0.05] p-5">
          <div className="mb-4 flex items-center justify-between">
            <Link to="/dashboard" onClick={onClose} className="flex items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-400">
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-600/30">
                  <Calendar size={18} className="text-white" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0d0d14] bg-emerald-500" />
              </div>
              <div>
                <p className="text-base font-semibold tracking-tight text-white">BookingApp</p>
                <p className="text-[10px] font-medium text-emerald-400">● En línea</p>
              </div>
            </Link>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white lg:hidden"
              aria-label="Cerrar menú"
            >
              <X size={16} />
            </button>
          </div>

          {firstBusiness && businessConfig && (
            <div className={cn('mb-3 flex items-center gap-2.5 rounded-xl border p-2.5', businessConfig.border, businessConfig.bg)}>
              <div className={cn('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border', businessConfig.bg, businessConfig.border)}>
                <businessConfig.icon size={15} className={businessConfig.color} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white">{firstBusiness.name}</p>
                <p className={cn('text-[10px] font-medium', businessConfig.color)}>{businessConfig.label}</p>
              </div>
            </div>
          )}

          {user?.role === 'SuperAdmin' && (
            <div className="mb-3 flex items-center gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/20">
                <Shield size={15} className="text-amber-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Super Admin</p>
                <p className="text-[10px] text-amber-400">Acceso total</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.04] p-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 shadow-md">
              <span className="text-xs font-bold text-white">{user?.fullName?.charAt(0).toUpperCase()}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white">{user?.fullName}</p>
              <p className="truncate text-[10px] text-slate-400">{roleLabel(user?.role)}</p>
            </div>
            <NotificationBell />
          </div>
        </div>

        {/* Navegación */}
        <nav className="flex-1 space-y-6 overflow-y-auto p-4">
          {sections.map(section => (
            <div key={section.title} className="space-y-1">
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">{section.title}</p>
              {section.items.map(item => {
                const Icon = item.icon
                const isActive = location.pathname === item.href
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={onClose}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'nav-link group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-150',
                      isActive ? 'is-active text-white' : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100'
                    )}
                  >
                    <span className={cn(
                      'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-colors',
                      isActive ? 'bg-violet-500/25' : 'bg-white/[0.03] group-hover:bg-white/[0.06]'
                    )}>
                      <Icon size={15} className={isActive ? 'text-violet-300' : 'text-slate-400'} />
                    </span>
                    {item.label}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="border-t border-white/[0.05] p-4">
          <button
            onClick={handleLogout}
            className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition-colors duration-150 hover:bg-rose-500/10 hover:text-rose-300"
          >
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-white/[0.03] transition-colors group-hover:bg-rose-500/20">
              <LogOut size={15} />
            </span>
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  )
}
