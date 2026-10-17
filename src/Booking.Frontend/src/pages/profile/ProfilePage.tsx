import { useRef, useState, type ComponentType, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import {
  User, Mail, Phone, Shield, Lock, Save, Building2, CalendarDays, Eye, EyeOff,
  Check, X, LogOut, Globe, KeyRound, Clock, Undo2,
} from 'lucide-react'
import { profileApi } from '@/api/profile'
import { useAuth } from '@/context/AuthContext'
import { roleLabel } from '@/lib/labels'
import { cn } from '@/lib/utils'
import { PageLoader } from '@/components/app/PageLoader'
import type { Profile } from '@/types'

/** Retraso entre elementos al entrar (ms). */
const STAGGER_MS = 60
const enter = (i: number) => ({ animationDelay: `${i * STAGGER_MS}ms` })

const apiMessage = (err: unknown, fallback: string) =>
  (isAxiosError<{ message?: string }>(err) && err.response?.data?.message) || fallback

const longDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'

// ── Piezas ─────────────────────────────────────────────────────────────

/** Avatar con anillo de luz que se dibuja una vez al entrar. */
function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?'
  return (
    <div className="profile-avatar relative h-24 w-24 flex-shrink-0 sm:h-28 sm:w-28">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
        <defs>
          <linearGradient id="avatar-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ede9fe" />
            <stop offset="50%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="47" fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="2" />
        <circle className="avatar-ring-stroke" cx="50" cy="50" r="47" fill="none" stroke="url(#avatar-ring)" strokeWidth="2.5" strokeLinecap="round" pathLength={100} />
      </svg>
      <div className="absolute inset-[9%] flex items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 shadow-[0_12px_40px_-8px_rgb(124_58_237_/_0.7)]">
        <span className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{initials}</span>
      </div>
    </div>
  )
}

/** Cabecera de vidrio con una inclinación muy suave al pasar el ratón. */
function Hero({ profile }: { profile: Profile }) {
  const ref = useRef<HTMLDivElement>(null)
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    ref.current.style.setProperty('--ry', `${x * 4}deg`)
    ref.current.style.setProperty('--rx', `${-y * 4}deg`)
    ref.current.style.setProperty('--mx', `${(x + 0.5) * 100}%`)
    ref.current.style.setProperty('--my', `${(y + 0.5) * 100}%`)
  }
  const onLeave = () => {
    ref.current?.style.setProperty('--rx', '0deg')
    ref.current?.style.setProperty('--ry', '0deg')
  }

  const facts = [
    { icon: CalendarDays, label: 'Miembro desde', value: longDate(profile.createdAt) },
    { icon: Building2, label: 'Negocio', value: profile.tenantSubdomain },
    { icon: Shield, label: 'Rol', value: roleLabel(profile.role) },
  ]

  return (
    <div className="profile-enter [perspective:1000px]" style={enter(0)}>
      <div ref={ref} className="profile-hero relative overflow-hidden rounded-3xl p-6 sm:p-8" onPointerMove={onMove} onPointerLeave={onLeave}>
        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center">
          <Avatar name={profile.fullName} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-widest text-violet-300">Mi perfil</p>
            <h1 className="mt-1 truncate text-3xl font-semibold tracking-tight text-white sm:text-4xl">{profile.fullName}</h1>
            <p className="mt-1 truncate text-sm text-slate-400">{profile.email}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-violet-400/25 bg-violet-500/15 px-2.5 py-0.5 text-xs font-medium text-violet-200">
                {roleLabel(profile.role)}
              </span>
              <span className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-0.5 text-xs text-slate-300">
                <Building2 size={11} /> {profile.tenantSubdomain}
              </span>
            </div>
          </div>
        </div>
        <dl className="relative z-10 mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {facts.map((f, i) => (
            <div key={f.label} className="profile-fact profile-enter rounded-2xl p-4" style={enter(2 + i)}>
              <dt className="flex items-center gap-1.5 text-xs text-slate-400"><f.icon size={12} /> {f.label}</dt>
              <dd className="mt-1 truncate text-sm font-medium text-white">{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}

/** Campo con icono dentro y brillo al enfocar. */
function Field({ id, label, icon: Icon, hint, children }: {
  id: string
  label: string
  icon: ComponentType<{ size?: number; className?: string }>
  hint?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm text-slate-300">{label}</label>
      <div className="profile-field relative">
        <Icon size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
        {children}
      </div>
      {hint}
    </div>
  )
}

const inputClass = 'h-11 w-full rounded-xl bg-transparent pl-10 pr-10 text-sm text-white outline-none placeholder:text-slate-500'

/** Fila de solo lectura con candado. */
function LockedRow({ icon: Icon, label, value, note }: {
  icon: ComponentType<{ size?: number; className?: string }>
  label: string
  value: string
  note: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
      <Icon size={15} className="flex-shrink-0 text-slate-500" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="truncate text-sm text-slate-200">{value}</p>
      </div>
      <span className="flex items-center gap-1 text-[11px] text-slate-500" title={note}>
        <Lock size={11} /> {note}
      </span>
    </div>
  )
}

// ── Información personal ───────────────────────────────────────────────

function InfoForm({ profile }: { profile: Profile }) {
  const queryClient = useQueryClient()
  const { user, login } = useAuth()
  const initial = { fullName: profile.fullName, phone: profile.phone ?? '' }
  const [form, setForm] = useState(initial)
  const dirty = form.fullName.trim() !== initial.fullName || form.phone.trim() !== initial.phone
  const valid = form.fullName.trim().length > 0

  const mutation = useMutation({
    mutationFn: () => profileApi.update({
      fullName: form.fullName.trim(),
      // Vacío = borrar el teléfono
      phone: form.phone.trim() || undefined,
    }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['profile'], updated)
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      // El nombre del menú lateral sale de la sesión guardada: se actualiza también
      if (user) login({ ...user, fullName: updated.fullName })
      toast.success('Perfil actualizado')
    },
    onError: (err) => toast.error(apiMessage(err, 'No se pudo actualizar el perfil.')),
  })

  const save = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (dirty && valid) mutation.mutate()
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="fullName" label="Nombre completo" icon={User}
          hint={!valid && <p className="text-xs text-rose-300">El nombre no puede estar vacío.</p>}>
          <input
            id="fullName"
            value={form.fullName}
            onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
            autoComplete="name"
            required
            aria-invalid={!valid}
            className={inputClass}
          />
        </Field>
        <Field id="phone" label="Teléfono" icon={Phone}
          hint={<p className="text-xs text-slate-500">Opcional. Déjalo vacío para quitarlo.</p>}>
          <input
            id="phone"
            type="tel"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="+34 600 000 000"
            autoComplete="tel"
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <LockedRow icon={Mail} label="Email" value={profile.email} note="No editable" />
        <LockedRow icon={Shield} label="Rol" value={roleLabel(profile.role)} note="Lo asigna el negocio" />
      </div>

      {/* Barra de cambios sin guardar */}
      <div className={cn('save-bar', dirty && 'is-open')} aria-hidden={!dirty}>
        <div className="save-bar-inner mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-2xl px-4 py-3 sm:px-5">
          <p className="flex items-center gap-2 text-sm text-slate-200">
            <span className="h-2 w-2 rounded-full bg-amber-400" aria-hidden /> Tienes cambios sin guardar
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setForm(initial)}
              tabIndex={dirty ? 0 : -1}
              className="flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              <Undo2 size={14} /> Descartar
            </button>
            <button
              type="submit"
              disabled={!valid || mutation.isPending}
              tabIndex={dirty ? 0 : -1}
              className="flex h-9 items-center gap-1.5 rounded-xl bg-violet-600 px-4 text-sm font-medium text-white shadow-lg shadow-violet-600/25 transition-colors hover:bg-violet-500 disabled:opacity-50"
            >
              <Save size={14} /> {mutation.isPending ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}

// ── Contraseña ─────────────────────────────────────────────────────────

const STRENGTH = [
  { label: 'Muy débil', color: '#f43f5e' },
  { label: 'Débil', color: '#fb923c' },
  { label: 'Aceptable', color: '#facc15' },
  { label: 'Buena', color: '#34d399' },
  { label: 'Muy buena', color: '#10b981' },
]

function strengthOf(pw: string): number {
  if (!pw) return 0
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/\d/.test(pw)) score++
  if (/[A-ZÁÉÍÓÚÑ]/.test(pw) && /[a-záéíóúñ]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return Math.min(4, score)
}

function PasswordInput({ id, label, value, onChange, autoComplete, describedBy }: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  autoComplete: string
  describedBy?: string
}) {
  const [visible, setVisible] = useState(false)
  return (
    <Field id={id} label={label} icon={KeyRound}>
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        autoComplete={autoComplete}
        aria-describedby={describedBy}
        required
        className={inputClass}
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-200"
      >
        {visible ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </Field>
  )
}

function Requirement({ ok, children, optional }: { ok: boolean; children: ReactNode; optional?: boolean }) {
  return (
    <li className={cn('flex items-center gap-2 text-xs transition-colors', ok ? 'text-emerald-300' : 'text-slate-400')}>
      <span className={cn('flex h-4 w-4 items-center justify-center rounded-full border transition-colors',
        ok ? 'border-emerald-400/50 bg-emerald-500/20' : 'border-white/15')}>
        {ok ? <Check size={10} /> : optional ? null : <X size={9} className="text-slate-500" />}
      </span>
      {children}
      {optional && <span className="text-slate-500">· recomendado</span>}
    </li>
  )
}

function PasswordForm() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const score = strengthOf(form.newPassword)
  const checks = {
    length: form.newPassword.length >= 8,
    match: form.newPassword.length > 0 && form.newPassword === form.confirmPassword,
    number: /\d/.test(form.newPassword),
    upper: /[A-ZÁÉÍÓÚÑ]/.test(form.newPassword),
    different: form.newPassword.length > 0 && form.newPassword !== form.currentPassword,
  }
  const valid = !!form.currentPassword && checks.length && checks.match && checks.different

  const mutation = useMutation({
    mutationFn: () => profileApi.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
    onSuccess: () => {
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setError('')
      toast.success('Contraseña cambiada')
    },
    onError: (err) => {
      const message = apiMessage(err, 'La contraseña actual no es correcta.')
      setError(message)
      toast.error(message)
    },
  })

  return (
    <form onSubmit={e => { e.preventDefault(); if (valid) mutation.mutate() }} className="space-y-5">
      <PasswordInput id="currentPassword" label="Contraseña actual" value={form.currentPassword}
        onChange={v => { setForm(f => ({ ...f, currentPassword: v })); setError('') }} autoComplete="current-password" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <PasswordInput id="newPassword" label="Nueva contraseña" value={form.newPassword}
          onChange={v => setForm(f => ({ ...f, newPassword: v }))} autoComplete="new-password" describedBy="pw-strength pw-reqs" />
        <PasswordInput id="confirmPassword" label="Repite la nueva contraseña" value={form.confirmPassword}
          onChange={v => setForm(f => ({ ...f, confirmPassword: v }))} autoComplete="new-password" />
      </div>

      {/* Medidor de seguridad */}
      <div id="pw-strength" aria-live="polite">
        <div className="flex gap-1.5" aria-hidden>
          {[0, 1, 2, 3].map(i => (
            <span key={i} className="strength-seg" style={{ '--on': i < score ? 1 : 0, '--c': STRENGTH[score].color, '--d': `${i * 50}ms` } as React.CSSProperties} />
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Seguridad: <span className="font-medium" style={{ color: form.newPassword ? STRENGTH[score].color : undefined }}>
            {form.newPassword ? STRENGTH[score].label : '—'}
          </span>
        </p>
      </div>

      <ul id="pw-reqs" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Requirement ok={checks.length}>Al menos 8 caracteres</Requirement>
        <Requirement ok={checks.match}>Las dos contraseñas coinciden</Requirement>
        <Requirement ok={checks.different}>Distinta de la actual</Requirement>
        <Requirement ok={checks.number && checks.upper} optional>Un número y una mayúscula</Requirement>
      </ul>

      {error && (
        <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-300" role="alert">{error}</p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!valid || mutation.isPending}
          className="flex h-11 items-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-medium text-white shadow-lg shadow-violet-600/25 transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Lock size={14} /> {mutation.isPending ? 'Cambiando…' : 'Cambiar contraseña'}
        </button>
      </div>
    </form>
  )
}

// ── Pantalla ───────────────────────────────────────────────────────────

const TABS = [
  { id: 'info', label: 'Información', icon: User },
  { id: 'password', label: 'Contraseña', icon: Lock },
] as const
type TabId = typeof TABS[number]['id']

export function ProfilePage() {
  const [tab, setTab] = useState<TabId>('info')
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: profileApi.get,
  })

  if (isLoading || !profile) return <PageLoader label="Cargando perfil…" cards={0} />

  const tabIndex = TABS.findIndex(t => t.id === tab)
  const expires = user?.expiresAt ? new Date(user.expiresAt) : null

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-24">
      <Hero profile={profile} />

      {/* Pestañas con indicador deslizante */}
      <div
        className="profile-enter profile-tabs relative grid w-full max-w-xs grid-cols-2 rounded-xl p-1"
        style={{ ...enter(5), '--tab': tabIndex } as React.CSSProperties}
        role="tablist"
        aria-label="Ajustes del perfil"
      >
        <span className="profile-tabs-indicator" aria-hidden />
        {TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={cn('relative z-10 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors',
              tab === t.id ? 'text-white' : 'text-slate-400 hover:text-white')}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      <section
        key={tab}
        id={`panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
        className="profile-panel glass-panel p-6 sm:p-8"
      >
        <div className="mb-6">
          <h2 className="flex items-center gap-2 text-base font-semibold text-white">
            {tab === 'info' ? <><User size={16} className="text-violet-300" /> Información personal</> : <><Lock size={16} className="text-violet-300" /> Cambiar contraseña</>}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {tab === 'info' ? 'Tu nombre y teléfono aparecen en las reservas y avisos.' : 'Usa una contraseña que no utilices en otros sitios.'}
          </p>
        </div>
        {tab === 'info' ? <InfoForm profile={profile} /> : <PasswordForm />}
      </section>

      {/* Sesión y accesos */}
      <div className="profile-enter grid grid-cols-1 gap-4 sm:grid-cols-2" style={enter(7)}>
        <div className="glass-panel flex items-center gap-4 p-5">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <Clock size={16} className="text-violet-300" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white">Sesión</p>
            <p className="truncate text-xs text-slate-400">
              {expires ? `Caduca el ${expires.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} a las ${expires.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}` : 'Activa'}
            </p>
          </div>
          <button
            onClick={() => { logout(); navigate('/login') }}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-500/20"
          >
            <LogOut size={13} /> Cerrar sesión
          </button>
        </div>

        {['Owner', 'SuperAdmin'].includes(profile.role) ? (
          <Link to="/share" className="glass-panel group flex items-center gap-4 p-5 transition-colors hover:bg-white/[0.03]">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
              <Globe size={16} className="text-violet-300" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white">Tu página pública</p>
              <p className="truncate text-xs text-slate-400">/book/{profile.tenantSubdomain}</p>
            </div>
            <span className="text-slate-500 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden>→</span>
          </Link>
        ) : (
          <Link to="/bookings" className="glass-panel group flex items-center gap-4 p-5 transition-colors hover:bg-white/[0.03]">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
              <CalendarDays size={16} className="text-violet-300" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white">Mis reservas</p>
              <p className="truncate text-xs text-slate-400">Consulta o cancela tus citas</p>
            </div>
            <span className="text-slate-500 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden>→</span>
          </Link>
        )}
      </div>
    </div>
  )
}
