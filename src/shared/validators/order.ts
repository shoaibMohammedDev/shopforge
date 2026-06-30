/**
 * @file shared/validators/order.ts
 * @description Zod validation schemas for order payloads.
 */
import { z } from 'zod/v4'

export const orderItemSchema = z.object({
  productId: z.string().min(1), variantId: z.string().optional(),
  productName: z.string().min(1), variantName: z.string().optional(),
  sku: z.string().min(1), price: z.number().min(0),
  quantity: z.number().int().min(1), total: z.number().min(0),
  image: z.string().optional(),
})

export const addressSchema = z.object({
  firstName: z.string().min(1), lastName: z.string().min(1),
  street1: z.string().min(1), street2: z.string().optional(),
  city: z.string().min(1), state: z.string().min(1),
  postalCode: z.string().min(1), country: z.string().min(1),
  phone: z.string().optional(),
})

export const createOrderSchema = z.object({
  userId: z.string().min(1),
  items: z.array(orderItemSchema).min(1, 'Order must have at least one item'),
  shippingAddress: addressSchema, billingAddress: addressSchema,
  shippingMethod: z.enum(['Standard', 'Express']).default('Standard'),
  subtotal: z.number().min(0), taxAmount: z.number().min(0),
  shippingAmount: z.number().min(0), discountAmount: z.number().min(0),
  totalAmount: z.number().min(0), couponId: z.string().optional(),
})
