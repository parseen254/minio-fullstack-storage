import React from 'react'
import { cn } from '@/lib/utils'

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const Loader: React.FC<LoaderProps> = ({ 
  size = 'md',
  className 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8'
  }

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-gray-300 border-t-blue-600',
        sizeClasses[size],
        className
      )}
    />
  )
}

interface LoadingSpinnerProps {
  text?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  text = 'Loading...',
  size = 'md',
  className
}) => {
  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      <Loader size={size} />
      {text && <span className="text-gray-600">{text}</span>}
    </div>
  )
}

interface FullPageLoaderProps {
  text?: string
}

export const FullPageLoader: React.FC<FullPageLoaderProps> = ({
  text = 'Loading...'
}) => {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="text-center">
        <Loader size="lg" className="mx-auto mb-4" />
        <p className="text-lg text-gray-600">{text}</p>
      </div>
    </div>
  )
}
