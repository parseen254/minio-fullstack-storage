import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authService } from '../services/auth-service'
import { QUERY_KEYS } from '../types/api'
import type {
  LoginRequest,
  RegisterRequest,
  ProfileUpdateRequest,
  AuthResponse,
  User,
  SuccessResponse
} from '../types/api'

// Auth Queries
export const useProfile = () => {
  return useQuery({
    queryKey: QUERY_KEYS.profile,
    queryFn: () => authService.getProfile(),
    enabled: authService.isAuthenticated(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Auth Mutations
export const useLogin = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (credentials: LoginRequest) => authService.login(credentials),
    onSuccess: (data: AuthResponse) => {
      // Set user data in cache
      queryClient.setQueryData(QUERY_KEYS.profile, {
        data: data.user,
        message: 'Profile loaded'
      } as SuccessResponse<User>)
      
      // Redirect to dashboard
      window.location.href = '/dashboard'
    },
    onError: (error) => {
      console.error('Login failed:', error)
    }
  })
}

export const useRegister = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (userData: RegisterRequest) => authService.register(userData),
    onSuccess: (data: AuthResponse) => {
      // Set user data in cache
      queryClient.setQueryData(QUERY_KEYS.profile, {
        data: data.user,
        message: 'Profile loaded'
      } as SuccessResponse<User>)
      
      // Redirect to dashboard
      window.location.href = '/dashboard'
    },
    onError: (error) => {
      console.error('Registration failed:', error)
    }
  })
}

export const useUpdateProfile = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (updates: ProfileUpdateRequest) => authService.updateProfile(updates),
    onSuccess: (data) => {
      // Update profile cache
      queryClient.setQueryData(QUERY_KEYS.profile, data)
      
      // Update user in localStorage
      if (data.data) {
        authService.setUser(data.data)
      }
    },
    onError: (error) => {
      console.error('Profile update failed:', error)
    }
  })
}

export const useLogout = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: () => Promise.resolve(authService.logout()),
    onSuccess: () => {
      // Clear all cached data
      queryClient.clear()
    }
  })
}
