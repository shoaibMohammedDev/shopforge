/**
 * @file shared/types/banner.ts
 * @description Banner domain type definitions.
 */

/** Promotional banner for homepage carousel. */
export interface BannerDisplay {
  id: string
  title: string
  subtitle: string | null
  image: string
  link: string | null
  buttonText: string | null
  position: 'hero' | 'sidebar' | 'promo-bar' | 'popup'
  isActive: boolean
  sortOrder: number
}
