/**
 * @file shared/types/address.ts
 * @description Address domain type definitions.
 */

/** Saved shipping/billing address. */
export interface AddressDisplay {
  id: string
  label: string | null
  firstName: string
  lastName: string
  street1: string
  street2: string | null
  city: string
  state: string
  postalCode: string
  country: string
  phone: string | null
  isDefault: boolean
}
