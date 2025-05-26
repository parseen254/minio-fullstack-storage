'use client'

import { useState } from 'react'
import { useUserPosts, useDeletePost, useCreatePost } from '@/hooks/use-posts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
  Plus,
  FileText,
  Calendar
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface UserPostManagerProps {
  user: {
    id: string
    firstName: string
    lastName: string
  }
}

export function UserPostManager({ user }: UserPostManagerProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    summary: '',
    status: 'draft' as 'draft' | 'published' | 'archived',
    tags: ''
  })
  const pageSize = 10

  const { data: postsData, isLoading } = useUserPosts({
    userId: user.id,
    page: currentPage,
    pageSize
  })

  const deletePostMutation = useDeletePost()
  const createPostMutation = useCreatePost()

  const handleDeletePost = async (postId: string, postTitle: string) => {
    if (window.confirm(`Are you sure you want to delete "${postTitle}"?`)) {
      try {
        await deletePostMutation.mutateAsync(postId)
        toast({
          title: 'Post deleted',
          description: `"${postTitle}" has been successfully deleted.`,
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

  const handleCreatePost = async () => {
    if (!newPost.title.trim() || !newPost.content.trim()) {
      toast({
        title: 'Error',
        description: 'Title and content are required.',
        variant: 'destructive',
      })
      return
    }

    try {
      const tags = newPost.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      await createPostMutation.mutateAsync({
        title: newPost.title,
        content: newPost.content,
        summary: newPost.summary || undefined,
        status: newPost.status,
        tags: tags.length > 0 ? tags : undefined
      })
      
      setNewPost({
        title: '',
        content: '',
        summary: '',
        status: 'draft',
        tags: ''
      })
      setShowCreatePost(false)
      
      toast({
        title: 'Post created',
        description: `"${newPost.title}" has been successfully created.`,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create post. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const filteredPosts = postsData?.data?.filter(post =>
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (post.summary && post.summary.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || []

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading posts...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Create Post Dialog */}
      <Dialog open={showCreatePost} onOpenChange={setShowCreatePost}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Post</DialogTitle>
            <DialogDescription>
              Write and publish a new blog post
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title *</label>
              <Input
                placeholder="Enter post title"
                value={newPost.title}
                onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Summary</label>
              <Input
                placeholder="Brief description of the post"
                value={newPost.summary}
                onChange={(e) => setNewPost(prev => ({ ...prev, summary: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Content *</label>
              <Textarea
                placeholder="Write your post content here..."
                value={newPost.content}
                onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                rows={10}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Tags</label>
              <Input
                placeholder="Enter tags separated by commas"
                value={newPost.tags}
                onChange={(e) => setNewPost(prev => ({ ...prev, tags: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <select
                value={newPost.status}
                onChange={(e) => setNewPost(prev => ({ ...prev, status: e.target.value as any }))}
                className="w-full p-2 border rounded-md"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreatePost(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePost} disabled={createPostMutation.isPending}>
              {createPostMutation.isPending ? 'Creating...' : 'Create Post'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>My Posts</span>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">
                {postsData?.pagination?.total || 0} posts
              </Badge>
              <Button onClick={() => setShowCreatePost(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Post
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Manage your blog posts and articles
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="flex items-center space-x-4 mb-6">
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

          {/* Posts Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPosts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="text-gray-500">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No posts created yet</p>
                        <p className="text-sm">Create your first post to get started</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPosts.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{post.title}</div>
                          {post.summary && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {post.summary}
                            </div>
                          )}
                        </div>
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
                        <div className="flex flex-wrap gap-1">
                          {post.tags?.slice(0, 2).map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {post.tags && post.tags.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{post.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">
                            {new Date(post.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {new Date(post.updatedAt).toLocaleDateString()}
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
                              <Eye className="mr-2 h-4 w-4" />
                              View Post
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Post
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeletePost(post.id, post.title)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {postsData?.pagination && postsData.pagination.total > pageSize && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-500">
                Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, postsData.pagination.total)} of {postsData.pagination.total} posts
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
                  Page {currentPage} of {Math.ceil(postsData.pagination.total / pageSize)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={currentPage >= Math.ceil(postsData.pagination.total / pageSize)}
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
