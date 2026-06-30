/**
 * @file shared/validators/product.ts
 * @description Zod validation schemas for product queries.
 */
import { z } from 'zod/v4'

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
