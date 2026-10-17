import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { profileApi } from '@/api/profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { User, Mail, Phone, Shield, Lock, Save, Building2 } from 'lucide-react'

export function ProfilePage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'info' | 'password'>('info')
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: profileApi.get,
  })

  const [form, setForm] = useState({ fullName: '', phone: '' })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: ''
  })

  const updateMutation = useMutation({
    mutationFn: profileApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      setSuccess('Perfil actualizado correctamente.')
      setTimeout(() => setSuccess(''), 3000)
    },
    onError: () => setError('Error al actualizar el perfil.')
  })

  const passwordMutation = useMutation({
    mutationFn: profileApi.changePassword,
    onSuccess: () => {
      setSuccess('Contraseña cambiada correctamente.')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setTimeout(() => setSuccess(''), 3000)
    },
    onError: () => setError('La contraseña actual es incorrecta.')
  })

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    updateMutation.mutate({
      fullName: form.fullName || profile?.fullName || '',
      phone: form.phone || profile?.phone,
    })
  }

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (passwordForm.newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    passwordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    })
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-3 text-slate-400">
        <span className="w-5 h-5 border-2 border-slate-600 border-t-violet-500 rounded-full animate-spin" />
        Cargando perfil...
      </div>
    </div>
  )

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Mi perfil</h1>
        <p className="text-slate-400 mt-1 text-sm">Gestiona tu información personal</p>
      </div>

      {/* Profile card */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-600/20 flex-shrink-0">
            <span className="text-white text-2xl font-bold">
              {profile?.fullName?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <h2 className="text-white text-xl font-bold">{profile?.fullName}</h2>
            <p className="text-slate-400 text-sm">{profile?.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs bg-violet-500/20 text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded-md font-medium">
                {profile?.role}
              </span>
              <span className="text-xs bg-white/5 text-slate-400 border border-white/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                <Building2 size={10} />
                {profile?.tenantSubdomain}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-slate-500 text-xs">Miembro desde</p>
            <p className="text-white text-sm font-medium mt-0.5">
              {new Date(profile?.createdAt ?? '').toLocaleDateString('es-ES', {
                day: 'numeric', month: 'long', year: 'numeric'
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.03] border border-white/10 rounded-xl p-1 w-fit">
        {[
          { id: 'info', label: 'Información', icon: User },
          { id: 'password', label: 'Contraseña', icon: Lock },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as 'info' | 'password'); setError(''); setSuccess('') }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Feedback */}
      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
          <p className="text-emerald-400 text-sm">{success}</p>
        </div>
      )}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
          <p className="text-rose-400 text-sm">{error}</p>
        </div>
      )}

      {/* Info tab */}
      {activeTab === 'info' && (
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
          <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
            <User size={16} className="text-violet-400" />
            Información personal
          </h3>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm flex items-center gap-2">
                  <User size={13} className="text-slate-500" /> Nombre completo
                </Label>
                <Input
                  defaultValue={profile?.fullName}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-violet-500 h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm flex items-center gap-2">
                  <Phone size={13} className="text-slate-500" /> Teléfono
                </Label>
                <Input
                  defaultValue={profile?.phone ?? ''}
                  placeholder="+34 600 000 000"
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-violet-500 h-10 rounded-xl"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm flex items-center gap-2">
                <Mail size={13} className="text-slate-500" /> Email
              </Label>
              <Input
                value={profile?.email}
                disabled
                className="bg-white/[0.02] border-white/5 text-slate-500 h-10 rounded-xl cursor-not-allowed"
              />
              <p className="text-slate-600 text-xs">El email no se puede modificar</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm flex items-center gap-2">
                <Shield size={13} className="text-slate-500" /> Rol
              </Label>
              <Input
                value={profile?.role}
                disabled
                className="bg-white/[0.02] border-white/5 text-slate-500 h-10 rounded-xl cursor-not-allowed"
              />
            </div>
            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl px-6 h-10 flex items-center gap-2 shadow-lg shadow-violet-600/20"
              >
                <Save size={14} />
                {updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Password tab */}
      {activeTab === 'password' && (
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
          <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
            <Lock size={16} className="text-violet-400" />
            Cambiar contraseña
          </h3>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Contraseña actual</Label>
              <Input
                type="password"
                value={passwordForm.currentPassword}
                onChange={e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))}
                required
                className="bg-white/5 border-white/10 text-white h-10 rounded-xl focus:border-violet-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Nueva contraseña</Label>
              <Input
                type="password"
                value={passwordForm.newPassword}
                onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                required
                className="bg-white/5 border-white/10 text-white h-10 rounded-xl focus:border-violet-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Confirmar nueva contraseña</Label>
              <Input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
                required
                className="bg-white/5 border-white/10 text-white h-10 rounded-xl focus:border-violet-500"
              />
            </div>
            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={passwordMutation.isPending}
                className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl px-6 h-10 flex items-center gap-2 shadow-lg shadow-violet-600/20"
              >
                <Lock size={14} />
                {passwordMutation.isPending ? 'Cambiando...' : 'Cambiar contraseña'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}