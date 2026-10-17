import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { adminApi } from '@/api/admin'
import { businessApi } from '@/api/business'
import { getBusinessConfig } from '@/lib/businessIcons'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  TrendingUp, DollarSign, Calendar, XCircle,
  Users, Star, BarChart3, Building2, FileSpreadsheet, FileText
} from 'lucide-react'

const COLORS = ['#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EF4444']

export function StatsPage() {
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | undefined>()
  const [period, setPeriod] = useState<'week' | 'month' | '3months'>('month')

  const { data: businesses } = useQuery({
    queryKey: ['businesses'],
    queryFn: businessApi.getAll,
  })

  const { data: stats } = useQuery({
    queryKey: ['dashboard', selectedBusinessId],
    queryFn: () => adminApi.getDashboard(selectedBusinessId),
    refetchInterval: 30000, // Refresca cada 30 segundos
  })

  const getPeriodDates = () => {
    const to = new Date()
    const from = new Date()
    if (period === 'week') from.setDate(from.getDate() - 7)
    else if (period === 'month') from.setMonth(from.getMonth() - 1)
    else from.setMonth(from.getMonth() - 3)
    return {
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0]
    }
  }

  const { from, to } = getPeriodDates()

  const { data: periodData, isLoading: periodLoading } = useQuery({
    queryKey: ['bookings-period', period, selectedBusinessId],
    queryFn: () => adminApi.getBookingsByPeriod(from, to),
      refetchInterval: 30000,
  })

  const { data: staffStats } = useQuery({
    queryKey: ['staff-stats', selectedBusinessId],
    queryFn: () => adminApi.getStaffStats(selectedBusinessId ?? businesses?.[0]?.id ?? ''),
    enabled: !!(selectedBusinessId || businesses?.[0]?.id),
  })

  // Mutations de exportación
  const excelMutation = useMutation({
    mutationFn: () => adminApi.exportExcel(from, to)
  })

  const pdfMutation = useMutation({
    mutationFn: () => adminApi.exportPdf(from, to)
  })

  const bookingStatusData = stats ? [
    { name: 'Completadas', value: stats.totalBookings - stats.cancelledBookings - stats.bookingsToday },
    { name: 'Canceladas', value: stats.cancelledBookings },
    { name: 'Pendientes', value: stats.bookingsToday },
  ].filter(d => d.value > 0) : []

  const servicesChartData = stats?.topServices?.map(s => ({
    name: s.serviceName.length > 12 ? s.serviceName.slice(0, 12) + '...' : s.serviceName,
    reservas: s.totalBookings,
    ingresos: s.totalRevenue,
  })) ?? []

  const staffChartData = staffStats?.map(s => ({
    name: s.staffName.split(' ')[0],
    completadas: s.completedBookings,
    canceladas: s.cancelledBookings,
    ingresos: s.revenue,
  })) ?? []

  return (
    <div className="space-y-6 max-w-7xl">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Estadísticas</h1>
          <p className="text-slate-400 mt-1 text-sm">Análisis detallado de tu negocio</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Selector de negocio */}
          {businesses && businesses.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedBusinessId(undefined)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                  !selectedBusinessId
                    ? 'bg-violet-600/20 border-violet-500/30 text-violet-300'
                    : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <Building2 size={12} /> Todos
              </button>
              {businesses.map(b => {
                const config = getBusinessConfig(b.category)
                return (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBusinessId(b.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
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

          {/* Selector de periodo */}
          <div className="flex items-center gap-1 bg-white/[0.03] border border-white/10 rounded-xl p-1">
            {[
              { id: 'week', label: '7 días' },
              { id: 'month', label: '30 días' },
              { id: '3months', label: '3 meses' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id as typeof period)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  period === p.id
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Botones de exportación */}
          <button
            onClick={() => excelMutation.mutate()}
            disabled={excelMutation.isPending}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/20 text-emerald-400 text-xs font-medium hover:bg-emerald-600/30 transition-all disabled:opacity-50"
          >
            <FileSpreadsheet size={14} />
            {excelMutation.isPending ? 'Exportando...' : 'Excel'}
          </button>
          <button
            onClick={() => pdfMutation.mutate()}
            disabled={pdfMutation.isPending}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-600/20 border border-rose-500/20 text-rose-400 text-xs font-medium hover:bg-rose-600/30 transition-all disabled:opacity-50"
          >
            <FileText size={14} />
            {pdfMutation.isPending ? 'Exportando...' : 'PDF'}
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total reservas',   value: stats?.totalBookings ?? 0,                        icon: Calendar,   color: 'text-violet-400',  bg: 'bg-violet-500/10',  border: 'border-violet-500/20' },
          { label: 'Ingresos totales', value: `${stats?.revenueTotal?.toFixed(2) ?? '0.00'}€`,  icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
          { label: 'Este mes',         value: stats?.bookingsThisMonth ?? 0,                     icon: TrendingUp, color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20' },
          { label: 'Cancelaciones',    value: `${stats?.cancellationRate ?? 0}%`,                icon: XCircle,    color: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/20' },
        ].map(kpi => (
          <div key={kpi.label} className={`bg-white/[0.03] border ${kpi.border} rounded-2xl p-5`}>
            <div className={`w-9 h-9 ${kpi.bg} rounded-xl flex items-center justify-center mb-3`}>
              <kpi.icon size={16} className={kpi.color} />
            </div>
            <p className="text-2xl font-bold text-white">{kpi.value}</p>
            <p className="text-slate-500 text-xs mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Gráfica de reservas por periodo */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 size={16} className="text-violet-400" />
          <h3 className="text-white font-semibold text-sm">Reservas por día</h3>
        </div>
        {periodLoading ? (
          <div className="flex items-center justify-center h-48 text-slate-500 text-sm">Cargando datos...</div>
        ) : periodData && periodData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={periodData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }}
                tickFormatter={(v: string) => new Date(v).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#0d0d14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }}
                labelFormatter={(v) => new Date(v).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} />
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
              <Bar dataKey="confirmed" name="Confirmadas" fill="#7C3AED" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cancelled" name="Canceladas" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-48 text-slate-600 text-sm">Sin datos para este periodo</div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Gráfica de ingresos */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <DollarSign size={16} className="text-emerald-400" />
            <h3 className="text-white font-semibold text-sm">Ingresos por día</h3>
          </div>
          {periodData && periodData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={periodData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }}
                  tickFormatter={(v: string) => new Date(v).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={(v: number) => `${v}€`} />
                <Tooltip
                  contentStyle={{ background: '#0d0d14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }}
                  formatter={(v) => [`${v}€`, 'Ingresos']}
                  labelFormatter={(v) => new Date(v).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })} />
                <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2}
                  dot={{ fill: '#10B981', r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-600 text-sm">Sin datos</div>
          )}
        </div>

        {/* Gráfica de pie */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Calendar size={16} className="text-blue-400" />
            <h3 className="text-white font-semibold text-sm">Estado de reservas</h3>
          </div>
          {bookingStatusData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="60%" height={180}>
                <PieChart>
                  <Pie data={bookingStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                    {bookingStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#0d0d14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {bookingStatusData.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <div>
                      <p className="text-white text-xs font-medium">{item.name}</p>
                      <p className="text-slate-500 text-xs">{item.value} reservas</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-600 text-sm">Sin datos</div>
          )}
        </div>
      </div>

      {/* Gráfica de servicios */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <Star size={16} className="text-yellow-400" />
          <h3 className="text-white font-semibold text-sm">Servicios más populares</h3>
        </div>
        {servicesChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={servicesChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fill: '#94a3b8', fontSize: 12 }} width={90} />
              <Tooltip contentStyle={{ background: '#0d0d14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }} />
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
              <Bar dataKey="reservas" name="Reservas" fill="#7C3AED" radius={[0, 4, 4, 0]} />
              <Bar dataKey="ingresos" name="Ingresos (€)" fill="#10B981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-32 text-slate-600 text-sm">Sin datos de servicios</div>
        )}
      </div>

      {/* Gráfica de staff */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <Users size={16} className="text-violet-400" />
          <h3 className="text-white font-semibold text-sm">Rendimiento del staff</h3>
        </div>
        {staffChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={staffChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#0d0d14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff' }} />
              <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
              <Bar dataKey="completadas" name="Completadas" fill="#7C3AED" radius={[4, 4, 0, 0]} />
              <Bar dataKey="canceladas" name="Canceladas" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-32 text-slate-600 text-sm">Sin datos de staff</div>
        )}
      </div>

    </div>
  )
}