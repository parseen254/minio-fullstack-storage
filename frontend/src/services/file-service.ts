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
    const response = await apiClient.get<ListResponse<File>>('/files', { params })
    return response
  }

  async getUserFiles(userId: string, params?: ListFilesParams): Promise<ListResponse<File>> {
    const response = await apiClient.get<ListResponse<File>>(`/users/${userId}/files`, { params })
    return response
  }

  async getFile(id: string): Promise<File> {
    const response = await apiClient.get<File>(`/files/${id}`)
    return response
  }
  async uploadFile(
    file: globalThis.File, 
    onProgress?: (progress: UploadProgress) => void
  ): Promise<FileUploadResponse> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await apiClient.post<FileUploadResponse>('/files', formData, {
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

    return response
  }
  async uploadMultipleFiles(
    files: globalThis.File[],
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
    const response = await apiClient.get<Blob>(`/files/${id}/download`, {
      responseType: 'blob',
      params: filename ? { filename } : undefined
    })
    return response
  }

  async deleteFile(id: string): Promise<ApiResponse> {
    const response = await apiClient.delete<ApiResponse>(`/files/${id}`)
    return response
  }

  async getFileStats(): Promise<{
    totalFiles: number
    totalSize: number
    avgFileSize: number
    filesByType: Record<string, number>
  }> {
    const response = await apiClient.get<{
      totalFiles: number
      totalSize: number
      avgFileSize: number
      filesByType: Record<string, number>
    }>('/files/stats')
    return response
  }
  validateFile(file: globalThis.File, options?: {
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

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}

export const fileService = new FileService()
