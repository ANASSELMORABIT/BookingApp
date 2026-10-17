import { useEffect, useLayoutEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { businessApi } from '@/api/business'
import { adminApi } from '@/api/admin'
import { getBusinessConfig } from '@/lib/businessIcons'
import { roleLabel } from '@/lib/labels'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, CalendarCheck, CalendarDays, ListChecks, User,
  Building2, LogOut, Scissors, BarChart3, Shield, Globe, Calendar, X, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react'
import { NotificationBell } from './NotificationBell'

type BadgeKey = 'today'

const navSections: {
  title: string
  items: { label: string; href: string; icon: typeof User; roles: string[]; badge?: BadgeKey }[]
}[] = [
  {
    title: 'Día a día',
    items: [
      { label: 'Dashboard',     href: '/dashboard', icon: LayoutDashboard, roles: ['Owner', 'Staff', 'SuperAdmin'] },
      { label: 'Agenda',        href: '/agenda',    icon: ListChecks,      roles: ['Owner', 'Staff', 'SuperAdmin'], badge: 'today' },
      { label: 'Calendario',    href: '/calendar',  icon: CalendarDays,    roles: ['Owner', 'Staff', 'SuperAdmin'] },
      { label: 'Reservas',      href: '/bookings',  icon: CalendarCheck,   roles: ['Owner', 'Staff', 'Client'] },
    ],
  },
  {
    title: 'Gestión',
    items: [
      { label: 'Negocios',       href: '/business', icon: Building2, roles: ['Owner', 'SuperAdmin'] },
      { label: 'Servicios',      href: '/services', icon: Scissors,  roles: ['Owner', 'Staff', 'SuperAdmin'] },
      { label: 'Estadísticas',   href: '/stats',    icon: BarChart3, roles: ['Owner', 'SuperAdmin'] },
      { label: 'Página pública', href: '/share',    icon: Globe,     roles: ['Owner', 'SuperAdmin'] },
    ],
  },
  {
    title: 'Cuenta',
    items: [
      { label: 'Perfil', href: '/profile', icon: User, roles: ['Owner', 'Staff', 'Client', 'SuperAdmin'] },
    ],
  },
]

/**
 * Menú lateral: fijo en escritorio (se puede plegar a solo iconos) y desplegable en móvil.
 * Un indicador se desliza hasta la opción activa al cambiar de pantalla.
 */
export function Sidebar({ open, onClose, collapsed, onToggleCollapsed }: {
  open: boolean
  onClose: () => void
  collapsed: boolean
  onToggleCollapsed: () => void
}) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const navRef = useRef<HTMLElement>(null)
  const indicatorRef = useRef<HTMLSpanElement>(null)
  const isTeam = ['Owner', 'Staff', 'SuperAdmin'].includes(user?.role ?? '')

  const { data: businesses } = useQuery({
    queryKey: ['businesses'],
    queryFn: businessApi.getAll,
    enabled: !!user && user.role !== 'Client',
  })

  // Contador de la Agenda: reservas de hoy (se refresca con cada aviso en tiempo real)
  const { data: stats } = useQuery({
    queryKey: ['dashboard', undefined],
    queryFn: () => adminApi.getDashboard(),
    enabled: isTeam,
    staleTime: 0,
    refetchInterval: 60_000,
  })
  const badges: Record<BadgeKey, number | undefined> = { today: stats?.bookingsToday }

  const firstBusiness = businesses?.[0]
  const businessConfig = firstBusiness ? getBusinessConfig(firstBusiness.category) : null

  // Cerrar el menú móvil con Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Coloca el indicador sobre la opción activa (escribe en el DOM, sin re-renderizar)
  useLayoutEffect(() => {
    const nav = navRef.current
    const indicator = indicatorRef.current
    if (!nav || !indicator) return
    const place = () => {
      const active = nav.querySelector<HTMLElement>('[aria-current="page"]')
      if (!active) {
        indicator.style.opacity = '0'
        return
      }
      indicator.style.opacity = '1'
      indicator.style.height = `${active.offsetHeight}px`
      indicator.style.transform = `translateY(${active.offsetTop}px)`
      // La primera vez aparece en su sitio; después se desliza
      requestAnimationFrame(() => indicator.classList.add('is-ready'))
    }
    place()
    const ro = new ResizeObserver(place)
    ro.observe(nav)
    return () => ro.disconnect()
  }, [location.pathname, collapsed])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const role = user?.role ?? ''
  const sections = navSections
    .map(s => ({ ...s, items: s.items.filter(i => i.roles.includes(role)) }))
    .filter(s => s.items.length > 0)
  let order = 0

  const initials = (user?.fullName ?? '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?'

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
          'app-sidebar fixed left-0 top-0 z-50 flex h-dvh w-64 flex-col text-white lg:visible lg:translate-x-0',
          open ? 'visible translate-x-0' : 'invisible -translate-x-full',
          collapsed && 'is-collapsed'
        )}
        aria-label="Menú principal"
      >
        {/* Logo + negocio */}
        <div className="sidebar-head border-b border-white/[0.05] p-5">
          <div className="mb-4 flex items-center justify-between">
            <Link to="/dashboard" onClick={onClose} className="sidebar-logo flex items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-400">
              <div className="relative flex-shrink-0">
                <div className="logo-mark flex h-10 w-10 items-center justify-center rounded-xl">
                  <Calendar size={18} className="text-white" />
                </div>
                <span className="online-dot absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0d0d14] bg-emerald-500" />
              </div>
              <div className="nav-label">
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
            <div className={cn('sidebar-chip mb-3 flex items-center gap-2.5 rounded-xl border p-2.5', businessConfig.border, businessConfig.bg)} title={firstBusiness.name}>
              <div className={cn('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border', businessConfig.bg, businessConfig.border)}>
                <businessConfig.icon size={15} className={businessConfig.color} />
              </div>
              <div className="nav-label min-w-0">
                <p className="truncate text-xs font-semibold text-white">{firstBusiness.name}</p>
                <p className={cn('text-[10px] font-medium', businessConfig.color)}>{businessConfig.label}</p>
              </div>
            </div>
          )}

          {user?.role === 'SuperAdmin' && (
            <div className="sidebar-chip mb-3 flex items-center gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 p-2.5" title="Super Admin">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/20">
                <Shield size={15} className="text-amber-400" />
              </div>
              <div className="nav-label">
                <p className="text-xs font-semibold text-white">Super Admin</p>
                <p className="text-[10px] text-amber-400">Acceso total</p>
              </div>
            </div>
          )}

          <div className="sidebar-user flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.04] p-2.5">
            <Link to="/profile" onClick={onClose} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg" title="Ir a mi perfil">
              <span className="user-avatar relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full">
                <span className="text-xs font-semibold text-white">{initials}</span>
              </span>
              <span className="nav-label min-w-0">
                <span className="block truncate text-xs font-medium text-white">{user?.fullName}</span>
                <span className="block truncate text-[10px] text-slate-400">{roleLabel(user?.role)}</span>
              </span>
            </Link>
            <span className="sidebar-bell flex-shrink-0"><NotificationBell /></span>
          </div>
        </div>

        {/* Navegación */}
        <nav ref={navRef} className="sidebar-nav relative flex-1 space-y-6 overflow-y-auto p-4">
          <span ref={indicatorRef} className="nav-indicator" aria-hidden />
          {sections.map(section => (
            <div key={section.title} className="space-y-1">
              <p className="nav-section mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                <span className="nav-label">{section.title}</span>
              </p>
              {section.items.map(item => {
                const Icon = item.icon
                const isActive = location.pathname === item.href
                const badge = item.badge ? badges[item.badge] : undefined
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={onClose}
                    aria-current={isActive ? 'page' : undefined}
                    aria-label={collapsed ? item.label : undefined}
                    data-label={item.label}
                    style={{ '--i': order++ } as React.CSSProperties}
                    className={cn(
                      'nav-link list-in group relative z-10 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm',
                      isActive ? 'is-active text-white' : 'text-slate-400 hover:text-slate-100'
                    )}
                  >
                    <span className="nav-icon flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg">
                      <Icon size={15} />
                    </span>
                    <span className="nav-label flex-1 truncate">{item.label}</span>
                    {!!badge && (
                      <span className="nav-badge" aria-label={`${badge} hoy`}>{badge > 99 ? '99+' : badge}</span>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="space-y-1 border-t border-white/[0.05] p-4">
          <button
            onClick={onToggleCollapsed}
            data-label={collapsed ? 'Desplegar menú' : 'Plegar menú'}
            aria-label={collapsed ? 'Desplegar menú' : 'Plegar menú'}
            aria-expanded={!collapsed}
            className="nav-link group hidden w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-white/[0.04] hover:text-slate-100 lg:flex"
          >
            <span className="nav-icon flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg">
              {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
            </span>
            <span className="nav-label">Plegar menú</span>
          </button>
          <button
            onClick={handleLogout}
            data-label="Cerrar sesión"
            aria-label={collapsed ? 'Cerrar sesión' : undefined}
            className="nav-link nav-logout group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 hover:bg-rose-500/10 hover:text-rose-300"
          >
            <span className="nav-icon flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg">
              <LogOut size={15} />
            </span>
            <span className="nav-label">Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  )
}
