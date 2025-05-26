import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { postService } from '../services/post-service'
import { QUERY_KEYS } from '../types/api'
import type {
  ListPostsParams,
  ListUserPostsParams,
  CreatePostRequest,
  UpdatePostRequest,
  Post
} from '../types/api'

// Post Queries
export const usePosts = (params?: ListPostsParams) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.posts, params],
    queryFn: () => postService.getPosts(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export const usePost = (id: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.post(id),
    queryFn: () => postService.getPost(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export const useUserPosts = (params: ListUserPostsParams) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.userPosts(params.userId), params],
    queryFn: () => postService.getUserPosts(params),
    enabled: !!params.userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Post Mutations
export const useCreatePost = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (postData: CreatePostRequest) => postService.createPost(postData),
    onSuccess: () => {
      // Invalidate posts queries
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.posts })
    },
    onError: (error) => {
      console.error('Post creation failed:', error)
    }
  })
}

export const useUpdatePost = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdatePostRequest }) =>
      postService.updatePost(id, updates),
    onSuccess: (data, variables) => {
      // Update post cache
      queryClient.setQueryData(QUERY_KEYS.post(variables.id), data)
      
      // Invalidate posts list
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.posts })
    },
    onError: (error) => {
      console.error('Post update failed:', error)
    }
  })
}

export const useDeletePost = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => postService.deletePost(id),
    onSuccess: (_, deletedId) => {
      // Remove post from cache
      queryClient.removeQueries({ queryKey: QUERY_KEYS.post(deletedId) })
      
      // Invalidate posts list
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.posts })
    },
    onError: (error) => {
      console.error('Post deletion failed:', error)
    }
  })
}

// Post Action Mutations
export const usePublishPost = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => postService.publishPost(id),
    onSuccess: (data, postId) => {
      queryClient.setQueryData(QUERY_KEYS.post(postId), data)
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.posts })
    }
  })
}

export const useUnpublishPost = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => postService.unpublishPost(id),
    onSuccess: (data, postId) => {
      queryClient.setQueryData(QUERY_KEYS.post(postId), data)
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.posts })
    }
  })
}

export const useArchivePost = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => postService.archivePost(id),
    onSuccess: (data, postId) => {
      queryClient.setQueryData(QUERY_KEYS.post(postId), data)
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.posts })
    }
  })
}

export const useDuplicatePost = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => postService.duplicatePost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.posts })
    }
  })
}
