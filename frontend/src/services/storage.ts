import axios from 'axios'
import { authService } from './auth'

export interface FileUploadRequest {
  file: File
  bucket?: string
  path?: string
}

export interface FileUploadResponse {
  fileId: string
  fileName: string
  fileSize: number
  contentType: string
  uploadUrl: string
  downloadUrl: string
  bucket: string
  path: string
  createdAt: string
}

export interface FileMetadata {
  fileId: string
  fileName: string
  fileSize: number
  contentType: string
  bucket: string
  path: string
  downloadUrl: string
  createdAt: string
  updatedAt: string
}

export interface StorageStats {
  totalFiles: number
  totalSize: number
  buckets: Array<{
    name: string
    fileCount: number
    size: number
  }>
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

// Create axios instance with auth interceptor
const storageApi = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
storageApi.interceptors.request.use((config) => {
  const token = authService.getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

class StorageService {
  async uploadFile(request: FileUploadRequest): Promise<FileUploadResponse> {
    const formData = new FormData()
    formData.append('file', request.file)
    
    if (request.bucket) {
      formData.append('bucket', request.bucket)
    }
    
    if (request.path) {
      formData.append('path', request.path)
    }

    const response = await storageApi.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })

    return response.data
  }

  async getFiles(bucket?: string, path?: string): Promise<FileMetadata[]> {
    const params = new URLSearchParams()
    if (bucket) params.append('bucket', bucket)
    if (path) params.append('path', path)

    const response = await storageApi.get(`/files?${params.toString()}`)
    return response.data.files || []
  }

  async getFile(fileId: string): Promise<FileMetadata> {
    const response = await storageApi.get(`/files/${fileId}`)
    return response.data
  }

  async deleteFile(fileId: string): Promise<void> {
    await storageApi.delete(`/files/${fileId}`)
  }

  async downloadFile(fileId: string): Promise<Blob> {
    const response = await storageApi.get(`/files/${fileId}/download`, {
      responseType: 'blob',
    })
    return response.data
  }

  async getStorageStats(): Promise<StorageStats> {
    const response = await storageApi.get('/storage/stats')
    return response.data
  }

  async createBucket(name: string): Promise<void> {
    await storageApi.post('/buckets', { name })
  }

  async getBuckets(): Promise<string[]> {
    const response = await storageApi.get('/buckets')
    return response.data.buckets || []
  }

  async deleteBucket(name: string): Promise<void> {
    await storageApi.delete(`/buckets/${name}`)
  }

  // Utility methods for file handling
  validateFile(file: File, maxSize?: number, allowedTypes?: string[]): string | null {
    if (maxSize && file.size > maxSize) {
      return `File size must be less than ${this.formatFileSize(maxSize)}`
    }

    if (allowedTypes && !allowedTypes.includes(file.type)) {
      return `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`
    }

    return null
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  getFileExtension(fileName: string): string {
    return fileName.split('.').pop()?.toLowerCase() || ''
  }

  isImageFile(file: File | string): boolean {
    const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    
    if (typeof file === 'string') {
      const ext = this.getFileExtension(file)
      return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)
    }
    
    return imageTypes.includes(file.type)
  }

  generateFilePreview(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.isImageFile(file)) {
        reject(new Error('File is not an image'))
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        resolve(e.target?.result as string)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }
}

export const storageService = new StorageService()
