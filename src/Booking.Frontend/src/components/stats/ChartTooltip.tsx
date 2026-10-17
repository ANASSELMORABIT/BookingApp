import type { TooltipContentProps } from 'recharts'

type Row = { name?: string | number; value?: unknown; color?: string; dataKey?: unknown }

/** Tooltip de vidrio para Recharts: título, una fila por serie y el valor ya formateado. */
export function ChartTooltip({
  active, payload, label, labelFormatter, valueFormatter,
}: Partial<TooltipContentProps<number, string>> & {
  labelFormatter?: (label: unknown) => string
  valueFormatter?: (value: number, name: string) => string
}) {
  if (!active || !payload?.length) return null
  const rows = payload as readonly Row[]
  return (
    <div className="chart-tooltip min-w-40">
      <p className="mb-1.5 text-xs font-medium text-white">{labelFormatter ? labelFormatter(label) : String(label ?? '')}</p>
      <dl className="space-y-0.5 text-xs tabular-nums">
        {rows.map(r => (
          <div key={String(r.dataKey ?? r.name)} className="flex items-center justify-between gap-6">
            <dt className="flex items-center gap-1.5 text-slate-400">
              <span className="h-2 w-2 rounded-full" style={{ background: r.color }} aria-hidden />
              {String(r.name ?? '')}
            </dt>
            <dd className="text-white">
              {valueFormatter ? valueFormatter(Number(r.value), String(r.name ?? '')) : String(r.value ?? '')}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
