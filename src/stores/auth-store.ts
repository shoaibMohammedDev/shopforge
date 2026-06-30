/**
 * @file auth-store.ts
 * @description Zustand store for authentication state management with localStorage persistence.
 *
 * Key Responsibilities:
 * - Manages the current user profile and authentication status
 * - Persists auth state to localStorage under the key 'shopforge-auth' so that
 *   a user remains logged in across page refreshes and browser restarts
 * - Provides actions for login, logout, and partial user profile updates
 * - Uses `partialize` to selectively persist only `user` and `isAuthenticated`,
 *   ensuring that action methods (login/logout/updateUser) are not serialized
 *   into localStorage (they are re-created on store initialization)
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserProfile } from '@/types'

/**
 * Shape of the authentication Zustand store.
 *
 * Separates the state (`user`, `isAuthenticated`) from the actions
 * (`login`, `logout`, `updateUser`) for a clean API surface.
 */
interface AuthStore {
  /** The currently authenticated user's profile, or null if not logged in */
  user: UserProfile | null
  /** Whether the user is currently authenticated; derived from login/logout actions */
  isAuthenticated: boolean

  /**
   * Authenticate a user by storing their profile and marking the session as active.
   * Typically called after a successful login API response.
   * @param user - The full user profile returned from the authentication API
   */
  login: (user: UserProfile) => void

  /**
   * Log out the current user by clearing the profile and authentication flag.
   * This also clears the persisted state in localStorage.
   */
  logout: () => void

  /**
   * Partially update the current user's profile with new data.
   * Uses a shallow merge, so only the provided fields are overwritten.
   * If no user is currently logged in, this is a no-op (sets user to null).
   *
   * @param data - A partial user profile with only the fields to update
   *
   * @example
   * // Update just the user's name and image after profile edit
   * updateUser({ name: 'Jane Doe', image: '/avatars/jane.jpg' })
   */
  updateUser: (data: Partial<UserProfile>) => void
}

/**
 * Zustand store for authentication state, persisted to localStorage.
 *
 * Uses the `persist` middleware with the `partialize` option to ensure
 * only the serializable state fields (`user`, `isAuthenticated`) are stored
 * in localStorage. Action methods are NOT persisted — they are re-created
 * when the store is initialized, which is the correct behavior since
 * functions cannot be meaningfully serialized.
 *
 * **Security note**: The user profile stored in localStorage contains
 * non-sensitive display information (name, email, role). Sensitive
 * credentials (passwords, tokens) should be managed server-side via
 * HTTP-only cookies, not in this client-side store.
 */
export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,

      login: (user) => set({ user, isAuthenticated: true }),

      logout: () => set({ user: null, isAuthenticated: false }),

      updateUser: (data) =>
        set((state) => ({
          // Shallow merge: existing fields are preserved unless overridden by `data`
          // If no user is logged in, we cannot update — safely return null
          user: state.user ? { ...state.user, ...data } : null,
        })),
    }),
    {
      /** localStorage key under which the auth state is persisted */
      name: 'shopforge-auth',

      /**
       * Selective persistence: only `user` and `isAuthenticated` are written
       * to localStorage. This prevents action functions from being serialized
       * (which would fail) and keeps the storage payload minimal.
       *
       * @param state - The full store state including actions
       * @returns A pick of the state containing only persistable fields
       */
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
