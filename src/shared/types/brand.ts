/**
 * @file shared/types/brand.ts
 * @description Brand domain type definitions.
 */

/** Product brand with product count. */
export interface BrandDisplay {
  id: string
  name: string
  slug: string
  logo: string | null
  isActive: boolean
  _count?: {
    products: number
  }
}
