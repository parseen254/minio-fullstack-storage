'use client'

import { useState } from 'react'
import { useUserFiles, useDeleteFile } from '@/hooks/use-files'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { FileUpload } from '@/components/files/file-upload'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Search, 
  MoreHorizontal, 
  Download, 
  Trash2, 
  Eye,
  Upload,
  FileText,
  Image,
  Film,
  Music,
  Archive
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface UserFileManagerProps {
  user: {
    id: string
    firstName: string
    lastName: string
  }
}

export function UserFileManager({ user }: UserFileManagerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const { data: filesData, isLoading } = useUserFiles({
    userId: user.id,
    page: currentPage,
    pageSize
  })

  const deleteFileMutation = useDeleteFile()

  const handleDeleteFile = async (fileId: string, fileName: string) => {
    if (window.confirm(`Are you sure you want to delete "${fileName}"?`)) {
      try {
        await deleteFileMutation.mutateAsync(fileId)
        toast({
          title: 'File deleted',
          description: `"${fileName}" has been successfully deleted.`,
        })
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to delete file. Please try again.',
          variant: 'destructive',
        })
      }
    }
  }

  const handleDownloadFile = async (fileId: string, fileName: string) => {
    try {
      // TODO: Implement file download
      const response = await fetch(`/api/v1/files/${fileId}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to download file. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith('image/')) return Image
    if (contentType.startsWith('video/')) return Film
    if (contentType.startsWith('audio/')) return Music
    if (contentType.includes('zip') || contentType.includes('archive')) return Archive
    return FileText
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const filteredFiles = filesData?.data?.filter(file =>
    file.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.contentType.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading files...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* File Upload */}
      {showUpload && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Files</CardTitle>
            <CardDescription>Upload new files to your storage</CardDescription>
          </CardHeader>
          <CardContent>
            <FileUpload onUploadComplete={() => setShowUpload(false)} />
          </CardContent>
        </Card>
      )}

      {/* File Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>My Files</span>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">
                {filesData?.pagination?.total || 0} files
              </Badge>
              <Button onClick={() => setShowUpload(!showUpload)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Files
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Manage your uploaded files and documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Files Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFiles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="text-gray-500">
                        <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No files uploaded yet</p>
                        <p className="text-sm">Upload your first file to get started</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFiles.map((file) => {
                    const FileIcon = getFileIcon(file.contentType)
                    return (
                      <TableRow key={file.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <FileIcon className="h-5 w-5 text-gray-400" />
                            <div>
                              <div className="font-medium">{file.originalName}</div>
                              <div className="text-sm text-gray-500">{file.fileName}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {file.contentType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {formatFileSize(file.size)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {new Date(file.createdAt).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleDownloadFile(file.id, file.originalName)}
                              >
                                <Download className="mr-2 h-4 w-4" />
                                Download
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDeleteFile(file.id, file.originalName)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {filesData?.pagination && filesData.pagination.total > pageSize && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-500">
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filesData.pagination.total)} of {filesData.pagination.total} files
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {Math.ceil(filesData.pagination.total / pageSize)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={currentPage >= Math.ceil(filesData.pagination.total / pageSize)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
