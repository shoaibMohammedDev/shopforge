/**
 * @file shared/types/user.ts
 * @description User domain type definitions.
 */

/** User profile data returned by the API. */
export interface UserProfile {
  id: string
  name: string | null
  email: string
  image: string | null
  role: string
  emailVerified: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}
