import client from './client'
import type { AuthResponse, LoginRequest, RegisterRequest } from '@/types'

export const authApi = {
  login: (data: LoginRequest) =>
    client.post<AuthResponse>('/Auth/login', data).then(r => r.data),

  register: (data: RegisterRequest) =>
    client.post<AuthResponse>('/Auth/register', data).then(r => r.data),
}