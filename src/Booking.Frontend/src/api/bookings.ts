import client from './client'
import type { Booking, TimeSlot } from '@/types'

export const bookingsApi = {
  getAvailability: (serviceId: string, staffId: string, date: string) =>
    client.get<TimeSlot[]>('/Availability', {
      params: { serviceId, staffId, date }
    }).then(r => r.data),

  create: (data: { serviceId: string; staffId: string; startTime: string; notes?: string }) =>
    client.post<Booking>('/Bookings', data).then(r => r.data),

  getByBusiness: (businessId: string, from: string, to: string) =>
    client.get<Booking[]>(`/Bookings/business/${businessId}`, {
      params: { from, to }
    }).then(r => r.data),

  getMyBookings: () =>
    client.get<Booking[]>('/Bookings/my').then(r => r.data),

  cancel: (id: string) =>
    client.delete<Booking>(`/Bookings/${id}`).then(r => r.data),
}