import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { userService } from '../services/user-service'
import { QUERY_KEYS } from '../types/api'
import type {
  ListUsersParams,
  User,
  UserResponse
} from '../types/api'

// User Queries
export const useUsers = (params?: ListUsersParams) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.users, params],
    queryFn: () => userService.getUsers(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export const useUser = (id: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.user(id),
    queryFn: () => userService.getUser(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// User Mutations
export const useUpdateUser = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<User> }) =>
      userService.updateUser(id, updates),
    onSuccess: (data, variables) => {
      // Update user cache
      queryClient.setQueryData(QUERY_KEYS.user(variables.id), data)
      
      // Invalidate users list
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users })
    },
    onError: (error) => {
      console.error('User update failed:', error)
    }
  })
}

export const useDeleteUser = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => userService.deleteUser(id),
    onSuccess: (_, deletedId) => {
      // Remove user from cache
      queryClient.removeQueries({ queryKey: QUERY_KEYS.user(deletedId) })
      
      // Invalidate users list
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users })
    },
    onError: (error) => {
      console.error('User deletion failed:', error)
    }
  })
}

// Admin User Actions
export const usePromoteToAdmin = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => userService.promoteToAdmin(id),
    onSuccess: (data, userId) => {
      queryClient.setQueryData(QUERY_KEYS.user(userId), data)
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users })
    }
  })
}

export const useDemoteFromAdmin = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => userService.demoteFromAdmin(id),
    onSuccess: (data, userId) => {
      queryClient.setQueryData(QUERY_KEYS.user(userId), data)
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users })
    }
  })
}

export const useBanUser = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => userService.banUser(id),
    onSuccess: (data, userId) => {
      queryClient.setQueryData(QUERY_KEYS.user(userId), data)
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users })
    }
  })
}

export const useUnbanUser = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => userService.unbanUser(id),
    onSuccess: (data, userId) => {
      queryClient.setQueryData(QUERY_KEYS.user(userId), data)
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users })
    }
  })
}
