import axios from 'axios'

const publicClient = axios.create({
  baseURL: '/api/public',
  headers: { 'Content-Type': 'application/json' },
})

export const publicApi = {
  getBusiness: (subdomain: string) =>
    publicClient.get(`/business/${subdomain}`).then(r => r.data),

  getAvailability: (serviceId: string, staffId: string, date: string) =>
    publicClient.get('/availability', {
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
  }) => publicClient.post('/book', data).then(r => r.data),
}