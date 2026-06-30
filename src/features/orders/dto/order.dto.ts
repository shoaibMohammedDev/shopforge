// ============================================================================
// ShopForge - Order DTOs (Data Transfer Objects)
// Typed interfaces for order request/response payloads
// ============================================================================

// ---- Request DTOs ----
export interface OrderItemInputDTO {
  productId: string
  variantId?: string | null
  productName: string
  variantName?: string | null
  sku: string
  price: number
  quantity: number
  total: number
  image?: string | null
}

export interface AddressDTO {
  firstName: string
  lastName: string
  street1: string
  street2?: string | null
  city: string
  state: string
  postalCode: string
  country: string
  phone?: string | null
}

export interface CreateOrderRequestDTO {
  userId: string
  items: OrderItemInputDTO[]
  shippingAddress: AddressDTO
  billingAddress: AddressDTO
  shippingMethod: 'Standard' | 'Express'
  subtotal: number
  taxAmount: number
  shippingAmount: number
  discountAmount: number
  totalAmount: number
  couponId?: string | null
}

export interface UpdateOrderStatusDTO {
  orderId: string
  status: 'PENDING' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED'
  message?: string
}

// ---- Response DTOs ----
export interface OrderItemDTO {
  id: string
  productId: string
  variantId: string | null
  productName: string
  variantName: string | null
  sku: string
  price: number
  quantity: number
  total: number
  image: string | null
}

export interface OrderTimelineDTO {
  id: string
  status: string
  message: string | null
  createdAt: string
}

export interface OrderDTO {
  id: string
  orderNumber: string
  status: string
  subtotal: number
  taxAmount: number
  shippingAmount: number
  discountAmount: number
  totalAmount: number
  shippingMethod: string | null
  trackingNumber: string | null
  couponId: string | null
  createdAt: string
  items: OrderItemDTO[]
  timeline?: OrderTimelineDTO[]
  payment?: { status: string; method: string; transactionId?: string } | null
}

export interface OrderListDTO {
  orders: OrderDTO[]
}
