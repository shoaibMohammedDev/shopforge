// ============================================================================
// File: order.dto.ts
// Description: Order Data Transfer Objects (DTOs) for ShopForge — typed interfaces
//              that define the shape of order request and response payloads
// Key Responsibilities:
//   - Define strict TypeScript contracts for order creation, status updates,
//     and order detail responses
//   - Support the full order lifecycle from creation through delivery
//   - Include address, line item, timeline, and payment sub-DTOs
// ============================================================================

// ---- Request DTOs ----

/**
 * Order line item input — represents a single product/variant in a new order.
 *
 * Each item captures a snapshot of the product details at the time of purchase
 * so that the order history remains accurate even if product details change later.
 */
export interface OrderItemInputDTO {
  /** ID of the product being ordered */
  productId: string
  /** ID of the specific variant (e.g., size/color), or null for the base product */
  variantId?: string | null
  /** Product name snapshot at the time of order */
  productName: string
  /** Variant name snapshot (e.g., "Large / Red"), or null */
  variantName?: string | null
  /** SKU identifier for inventory tracking */
  sku: string
  /** Unit price at the time of order (in dollars) */
  price: number
  /** Quantity of this item in the order */
  quantity: number
  /** Line total (price × quantity, in dollars) */
  total: number
  /** Product image URL for display in order history, or null */
  image?: string | null
}

/**
 * Address DTO — represents a shipping or billing address.
 *
 * Uses a flat structure compatible with most shipping carriers and
 * payment processors. All fields are strings to match form input.
 */
export interface AddressDTO {
  /** Recipient's first name */
  firstName: string
  /** Recipient's last name */
  lastName: string
  /** Primary street address line (e.g., "123 Main St") */
  street1: string
  /** Secondary street address line (e.g., "Apt 4B"), optional */
  street2?: string | null
  /** City name */
  city: string
  /** State or province code (e.g., "CA", "NY") */
  state: string
  /** Postal/ZIP code */
  postalCode: string
  /** Country code (e.g., "US", "GB") */
  country: string
  /** Contact phone number, optional */
  phone?: string | null
}

/**
 * Create order request payload — the complete data needed to place a new order.
 *
 * Includes the customer ID, all line items, both addresses, shipping method,
 * and the pre-calculated financial breakdown (subtotal, tax, shipping, discount, total).
 */
export interface CreateOrderRequestDTO {
  /** ID of the customer placing the order */
  userId: string
  /** Ordered line items with product snapshots */
  items: OrderItemInputDTO[]
  /** Shipping address for the order */
  shippingAddress: AddressDTO
  /** Billing address for the order */
  billingAddress: AddressDTO
  /** Selected shipping method — 'Standard' for regular, 'Express' for priority */
  shippingMethod: 'Standard' | 'Express'
  /** Sum of all item totals before tax, shipping, and discounts (in dollars) */
  subtotal: number
  /** Calculated tax amount (in dollars) */
  taxAmount: number
  /** Shipping cost (in dollars) */
  shippingAmount: number
  /** Coupon discount amount (in dollars; 0 if no coupon applied) */
  discountAmount: number
  /** Final total amount to be charged (subtotal + tax + shipping - discount) */
  totalAmount: number
  /** ID of the applied coupon, or null if no coupon was used */
  couponId?: string | null
}

/**
 * Update order status request payload (admin only).
 *
 * Maps to the order status lifecycle: PENDING → PAID → PROCESSING → SHIPPED → DELIVERED.
 * CANCELLED and REFUNDED are terminal states that can be set from most other states.
 */
export interface UpdateOrderStatusDTO {
  /** ID of the order to update */
  orderId: string
  /** The new status to set */
  status: 'PENDING' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED'
  /** Optional message for the timeline entry (e.g., "Shipped via FedEx, tracking #12345") */
  message?: string
}

// ---- Response DTOs ----

/**
 * Order line item response — a persisted order item as returned by the API.
 *
 * Similar to OrderItemInputDTO but with a database-assigned ID and
 * non-optional variant/image fields (stored as null rather than omitted).
 */
export interface OrderItemDTO {
  /** Unique line item identifier (UUID) */
  id: string
  /** ID of the product */
  productId: string
  /** ID of the variant, or null for base product */
  variantId: string | null
  /** Product name snapshot */
  productName: string
  /** Variant name snapshot, or null */
  variantName: string | null
  /** SKU identifier */
  sku: string
  /** Unit price at the time of order */
  price: number
  /** Quantity ordered */
  quantity: number
  /** Line total (price × quantity) */
  total: number
  /** Product image URL, or null */
  image: string | null
}

/**
 * Order timeline entry — records each status change for audit trail.
 *
 * Timeline entries are created automatically whenever an order's status
 * changes, providing a complete history of the order's lifecycle.
 */
export interface OrderTimelineDTO {
  /** Unique timeline entry identifier (UUID) */
  id: string
  /** The status that was set at this point in time */
  status: string
  /** Optional human-readable message describing the status change */
  message: string | null
  /** ISO 8601 timestamp of when this status change occurred */
  createdAt: string
}

/**
 * Complete order detail response — returned for single-order views.
 *
 * Includes all financial details, line items, timeline entries,
 * and payment information for a comprehensive order summary.
 */
export interface OrderDTO {
  /** Unique order identifier (UUID) */
  id: string
  /** Human-readable order number (e.g., "SF-M3FGH2") for customer reference */
  orderNumber: string
  /** Current order status (e.g., 'PENDING', 'SHIPPED', 'DELIVERED') */
  status: string
  /** Subtotal of all line items before tax/shipping/discount */
  subtotal: number
  /** Tax amount charged */
  taxAmount: number
  /** Shipping cost charged */
  shippingAmount: number
  /** Coupon discount applied */
  discountAmount: number
  /** Final total amount charged to the customer */
  totalAmount: number
  /** Selected shipping method (e.g., 'Standard', 'Express'), or null */
  shippingMethod: string | null
  /** Carrier tracking number for shipment tracking, or null if not yet shipped */
  trackingNumber: string | null
  /** ID of the applied coupon, or null */
  couponId: string | null
  /** ISO 8601 timestamp of when the order was placed */
  createdAt: string
  /** Line items in this order */
  items: OrderItemDTO[]
  /** Timeline entries showing the order's status history (optional, included in detail views) */
  timeline?: OrderTimelineDTO[]
  /** Payment information including status and method (optional, may be null) */
  payment?: { status: string; method: string; transactionId?: string } | null
}

/**
 * Wrapper for a list of orders — used for bulk order retrieval responses.
 *
 * Currently a simple wrapper; pagination metadata is added at the
 * repository level when using filtered queries.
 */
export interface OrderListDTO {
  /** Array of order summaries */
  orders: OrderDTO[]
}
