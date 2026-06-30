// ============================================================================
// ShopForge API Client
// Centralized API request handler with error handling and type safety
// ============================================================================

import type { ApiResponse } from '@/types'

const API_BASE = '/api'

class ApiClient {
  private baseUrl: string
  private csrfToken: string | null = null

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl
  }

  /**
   * Get CSRF token from cookie (double-submit pattern)
   */
  private getCsrfTokenFromCookie(): string | null {
    if (typeof document === 'undefined') return null
    const match = document.cookie
      .split(';')
      .find(c => c.trim().startsWith('shopforge-csrf='))
    return match ? match.split('=')[1]?.trim() || null : null
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options?.headers as Record<string, string>),
      }

      // Attach CSRF token for state-changing requests
      const method = options?.method?.toUpperCase() || 'GET'
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        const token = this.getCsrfTokenFromCookie()
        if (token) {
          headers['x-csrf-token'] = token
        }
      }

      const config: RequestInit = {
        ...options,
        headers,
      }

      const response = await fetch(url, config)
      const body = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: body.error || `Request failed with status ${response.status}`,
        }
      }

      // Unwrap the API's { success, data } envelope so callers get data directly
      const data = body.data !== undefined ? body.data : body
      return { success: true, data }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      }
    }
  }

  async get<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>): Promise<ApiResponse<T>> {
    let url = endpoint
    if (params) {
      const searchParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          searchParams.set(key, String(value))
        }
      })
      const qs = searchParams.toString()
      if (qs) url += `?${qs}`
    }
    return this.request<T>(url)
  }

  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

export const api = new ApiClient()
