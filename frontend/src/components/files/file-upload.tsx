'use client'

import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, File, Image, Video, Music } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert } from '@/components/ui/alert'
import { useFileUpload, useMultipleFileUpload, useFileValidation } from '@/hooks/use-files'
import { fileService } from '@/services/file-service'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  multiple?: boolean
  accept?: Record<string, string[]>
  maxSize?: number
  maxFiles?: number
  onUploadComplete?: (files: any[]) => void
  onUploadError?: (error: Error) => void
  className?: string
}

interface FileWithPreview extends File {
  preview?: string
  id?: string
}

export const FileUpload: React.FC<FileUploadProps> = ({
  multiple = false,
  accept,
  maxSize = 50 * 1024 * 1024, // 50MB
  maxFiles = 10,
  onUploadComplete,
  onUploadError,
  className
}) => {
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([])
  const [uploadErrors, setUploadErrors] = useState<string[]>([])
  
  const { mutate: uploadSingle, isPending: isSingleUploading, uploadProgress } = useFileUpload()
  const { 
    mutate: uploadMultiple, 
    isPending: isMultipleUploading, 
    uploadsProgress,
    completedUploads 
  } = useMultipleFileUpload()
  
  const { validateFiles } = useFileValidation()

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setUploadErrors([])
    
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const errors = rejectedFiles.map(file => 
        `${file.file.name}: ${file.errors.map((e: any) => e.message).join(', ')}`
      )
      setUploadErrors(errors)
    }

    // Validate accepted files
    const { validFiles, invalidFiles } = validateFiles(acceptedFiles, {
      maxSize,
      allowedTypes: accept ? Object.keys(accept) : undefined
    })

    if (invalidFiles.length > 0) {
      const errors = invalidFiles.map(({ file, error }) => `${file.name}: ${error}`)
      setUploadErrors(prev => [...prev, ...errors])
    }

    // Add preview URLs for images
    const filesWithPreview = validFiles.map(file => {
      const fileWithPreview = file as FileWithPreview
      if (file.type.startsWith('image/')) {
        fileWithPreview.preview = URL.createObjectURL(file)
      }
      return fileWithPreview
    })

    if (multiple) {
      setSelectedFiles(prev => [...prev, ...filesWithPreview].slice(0, maxFiles))
    } else {
      setSelectedFiles(filesWithPreview.slice(0, 1))
    }
  }, [multiple, maxSize, maxFiles, accept, validateFiles])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple,
    maxFiles: multiple ? maxFiles : 1
  })

  const removeFile = (index: number) => {
    setSelectedFiles(prev => {
      const newFiles = [...prev]
      if (newFiles[index].preview) {
        URL.revokeObjectURL(newFiles[index].preview!)
      }
      newFiles.splice(index, 1)
      return newFiles
    })
  }

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return

    try {
      setUploadErrors([])
      
      if (multiple) {
        const results = await uploadMultiple(selectedFiles)
        onUploadComplete?.(results)
      } else {
        const result = await uploadSingle(selectedFiles[0])
        onUploadComplete?.([result])
      }
      
      // Clear selected files on successful upload
      setSelectedFiles([])
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      setUploadErrors([errorMessage])
      onUploadError?.(error as Error)
    }
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="w-8 h-8 text-blue-500" />
    if (file.type.startsWith('video/')) return <Video className="w-8 h-8 text-purple-500" />
    if (file.type.startsWith('audio/')) return <Music className="w-8 h-8 text-green-500" />
    return <File className="w-8 h-8 text-gray-500" />
  }

  const isUploading = isSingleUploading || isMultipleUploading

  return (
    <div className={cn('w-full', className)}>
      {/* Upload Errors */}
      {uploadErrors.length > 0 && (
        <Alert type="error" title="Upload Errors" className="mb-4">
          <ul className="list-disc list-inside space-y-1">
            {uploadErrors.map((error, index) => (
              <li key={index} className="text-sm">{error}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400',
          isUploading && 'pointer-events-none opacity-50'
        )}
      >
        <input {...getInputProps()} />
        
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        
        {isDragActive ? (
          <p className="text-lg text-blue-600">Drop the files here...</p>
        ) : (
          <div>
            <p className="text-lg text-gray-600 mb-2">
              Drag & drop {multiple ? 'files' : 'a file'} here, or{' '}
              <span className="text-blue-600 font-medium">browse</span>
            </p>
            <p className="text-sm text-gray-500">
              Max size: {fileService.formatFileSize(maxSize)}
              {multiple && ` • Max files: ${maxFiles}`}
            </p>
          </div>
        )}
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Selected Files ({selectedFiles.length})
          </h4>
          
          <div className="space-y-3">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                {/* File Icon/Preview */}
                <div className="flex-shrink-0">
                  {file.preview ? (
                    <img
                      src={file.preview}
                      alt={file.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  ) : (
                    getFileIcon(file)
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {fileService.formatFileSize(file.size)}
                  </p>
                  
                  {/* Upload Progress */}
                  {isUploading && multiple && uploadsProgress[index] && (
                    <div className="mt-2">
                      <Progress
                        value={uploadsProgress[index].percentage}
                        showLabel
                        size="sm"
                        color={completedUploads[index] ? 'green' : 'blue'}
                      />
                    </div>
                  )}
                </div>

                {/* Remove Button */}
                {!isUploading && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Single File Upload Progress */}
          {isUploading && !multiple && uploadProgress && (
            <div className="mt-4">
              <Progress
                value={uploadProgress.percentage}
                showLabel
                color="blue"
              />
            </div>
          )}

          {/* Upload Button */}
          <div className="mt-4 flex justify-end">
            <Button
              onClick={uploadFiles}
              disabled={isUploading || selectedFiles.length === 0}
              className="min-w-32"
            >
              {isUploading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Uploading...</span>
                </div>
              ) : (
                `Upload ${selectedFiles.length} ${selectedFiles.length === 1 ? 'file' : 'files'}`
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
