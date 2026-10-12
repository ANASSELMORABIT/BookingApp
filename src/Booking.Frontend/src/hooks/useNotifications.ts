import { useEffect, useState, useCallback } from 'react'
import * as signalR from '@microsoft/signalr'
import { useAuth } from '@/context/AuthContext'

export interface Notification {
  id: string
  type: 'booking_created' | 'booking_cancelled' | 'booking_confirmed'
  title: string
  message: string
  time: string
  read: boolean
}

export function useNotifications() {
  const { user, token } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null)

  const addNotification = useCallback((data: Omit<Notification, 'id' | 'read'>) => {
    const notification: Notification = {
      ...data,
      id: crypto.randomUUID(),
      read: false,
    }
    setNotifications(prev => [notification, ...prev].slice(0, 20))
  }, [])

  useEffect(() => {
    if (!token || !user) return

    const conn = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5239/hubs/notifications', {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .build()

    conn.on('BookingCreated', addNotification)
    conn.on('BookingCancelled', addNotification)
    conn.on('BookingConfirmed', addNotification)

    conn.start().then(() => {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const tenantId = payload?.tenant_id
      const role = payload?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']

      if (role === 'SuperAdmin') {
        // SuperAdmin se une al grupo global
        conn.invoke('JoinTenantGroup', 'superadmin')
        // Y también pedimos al backend que nos una a todos los grupos
        conn.invoke('JoinAllGroups').catch(() => {
          // Si no existe el método, no pasa nada
        })
      } else if (tenantId) {
        conn.invoke('JoinTenantGroup', tenantId)
      }
    })

    setConnection(conn)

    return () => { conn.stop() }
  }, [token, user, addNotification])

  const markAllRead = () =>
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))

  const markRead = (id: string) =>
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))

  const unreadCount = notifications.filter(n => !n.read).length

  return { notifications, unreadCount, markAllRead, markRead }
}