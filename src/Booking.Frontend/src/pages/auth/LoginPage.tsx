import { useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { authApi } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Calendar, Zap, Shield, ArrowLeft } from 'lucide-react'

// Retraso entre elementos en la animación de entrada
const STAGGER_MS = 60
const rise = (i: number) => ({ animationDelay: `${i * STAGGER_MS}ms` })

export function LoginPage() {
  const cardRef = useRef<HTMLDivElement>(null)

  // Brillo de la tarjeta que sigue al cursor (variables CSS, sin re-renderizar)
  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return
    const el = cardRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${e.clientX - r.left}px`)
    el.style.setProperty('--my', `${e.clientY - r.top}px`)
  }

  const { login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', subdomain: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = await authApi.login(form)
      login(data)
      navigate(data.role === 'Client' ? '/bookings' : '/dashboard')
    } catch {
      setError('Credenciales incorrectas. Verifica tus datos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex overflow-hidden relative" onPointerMove={handlePointerMove}>

      {/* Fondo estático: degradados, retícula, grano y viñeta */}
      <div className="login-backdrop absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* Left panel */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 relative z-10">
        <Link to="/" className="login-rise flex items-center gap-3 w-fit rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-400" style={rise(0)}>
          <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center">
            <Calendar size={18} className="text-white" />
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">BookingApp</span>
        </Link>

        <div className="space-y-8">
          <div className="login-rise" style={rise(1)}>
            <h1 className="text-5xl font-bold text-white leading-tight">
              Gestiona tus<br />
              <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                reservas
              </span><br />
              sin esfuerzo
            </h1>
            <p className="text-slate-400 mt-4 text-lg leading-relaxed max-w-md">
              La plataforma todo-en-uno para peluquerías, gimnasios, clínicas y espacios de coworking.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: Zap, label: 'Reservas en tiempo real', desc: 'Disponibilidad actualizada al instante' },
              { icon: Shield, label: 'Pagos seguros', desc: 'Integración con Stripe certificada' },
              { icon: Calendar, label: 'Panel completo', desc: 'Gestiona staff, servicios y estadísticas' },
            ].map((item, i) => (
              <div key={item.label} className="login-rise flex items-center gap-4" style={rise(2 + i)}>
                <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <item.icon size={16} className="text-violet-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{item.label}</p>
                  <p className="text-slate-400 text-xs">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-slate-500 text-sm">© 2026 BookingApp. Todos los derechos reservados.</p>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="login-rise w-full max-w-md" style={rise(2)}>
          <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-white">
            <ArrowLeft size={14} /> Volver al inicio
          </Link>
          <div ref={cardRef} className="login-card rounded-2xl p-8">

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white">Bienvenido de nuevo</h2>
              <p className="text-slate-400 mt-1 text-sm">Inicia sesión para continuar</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Subdominio</Label>
                <Input
                  placeholder="mi-peluqueria"
                  value={form.subdomain}
                  onChange={e => setForm(f => ({ ...f, subdomain: e.target.value }))}
                  required
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-violet-500 focus:ring-violet-500/20 h-11 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Email</Label>
                <Input
                  type="email"
                  placeholder="tu@email.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-violet-500 focus:ring-violet-500/20 h-11 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Contraseña</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    required
                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-violet-500 focus:ring-violet-500/20 h-11 rounded-xl pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-violet-600/25"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Iniciando sesión...
                  </span>
                ) : 'Iniciar sesión'}
              </Button>

              <p className="text-center text-sm text-slate-400">
                ¿No tienes cuenta?{' '}
                <Link to="/register" className="text-violet-400 font-medium hover:text-violet-300 transition-colors">
                  Regístrate gratis
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}