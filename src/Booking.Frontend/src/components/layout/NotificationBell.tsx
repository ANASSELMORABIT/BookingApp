import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Bell, X, CheckCheck, Calendar, XCircle, CheckCircle, AlertTriangle } from 'lucide-react'
import { useNotifications } from '@/hooks/useNotifications'
import { cn } from '@/lib/utils'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const { notifications, unreadCount, markAllRead, markRead } = useNotifications()

  const icons = {
    booking_created:   { icon: Calendar,    color: 'text-violet-400',  bg: 'bg-violet-500/10'  },
    booking_cancelled: { icon: XCircle,     color: 'text-rose-400',    bg: 'bg-rose-500/10'    },
    booking_confirmed: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    booking_alert:     { icon: AlertTriangle, color: 'text-amber-300', bg: 'bg-amber-500/10' },
  }

  // Calcula la posición del panel en base a la posición real del botón en el viewport
  const updatePosition = () => {
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    const panelWidth = 320 // w-80
    const gap = 8

    // Por defecto, el panel se abre a la derecha del botón
    let left = rect.right + gap
    // Si no cabe a la derecha, lo abrimos hacia la izquierda del botón
    if (left + panelWidth > window.innerWidth) {
      left = rect.left - panelWidth - gap
    }
    // Nunca dejar que se salga por la izquierda
    left = Math.max(gap, left)

    setCoords({ top: rect.top, left })
  }

  const toggleOpen = () => {
    if (!open) {
      updatePosition()
      markAllRead()
    }
    setOpen(!open)
  }

  // Reposicionar si cambia el tamaño de la ventana o se hace scroll mientras está abierto
  useEffect(() => {
    if (!open) return
    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={toggleOpen}
        className="relative w-8 h-8 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center hover:bg-white/[0.07] transition-all"
      >
        <Bell size={14} className="text-slate-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-violet-600 rounded-full text-[10px] text-white font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)} />
          <div
            className="fixed w-80 bg-[#0d0d14] border border-white/10 rounded-2xl shadow-2xl z-[9999] overflow-hidden"
            style={{ top: coords.top, left: coords.left }}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/[0.05]">
              <div className="flex items-center gap-2">
                <Bell size={14} className="text-violet-400" />
                <h3 className="text-white text-sm font-semibold">Notificaciones</h3>
                {unreadCount > 0 && (
                  <span className="text-[10px] bg-violet-600/20 text-violet-400 border border-violet-500/20 px-1.5 py-0.5 rounded-full">
                    {unreadCount} nuevas
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <button onClick={markAllRead} className="text-slate-500 hover:text-slate-300 transition-colors">
                    <CheckCheck size={14} />
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Bell size={24} className="text-slate-700 mb-2" />
                  <p className="text-slate-500 text-sm">Sin notificaciones</p>
                </div>
              ) : (
                notifications.map(n => {
                  const config = icons[n.type]
                  const Icon = config.icon
                  return (
                    <div
                      key={n.id}
                      onClick={() => markRead(n.id)}
                      className={cn(
                        'flex items-start gap-3 p-4 border-b border-white/[0.03] cursor-pointer transition-all hover:bg-white/[0.03]',
                        !n.read && 'bg-white/[0.02]'
                      )}
                    >
                      <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <Icon size={14} className={config.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-white text-xs font-medium">{n.title}</p>
                          {!n.read && (
                            <div className="w-1.5 h-1.5 bg-violet-400 rounded-full flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-slate-400 text-xs mt-0.5 leading-relaxed break-words">{n.message}</p>
                        <p className="text-slate-600 text-[10px] mt-1">
                          {new Date(n.time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}