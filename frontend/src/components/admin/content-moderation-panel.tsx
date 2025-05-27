'use client'

import { useState } from 'react'
import { usePosts, useDeletePost } from '@/hooks/use-posts'
import { useFiles, useDeleteFile } from '@/hooks/use-files'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Trash2, 
  Edit, 
  Eye,
  FileText,
  Download,
  AlertTriangle
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import type { Post, File } from '@/types/api'

export function ContentModerationPanel() {
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const { data: postsData, isLoading: postsLoading } = usePosts({
    page: currentPage,
    pageSize
  })

  const { data: filesData, isLoading: filesLoading } = useFiles({
    page: currentPage,
    pageSize
  })

  const deletePostMutation = useDeletePost()
  const deleteFileMutation = useDeleteFile()

  const handleDeletePost = async (postId: string, postTitle: string) => {
    if (window.confirm(`Are you sure you want to delete post: "${postTitle}"?`)) {
      try {
        await deletePostMutation.mutateAsync(postId)
        toast({
          title: 'Post deleted',
          description: `Post "${postTitle}" has been successfully deleted.`,
        })
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to delete post. Please try again.',
          variant: 'destructive',
        })
      }
    }
  }

  const handleDeleteFile = async (fileId: string, fileName: string) => {
    if (window.confirm(`Are you sure you want to delete file: "${fileName}"?`)) {
      try {
        await deleteFileMutation.mutateAsync(fileId)
        toast({
          title: 'File deleted',
          description: `File "${fileName}" has been successfully deleted.`,
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

  const filteredPosts = postsData?.data?.filter((post: Post) =>
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.content.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const filteredFiles = filesData?.data?.filter(file =>
    file.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    file.fileName.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const PostsTable = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search posts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Views</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPosts.map((post: Post) => (
              <TableRow key={post.id}>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className="font-medium">{post.title}</div>
                      {post.summary && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {post.summary}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">User ID: {post.userId}</span>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={
                      post.status === 'published' ? 'default' : 
                      post.status === 'draft' ? 'secondary' : 'outline'
                    }
                  >
                    {post.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm">-</span>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="mr-2 h-4 w-4" />
                        View Post
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Post
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <AlertTriangle className="mr-2 h-4 w-4 text-yellow-600" />
                        Flag Content
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => handleDeletePost(post.id, post.title)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Post
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )

  const FilesTable = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File Name</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFiles.map((file) => (
              <TableRow key={file.id}>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Download className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className="font-medium">{file.originalName}</div>
                      <div className="text-sm text-gray-500">{file.fileName}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">User ID: {file.userId}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {file.contentType}
                  </Badge>
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
                      <DropdownMenuItem>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <AlertTriangle className="mr-2 h-4 w-4 text-yellow-600" />
                        Flag File
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => handleDeleteFile(file.id, file.originalName)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete File
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Content Moderation</CardTitle>
        <CardDescription>
          Monitor and moderate user-generated content including posts and files
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="posts" className="space-y-4">
          <TabsList>
            <TabsTrigger value="posts">
              Posts ({postsData?.pagination?.total || 0})
            </TabsTrigger>
            <TabsTrigger value="files">
              Files ({filesData?.pagination?.total || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts">
            {postsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading posts...</p>
              </div>
            ) : (
              <PostsTable />
            )}
          </TabsContent>

          <TabsContent value="files">
            {filesLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading files...</p>
              </div>
            ) : (
              <FilesTable />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
