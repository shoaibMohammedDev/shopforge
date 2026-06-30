/**
 * @file shared/constants/user.ts
 * @description User-related constants.
 */

export const USER_ROLES = { CUSTOMER: 'CUSTOMER', ADMIN: 'ADMIN', SUPER_ADMIN: 'SUPER_ADMIN' } as const
export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES]
