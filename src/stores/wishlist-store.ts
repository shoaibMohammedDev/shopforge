/**
 * @file wishlist-store.ts
 * @description Zustand store for product wishlist management with localStorage persistence.
 *
 * Key Responsibilities:
 * - Maintains a list of product IDs that the user has wishlisted
 * - Persists the wishlist to localStorage under the key 'shopforge-wishlist',
 *   ensuring the wishlist survives page refreshes and browser restarts
 * - Provides actions for adding, removing, checking, and toggling wishlist items
 * - Enforces uniqueness — each product can only appear once in the wishlist
 *
 * Design note: Only product IDs are stored (not full product data) to keep
 * the persisted state lightweight. Product details are fetched from the API
 * when the wishlist page is rendered, ensuring data is always up-to-date.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Shape of the wishlist Zustand store.
 *
 * Stores product IDs as a flat array for simplicity and minimal storage
 * footprint. Full product data is resolved at render time via API calls.
 */
interface WishlistStore {
  /** Ordered list of product IDs currently in the wishlist */
  productIds: string[]

  /**
   * Add a product to the wishlist.
   * No-op if the product is already wishlisted (prevents duplicates).
   * @param productId - The ID of the product to add
   */
  addItem: (productId: string) => void

  /**
   * Remove a product from the wishlist.
   * No-op if the product is not in the wishlist.
   * @param productId - The ID of the product to remove
   */
  removeItem: (productId: string) => void

  /**
   * Check whether a product is currently in the wishlist.
   * Used primarily for rendering heart/favorite icon states.
   * @param productId - The ID of the product to check
   * @returns True if the product is in the wishlist, false otherwise
   */
  isInWishlist: (productId: string) => boolean

  /**
   * Toggle a product's wishlist status.
   * If the product is wishlisted, it is removed; if not, it is added.
   * This is the primary action used by wishlist toggle buttons in the UI,
   * as it avoids the need for a separate `isInWishlist` check before acting.
   * @param productId - The ID of the product to toggle
   */
  toggleItem: (productId: string) => void
}

/**
 * Zustand store for wishlist state, persisted to localStorage.
 *
 * Uses the `persist` middleware with the storage key `'shopforge-wishlist'`
 * to automatically save and rehydrate the wishlist across browser sessions.
 *
 * **Uniqueness guarantee**: The `addItem` action checks for duplicates before
 * adding, and `toggleItem` ensures consistent add/remove behavior.
 */
export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      productIds: [],

      addItem: (productId) => {
        const { productIds } = get()
        // Prevent duplicates — only add if not already in the wishlist
        if (!productIds.includes(productId)) {
          set({ productIds: [...productIds, productId] })
        }
      },

      removeItem: (productId) => {
        // Filter out the matching product ID, leaving all others intact
        set({ productIds: get().productIds.filter((id) => id !== productId) })
      },

      isInWishlist: (productId) => get().productIds.includes(productId),

      toggleItem: (productId) => {
        const { productIds } = get()
        if (productIds.includes(productId)) {
          // Currently wishlisted — remove it
          set({ productIds: productIds.filter((id) => id !== productId) })
        } else {
          // Not wishlisted — add it
          set({ productIds: [...productIds, productId] })
        }
      },
    }),
    {
      /** localStorage key under which the wishlist state is persisted */
      name: 'shopforge-wishlist',
    }
  )
)
