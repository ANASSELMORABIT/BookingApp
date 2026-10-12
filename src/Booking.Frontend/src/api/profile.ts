import client from './client'
import type { Profile } from '@/types'

export const profileApi = {
  get: () =>
    client.get<Profile>('/Profile').then(r => r.data),

  update: (data: { fullName: string; phone?: string }) =>
    client.put<Profile>('/Profile', data).then(r => r.data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    client.put('/Profile/change-password', data).then(r => r.data),
}