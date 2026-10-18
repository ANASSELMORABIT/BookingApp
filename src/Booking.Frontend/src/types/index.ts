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

/** Normas del negocio que el cliente ve y acepta al reservar. */
export interface BusinessPolicies {
  noCompanionsPolicy: boolean
  autoCancelLate: boolean
  lateToleranceMinutes: number
  blockLateCancellations: boolean
  cancellationNoticeHours: number
  extraPolicy?: string | null
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
  policies: BusinessPolicies
}

/** Extra opcional de un servicio: suma precio y, si tiene minutos, alarga la cita. */
export interface ServiceExtra {
  id: string
  name: string
  price: number
  extraMinutes: number
  isActive: boolean
}

export interface Service {
  id: string
  name: string
  description?: string
  durationMinutes: number
  price: number
  isActive: boolean
  extras: ServiceExtra[]
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
  /** Total a pagar: servicio + extras */
  price: number
  basePrice: number
  extras: BookingExtra[]
  notes?: string
  arrivedAt?: string | null
  /** El cliente estaba en la lista de avisos al reservar */
  clientFlagged: boolean
  /** Cancelar antes de esta hora no penaliza (null si el negocio no tiene esa norma) */
  freeCancellationUntil?: string | null
}

export interface BookingExtra {
  name: string
  price: number
  extraMinutes: number
}

export interface ClientSummary {
  id: string
  fullName: string
  email: string
  phone?: string | null
  totalBookings: number
  noShowCount: number
  cancelledCount: number
  isFlagged: boolean
  isBlocked: boolean
  blockedReason?: string | null
  blockedAt?: string | null
  lastBookingAt?: string | null
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
  policies: BusinessPolicies
}

export interface PublicService {
  id: string
  name: string
  description?: string
  durationMinutes: number
  price: number
  extras: PublicExtra[]
}

export interface PublicExtra {
  id: string
  name: string
  price: number
  extraMinutes: number
}

export interface PublicBooking {
  bookingId: string
  serviceName: string
  startTime: string
  endTime: string
  message: string
  basePrice: number
  totalPrice: number
  extras: BookingExtra[]
}

export interface PublicStaff {
  id: string
  name: string
}