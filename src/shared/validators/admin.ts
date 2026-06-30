/**
 * @file shared/validators/admin.ts
 * @description Zod validation schemas for admin panel payloads.
 */
import { z } from 'zod/v4'

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
    name: z.string().optional(), price: z.number().min(0).optional(),
    isActive: z.boolean().optional(), isFeatured: z.boolean().optional(),
  }),
})

export const adminToggleUserSchema = z.object({
  action: z.literal('toggle-user'),
  id: z.string().min(1),
  data: z.object({ isActive: z.boolean() }),
})

export const adminApproveReviewSchema = z.object({
  action: z.literal('approve-review'),
  id: z.string().min(1),
  data: z.object({ isApproved: z.boolean() }),
})

export const adminUpdateSettingsSchema = z.object({
  action: z.literal('update-settings'),
  data: z.record(z.string(), z.unknown()),
})

export const adminCreateProductSchema = z.object({
  action: z.literal('create-product'),
  data: z.object({
    name: z.string().min(1), description: z.string().min(1),
    shortDesc: z.string().optional(), price: z.number().min(0),
    comparePrice: z.number().min(0).optional(), categoryId: z.string().min(1),
    brandId: z.string().optional(), stock: z.number().int().min(0).optional(),
    images: z.array(z.string()).optional(),
  }),
})

export const adminActionSchema = z.discriminatedUnion('action', [
  adminUpdateOrderSchema, adminUpdateProductSchema, adminToggleUserSchema,
  adminApproveReviewSchema, adminUpdateSettingsSchema, adminCreateProductSchema,
])
