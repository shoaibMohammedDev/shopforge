/**
 * @file shared/validators/address.ts
 * @description Zod validation schemas for address payloads.
 */
import { z } from 'zod/v4'

export const createAddressSchema = z.object({
  userId: z.string().min(1), label: z.string().max(50).optional(),
  firstName: z.string().min(1), lastName: z.string().min(1),
  street1: z.string().min(1), street2: z.string().optional(),
  city: z.string().min(1), state: z.string().min(1),
  postalCode: z.string().min(1), country: z.string().min(1),
  phone: z.string().optional(), isDefault: z.boolean().default(false),
})
