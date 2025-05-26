import { apiClient } from '../lib/api-client'
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
  SuccessResponse,
  ProfileUpdateRequest
} from '../types/api'

export class AuthService {
  private static TOKEN_KEY = 'authToken'
  private static USER_KEY = 'userInfo'

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials)
    
    if (response.token && response.user) {
      this.setToken(response.token)
      this.setUser(response.user)
    }
    
    return response
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', userData)
    
    if (response.token && response.user) {
      this.setToken(response.token)
      this.setUser(response.user)
    }
    
    return response
  }

  async getProfile(): Promise<SuccessResponse<User>> {
    return apiClient.get<SuccessResponse<User>>('/profile')
  }

  async updateProfile(updates: ProfileUpdateRequest): Promise<SuccessResponse<User>> {
    return apiClient.put<SuccessResponse<User>>('/profile', updates)
  }

  logout(): void {
    this.clearToken()
    this.clearUser()
    apiClient.clearAuthToken()
    
    // Redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login'
    }
  }

  getToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(AuthService.TOKEN_KEY)
  }

  setToken(token: string): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(AuthService.TOKEN_KEY, token)
    apiClient.setAuthToken(token)
  }

  clearToken(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(AuthService.TOKEN_KEY)
  }

  getUser(): User | null {
    if (typeof window === 'undefined') return null
    const userInfo = localStorage.getItem(AuthService.USER_KEY)
    return userInfo ? JSON.parse(userInfo) : null
  }

  setUser(user: User): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(AuthService.USER_KEY, JSON.stringify(user))
  }

  clearUser(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(AuthService.USER_KEY)
  }

  isAuthenticated(): boolean {
    return !!this.getToken()
  }

  isAdmin(): boolean {
    const user = this.getUser()
    return user?.role === 'admin'
  }

  getCurrentUser(): User | null {
    return this.getUser()
  }

  // Initialize auth state on app start
  initialize(): void {
    const token = this.getToken()
    if (token) {
      apiClient.setAuthToken(token)
    }
  }
}

export const authService = new AuthService()
