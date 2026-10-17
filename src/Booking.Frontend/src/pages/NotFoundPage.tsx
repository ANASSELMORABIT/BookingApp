import { Link } from 'react-router-dom'
import { ArrowLeft, Compass } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

/** Pantalla para direcciones que no existen. */
export function NotFoundPage() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#0a0a0f] px-4">
      <div className="app-backdrop pointer-events-none fixed inset-0" aria-hidden />
      <div className="page-enter relative z-10 max-w-md text-center">
        <div className="empty-icon mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl">
          <Compass size={26} className="text-violet-300" />
        </div>
        <p className="text-sm font-medium text-violet-400">Error 404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Esta página no existe</h1>
        <p className="mt-3 text-slate-400">Puede que el enlace esté mal escrito o que la página se haya movido.</p>
        <Link to={isAuthenticated ? '/dashboard' : '/'} className="btn-primary mt-8 text-sm">
          <ArrowLeft size={15} /> {isAuthenticated ? 'Volver al panel' : 'Volver al inicio'}
        </Link>
      </div>
    </div>
  )
}
