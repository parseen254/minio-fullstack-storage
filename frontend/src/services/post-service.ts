import { apiClient } from '../lib/api-client'
import type { 
  Post, 
  CreatePostRequest, 
  UpdatePostRequest, 
  ListResponse, 
  ListPostsParams,
  ListUserPostsParams,
  ApiResponse
} from '../types/api'

class PostService {
  async getPosts(params?: ListPostsParams): Promise<ListResponse<Post>> {
    const response = await apiClient.get<ListResponse<Post>>('/posts', { params })
    return response
  }

  async getUserPosts(params: ListUserPostsParams): Promise<ListResponse<Post>> {
    const { userId, ...queryParams } = params
    const response = await apiClient.get<ListResponse<Post>>(`/users/${userId}/posts`, { 
      params: queryParams 
    })
    return response
  }

  async getPost(id: string): Promise<Post> {
    const response = await apiClient.get<Post>(`/posts/${id}`)
    return response
  }

  async createPost(postData: CreatePostRequest): Promise<Post> {
    const response = await apiClient.post<Post>('/posts', postData)
    return response
  }

  async updatePost(id: string, updates: UpdatePostRequest): Promise<Post> {
    const response = await apiClient.put<Post>(`/posts/${id}`, updates)
    return response
  }

  async deletePost(id: string): Promise<ApiResponse> {
    const response = await apiClient.delete<ApiResponse>(`/posts/${id}`)
    return response
  }

  async publishPost(id: string): Promise<Post> {
    const response = await apiClient.patch<Post>(`/posts/${id}/publish`)
    return response
  }

  async unpublishPost(id: string): Promise<Post> {
    const response = await apiClient.patch<Post>(`/posts/${id}/unpublish`)
    return response
  }

  async archivePost(id: string): Promise<Post> {
    const response = await apiClient.patch<Post>(`/posts/${id}/archive`)
    return response
  }

  async duplicatePost(id: string): Promise<Post> {
    const response = await apiClient.post<Post>(`/posts/${id}/duplicate`)
    return response
  }
}

export const postService = new PostService()