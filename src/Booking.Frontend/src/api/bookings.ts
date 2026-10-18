import client from './client'
import type { Booking, TimeSlot } from '@/types'

export const bookingsApi = {
  getAvailability: (serviceId: string, staffId: string, date: string, extraIds: string[] = []) =>
    client.get<TimeSlot[]>('/Availability', {
      params: { serviceId, staffId, date, extraIds }
    }).then(r => r.data),

  create: (data: {
    serviceId: string; staffId: string; startTime: string; notes?: string
    extraIds: string[]; acceptPolicies: boolean
  }) =>
    client.post<Booking>('/Bookings', data).then(r => r.data),

  getByBusiness: (businessId: string, from: string, to: string) =>
    client.get<Booking[]>(`/Bookings/business/${businessId}`, {
      params: { from, to }
    }).then(r => r.data),

  getMyBookings: () =>
    client.get<Booking[]>('/Bookings/my').then(r => r.data),

  cancel: (id: string) =>
    client.delete<Booking>(`/Bookings/${id}`).then(r => r.data),

  /** El cliente ha llegado: evita la cancelación automática por retraso. */
  markArrived: (id: string) =>
    client.put<Booking>(`/Bookings/${id}/arrived`).then(r => r.data),
}