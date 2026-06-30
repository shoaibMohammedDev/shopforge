/**
 * @file validators.ts
 * @description Zod validation schemas for ShopForge API route handlers.
 *   Every incoming request body and query string is validated against one of
 *   these schemas before reaching business logic, ensuring type safety and
 *   providing clear, localised error messages for invalid input.
 *
 * Key Responsibilities:
 *   - Define strict validation rules for auth, product, order, coupon, admin,
 *     address, and review payloads
 *   - Use `z.discriminatedUnion` to route multi-action endpoints by an `action` field
 *   - Export inferred TypeScript types so route handlers are always in sync with validation
 */

import { z } from 'zod/v4'

// ---- Auth ----

/**
 * Schema for the login action. Requires a valid email and a non-empty password.
 * The `action: 'login'` literal is used as the discriminator in `authSchema`.
 */
export const loginSchema = z.object({
  action: z.literal('login'),
  email: z.email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

/**
 * Schema for the registration action. Enforces a minimum password length
 * of 8 characters and requires a name (max 100 chars to prevent abuse).
 */
export const registerSchema = z.object({
  action: z.literal('register'),
  email: z.email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100),
})

/**
 * Discriminated union of all authentication-related actions.
 * The `action` field determines which sub-schema is used for validation:
 * - `'login'`           — email + password login
 * - `'register'`        — new account creation
 * - `'verify'`          — email verification
 * - `'change-password'` — password change for authenticated users
 *
 * Using `z.discriminatedUnion` instead of `z.union` gives better error
 * messages because Zod knows which branch to validate based on `action`.
 */
export const authSchema = z.discriminatedUnion('action', [
  loginSchema,
  registerSchema,
  z.object({
    action: z.literal('verify'),
    userId: z.string().min(1),
  }),
  z.object({
    action: z.literal('change-password'),
    userId: z.string().min(1),
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  }),
])

// ---- Products ----

/**
 * Schema for product listing/query parameters.
 *
 * All fields are optional. Numeric query params use `z.coerce.number()`
 * because URL search params are always strings. The `isFeatured` field
 * uses a string enum + transform because checkboxes submit "true"/"false".
 */
export const productQuerySchema = z.object({
  /** Free-text search across product name and description. */
  search: z.string().optional(),
  /** Filter by category ID. */
  categoryId: z.string().optional(),
  /** Filter by brand ID. */
  brandId: z.string().optional(),
  /** Minimum price filter (inclusive). */
  minPrice: z.coerce.number().min(0).optional(),
  /** Maximum price filter (inclusive). */
  maxPrice: z.coerce.number().min(0).optional(),
  /** Minimum average rating (1–5). */
  minRating: z.coerce.number().min(1).max(5).optional(),
  /** Sort mode — must match one of the PRODUCT_SORT_OPTIONS constant values. */
  sort: z.enum(['newest', 'price-asc', 'price-desc', 'rating', 'popular']).default('newest'),
  /** Page number (1-indexed). */
  page: z.coerce.number().int().min(1).default(1),
  /** Items per page (capped at 100 to prevent excessive DB loads). */
  limit: z.coerce.number().int().min(1).max(100).default(12),
  /** Featured product flag — transmitted as a string, transformed to boolean. */
  isFeatured: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
  /** Tag filter for product collections. */
  tag: z.string().optional(),
})

// ---- Orders ----

/**
 * Schema for a single line item within an order.
 * Captures product identity, pricing at time of purchase, and quantity.
 */
export const orderItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional(),
  productName: z.string().min(1),
  variantName: z.string().optional(),
  sku: z.string().min(1),
  price: z.number().min(0),
  quantity: z.number().int().min(1),
  total: z.number().min(0),
  image: z.string().optional(),
})

/**
 * Schema for a postal address. Used for both shipping and billing addresses.
 * All core fields (name, street, city, state, postal code, country) are required;
 * secondary fields (street2, phone) are optional.
 */
export const addressSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  street1: z.string().min(1),
  street2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().min(1),
  phone: z.string().optional(),
})

/**
 * Schema for creating a new order.
 * Includes the user ID, item list, both addresses, shipping method,
 * and all monetary amounts (subtotal, tax, shipping, discount, total).
 * The `items` array must contain at least one item.
 */
export const createOrderSchema = z.object({
  userId: z.string().min(1),
  items: z.array(orderItemSchema).min(1, 'Order must have at least one item'),
  shippingAddress: addressSchema,
  billingAddress: addressSchema,
  shippingMethod: z.enum(['Standard', 'Express']).default('Standard'),
  subtotal: z.number().min(0),
  taxAmount: z.number().min(0),
  shippingAmount: z.number().min(0),
  discountAmount: z.number().min(0),
  totalAmount: z.number().min(0),
  couponId: z.string().optional(),
})

// ---- Coupons ----

/**
 * Schema for looking up a coupon by code.
 * Includes `subtotal` so the validator can check minimum-purchase requirements.
 */
export const couponQuerySchema = z.object({
  code: z.string().min(1),
  subtotal: z.coerce.number().min(0),
})

/**
 * Schema for creating a new coupon.
 * Supports both percentage and fixed-amount discounts, optional purchase
 * thresholds, usage limits, and date-based activation/expiration windows.
 */
export const createCouponSchema = z.object({
  code: z.string().min(1).max(50),
  type: z.enum(['PERCENTAGE', 'FIXED']),
  value: z.number().min(0),
  minPurchase: z.number().min(0).default(0),
  maxDiscount: z.number().min(0).optional(),
  usageLimit: z.number().int().min(1).optional(),
  perUserLimit: z.number().int().min(1).optional(),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
})

// ---- Admin ----

/**
 * Schema for the admin "update order status" action.
 * The `action: 'update-order-status'` literal routes to this handler.
 */
export const adminUpdateOrderSchema = z.object({
  action: z.literal('update-order-status'),
  id: z.string().min(1),
  data: z.object({
    status: z.enum(['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']),
    message: z.string().optional(),
  }),
})

/**
 * Schema for the admin "update product" action.
 * All data fields are optional — only supplied fields are patched.
 */
export const adminUpdateProductSchema = z.object({
  action: z.literal('update-product'),
  id: z.string().min(1),
  data: z.object({
    name: z.string().optional(),
    price: z.number().min(0).optional(),
    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
  }),
})

/**
 * Schema for the admin "toggle user active state" action.
 * Used to ban/unban user accounts.
 */
export const adminToggleUserSchema = z.object({
  action: z.literal('toggle-user'),
  id: z.string().min(1),
  data: z.object({
    isActive: z.boolean(),
  }),
})

/**
 * Schema for the admin "approve/reject review" action.
 * Moderators use this to control which reviews appear on the storefront.
 */
export const adminApproveReviewSchema = z.object({
  action: z.literal('approve-review'),
  id: z.string().min(1),
  data: z.object({
    isApproved: z.boolean(),
  }),
})

/**
 * Schema for the admin "update settings" action.
 * Accepts an arbitrary string-keyed record for flexibility — the actual
 * settings schema is enforced by the settings service.
 */
export const adminUpdateSettingsSchema = z.object({
  action: z.literal('update-settings'),
  data: z.record(z.string(), z.unknown()),
})

/**
 * Schema for the admin "create product" action.
 * Required fields: name, description, price, categoryId.
 * Optional fields: short description, compare-at price, brand, stock, images.
 */
export const adminCreateProductSchema = z.object({
  action: z.literal('create-product'),
  data: z.object({
    name: z.string().min(1),
    description: z.string().min(1),
    shortDesc: z.string().optional(),
    price: z.number().min(0),
    comparePrice: z.number().min(0).optional(),
    categoryId: z.string().min(1),
    brandId: z.string().optional(),
    stock: z.number().int().min(0).optional(),
    images: z.array(z.string()).optional(),
  }),
})

/**
 * Discriminated union of all admin panel actions.
 * The `action` field determines which sub-schema is used for validation,
 * following the same pattern as `authSchema`. This allows a single admin
 * API endpoint to handle multiple operations safely.
 */
export const adminActionSchema = z.discriminatedUnion('action', [
  adminUpdateOrderSchema,
  adminUpdateProductSchema,
  adminToggleUserSchema,
  adminApproveReviewSchema,
  adminUpdateSettingsSchema,
  adminCreateProductSchema,
])

// ---- Address ----

/**
 * Schema for creating a new saved address for a user.
 * Similar to `addressSchema` but includes `userId`, an optional `label`
 * (e.g. "Home", "Office"), and an `isDefault` flag to mark the primary
 * shipping address.
 */
export const createAddressSchema = z.object({
  userId: z.string().min(1),
  label: z.string().max(50).optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  street1: z.string().min(1),
  street2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().min(1),
  phone: z.string().optional(),
  isDefault: z.boolean().default(false),
})

// ---- Reviews ----

/**
 * Schema for creating a product review.
 * Rating is an integer from 1–5. Title and content are optional but
 * length-capped to prevent abuse.
 */
export const createReviewSchema = z.object({
  userId: z.string().min(1),
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  content: z.string().max(2000).optional(),
})
