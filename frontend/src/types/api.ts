import React from "react";
// API Response Types
export interface ApiResponse<T = any> {
  data?: T
  message?: string
  error?: string
  code?: number
}

export interface ErrorResponse {
  error: string
  message?: string
  code?: number
}

export interface SuccessResponse<T = any> {
  message: string
  data: T
}

export interface ListResponse<T = any> {
  data: T[]
  pagination: Pagination
}

export interface Pagination {
  page: number
  pageSize: number
  total: number
  offset: number
}

// User Types
export interface User {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  role: string
  avatar?: string
  createdAt: string
  updatedAt: string
  etag: string
}

export interface UserResponse {
  id: string
  username: string
  email: string
  firstName: string
  lastName: string
  role: string
  avatar?: string
  createdAt: string
  updatedAt: string
  etag: string
}

// Auth Types
export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  username: string
  email: string
  password: string
  firstName: string
  lastName: string
}

export interface AuthResponse {
  token: string
  user: UserResponse
}

// File Types
export interface File {
  id: string
  fileName: string
  originalName: string
  path: string
  size: number
  contentType: string
  userId: string
  etag: string
  metadata?: Record<string, string>
  createdAt: string
  updatedAt: string
}

export interface FileUploadResponse {
  message: string
  data: File
}

// Post Types
export interface Post {
  id: string
  title: string
  content: string
  summary?: string
  status: 'draft' | 'published' | 'archived'
  tags?: string[]
  userId: string
  etag: string
  createdAt: string
  updatedAt: string
}

export interface CreatePostRequest {
  title: string
  content: string
  summary?: string
  status?: 'draft' | 'published' | 'archived'
  tags?: string[]
}

export interface UpdatePostRequest extends Partial<CreatePostRequest> {}

// Query Parameters
export interface PaginationParams {
  page?: number
  pageSize?: number
}

export interface ListUsersParams extends PaginationParams {}
export interface ListPostsParams extends PaginationParams {}
export interface ListUserPostsParams extends PaginationParams {
  userId: string
}
export interface ListFilesParams extends PaginationParams {
  userId?: string
  contentType?: string
}

// Form Types
export interface ProfileUpdateRequest {
  firstName?: string
  lastName?: string
  avatar?: string
}

// Admin Types
export interface AdminStats {
  totalUsers: number
  totalPosts: number
  totalFiles: number
  totalStorageUsed: number
}

// Upload Progress
export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

// File Download
export interface FileDownloadRequest {
  fileId: string
  fileName?: string
}

// Error Types
export type ApiErrorCode = 
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED' 
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR'

export interface ApiError {
  message: string
  code?: ApiErrorCode
  status?: number
  details?: any
}

// React Query Keys
export const QUERY_KEYS = {
  // Auth
  profile: ['profile'] as const,
  
  // Users
  users: ['users'] as const,
  user: (id: string) => ['users', id] as const,
  
  // Posts
  posts: ['posts'] as const,
  post: (id: string) => ['posts', id] as const,
  userPosts: (userId: string) => ['posts', 'user', userId] as const,
  
  // Files
  files: ['files'] as const,
  file: (id: string) => ['files', id] as const,
  
  // Admin
  adminStats: ['admin', 'stats'] as const,
} as const

// Component Props Types
export interface BaseComponentProps {
  className?: string
}

export interface LoadingState {
  isLoading: boolean
  error?: string | null
}

export interface ModalProps extends BaseComponentProps {
  isOpen: boolean
  onClose: () => void
  title?: string
}

export interface FormFieldProps extends BaseComponentProps {
  label: string
  error?: string
  required?: boolean
}

// Toast Types
export interface Toast {
  id: string
  title: string
  description?: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

// Navigation Types
export interface NavItem {
  label: string
  href: string
  icon?: React.ComponentType<any>
  requireAuth?: boolean
  requireAdmin?: boolean
}

// Table Types
export interface Column<T> {
  key: keyof T | string
  label: string
  sortable?: boolean
  render?: (value: any, row: T) => React.ReactNode
}

export interface TableProps<T> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  onSort?: (key: string, direction: 'asc' | 'desc') => void
  onRowClick?: (row: T) => void
}

// Filter Types
export interface FilterOption {
  label: string
  value: string
}

export interface DateRange {
  from: Date
  to: Date
}

export interface PostFilters {
  status?: string
  dateRange?: DateRange
  userId?: string
}

export interface UserFilters {
  role?: string
  dateRange?: DateRange
}

export interface FileFilters {
  contentType?: string
  dateRange?: DateRange
  userId?: string
}
