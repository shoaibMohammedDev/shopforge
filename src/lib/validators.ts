// ============================================================================
// ShopForge - Zod Validation Schemas for API Routes
// ============================================================================

import { z } from 'zod/v4'

// ---- Auth ----
export const loginSchema = z.object({
  action: z.literal('login'),
  email: z.email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const registerSchema = z.object({
  action: z.literal('register'),
  email: z.email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100),
})

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
export const productQuerySchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  minRating: z.coerce.number().min(1).max(5).optional(),
  sort: z.enum(['newest', 'price-asc', 'price-desc', 'rating', 'popular']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12),
  isFeatured: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
  tag: z.string().optional(),
})

// ---- Orders ----
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
export const couponQuerySchema = z.object({
  code: z.string().min(1),
  subtotal: z.coerce.number().min(0),
})

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
export const adminUpdateOrderSchema = z.object({
  action: z.literal('update-order-status'),
  id: z.string().min(1),
  data: z.object({
    status: z.enum(['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']),
    message: z.string().optional(),
  }),
})

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

export const adminToggleUserSchema = z.object({
  action: z.literal('toggle-user'),
  id: z.string().min(1),
  data: z.object({
    isActive: z.boolean(),
  }),
})

export const adminApproveReviewSchema = z.object({
  action: z.literal('approve-review'),
  id: z.string().min(1),
  data: z.object({
    isApproved: z.boolean(),
  }),
})

export const adminUpdateSettingsSchema = z.object({
  action: z.literal('update-settings'),
  data: z.record(z.unknown()),
})

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

export const adminActionSchema = z.discriminatedUnion('action', [
  adminUpdateOrderSchema,
  adminUpdateProductSchema,
  adminToggleUserSchema,
  adminApproveReviewSchema,
  adminUpdateSettingsSchema,
  adminCreateProductSchema,
])

// ---- Address ----
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
export const createReviewSchema = z.object({
  userId: z.string().min(1),
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  content: z.string().max(2000).optional(),
})
