import { apiClient } from '../lib/api-client'
import type { 
  File, 
  FileUploadResponse, 
  ListResponse, 
  ListFilesParams,
  UploadProgress,
  ApiResponse
} from '../types/api'

class FileService {
  async getFiles(params?: ListFilesParams): Promise<ListResponse<File>> {
    const response = await apiClient.get('/files', { params })
    return response.data
  }

  async getUserFiles(userId: string, params?: ListFilesParams): Promise<ListResponse<File>> {
    const response = await apiClient.get(`/users/${userId}/files`, { params })
    return response.data
  }

  async getFile(id: string): Promise<File> {
    const response = await apiClient.get(`/files/${id}`)
    return response.data
  }

  async uploadFile(
    file: File, 
    onProgress?: (progress: UploadProgress) => void
  ): Promise<FileUploadResponse> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await apiClient.post('/files', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress({
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage
          })
        }
      }
    })

    return response.data
  }

  async uploadMultipleFiles(
    files: File[],
    onProgress?: (fileIndex: number, progress: UploadProgress) => void,
    onComplete?: (fileIndex: number) => void,
    onError?: (fileIndex: number, error: any) => void
  ): Promise<FileUploadResponse[]> {
    const results: FileUploadResponse[] = []
    
    for (let i = 0; i < files.length; i++) {
      try {
        const result = await this.uploadFile(files[i], (progress) => {
          onProgress?.(i, progress)
        })
        results.push(result)
        onComplete?.(i)
      } catch (error) {
        onError?.(i, error)
        throw error
      }
    }

    return results
  }

  async downloadFile(id: string, filename?: string): Promise<Blob> {
    const response = await apiClient.get(`/files/${id}/download`, {
      responseType: 'blob',
      params: filename ? { filename } : undefined
    })
    return response.data
  }

  async deleteFile(id: string): Promise<ApiResponse> {
    const response = await apiClient.delete(`/files/${id}`)
    return response.data
  }

  async getFileStats(): Promise<{
    totalFiles: number
    totalSize: number
    avgFileSize: number
    filesByType: Record<string, number>
  }> {
    const response = await apiClient.get('/files/stats')
    return response.data
  }

  validateFile(file: File, options?: {
    maxSize?: number
    allowedTypes?: string[]
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    const maxSize = options?.maxSize || 10 * 1024 * 1024 // 10MB default
    const allowedTypes = options?.allowedTypes || []

    if (file.size > maxSize) {
      errors.push(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`)
    }

    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      errors.push(`File type ${file.type} is not allowed`)
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

export const fileService = new FileService()