import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WishlistStore {
  productIds: string[]
  addItem: (productId: string) => void
  removeItem: (productId: string) => void
  isInWishlist: (productId: string) => boolean
  toggleItem: (productId: string) => void
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      productIds: [],

      addItem: (productId) => {
        const { productIds } = get()
        if (!productIds.includes(productId)) {
          set({ productIds: [...productIds, productId] })
        }
      },

      removeItem: (productId) => {
        set({ productIds: get().productIds.filter((id) => id !== productId) })
      },

      isInWishlist: (productId) => get().productIds.includes(productId),

      toggleItem: (productId) => {
        const { productIds } = get()
        if (productIds.includes(productId)) {
          set({ productIds: productIds.filter((id) => id !== productId) })
        } else {
          set({ productIds: [...productIds, productId] })
        }
      },
    }),
    {
      name: 'shopforge-wishlist',
    }
  )
)
