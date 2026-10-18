import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { AlertTriangle, Ban, Mail, Phone, Search, ShieldCheck, Undo2, Users } from 'lucide-react'
import { clientsApi } from '@/api/clients'
import { PageHeader } from '@/components/app/PageHeader'
import { PageLoader } from '@/components/app/PageLoader'
import { EmptyState } from '@/components/app/EmptyState'
import { Segmented } from '@/components/app/Segmented'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { ClientSummary } from '@/types'

type Filter = 'all' | 'flagged' | 'blocked'

const apiMessage = (err: unknown, fallback: string) =>
  (isAxiosError<{ message?: string }>(err) && err.response?.data?.message) || fallback

const shortDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

const initialsOf = (name: string) => name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')

/** Clientes del negocio: lista de avisos (no presentados) y bloqueados (cancelaron sin aviso). */
export function ClientsPage() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [blockTarget, setBlockTarget] = useState<ClientSummary | null>(null)
  const [reason, setReason] = useState('')

  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: clientsApi.getAll,
    staleTime: 0,
  })

  const onDone = (msg: string) => () => {
    queryClient.invalidateQueries({ queryKey: ['clients'] })
    toast.success(msg)
  }
  const block = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => clientsApi.block(id, reason || undefined),
    onSuccess: () => { onDone('Cliente bloqueado')(); setBlockTarget(null); setReason('') },
    onError: err => toast.error(apiMessage(err, 'No se pudo bloquear al cliente.')),
  })
  const unblock = useMutation({
    mutationFn: (id: string) => clientsApi.unblock(id),
    onSuccess: onDone('Cliente desbloqueado: ya puede reservar'),
    onError: err => toast.error(apiMessage(err, 'No se pudo desbloquear al cliente.')),
  })
  const clearFlag = useMutation({
    mutationFn: (id: string) => clientsApi.clearFlag(id),
    onSuccess: onDone('Aviso quitado'),
    onError: err => toast.error(apiMessage(err, 'No se pudo quitar el aviso.')),
  })

  const counts = {
    all: clients?.length ?? 0,
    flagged: clients?.filter(c => c.isFlagged).length ?? 0,
    blocked: clients?.filter(c => c.isBlocked).length ?? 0,
  }

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (clients ?? [])
      .filter(c => filter === 'all' || (filter === 'flagged' ? c.isFlagged : c.isBlocked))
      .filter(c => !q || c.fullName.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.phone ?? '').includes(q))
  }, [clients, filter, search])

  if (isLoading) return <PageLoader label="Cargando clientes…" cards={3} />

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        subtitle="Historial de tus clientes, lista de avisos y bloqueos"
      />

      {/* Resumen */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: 'Clientes', value: counts.all, icon: Users, color: 'text-violet-300', text: 'Han reservado alguna vez' },
          { label: 'Con aviso', value: counts.flagged, icon: AlertTriangle, color: 'text-amber-300', text: 'No se presentaron a una cita' },
          { label: 'Bloqueados', value: counts.blocked, icon: Ban, color: 'text-rose-300', text: 'Cancelaron sin el aviso mínimo' },
        ].map((s, i) => (
          <div key={s.label} className="list-in glass-panel p-4" style={{ '--i': i } as React.CSSProperties}>
            <div className="flex items-center gap-2"><s.icon size={15} className={s.color} /><p className="text-sm font-medium text-white">{s.label}</p></div>
            <p className="mt-2 text-2xl font-semibold text-white tabular-nums">{s.value}</p>
            <p className="text-xs text-slate-400">{s.text}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          label="Filtrar clientes"
          value={filter}
          onChange={setFilter}
          size="sm"
          options={[
            { id: 'all', label: 'Todos', count: counts.all },
            { id: 'flagged', label: 'Con aviso', count: counts.flagged },
            { id: 'blocked', label: 'Bloqueados', count: counts.blocked },
          ]}
        />
        <label className="profile-field relative block sm:w-72">
          <span className="sr-only">Buscar clientes</span>
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre, email o teléfono"
            className="h-10 w-full rounded-xl bg-transparent pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-500" />
        </label>
      </div>

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02]">
          <EmptyState
            icon={filter === 'blocked' ? ShieldCheck : Users}
            title={!clients?.length ? 'Aún no tienes clientes' : filter === 'blocked' ? 'No hay clientes bloqueados' : filter === 'flagged' ? 'Nadie en la lista de avisos' : 'Ningún cliente coincide'}
            text={!clients?.length ? 'Aparecerán aquí cuando reserven desde tu página pública.' : undefined}
          />
        </div>
      ) : (
        <ul className="space-y-2">
          {shown.map((c, i) => (
            <li
              key={c.id}
              style={{ '--i': i } as React.CSSProperties}
              className={cn('list-in lift-card flex flex-col gap-4 rounded-2xl border bg-white/[0.03] p-4 sm:flex-row sm:items-center',
                c.isBlocked ? 'border-rose-500/30' : c.isFlagged ? 'border-amber-500/30' : 'border-white/[0.07]')}
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="staff-avatar" style={{ '--h': 250 } as React.CSSProperties} aria-hidden>{initialsOf(c.fullName)}</span>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 font-medium text-white">
                    <span className="truncate">{c.fullName}</span>
                    {c.isBlocked && <span className="flex items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[11px] font-medium text-rose-300"><Ban size={11} /> Bloqueado</span>}
                    {c.isFlagged && <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-300"><AlertTriangle size={11} /> Con aviso</span>}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
                    <span className="flex items-center gap-1 truncate"><Mail size={11} /> {c.email}</span>
                    {c.phone && <span className="flex items-center gap-1"><Phone size={11} /> {c.phone}</span>}
                  </p>
                  {c.isBlocked && c.blockedReason && (
                    <p className="mt-1 text-xs text-rose-200/80">{c.blockedReason}</p>
                  )}
                </div>
              </div>

              <dl className="grid grid-cols-4 gap-4 text-center text-xs sm:w-80">
                <div><dt className="text-slate-500">Reservas</dt><dd className="mt-0.5 font-semibold text-white tabular-nums">{c.totalBookings}</dd></div>
                <div><dt className="text-slate-500">No vino</dt><dd className={cn('mt-0.5 font-semibold tabular-nums', c.noShowCount ? 'text-amber-300' : 'text-white')}>{c.noShowCount}</dd></div>
                <div><dt className="text-slate-500">Canceló</dt><dd className="mt-0.5 font-semibold text-white tabular-nums">{c.cancelledCount}</dd></div>
                <div><dt className="text-slate-500">Última</dt><dd className="mt-0.5 font-medium text-slate-300">{shortDate(c.lastBookingAt)}</dd></div>
              </dl>

              <div className="flex flex-wrap gap-2 sm:justify-end">
                {c.isFlagged && (
                  <button onClick={() => clearFlag.mutate(c.id)} disabled={clearFlag.isPending}
                    className="flex h-8 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs text-slate-300 transition-colors hover:bg-white/[0.07] hover:text-white">
                    <Undo2 size={12} /> Quitar aviso
                  </button>
                )}
                {c.isBlocked ? (
                  <button onClick={() => unblock.mutate(c.id)} disabled={unblock.isPending}
                    className="flex h-8 items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20">
                    <ShieldCheck size={12} /> Desbloquear
                  </button>
                ) : (
                  <button onClick={() => setBlockTarget(c)}
                    className="flex h-8 items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 text-xs text-rose-300 transition-colors hover:bg-rose-500/20">
                    <Ban size={12} /> Bloquear
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Bloquear a mano, con motivo opcional */}
      <Dialog open={!!blockTarget} onOpenChange={open => { if (!open) { setBlockTarget(null); setReason('') } }}>
        <DialogContent className="app-dialog max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">¿Bloquear a {blockTarget?.fullName}?</DialogTitle>
            <DialogDescription className="text-slate-400">No podrá reservar hasta que lo desbloquees. Sus reservas actuales no cambian.</DialogDescription>
          </DialogHeader>
          <label htmlFor="block-reason" className="text-sm text-slate-300">Motivo (opcional)</label>
          <input id="block-reason" value={reason} onChange={e => setReason(e.target.value)} maxLength={200}
            placeholder="Ej.: No se presenta a las citas"
            className="h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-violet-500" />
          <div className="mt-2 flex justify-end gap-2">
            <button onClick={() => { setBlockTarget(null); setReason('') }} className="h-10 rounded-xl px-4 text-sm text-slate-300 hover:bg-white/5">Volver</button>
            <button onClick={() => blockTarget && block.mutate({ id: blockTarget.id, reason })} disabled={block.isPending}
              className="h-10 rounded-xl bg-rose-600 px-4 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-50">
              {block.isPending ? 'Bloqueando…' : 'Bloquear'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
