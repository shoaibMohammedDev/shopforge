/**
 * @file modules/coupons/index.ts
 * @description Barrel export for the Coupons module.
 */
export { couponService } from './services/coupon.service'
export type {
  ValidateCouponRequestDTO, CreateCouponRequestDTO, CouponDTO, CouponValidationDTO,
} from './dto/coupon.dto'
