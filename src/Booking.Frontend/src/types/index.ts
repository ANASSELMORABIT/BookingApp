export interface AuthResponse {
  token: string
  fullName: string
  email: string
  role: string
  expiresAt: string
}

export interface BookingsByPeriod {
  date: string
  totalBookings: number
  confirmed: number
  cancelled: number
  revenue: number
}

export interface LoginRequest {
  email: string
  password: string
  subdomain: string
}

export interface RegisterRequest {
  fullName: string
  email: string
  password: string
  subdomain: string
}

export interface Profile {
  id: string
  fullName: string
  email: string
  phone?: string
  role: string
  tenantSubdomain: string
  createdAt: string
}

export interface Business {
  id: string
  name: string
  category: string
  phone?: string
  address?: string
  openTime: string
  closeTime: string
  totalServices: number
  totalStaff: number
}

export interface Service {
  id: string
  name: string
  description?: string
  durationMinutes: number
  price: number
  isActive: boolean
}

export interface Staff {
  id: string
  name: string
  email?: string
  isActive: boolean
  totalBookings: number
}

export interface TimeSlot {
  startTime: string
  endTime: string
  isAvailable: boolean
}

export interface Booking {
  id: string
  serviceName: string
  staffName: string
  clientName: string
  startTime: string
  endTime: string
  status: string
  paymentStatus: string
  price: number
  notes?: string
}

export interface DashboardStats {
  totalBookings: number
  bookingsToday: number
  bookingsThisWeek: number
  bookingsThisMonth: number
  revenueTotal: number
  revenueThisMonth: number
  cancelledBookings: number
  cancellationRate: number
  staffStats: StaffStats[]
  topServices: ServiceStats[]
}

export interface StaffStats {
  staffId: string
  staffName: string
  totalBookings: number
  completedBookings: number
  cancelledBookings: number
  revenue: number
}

export interface ServiceStats {
  serviceId: string
  serviceName: string
  totalBookings: number
  totalRevenue: number
  price: number
}


export interface PublicBusiness {
  id: string
  name: string
  category: string
  phone?: string
  address?: string
  openTime: string
  closeTime: string
  services: PublicService[]
  staff: PublicStaff[]
}

export interface PublicService {
  id: string
  name: string
  description?: string
  durationMinutes: number
  price: number
}

export interface PublicStaff {
  id: string
  name: string
}