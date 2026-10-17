import axios from 'axios'
import type { PublicBooking, PublicBusiness, TimeSlot } from '@/types'

const publicClient = axios.create({
  baseURL: '/api/public',
  headers: { 'Content-Type': 'application/json' },
})

export const publicApi = {
  getBusiness: (subdomain: string) =>
    publicClient.get<PublicBusiness[]>(`/business/${subdomain}`).then(r => r.data),

  getAvailability: (serviceId: string, staffId: string, date: string) =>
    publicClient.get<TimeSlot[]>('/availability', {
      params: { serviceId, staffId, date }
    }).then(r => r.data),

  book: (data: {
    serviceId: string
    staffId: string
    startTime: string
    fullName: string
    email: string
    phone?: string
    notes?: string
  }) => publicClient.post<PublicBooking>('/book', data).then(r => r.data),
}