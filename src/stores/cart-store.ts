import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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

interface CartStore {
  items: LocalCartItem[]
  couponCode: string | null
  addItem: (item: LocalCartItem) => void
  removeItem: (productId: string, variantId?: string) => void
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void
  clearCart: () => void
  applyCoupon: (code: string) => void
  removeCoupon: () => void
  getItemCount: () => number
  getSubtotal: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      couponCode: null,

      addItem: (item) => {
        const { items } = get()
        const existingIndex = items.findIndex(
          (i) => i.productId === item.productId && i.variantId === item.variantId
        )

        if (existingIndex >= 0) {
          const newItems = [...items]
          newItems[existingIndex] = {
            ...newItems[existingIndex],
            quantity: newItems[existingIndex].quantity + item.quantity,
          }
          set({ items: newItems })
        } else {
          set({ items: [...items, item] })
        }
      },

      removeItem: (productId, variantId) => {
        set({
          items: get().items.filter(
            (i) => !(i.productId === productId && i.variantId === variantId)
          ),
        })
      },

      updateQuantity: (productId, quantity, variantId) => {
        if (quantity <= 0) {
          get().removeItem(productId, variantId)
          return
        }
        set({
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
      name: 'shopforge-cart',
    }
  )
)
