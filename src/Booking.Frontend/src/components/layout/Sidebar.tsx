import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { businessApi } from '@/api/business'
import { getBusinessConfig } from '@/lib/businessIcons'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Calendar, User,
  Building2, LogOut, Scissors, BarChart3, Shield
} from 'lucide-react'
import { NotificationBell } from './NotificationBell'


const navItems = [
  { label: 'Dashboard',    href: '/dashboard', icon: LayoutDashboard, roles: ['Owner', 'Staff', 'SuperAdmin'] },
  { label: 'Reservas',     href: '/bookings',  icon: Calendar,        roles: ['Owner', 'Staff', 'Client'] },
  { label: 'Calendario',   href: '/calendar',  icon: Calendar,        roles: ['Owner', 'Staff', 'SuperAdmin'] }, // NUEVA
  { label: 'Negocios',     href: '/business',  icon: Building2,       roles: ['Owner', 'SuperAdmin'] },
  { label: 'Servicios', href: '/services', icon: Scissors, roles: ['Owner', 'Staff', 'SuperAdmin'] },
  { label: 'Estadísticas', href: '/stats',     icon: BarChart3,       roles: ['Owner', 'SuperAdmin'] },
  { label: 'Perfil',       href: '/profile',   icon: User,            roles: ['Owner', 'Staff', 'Client', 'SuperAdmin'] },
]

export function Sidebar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const { data: businesses } = useQuery({
    queryKey: ['businesses'],
    queryFn: businessApi.getAll,
    enabled: !!user && user.role !== 'Client',
  })

  const firstBusiness = businesses?.[0]
  const businessConfig = firstBusiness
    ? getBusinessConfig(firstBusiness.category)
    : null

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const filteredNav = navItems.filter(item =>
    item.roles.includes(user?.role ?? '')
  )

  return (
    <aside className="w-64 h-screen bg-[#0d0d14] border-r border-white/[0.06] text-white flex flex-col fixed left-0 top-0">

      {/* Logo + Business branding */}
      <div className="p-5 border-b border-white/[0.05]">

        {/* App logo */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-600/30">
              <Calendar size={18} className="text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0d0d14]" />
          </div>
          <div>
            <h1 className="text-white font-bold text-base tracking-tight">BookingApp</h1>
            <p className="text-emerald-400 text-[10px] font-medium">● En línea</p>
          </div>
        </div>

        {/* Business badge */}
        {firstBusiness && businessConfig && (
          <div className={`flex items-center gap-2.5 p-2.5 rounded-xl border ${businessConfig.border} ${businessConfig.bg} mb-3`}>
            <div className={`w-8 h-8 rounded-lg ${businessConfig.bg} border ${businessConfig.border} flex items-center justify-center flex-shrink-0`}>
              <businessConfig.icon size={15} className={businessConfig.color} />
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">{firstBusiness.name}</p>
              <p className={`text-[10px] font-medium ${businessConfig.color}`}>{businessConfig.label}</p>
            </div>
          </div>
        )}

        {/* SuperAdmin badge */}
        {user?.role === 'SuperAdmin' && (
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/10 mb-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Shield size={15} className="text-amber-400" />
            </div>
            <div>
              <p className="text-white text-xs font-semibold">Super Admin</p>
              <p className="text-amber-400 text-[10px]">Acceso total</p>
            </div>
          </div>
        )}

        {/* User card */}
          <div className="flex items-center gap-3 p-3 bg-white/[0.04] border border-white/[0.06] rounded-xl">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
              <span className="text-white text-xs font-bold">
                {user?.fullName?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-xs font-medium truncate">{user?.fullName}</p>
              <p className="text-slate-500 text-[10px] truncate">{user?.email}</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium whitespace-nowrap border ${
                user?.role === 'SuperAdmin'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/20'
                  : 'bg-violet-500/20 text-violet-400 border-violet-500/20'
              }`}>
                {user?.role}
              </span>
              <NotificationBell />
            </div>
          </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <p className="text-slate-600 text-[10px] font-semibold uppercase tracking-widest px-3 mb-3">
          Menú principal
        </p>
        {filteredNav.map(item => {
          const Icon = item.icon
          const isActive = location.pathname === item.href
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150',
                isActive
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-500/20 shadow-sm'
                  : 'text-slate-500 hover:bg-white/[0.04] hover:text-slate-200'
              )}
            >
              <div className={cn(
                'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all',
                isActive ? 'bg-violet-600/30' : 'bg-white/[0.03]'
              )}>
                <Icon size={15} className={isActive ? 'text-violet-400' : 'text-slate-500'} />
              </div>
              {item.label}
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 bg-violet-400 rounded-full" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-white/[0.05]">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 w-full transition-all duration-150 group"
        >
          <div className="w-7 h-7 rounded-lg bg-white/[0.03] group-hover:bg-rose-500/20 flex items-center justify-center flex-shrink-0 transition-all">
            <LogOut size={15} />
          </div>
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}