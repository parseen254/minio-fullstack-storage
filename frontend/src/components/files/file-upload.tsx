'use client'

import React, { useCallback, useState } from 'react'
import { Upload, X, File, Image, Video, Music } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useFileUpload, useMultipleFileUpload, useFileValidation } from '@/hooks/use-files'
import { cn } from '@/lib/utils'
import type { File as ApiFile } from '@/types/api'

interface FileUploadProps {
  multiple?: boolean
  accept?: string
  maxSize?: number
  maxFiles?: number
  onUploadComplete?: (files: ApiFile[]) => void
  onUploadError?: (error: Error) => void
  className?: string
}

interface FileWithPreview extends File {
  preview?: string
  id?: string
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
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
  const [isDragOver, setIsDragOver] = useState(false)
  
  const { mutate: uploadSingle, isPending: isSingleUploading, uploadProgress } = useFileUpload()
  const { 
    mutate: uploadMultiple, 
    isPending: isMultipleUploading, 
    uploadsProgress,
    completedUploads 
  } = useMultipleFileUpload()
  
  const { validateFiles } = useFileValidation()

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return
    
    const fileArray = Array.from(files)
    setUploadErrors([])

    // Validate files
    const validation = validateFiles(fileArray, {
      maxSize,
      allowedTypes: accept ? accept.split(',') : undefined
    })

    if (validation.hasErrors) {
      setUploadErrors(validation.invalidFiles.map(f => f.errors.join(', ')))
      return
    }

    // Limit number of files
    const filesToAdd = multiple 
      ? fileArray.slice(0, maxFiles - selectedFiles.length)
      : [fileArray[0]]

    // Create previews for image files
    const filesWithPreviews = filesToAdd.map(file => {
      const fileWithPreview = file as FileWithPreview
      if (file.type.startsWith('image/')) {
        fileWithPreview.preview = URL.createObjectURL(file)
      }
      return fileWithPreview
    })

    if (multiple) {
      setSelectedFiles(prev => [...prev, ...filesWithPreviews])
    } else {
      setSelectedFiles(filesWithPreviews)
    }
  }, [multiple, maxSize, maxFiles, selectedFiles.length, accept, validateFiles])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

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

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return

    try {
      setUploadErrors([])
      
      if (multiple && selectedFiles.length > 1) {
        uploadMultiple(selectedFiles, {
          onSuccess: (results) => {
            const files = results.map(response => response.data)
            onUploadComplete?.(files)
            setSelectedFiles([])
          },
          onError: (error) => {
            setUploadErrors([error.message])
            onUploadError?.(error)
          }
        })
      } else {
        uploadSingle(selectedFiles[0], {
          onSuccess: (result) => {
            onUploadComplete?.([result.data])
            setSelectedFiles([])
          },
          onError: (error) => {
            setUploadErrors([error.message])
            onUploadError?.(error)
          }
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      setUploadErrors([errorMessage])
      onUploadError?.(error as Error)
    }
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="h-6 w-6" />
    if (file.type.startsWith('video/')) return <Video className="h-6 w-6" />
    if (file.type.startsWith('audio/')) return <Music className="h-6 w-6" />
    return <File className="h-6 w-6" />
  }

  const isUploading = isSingleUploading || isMultipleUploading

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upload Errors */}
      {uploadErrors.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription>
            <ul className="list-disc list-inside">
              {uploadErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Drop Zone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          "hover:border-primary hover:bg-primary/5"
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <div className="space-y-2">
          <p className="text-lg font-medium">
            {multiple ? 'Drop files here or click to browse' : 'Drop a file here or click to browse'}
          </p>
          <p className="text-sm text-muted-foreground">
            {accept && `Accepted types: ${accept}`}
            {maxSize && ` • Max size: ${Math.round(maxSize / 1024 / 1024)}MB`}
            {multiple && maxFiles && ` • Max files: ${maxFiles}`}
          </p>
        </div>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => {
            const input = document.createElement('input')
            input.type = 'file'
            input.multiple = multiple
            input.accept = accept || ''
            input.onchange = (e) => {
              const target = e.target as HTMLInputElement
              handleFileSelect(target.files)
            }
            input.click()
          }}
        >
          Browse Files
        </Button>
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium">Selected Files</h3>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {file.preview ? (
                    <img src={file.preview} alt={file.name} className="h-10 w-10 object-cover rounded" />
                  ) : (
                    getFileIcon(file)
                  )}
                  <div>
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                
                {/* Upload Progress */}
                {isUploading && (
                  <div className="flex-1 mx-4">
                    {multiple && uploadsProgress && uploadsProgress[index] ? (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Uploading...</span>
                          <span>{uploadsProgress[index].percentage}%</span>
                        </div>
                        <Progress value={uploadsProgress[index].percentage} />
                      </div>
                    ) : (!multiple && uploadProgress && index === 0) ? (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Uploading...</span>
                          <span>{uploadProgress.percentage}%</span>
                        </div>
                        <Progress value={uploadProgress.percentage} />
                      </div>
                    ) : null}
                  </div>
                )}
                
                {!isUploading && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Button */}
      {selectedFiles.length > 0 && (
        <Button 
          onClick={handleUpload} 
          disabled={isUploading}
          className="w-full"
        >
          {isUploading ? 'Uploading...' : `Upload ${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''}`}
        </Button>
      )}
    </div>
  )
}
