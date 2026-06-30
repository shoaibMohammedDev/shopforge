/**
 * @file api-client.ts
 * @description Centralized HTTP client for all ShopForge API communication.
 *   Provides a singleton `api` instance with typed request methods (GET, POST, PUT, DELETE),
 *   automatic CSRF token injection for state-changing requests, query-string building,
 *   and standardized error handling via the `ApiResponse` envelope.
 *
 * Key Responsibilities:
 *   - Abstract fetch calls behind typed convenience methods (get / post / put / delete)
 *   - Automatically attach CSRF tokens to POST, PUT, PATCH, DELETE requests
 *   - Unwrap the server's `{ success, data }` envelope so callers receive data directly
 *   - Convert network-level failures and non-2xx responses into a uniform `ApiResponse` shape
 */

import type { ApiResponse } from '@/types'

/** Base path prefix for all API endpoints. Relative to the app origin so the browser resolves it automatically. */
const API_BASE = '/api'

/**
 * ApiClient — lightweight wrapper around the Fetch API.
 *
 * Encapsulates base URL configuration, CSRF token management, and response
 * normalisation so that every call site deals with a consistent `ApiResponse<T>`.
 */
class ApiClient {
  /** Root URL prefix prepended to every endpoint (e.g. "/api"). */
  private baseUrl: string

  /**
   * Cached CSRF token value. Currently unused for caching but reserved
   * for future optimisation where the token may be read once per page load.
   */
  private csrfToken: string | null = null

  /**
   * Create a new ApiClient instance.
   *
   * @param baseUrl - URL prefix for all requests. Defaults to `API_BASE` ("/api").
   *                  Override only for testing or non-standard gateway setups.
   */
  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl
  }

  /**
   * Extract the CSRF token from the browser's cookie store.
   *
   * Implements the "double-submit cookie" pattern: the same token that was
   * set as an HttpOnly cookie by the server is also sent as a custom header,
   * proving the request originated from our own front-end.
   *
   * @returns The CSRF token string if the cookie exists, otherwise `null`.
   *          Returns `null` immediately when called server-side (`document` undefined).
   */
  private getCsrfTokenFromCookie(): string | null {
    // Guard: cookie access is only available in the browser
    if (typeof document === 'undefined') return null
    const match = document.cookie
      .split(';')
      .find(c => c.trim().startsWith('shopforge-csrf='))
    return match ? match.split('=')[1]?.trim() || null : null
  }

  /**
   * Core request method that all public helpers delegate to.
   *
   * Constructs the full URL, merges headers, injects the CSRF token for
   * state-changing methods, performs the fetch, and normalises both success
   * and error responses into `ApiResponse<T>`.
   *
   * @typeParam T - Expected shape of the successful response data.
   * @param endpoint - Relative API path (e.g. "/products", "/orders/123").
   * @param options  - Standard `RequestInit` options forwarded to `fetch`.
   * @returns A promise resolving to `ApiResponse<T>` — `{ success: true, data }` on
   *          success or `{ success: false, error }` on any failure.
   */
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
      // Only mutations need the token — GET/HEAD are idempotent and safe
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
        // Non-2xx status — surface the server's error message or a generic fallback
        return {
          success: false,
          error: body.error || `Request failed with status ${response.status}`,
        }
      }

      // Unwrap the API's { success, data } envelope so callers get data directly
      // Some legacy endpoints may return data at the top level; handle both shapes
      const data = body.data !== undefined ? body.data : body
      return { success: true, data }
    } catch (error) {
      // Network failures, CORS issues, JSON parse errors, etc.
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      }
    }
  }

  /**
   * Perform a GET request with optional query parameters.
   *
   * Automatically serialises the `params` object into a URL query string,
   * filtering out `undefined` and empty-string values to keep URLs clean.
   *
   * @typeParam T - Expected response data type.
   * @param endpoint - Relative API path.
   * @param params   - Key-value pairs to encode as `?key=value` query parameters.
   *                    Values of `undefined` or `''` are silently omitted.
   * @returns Promise resolving to `ApiResponse<T>`.
   */
  async get<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>): Promise<ApiResponse<T>> {
    let url = endpoint
    if (params) {
      const searchParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        // Skip undefined and empty-string values — they add noise to the URL
        if (value !== undefined && value !== '') {
          searchParams.set(key, String(value))
        }
      })
      const qs = searchParams.toString()
      if (qs) url += `?${qs}`
    }
    return this.request<T>(url)
  }

  /**
   * Perform a POST request to create a resource or trigger an action.
   *
   * @typeParam T - Expected response data type.
   * @param endpoint - Relative API path.
   * @param body     - Request payload; will be JSON-serialised automatically.
   * @returns Promise resolving to `ApiResponse<T>`.
   */
  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  /**
   * Perform a PUT request to fully replace a resource.
   *
   * @typeParam T - Expected response data type.
   * @param endpoint - Relative API path (usually includes the resource ID).
   * @param body     - Request payload; will be JSON-serialised automatically.
   * @returns Promise resolving to `ApiResponse<T>`.
   */
  async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  /**
   * Perform a DELETE request to remove a resource.
   *
   * @typeParam T - Expected response data type.
   * @param endpoint - Relative API path (usually includes the resource ID).
   * @returns Promise resolving to `ApiResponse<T>`.
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

/** Singleton ApiClient instance used throughout the application. */
export const api = new ApiClient()
