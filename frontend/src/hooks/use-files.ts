import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fileService } from '../services/file-service'
import { QUERY_KEYS } from '../types/api'
import type { File, UploadProgress } from '../types/api'
import { useState } from 'react'

// File Queries
export const useFile = (id: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.file(id),
    queryFn: () => fileService.getFile(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

// File Upload Hook with Progress
export const useFileUpload = () => {
  const queryClient = useQueryClient()
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
  
  const mutation = useMutation({
    mutationFn: (file: File) => 
      fileService.uploadFile(file, setUploadProgress),
    onSuccess: () => {
      // Invalidate files queries if they exist
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.files })
      setUploadProgress(null)
    },
    onError: () => {
      setUploadProgress(null)
    }
  })

  return {
    ...mutation,
    uploadProgress
  }
}

// Multiple File Upload Hook
export const useMultipleFileUpload = () => {
  const queryClient = useQueryClient()
  const [uploadsProgress, setUploadsProgress] = useState<Record<number, UploadProgress>>({})
  const [completedUploads, setCompletedUploads] = useState<Record<number, boolean>>({})
  
  const mutation = useMutation({
    mutationFn: (files: File[]) => 
      fileService.uploadMultipleFiles(
        files,
        (fileIndex, progress) => {
          setUploadsProgress(prev => ({
            ...prev,
            [fileIndex]: progress
          }))
        },
        (fileIndex) => {
          setCompletedUploads(prev => ({
            ...prev,
            [fileIndex]: true
          }))
        },
        (fileIndex, error) => {
          console.error(`Upload failed for file ${fileIndex}:`, error)
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.files })
      setUploadsProgress({})
      setCompletedUploads({})
    },
    onError: () => {
      setUploadsProgress({})
      setCompletedUploads({})
    }
  })

  return {
    ...mutation,
    uploadsProgress,
    completedUploads
  }
}

// File Download Hook
export const useFileDownload = () => {
  return useMutation({
    mutationFn: ({ id, filename }: { id: string; filename?: string }) =>
      fileService.downloadFile(id, filename),
    onError: (error) => {
      console.error('File download failed:', error)
    }
  })
}

// File Delete Hook
export const useDeleteFile = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => fileService.deleteFile(id),
    onSuccess: (_, deletedId) => {
      // Remove file from cache
      queryClient.removeQueries({ queryKey: QUERY_KEYS.file(deletedId) })
      
      // Invalidate files list
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.files })
    },
    onError: (error) => {
      console.error('File deletion failed:', error)
    }
  })
}

// File Validation Hook
export const useFileValidation = () => {
  const validateFile = (file: File, options?: {
    maxSize?: number
    allowedTypes?: string[]
  }) => {
    return fileService.validateFile(file, options)
  }

  const validateFiles = (files: File[], options?: {
    maxSize?: number
    allowedTypes?: string[]
  }) => {
    const results = files.map(file => ({
      file,
      ...fileService.validateFile(file, options)
    }))

    const validFiles = results.filter(r => r.isValid).map(r => r.file)
    const invalidFiles = results.filter(r => !r.isValid)

    return {
      validFiles,
      invalidFiles,
      hasErrors: invalidFiles.length > 0
    }
  }

  return {
    validateFile,
    validateFiles
  }
}
