import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios'
import { authService } from '../services/auth'

export interface ApiError {
  message: string
  code?: string
  status?: number
  details?: any
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export interface ApiClientConfig {
  baseURL?: string
  timeout?: number
  retries?: number
  retryDelay?: number
}

class ApiClient {
  private instance: AxiosInstance
  private config: Required<ApiClientConfig>

  constructor(config: ApiClientConfig = {}) {
    this.config = {
      baseURL: config.baseURL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      retryDelay: config.retryDelay || 1000,
    }

    this.instance = axios.create({
      baseURL: `${this.config.baseURL}/api/v1`,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors(): void {
    // Request interceptor for auth
    this.instance.interceptors.request.use(
      (config) => {
        const token = authService.getToken()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor for error handling
    this.instance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean }

        // Handle 401 errors (unauthorized)
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true
          authService.logout()
          window.location.href = '/auth/login'
          return Promise.reject(this.createApiError(error))
        }

        // Retry logic for 5xx errors
        if (this.shouldRetry(error) && !originalRequest._retry) {
          originalRequest._retry = true
          return this.retryRequest(originalRequest)
        }

        return Promise.reject(this.createApiError(error))
      }
    )
  }

  private shouldRetry(error: AxiosError): boolean {
    if (!error.response) return true // Network errors
    
    const status = error.response.status
    return status >= 500 || status === 408 || status === 429 // Server errors, timeout, rate limit
  }

  private async retryRequest(config: AxiosRequestConfig, attempt: number = 1): Promise<AxiosResponse> {
    if (attempt > this.config.retries) {
      throw new Error('Max retry attempts exceeded')
    }

    await this.delay(this.config.retryDelay * attempt)
    
    try {
      return await this.instance.request(config)
    } catch (error) {
      if (this.shouldRetry(error as AxiosError)) {
        return this.retryRequest(config, attempt + 1)
      }
      throw error
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private createApiError(error: AxiosError): ApiError {
    if (error.response) {
      return {
        message: error.response.data?.message || error.message || 'An error occurred',
        code: error.response.data?.code,
        status: error.response.status,
        details: error.response.data?.details,
      }
    }

    if (error.request) {
      return {
        message: 'Network error - please check your connection',
        code: 'NETWORK_ERROR',
      }
    }

    return {
      message: error.message || 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
    }
  }

  // HTTP methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.get<T>(url, config)
    return response.data
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.post<T>(url, data, config)
    return response.data
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.put<T>(url, data, config)
    return response.data
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.patch<T>(url, data, config)
    return response.data
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.delete<T>(url, config)
    return response.data
  }

  // Utility methods
  async uploadFile(url: string, file: File, onProgress?: (progress: number) => void): Promise<any> {
    const formData = new FormData()
    formData.append('file', file)

    return this.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress(progress)
        }
      },
    })
  }

  async downloadFile(url: string, filename?: string): Promise<Blob> {
    const response = await this.instance.get(url, {
      responseType: 'blob',
    })

    // If filename is provided, trigger download
    if (filename) {
      const blob = new Blob([response.data])
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    }

    return response.data
  }

  // Set auth token manually
  setAuthToken(token: string): void {
    this.instance.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }

  // Clear auth token
  clearAuthToken(): void {
    delete this.instance.defaults.headers.common['Authorization']
  }

  // Get instance for advanced usage
  getInstance(): AxiosInstance {
    return this.instance
  }
}

// Create singleton instance
export const apiClient = new ApiClient()

// Export class for custom instances
export { ApiClient }
