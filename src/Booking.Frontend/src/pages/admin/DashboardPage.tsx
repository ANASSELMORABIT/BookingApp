import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/api/admin'
import { businessApi } from '@/api/business'
import { useAuth } from '@/context/AuthContext'
import { getBusinessConfig } from '@/lib/businessIcons'
import {
  Calendar, TrendingUp, DollarSign, XCircle,
  Users, Star, ArrowUpRight, Activity, Shield
} from 'lucide-react'

export function DashboardPage() {
  const { user } = useAuth()
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | undefined>(undefined)

  const { data: businesses } = useQuery({
    queryKey: ['businesses'],
    queryFn: businessApi.getAll,
  })

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard', selectedBusinessId],
    queryFn: () => adminApi.getDashboard(selectedBusinessId),
    enabled: true, // CAMBIA ESTO — siempre activo
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-3 text-slate-400">
        <span className="w-5 h-5 border-2 border-slate-600 border-t-violet-500 rounded-full animate-spin" />
        Cargando estadísticas...
      </div>
    </div>
  )

  const kpis = [
    { label: 'Reservas hoy',      value: stats?.bookingsToday ?? 0,                          sub: `${stats?.bookingsThisWeek ?? 0} esta semana`,   icon: Calendar,   color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
    { label: 'Reservas este mes', value: stats?.bookingsThisMonth ?? 0,                       sub: `${stats?.totalBookings ?? 0} en total`,          icon: TrendingUp, color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20'   },
    { label: 'Ingresos este mes', value: `${stats?.revenueThisMonth?.toFixed(2) ?? '0.00'}€`, sub: `${stats?.revenueTotal?.toFixed(2) ?? '0.00'}€ total`, icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { label: 'Cancelaciones',     value: stats?.cancelledBookings ?? 0,                       sub: `${stats?.cancellationRate ?? 0}% tasa`,          icon: XCircle,    color: 'text-rose-400',   bg: 'bg-rose-500/10',   border: 'border-rose-500/20'   },
  ]

  return (
    <div className="space-y-8 max-w-7xl">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Bienvenido, <span className="text-white font-medium">{user?.fullName}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Business selector */}
          {businesses && businesses.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setSelectedBusinessId(undefined)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                  !selectedBusinessId
                    ? 'bg-violet-600/20 border-violet-500/30 text-violet-300'
                    : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                {user?.role === 'SuperAdmin' ? (
                  <><Shield size={12} /> Todos</>
                ) : 'Todos mis negocios'}
              </button>
              {businesses.map(b => {
                const config = getBusinessConfig(b.category)
                return (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBusinessId(b.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                      selectedBusinessId === b.id
                        ? `${config.bg} ${config.border} ${config.color}`
                        : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <config.icon size={12} />
                    {b.name}
                  </button>
                )
              })}
            </div>
          )}
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
            <Activity size={12} className="text-emerald-400" />
            <span className="text-emerald-400 text-xs font-medium">En línea</span>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <div key={kpi.label} className={`bg-white/[0.03] border ${kpi.border} rounded-2xl p-5 backdrop-blur-sm hover:bg-white/[0.05] transition-all duration-200`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 ${kpi.bg} rounded-xl flex items-center justify-center`}>
                <kpi.icon size={18} className={kpi.color} />
              </div>
              <ArrowUpRight size={14} className="text-slate-600" />
            </div>
            <p className="text-3xl font-bold text-white">{kpi.value}</p>
            <p className="text-slate-500 text-xs mt-1">{kpi.label}</p>
            <p className="text-slate-600 text-xs mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Staff */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-5">
            <Users size={16} className="text-violet-400" />
            <h3 className="text-white font-semibold text-sm">Rendimiento del staff</h3>
          </div>
          {!stats?.staffStats?.length ? (
            <div className="flex items-center justify-center h-32 text-slate-600 text-sm">Sin datos todavía</div>
          ) : (
            <div className="space-y-3">
              {stats.staffStats.map(s => (
                <div key={s.staffId} className="flex items-center justify-between p-3 bg-white/[0.03] rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-violet-500/20 rounded-full flex items-center justify-center">
                      <span className="text-violet-400 text-xs font-bold">{s.staffName.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{s.staffName}</p>
                      <p className="text-slate-500 text-xs">{s.completedBookings} ✓ · {s.cancelledBookings} ✗</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white text-sm font-semibold">{s.revenue.toFixed(2)}€</p>
                    <p className="text-slate-500 text-xs">{s.totalBookings} reservas</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top servicios */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-5">
            <Star size={16} className="text-yellow-400" />
            <h3 className="text-white font-semibold text-sm">Servicios más populares</h3>
          </div>
          {!stats?.topServices?.length ? (
            <div className="flex items-center justify-center h-32 text-slate-600 text-sm">Sin datos todavía</div>
          ) : (
            <div className="space-y-3">
              {stats.topServices.map((s, i) => (
                <div key={s.serviceId} className="flex items-center justify-between p-3 bg-white/[0.03] rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                      <span className="text-slate-400 text-xs font-bold">#{i + 1}</span>
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{s.serviceName}</p>
                      <p className="text-slate-500 text-xs">{s.price.toFixed(2)}€ / sesión</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white text-sm font-semibold">{s.totalRevenue.toFixed(2)}€</p>
                    <p className="text-slate-500 text-xs">{s.totalBookings} reservas</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Resumen total */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total reservas',  value: stats?.totalBookings ?? 0 },
            { label: 'Esta semana',     value: stats?.bookingsThisWeek ?? 0 },
            { label: 'Canceladas',      value: stats?.cancelledBookings ?? 0 },
            { label: 'Ingresos totales', value: `${stats?.revenueTotal?.toFixed(2) ?? '0.00'}€` },
          ].map(item => (
            <div key={item.label} className="text-center p-4 bg-white/[0.02] rounded-xl border border-white/[0.05]">
              <p className="text-2xl font-bold text-white">{item.value}</p>
              <p className="text-xs text-slate-500 mt-1">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}