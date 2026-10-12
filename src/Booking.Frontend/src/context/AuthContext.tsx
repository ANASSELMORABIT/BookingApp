import { createContext, useContext, useState, type ReactNode } from 'react'
import type { AuthResponse } from '@/types'

interface AuthContextType {
  user: AuthResponse | null
  token: string | null
  login: (data: AuthResponse) => void
  logout: () => void
  isAuthenticated: boolean
  isOwner: boolean
  isStaff: boolean
  isClient: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthResponse | null>(() => {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })

  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('token')
  )

  const login = (data: AuthResponse) => {
    setUser(data)
    setToken(data.token)
    localStorage.setItem('user', JSON.stringify(data))
    localStorage.setItem('token', data.token)
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('user')
    localStorage.removeItem('token')
  }

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      logout,
      isAuthenticated: !!token,
      isOwner: user?.role === 'Owner',
      isStaff: user?.role === 'Staff',
      isClient: user?.role === 'Client',
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}