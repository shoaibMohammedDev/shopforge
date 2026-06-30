/**
 * @file shared/validators/review.ts
 * @description Zod validation schemas for review payloads.
 */
import { z } from 'zod/v4'

export const createReviewSchema = z.object({
  userId: z.string().min(1), productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(), content: z.string().max(2000).optional(),
})
