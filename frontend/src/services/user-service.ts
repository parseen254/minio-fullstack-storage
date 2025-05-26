import { apiClient } from '../lib/api-client'
import type {
  User,
  UserResponse,
  ListResponse,
  SuccessResponse,
  ListUsersParams
} from '../types/api'

export class UserService {
  async getUsers(params?: ListUsersParams): Promise<ListResponse<UserResponse>> {
    const queryParams = new URLSearchParams()
    
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString())
    
    const url = `/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    return apiClient.get<ListResponse<UserResponse>>(url)
  }

  async getUser(id: string): Promise<SuccessResponse<UserResponse>> {
    return apiClient.get<SuccessResponse<UserResponse>>(`/users/${id}`)
  }

  async updateUser(id: string, updates: Partial<User>): Promise<SuccessResponse<User>> {
    return apiClient.put<SuccessResponse<User>>(`/users/${id}`, updates)
  }

  async deleteUser(id: string): Promise<SuccessResponse<void>> {
    return apiClient.delete<SuccessResponse<void>>(`/users/${id}`)
  }

  async getUserProfile(id: string): Promise<SuccessResponse<UserResponse>> {
    return this.getUser(id)
  }

  // Admin only methods
  async promoteToAdmin(id: string): Promise<SuccessResponse<User>> {
    return this.updateUser(id, { role: 'admin' })
  }

  async demoteFromAdmin(id: string): Promise<SuccessResponse<User>> {
    return this.updateUser(id, { role: 'user' })
  }

  async banUser(id: string): Promise<SuccessResponse<User>> {
    return this.updateUser(id, { role: 'banned' })
  }

  async unbanUser(id: string): Promise<SuccessResponse<User>> {
    return this.updateUser(id, { role: 'user' })
  }
}

export const userService = new UserService()
