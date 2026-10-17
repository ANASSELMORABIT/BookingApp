import client from './client'
import type { DashboardStats, BookingsByPeriod, StaffStats } from '@/types'

export const adminApi = {
  getDashboard: (businessId?: string) =>
    client.get<DashboardStats>('/Admin/dashboard', {
      params: businessId ? { businessId } : {}
    }).then(r => r.data),

  getBookingsByPeriod: (from: string, to: string, businessId?: string) =>
    client.get<BookingsByPeriod[]>('/Admin/bookings-by-period', {
      params: { from, to, ...(businessId ? { businessId } : {}) }
    }).then(r => r.data),

  getStaffStats: (businessId: string) =>
    client.get<StaffStats[]>(`/Admin/staff-stats/${businessId}`).then(r => r.data),

  exportExcel: (from: string, to: string) =>
    client.get('/Export/excel', {
      params: { from, to },
      responseType: 'blob'
    }).then(r => {
      const url = URL.createObjectURL(r.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `reservas_${from}_${to}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    }),

  exportPdf: (from: string, to: string) =>
    client.get('/Export/pdf', {
      params: { from, to },
      responseType: 'blob'
    }).then(r => {
      const url = URL.createObjectURL(r.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `estadisticas_${from}_${to}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    }),
}