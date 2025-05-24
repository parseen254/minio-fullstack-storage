// Form validation utilities
export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  custom?: (value: any) => string | null
}

export interface ValidationRules {
  [key: string]: ValidationRule
}

export interface ValidationErrors {
  [key: string]: string
}

export function validateForm(data: Record<string, any>, rules: ValidationRules): ValidationErrors {
  const errors: ValidationErrors = {}

  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field]
    const error = validateField(value, rule, field)
    
    if (error) {
      errors[field] = error
    }
  }

  return errors
}

export function validateField(value: any, rule: ValidationRule, fieldName: string): string | null {
  // Required validation
  if (rule.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
    return `${fieldName} is required`
  }

  // Skip other validations if value is empty and not required
  if (!value && !rule.required) {
    return null
  }

  const stringValue = String(value)

  // Min length validation
  if (rule.minLength && stringValue.length < rule.minLength) {
    return `${fieldName} must be at least ${rule.minLength} characters long`
  }

  // Max length validation
  if (rule.maxLength && stringValue.length > rule.maxLength) {
    return `${fieldName} must be no more than ${rule.maxLength} characters long`
  }

  // Pattern validation
  if (rule.pattern && !rule.pattern.test(stringValue)) {
    return `${fieldName} format is invalid`
  }

  // Custom validation
  if (rule.custom) {
    return rule.custom(value)
  }

  return null
}

// Email validation
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Password strength validation
export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

// File name sanitization
export function sanitizeFileName(fileName: string): string {
  // Remove or replace invalid characters
  return fileName
    .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid characters with underscore
    .replace(/\s+/g, '_') // Replace spaces with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
    .toLowerCase()
}

// URL validation
export function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// Deep clone utility
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T
  }

  if (obj instanceof Array) {
    return obj.map((item) => deepClone(item)) as T
  }

  if (typeof obj === 'object') {
    const cloned = {} as T
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key])
      }
    }
    return cloned
  }

  return obj
}

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

// Throttle utility
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

// Format date utility
export function formatDate(date: Date | string, format: 'short' | 'long' | 'iso' = 'short'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date

  switch (format) {
    case 'short':
      return dateObj.toLocaleDateString()
    case 'long':
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    case 'iso':
      return dateObj.toISOString()
    default:
      return dateObj.toLocaleDateString()
  }
}

// Retry utility for async functions
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      if (attempt === maxAttempts) {
        throw lastError
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay * attempt))
    }
  }

  throw lastError!
}
