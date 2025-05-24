import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken')
      localStorage.removeItem('userInfo')
      window.location.href = '/auth/login'
    }
    return Promise.reject(error)
  }
)

export interface User {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  role: string
  avatar?: string
  createdAt: string
  updatedAt: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  firstName: string
  lastName: string
}

export interface AuthResponse {
  token: string
  user: User
}

export const authService = {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await api.post('/auth/login', credentials)
    const { token, user } = response.data
    localStorage.setItem('authToken', token)
    localStorage.setItem('userInfo', JSON.stringify(user))
    return response.data
  },

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post('/auth/register', userData)
    const { token, user } = response.data
    localStorage.setItem('authToken', token)
    localStorage.setItem('userInfo', JSON.stringify(user))
    return response.data
  },

  logout() {
    localStorage.removeItem('authToken')
    localStorage.removeItem('userInfo')
    window.location.href = '/auth/login'
  },

  getCurrentUser(): User | null {
    const userInfo = localStorage.getItem('userInfo')
    return userInfo ? JSON.parse(userInfo) : null
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('authToken')
  },

  getToken(): string | null {
    return localStorage.getItem('authToken')
  },
}

export default api
