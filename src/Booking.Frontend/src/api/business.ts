import client from './client'
import type { Business, BusinessPolicies, Service, ServiceExtra, Staff } from '@/types'

export const businessApi = {
  getAll: () =>
    client.get<Business[]>('/Business').then(r => r.data),

  getById: (id: string) =>
    client.get<Business>(`/Business/${id}`).then(r => r.data),

  create: (data: Partial<Business>) =>
    client.post<Business>('/Business', data).then(r => r.data),

  update: (id: string, data: Partial<Business>) =>
    client.put<Business>(`/Business/${id}`, data).then(r => r.data),

  getServices: (id: string) =>
    client.get<Service[]>(`/Business/${id}/services`).then(r => r.data),

  createService: (id: string, data: Partial<Service>) =>
    client.post<Service>(`/Business/${id}/services`, data).then(r => r.data),

  updateService: (serviceId: string, data: Partial<Service>) =>
    client.put<Service>(`/Business/services/${serviceId}`, data).then(r => r.data),

  deleteService: (serviceId: string) =>
    client.delete(`/Business/services/${serviceId}`).then(r => r.data),

  getStaff: (id: string) =>
    client.get<Staff[]>(`/Business/${id}/staff`).then(r => r.data),

  addStaff: (id: string, data: { name: string; email?: string }) =>
    client.post<Staff>(`/Business/${id}/staff`, data).then(r => r.data),

  toggleStaff: (staffId: string) =>
    client.put(`/Business/staff/${staffId}/toggle`).then(r => r.data),

  updatePolicies: (id: string, data: BusinessPolicies) =>
    client.put<BusinessPolicies>(`/Business/${id}/policies`, data).then(r => r.data),

  addExtra: (serviceId: string, data: Omit<ServiceExtra, 'id'>) =>
    client.post<ServiceExtra>(`/Business/services/${serviceId}/extras`, data).then(r => r.data),

  updateExtra: (extraId: string, data: Omit<ServiceExtra, 'id'>) =>
    client.put<ServiceExtra>(`/Business/extras/${extraId}`, data).then(r => r.data),

  deleteExtra: (extraId: string) =>
    client.delete(`/Business/extras/${extraId}`).then(r => r.data),
}