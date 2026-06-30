/**
 * @file cart-store.ts
 * @description Zustand store for shopping cart management with localStorage persistence.
 *
 * Key Responsibilities:
 * - Manages the local cart item list (add, remove, update quantity, clear)
 * - Supports product variants via `variantId` — items with different variants
 *   of the same product are tracked as separate cart entries
 * - Persists the full cart state to localStorage under the key 'shopforge-cart',
 *   so the cart survives page refreshes and browser restarts
 * - Tracks an applied coupon code alongside the cart items
 * - Provides computed-style getters for total item count and subtotal
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Represents a single item in the local (client-side) shopping cart.
 *
 * This is a denormalized snapshot of product data stored directly in the cart
 * to avoid needing to re-fetch product details on every cart render. It captures
 * the essential display and pricing information at the time the item was added.
 *
 * @property productId - Unique identifier of the product
 * @property variantId - Optional variant identifier; when present, this item
 *   represents a specific product variant (e.g., size/color combination)
 * @property quantity - Number of units of this item in the cart
 * @property name - Display name of the product
 * @property slug - URL-friendly slug for navigation to the product page
 * @property price - Current unit price of the item (or variant)
 * @property comparePrice - Original/list price before discount, used to
 *   display savings (e.g., strikethrough pricing)
 * @property image - Primary product image URL for cart display
 * @property variantName - Human-readable name of the selected variant
 *   (e.g., "Large / Red")
 * @property sku - Stock Keeping Unit identifier for inventory tracking
 */
export interface LocalCartItem {
  productId: string
  variantId?: string
  quantity: number
  name: string
  slug: string
  price: number
  comparePrice?: number
  image: string
  variantName?: string
  sku: string
}

/**
 * Shape of the cart Zustand store.
 *
 * Combines the cart state (items and coupon) with actions for mutating the cart
 * and getter methods for derived values (item count, subtotal).
 */
interface CartStore {
  /** The list of items currently in the cart */
  items: LocalCartItem[]
  /** The currently applied coupon code, or null if no coupon is applied */
  couponCode: string | null

  /**
   * Add an item to the cart. If an item with the same `productId` and
   * `variantId` already exists, its quantity is incremented instead of
   * creating a duplicate entry.
   * @param item - The cart item to add (with at least quantity of 1)
   */
  addItem: (item: LocalCartItem) => void

  /**
   * Remove an item from the cart identified by its productId and optional variantId.
   * @param productId - The product ID of the item to remove
   * @param variantId - Optional variant ID to disambiguate items of the same product
   */
  removeItem: (productId: string, variantId?: string) => void

  /**
   * Update the quantity of a specific cart item.
   * If the new quantity is <= 0, the item is removed from the cart entirely.
   * @param productId - The product ID of the item to update
   * @param quantity - The new quantity value
   * @param variantId - Optional variant ID to disambiguate items of the same product
   */
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void

  /** Clear all items from the cart and remove any applied coupon */
  clearCart: () => void

  /**
   * Apply a coupon code to the cart.
   * Note: Validation of the coupon code is handled by the server-side API;
   * this merely stores the code for submission during checkout.
   * @param code - The coupon code string to apply
   */
  applyCoupon: (code: string) => void

  /** Remove the currently applied coupon code from the cart */
  removeCoupon: () => void

  /**
   * Compute the total number of items in the cart (sum of all quantities).
   * @returns The total quantity across all cart items
   */
  getItemCount: () => number

  /**
   * Compute the cart subtotal (sum of price × quantity for each item).
   * Does not include tax, shipping, or coupon discounts.
   * @returns The monetary subtotal as a number
   */
  getSubtotal: () => number
}

/**
 * Zustand store for shopping cart state, persisted to localStorage.
 *
 * Uses the `persist` middleware with the storage key `'shopforge-cart'` to
 * automatically save and rehydrate the cart across browser sessions.
 *
 * **Item identity**: Two cart items are considered the same if they share
 * both `productId` AND `variantId`. This allows the same product in
 * different variants (e.g., different sizes) to coexist as separate entries.
 *
 * **Quantity handling**: When adding an item that already exists, the
 * quantities are merged (incremented). When updating quantity to 0 or below,
 * the item is removed entirely via `removeItem()`.
 */
export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      couponCode: null,

      addItem: (item) => {
        const { items } = get()

        // Check if this product+variant combo already exists in the cart
        const existingIndex = items.findIndex(
          (i) => i.productId === item.productId && i.variantId === item.variantId
        )

        if (existingIndex >= 0) {
          // Item already exists — merge quantities by incrementing
          const newItems = [...items]
          newItems[existingIndex] = {
            ...newItems[existingIndex],
            quantity: newItems[existingIndex].quantity + item.quantity,
          }
          set({ items: newItems })
        } else {
          // New item — append to the cart
          set({ items: [...items, item] })
        }
      },

      removeItem: (productId, variantId) => {
        set({
          // Filter out the item matching both productId and variantId
          items: get().items.filter(
            (i) => !(i.productId === productId && i.variantId === variantId)
          ),
        })
      },

      updateQuantity: (productId, quantity, variantId) => {
        // Guard: quantities of 0 or less should remove the item entirely
        if (quantity <= 0) {
          get().removeItem(productId, variantId)
          return
        }
        set({
          // Map over items, updating only the matching one
          items: get().items.map((i) =>
            i.productId === productId && i.variantId === variantId
              ? { ...i, quantity }
              : i
          ),
        })
      },

      clearCart: () => set({ items: [], couponCode: null }),

      applyCoupon: (code) => set({ couponCode: code }),

      removeCoupon: () => set({ couponCode: null }),

      getItemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

      getSubtotal: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    {
      /** localStorage key under which the cart state is persisted */
      name: 'shopforge-cart',
    }
  )
)
