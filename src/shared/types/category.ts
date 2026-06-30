/**
 * @file shared/types/category.ts
 * @description Category domain type definitions.
 */

/** Product category with nested children. */
export interface CategoryDisplay {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  parentId: string | null
  isActive: boolean
  sortOrder: number
  _count?: {
    products: number
  }
  children?: CategoryDisplay[]
}
