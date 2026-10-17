import { useEffect, useState, useCallback } from 'react'
import * as signalR from '@microsoft/signalr'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'

/** Datos que cambian cuando se crea o cancela una reserva: se recargan al recibir la notificación. */
const BOOKING_QUERY_KEYS = [
  ['calendar-bookings'], ['agenda'], ['business-bookings'], ['my-bookings'],
  ['dashboard'], ['bookings-period'], ['staff-stats'], ['availability'],
]

export interface Notification {
  id: string
  type: 'booking_created' | 'booking_cancelled' | 'booking_confirmed'
  title: string
  message: string
  time: string
  read: boolean
}

/**
 * Conecta con el hub de SignalR. El backend añade la conexión al grupo de su tenant
 * (y al grupo global si es SuperAdmin) a partir del JWT, así que el cliente no elige grupo.
 */
export function useNotifications() {
  const { user, token } = useAuth()
  const queryClient = useQueryClient()
  const [notifications, setNotifications] = useState<Notification[]>([])

  const addNotification = useCallback((data: Omit<Notification, 'id' | 'read'>) => {
    const notification: Notification = { ...data, id: crypto.randomUUID(), read: false }
    setNotifications(prev => [notification, ...prev].slice(0, 20))
    // Calendario, agenda, dashboard y listas se actualizan al momento, sin esperar a recargar
    BOOKING_QUERY_KEYS.forEach(queryKey => queryClient.invalidateQueries({ queryKey }))
  }, [queryClient])

  useEffect(() => {
    if (!token || !user) return

    // URL relativa: Vite redirige /hubs al backend en desarrollo
    const conn = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/notifications', { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .build()

    conn.on('BookingCreated', addNotification)
    conn.on('BookingCancelled', addNotification)
    conn.on('BookingConfirmed', addNotification)

    conn.start().catch(err => console.warn('No se pudo conectar a las notificaciones', err))

    return () => { conn.stop() }
  }, [token, user, addNotification])

  const markAllRead = () =>
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))

  const markRead = (id: string) =>
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))

  const unreadCount = notifications.filter(n => !n.read).length

  return { notifications, unreadCount, markAllRead, markRead }
}
