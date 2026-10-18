import client from './client'
import type { ClientSummary } from '@/types'

/** Clientes del negocio: historial, lista de avisos y bloqueos (solo propietario). */
export const clientsApi = {
  getAll: () =>
    client.get<ClientSummary[]>('/Clients').then(r => r.data),

  block: (id: string, reason?: string) =>
    client.put<ClientSummary>(`/Clients/${id}/block`, { reason }).then(r => r.data),

  unblock: (id: string) =>
    client.put<ClientSummary>(`/Clients/${id}/unblock`).then(r => r.data),

  clearFlag: (id: string) =>
    client.put<ClientSummary>(`/Clients/${id}/clear-flag`).then(r => r.data),
}
