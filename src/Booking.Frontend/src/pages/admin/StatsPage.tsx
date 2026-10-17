import { useMemo, useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { adminApi } from '@/api/admin'
import { businessApi } from '@/api/business'
import { getBusinessConfig } from '@/lib/businessIcons'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  TrendingUp, Euro, Calendar, XCircle, Users, Star, Building2, FileSpreadsheet, FileText,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatPrice, toLocalIsoDate } from '@/lib/labels'
import { PageHeader } from '@/components/app/PageHeader'
import { CountUp } from '@/components/app/CountUp'
import { Reveal } from '@/components/landing/Reveal'
import { TiltCard } from '@/components/landing/TiltCard'
import { BookingsSkyline, type DayStats } from '@/components/stats/BookingsSkyline'
import { ChartTooltip } from '@/components/stats/ChartTooltip'

// Paleta validada sobre el fondo oscuro (violeta y rosa también para daltonismo)
const C = {
  bookings: '#8b5cf6',
  revenue: '#0ea371',
  cancelled: '#f43f5e',
  grid: 'rgba(255,255,255,0.05)',
  axis: '#64748b',
}
/** Duración de las animaciones de entrada de las gráficas (ms). */
const CHART_ANIMATION_MS = 900
const STAGGER_MS = 70

const PERIODS = [
  { id: 'week', label: '7 días', text: 'últimos 7 días' },
  { id: 'month', label: '30 días', text: 'últimos 30 días' },
  { id: '3months', label: '3 meses', text: 'últimos 3 meses' },
] as const
type PeriodId = typeof PERIODS[number]['id']

const dayLabel = (key: unknown) =>
  new Date(`${String(key)}T00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
const longDayLabel = (key: unknown) =>
  new Date(`${String(key)}T00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
const truncate = (s: string, n = 16) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

function ChartCard({ icon: Icon, iconClass, title, subtitle, children, delay = 0, className }: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  iconClass: string
  title: string
  subtitle?: string
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  return (
    <Reveal delay={delay} className={className}>
      <section className="glass-panel h-full p-6" aria-label={title}>
        <div className="mb-6 flex items-start gap-2">
          <Icon size={16} className={`mt-0.5 ${iconClass}`} />
          <div>
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
          </div>
        </div>
        {children}
      </section>
    </Reveal>
  )
}

const Empty = ({ text = 'Sin datos todavía' }: { text?: string }) => (
  <div className="flex h-48 items-center justify-center text-sm text-slate-500">{text}</div>
)

export function StatsPage() {
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | undefined>()
  const [period, setPeriod] = useState<PeriodId>('month')
  const [reduceMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const animate = !reduceMotion

  const { data: businesses } = useQuery({
    queryKey: ['businesses'],
    queryFn: businessApi.getAll,
  })

  const { data: stats } = useQuery({
    queryKey: ['dashboard', selectedBusinessId],
    queryFn: () => adminApi.getDashboard(selectedBusinessId),
    refetchInterval: 30000,
  })

  const { from, to } = useMemo(() => {
    const end = new Date()
    const start = new Date()
    if (period === 'week') start.setDate(start.getDate() - 7)
    else if (period === 'month') start.setMonth(start.getMonth() - 1)
    else start.setMonth(start.getMonth() - 3)
    return { from: toLocalIsoDate(start), to: toLocalIsoDate(end) }
  }, [period])

  const { data: periodData, isLoading: periodLoading } = useQuery({
    queryKey: ['bookings-period', period, selectedBusinessId],
    // El backend aún no filtra por negocio: esta serie muestra siempre todos
    queryFn: () => adminApi.getBookingsByPeriod(from, to),
    refetchInterval: 30000,
  })

  const { data: staffStats } = useQuery({
    queryKey: ['staff-stats', selectedBusinessId],
    queryFn: () => adminApi.getStaffStats(selectedBusinessId ?? businesses?.[0]?.id ?? ''),
    enabled: !!(selectedBusinessId || businesses?.[0]?.id),
  })

  const excelMutation = useMutation({
    mutationFn: () => adminApi.exportExcel(from, to),
    onSuccess: () => toast.success('Excel descargado'),
    onError: () => toast.error('No se pudo exportar a Excel.'),
  })

  const pdfMutation = useMutation({
    mutationFn: () => adminApi.exportPdf(from, to),
    onSuccess: () => toast.success('PDF descargado'),
    onError: () => toast.error('No se pudo exportar a PDF.'),
  })

  // El backend solo devuelve los días con reservas: se rellena el periodo completo con ceros
  const days: DayStats[] = useMemo(() => {
    const byDate = new Map((periodData ?? []).map(d => [d.date.slice(0, 10), d]))
    const out: DayStats[] = []
    const cursor = new Date(`${from}T00:00`)
    const last = new Date(`${to}T00:00`)
    while (cursor <= last) {
      const key = toLocalIsoDate(cursor)
      const d = byDate.get(key)
      out.push({ key, total: d?.totalBookings ?? 0, confirmed: d?.confirmed ?? 0, cancelled: d?.cancelled ?? 0, revenue: d?.revenue ?? 0 })
      cursor.setDate(cursor.getDate() + 1)
    }
    return out
  }, [periodData, from, to])

  const revenueInPeriod = days.reduce((s, d) => s + d.revenue, 0)

  const servicesByBookings = [...(stats?.topServices ?? [])]
    .sort((a, b) => b.totalBookings - a.totalBookings)
    .map(s => ({ name: truncate(s.serviceName), full: s.serviceName, reservas: s.totalBookings }))
  const servicesByRevenue = [...(stats?.topServices ?? [])]
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .map(s => ({ name: truncate(s.serviceName), full: s.serviceName, ingresos: s.totalRevenue }))

  const staffChartData = staffStats?.map(s => ({
    name: s.staffName.split(' ')[0],
    completadas: s.completedBookings,
    canceladas: s.cancelledBookings,
  })) ?? []

  const cancellationRate = stats?.cancellationRate ?? 0
  const periodText = PERIODS.find(p => p.id === period)!.text
  const anim = { isAnimationActive: animate, animationDuration: CHART_ANIMATION_MS, animationEasing: 'ease-out' as const }
  const axisTick = { fill: C.axis, fontSize: 11 }

  const kpis = [
    { label: 'Total reservas', value: stats?.totalBookings ?? 0, kind: 'int' as const, icon: Calendar, color: 'text-violet-300', bg: 'bg-violet-500/10', glow: 'rgb(139 92 246 / 0.3)' },
    { label: 'Ingresos totales', value: stats?.revenueTotal ?? 0, kind: 'eur' as const, icon: Euro, color: 'text-emerald-300', bg: 'bg-emerald-500/10', glow: 'rgb(14 163 113 / 0.28)' },
    { label: 'Reservas este mes', value: stats?.bookingsThisMonth ?? 0, kind: 'int' as const, icon: TrendingUp, color: 'text-blue-300', bg: 'bg-blue-500/10', glow: 'rgb(59 130 246 / 0.26)' },
    { label: 'Tasa de cancelación', value: cancellationRate, kind: 'pct' as const, icon: XCircle, color: 'text-rose-300', bg: 'bg-rose-500/10', glow: 'rgb(244 63 94 / 0.24)' },
  ]

  return (
    <div className="space-y-6 max-w-7xl">

      {/* Cabecera, filtros y exportación */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <PageHeader title="Estadísticas" subtitle="Análisis detallado de tu negocio" />

        <div className="flex items-center gap-3 flex-wrap">
          {businesses && businesses.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Negocio">
              <button
                onClick={() => setSelectedBusinessId(undefined)}
                aria-pressed={!selectedBusinessId}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
                  !selectedBusinessId ? 'bg-violet-600/20 border-violet-500/30 text-violet-300' : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'
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
                    aria-pressed={selectedBusinessId === b.id}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-colors ${
                      selectedBusinessId === b.id ? `${config.bg} ${config.border} ${config.color}` : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <config.icon size={12} /> {b.name}
                  </button>
                )
              })}
            </div>
          )}

          <div className="flex items-center gap-1 bg-white/[0.03] border border-white/10 rounded-xl p-1" role="group" aria-label="Periodo">
            {PERIODS.map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                aria-pressed={period === p.id}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${period === p.id ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => excelMutation.mutate()}
            disabled={excelMutation.isPending}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600/15 border border-emerald-500/20 text-emerald-300 text-xs font-medium hover:bg-emerald-600/25 transition-colors disabled:opacity-50"
          >
            <FileSpreadsheet size={14} /> {excelMutation.isPending ? 'Exportando…' : 'Excel'}
          </button>
          <button
            onClick={() => pdfMutation.mutate()}
            disabled={pdfMutation.isPending}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-600/15 border border-rose-500/20 text-rose-300 text-xs font-medium hover:bg-rose-600/25 transition-colors disabled:opacity-50"
          >
            <FileText size={14} /> {pdfMutation.isPending ? 'Exportando…' : 'PDF'}
          </button>
        </div>
      </div>

      {/* Horizonte 3D: reservas por día */}
      <Reveal>
        <BookingsSkyline
          days={days}
          todayKey={toLocalIsoDate(new Date())}
          loading={periodLoading}
          periodLabel={periodText + (selectedBusinessId ? ' · todos los negocios' : '')}
        />
      </Reveal>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <Reveal key={kpi.label} delay={i * STAGGER_MS}>
            <TiltCard maxTilt={5}>
              <div className="relative overflow-hidden rounded-[1.25rem] p-5">
                <span className="kpi-glow" style={{ '--glow': kpi.glow } as React.CSSProperties} aria-hidden />
                <div className={`w-9 h-9 ${kpi.bg} rounded-xl flex items-center justify-center mb-4`}>
                  <kpi.icon size={16} className={kpi.color} />
                </div>
                <p className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  <CountUp value={kpi.value} kind={kpi.kind} />
                </p>
                <p className="text-slate-400 text-xs mt-1">{kpi.label}</p>
              </div>
            </TiltCard>
          </Reveal>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cobrado por día */}
        <ChartCard
          icon={Euro}
          iconClass="text-emerald-300"
          title="Cobrado por día"
          subtitle={`${formatPrice(revenueInPeriod)} en los ${periodText} · solo reservas pagadas`}
          className="lg:col-span-2"
        >
          {days.some(d => d.revenue > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={days} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.revenue} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={C.revenue} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={C.grid} vertical={false} />
                <XAxis dataKey="key" tick={axisTick} tickFormatter={dayLabel} minTickGap={24} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick} tickFormatter={(v: number) => `${v} €`} axisLine={false} tickLine={false} width={56} />
                <Tooltip
                  cursor={{ stroke: 'rgba(255,255,255,0.25)', strokeDasharray: '3 3' }}
                  content={<ChartTooltip labelFormatter={longDayLabel} valueFormatter={v => formatPrice(v)} />}
                />
                <Area type="monotone" dataKey="revenue" name="Cobrado" stroke={C.revenue} strokeWidth={2} fill="url(#revenueFill)"
                  activeDot={{ r: 5, stroke: '#0a0a0f', strokeWidth: 2 }} {...anim} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <Empty text="Aún no hay reservas pagadas en este periodo" />
          )}
        </ChartCard>

        {/* Tasa de cancelación (antes un gráfico circular de 2 porciones) */}
        <ChartCard icon={XCircle} iconClass="text-rose-300" title="Cancelaciones" subtitle="Sobre el total de reservas" delay={STAGGER_MS}>
          <div className="flex h-[220px] flex-col justify-center">
            <p className="text-5xl font-semibold tracking-tight text-white">
              <CountUp value={cancellationRate} kind="pct" />
            </p>
            <p className="mt-2 text-sm text-slate-400">
              {stats?.cancelledBookings ?? 0} de {stats?.totalBookings ?? 0} reservas canceladas
            </p>
            <div
              className="meter mt-6"
              role="meter"
              aria-label="Tasa de cancelación"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={cancellationRate}
            >
              <span style={{ '--scale': Math.min(100, Math.max(0, cancellationRate)) / 100 } as React.CSSProperties} />
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-slate-500"><span>0 %</span><span>100 %</span></div>
          </div>
        </ChartCard>
      </div>

      {/* Servicios: cada medida en su gráfica (antes compartían eje) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard icon={Star} iconClass="text-violet-300" title="Reservas por servicio" subtitle="Servicios más populares">
          {servicesByBookings.length ? (
            <ResponsiveContainer width="100%" height={Math.max(180, servicesByBookings.length * 36)}>
              <BarChart data={servicesByBookings} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barCategoryGap={8}>
                <CartesianGrid stroke={C.grid} horizontal={false} />
                <XAxis type="number" tick={axisTick} allowDecimals={false} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fill: '#cbd5e1', fontSize: 12 }} width={130} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  content={<ChartTooltip labelFormatter={(l) => servicesByBookings.find(s => s.name === l)?.full ?? String(l)} valueFormatter={v => `${v} reservas`} />}
                />
                <Bar dataKey="reservas" name="Reservas" fill={C.bookings} radius={[0, 4, 4, 0]} {...anim} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </ChartCard>

        <ChartCard icon={Euro} iconClass="text-emerald-300" title="Ingresos por servicio" subtitle="Lo que más factura" delay={STAGGER_MS}>
          {servicesByRevenue.length ? (
            <ResponsiveContainer width="100%" height={Math.max(180, servicesByRevenue.length * 36)}>
              <BarChart data={servicesByRevenue} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }} barCategoryGap={8}>
                <CartesianGrid stroke={C.grid} horizontal={false} />
                <XAxis type="number" tick={axisTick} tickFormatter={(v: number) => `${v} €`} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fill: '#cbd5e1', fontSize: 12 }} width={130} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  content={<ChartTooltip labelFormatter={(l) => servicesByRevenue.find(s => s.name === l)?.full ?? String(l)} valueFormatter={v => formatPrice(v)} />}
                />
                <Bar dataKey="ingresos" name="Ingresos" fill={C.revenue} radius={[0, 4, 4, 0]} {...anim} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </ChartCard>
      </div>

      {/* Equipo */}
      <ChartCard icon={Users} iconClass="text-violet-300" title="Rendimiento del equipo" subtitle="Reservas completadas y canceladas por persona">
        {staffChartData.length ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={staffChartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }} barGap={2} barCategoryGap="28%">
              <CartesianGrid stroke={C.grid} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#cbd5e1', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={axisTick} allowDecimals={false} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} content={<ChartTooltip valueFormatter={v => `${v}`} />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ color: '#cbd5e1', fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="completadas" name="Completadas" fill={C.bookings} radius={[4, 4, 0, 0]} {...anim} />
              <Bar dataKey="canceladas" name="Canceladas" fill={C.cancelled} radius={[4, 4, 0, 0]} {...anim} />
            </BarChart>
          </ResponsiveContainer>
        ) : <Empty text="Sin datos del equipo todavía" />}
      </ChartCard>
    </div>
  )
}
