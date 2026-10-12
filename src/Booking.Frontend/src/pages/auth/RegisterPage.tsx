import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { authApi } from '@/api/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Calendar, Users, Sparkles, BarChart3 } from 'lucide-react'

export function RegisterPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({ fullName: '', email: '', password: '', subdomain: '' })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = await authApi.register(form)
      login(data)
      navigate('/dashboard')
    } catch {
      setError('Error al registrarse. El email puede estar ya en uso.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex overflow-hidden relative">

      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -right-40 w-80 h-80 bg-indigo-600/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl animate-pulse delay-500" />
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* Left panel */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center">
            <Calendar size={18} className="text-white" />
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">BookingApp</span>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="text-5xl font-bold text-white leading-tight">
              Empieza a<br />
              <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                crecer
              </span><br />
              hoy mismo
            </h1>
            <p className="text-slate-400 mt-4 text-lg leading-relaxed max-w-md">
              Crea tu negocio en minutos y empieza a recibir reservas online sin complicaciones.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: Sparkles, label: 'Configuración en 2 minutos', desc: 'Tu subdominio propio listo al instante' },
              { icon: Users, label: 'Gestión de staff y clientes', desc: 'Todo centralizado en un solo panel' },
              { icon: BarChart3, label: 'Estadísticas en tiempo real', desc: 'Controla ingresos, reservas y cancelaciones' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-4">
                <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <item.icon size={16} className="text-violet-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{item.label}</p>
                  <p className="text-slate-500 text-xs">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-slate-600 text-sm">© 2026 BookingApp. Todos los derechos reservados.</p>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-md">
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-2xl">

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white">Crear cuenta</h2>
              <p className="text-slate-400 mt-1 text-sm">Registra tu negocio en BookingApp</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Nombre completo</Label>
                <Input
                  placeholder="Carlos García"
                  value={form.fullName}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                  required
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-violet-500 focus:ring-violet-500/20 h-11 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Subdominio</Label>
                <Input
                  placeholder="mi-peluqueria"
                  value={form.subdomain}
                  onChange={e => setForm(f => ({ ...f, subdomain: e.target.value }))}
                  required
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-violet-500 focus:ring-violet-500/20 h-11 rounded-xl"
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
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-violet-500 focus:ring-violet-500/20 h-11 rounded-xl"
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
                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-violet-500 focus:ring-violet-500/20 h-11 rounded-xl pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
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
                    Registrando...
                  </span>
                ) : 'Crear cuenta'}
              </Button>

              <p className="text-center text-sm text-slate-500">
                ¿Ya tienes cuenta?{' '}
                <Link to="/login" className="text-violet-400 font-medium hover:text-violet-300 transition-colors">
                  Inicia sesión
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}