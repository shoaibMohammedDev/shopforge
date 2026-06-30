/**
 * @file shared/validators/index.ts
 * @description Barrel export for all shared validators.
 */

export { loginSchema, registerSchema, authSchema } from './auth'
export { productQuerySchema } from './product'
export { orderItemSchema, addressSchema, createOrderSchema } from './order'
export { couponQuerySchema, createCouponSchema } from './coupon'
export {
  adminUpdateOrderSchema, adminUpdateProductSchema, adminToggleUserSchema,
  adminApproveReviewSchema, adminUpdateSettingsSchema, adminCreateProductSchema,
  adminActionSchema,
} from './admin'
export { createAddressSchema } from './address'
export { createReviewSchema } from './review'
