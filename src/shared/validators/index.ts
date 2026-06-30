/**
 * @file shared/validators/index.ts
 * @description Barrel export for shared Zod validation schemas.
 * Only exports schemas that are actively consumed by API routes.
 */

export { loginSchema, registerSchema, authSchema } from './auth'
export { productQuerySchema } from './product'
export { orderItemSchema, addressSchema, createOrderSchema } from './order'
export { couponQuerySchema, createCouponSchema } from './coupon'
