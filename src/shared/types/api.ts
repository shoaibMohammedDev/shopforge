/**
 * @file shared/types/api.ts
 * @description API response type definitions for ShopForge.
 */

/** Standard API response envelope used by all backend endpoints. */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

/** Paginated API response with flat pagination fields. */
export interface PaginatedResponse<T = unknown> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}
