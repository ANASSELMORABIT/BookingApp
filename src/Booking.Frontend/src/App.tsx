import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { MainLayout } from '@/components/layout/MainLayout'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { DashboardPage } from '@/pages/admin/DashboardPage'
import { BookingsPage } from '@/pages/booking/BookingsPage'
import { ProfilePage } from '@/pages/profile/ProfilePage'
import { BusinessPage } from '@/pages/admin/BusinessPage'
import { StatsPage } from '@/pages/admin/StatsPage'
import { ServicesPage } from '@/pages/admin/ServicesPage'
import { CalendarPage } from '@/pages/admin/CalendarPage'
import { PublicBookingPage } from '@/pages/public/PublicBookingPage'


export default function App() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
      } />
      <Route path="/register" element={
        isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />
      } />
     <Route path="/dashboard" element={
        <ProtectedRoute allowedRoles={['Owner', 'Staff', 'SuperAdmin']}>
          <MainLayout><DashboardPage /></MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/bookings" element={
        <ProtectedRoute>
          <MainLayout><BookingsPage /></MainLayout>
        </ProtectedRoute>
      } />
     <Route path="/business" element={
        <ProtectedRoute allowedRoles={['Owner', 'SuperAdmin']}>
          <MainLayout><BusinessPage /></MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute>
          <MainLayout><ProfilePage /></MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/stats" element={  
        <ProtectedRoute allowedRoles={['Owner', 'SuperAdmin']}>
          <MainLayout><StatsPage /></MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/services" element={
        <ProtectedRoute allowedRoles={['Owner', 'Staff', 'SuperAdmin']}>
          <MainLayout><ServicesPage /></MainLayout>
        </ProtectedRoute>
      } />
      <Route path="/" element={
        <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />
      } />


      <Route path="/calendar" element={
        <ProtectedRoute allowedRoles={['Owner', 'Staff', 'SuperAdmin']}>
          <MainLayout><CalendarPage /></MainLayout>
        </ProtectedRoute>
      } />

      <Route path="/book/:subdomain" element={<PublicBookingPage />} />
    </Routes>
  )
}