/**
 * @file admin-settings.tsx
 * @description Store settings page for the ShopForge admin panel. Provides
 * a form for managing global store configuration including store name,
 * tax rate, free shipping minimum, and currency selection. Settings are
 * fetched on mount and saved via the admin API.
 *
 * @keyfeatures
 * - Store name configuration
 * - Tax rate percentage input with validation (0-100)
 * - Free shipping minimum order amount
 * - Currency selection dropdown (USD, EUR, GBP, CAD, AUD, JPY, CNY)
 * - Save settings with loading spinner feedback
 * - Loading skeletons while settings are being fetched
 * - Toast notifications for save success/failure
 */
'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ============================================================================
// AdminSettingsContent
// ============================================================================

/**
 * @interface StoreSettings
 * @description Represents the store's configuration settings. Uses an index
 * signature to allow flexible key-value access for dynamic form handling.
 *
 * @property {string} [storeName] - The display name of the store
 * @property {number} [taxRate] - Tax rate percentage (0-100)
 * @property {number} [freeShippingMin] - Minimum order amount for free shipping
 * @property {string} [currency] - Store currency code (e.g. "USD", "EUR")
 */
interface StoreSettings {
  storeName?: string
  taxRate?: number
  freeShippingMin?: number
  currency?: string
  [key: string]: unknown
}

/**
 * @function AdminSettingsContent
 * @description Store settings content for the admin panel. Fetches the current
 * store settings on mount and provides a form for updating the store name,
 * tax rate, free shipping minimum, and currency. Saves changes via the
 * admin API with toast feedback.
 *
 * @state
 * - `settings` - StoreSettings object fetched from /api/admin?action=settings
 * - `loading` - boolean for initial data fetch state
 * - `saving` - boolean for the save settings API call loading state
 *
 * @remarks
 * - Settings are fetched once on component mount
 * - Form inputs update local state immediately; changes are persisted only on save
 * - Tax rate is validated to be between 0 and 100 via HTML min/max attributes
 * - Free shipping minimum of 0 means free shipping for all orders
 * - Currency selection supports 7 major world currencies
 */
export function AdminSettingsContent() {
  const [settings, setSettings] = useState<StoreSettings>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Fetch current store settings on component mount
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/admin?action=settings')
        if (!res.ok) throw new Error('Failed')
        const data = await res.json()
        setSettings(data)
      } catch (err) {
        console.error('Failed to fetch settings:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  /**
   * Handles saving the updated store settings. Sends a PUT request to the
   * admin API with the current settings values. Shows a success toast on
   * completion or an error toast on failure.
   */
  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-settings',
          data: {
            storeName: settings.storeName,
            taxRate: settings.taxRate,
            freeShippingMin: settings.freeShippingMin,
            currency: settings.currency,
          },
        }),
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'Settings saved successfully' })
    } catch {
      toast({ title: 'Failed to save settings', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // Loading state: skeleton placeholders matching the settings form layout
  if (loading) {
    return (
      <>
        <div className="max-w-2xl space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </>
    )
  }

  return (
    <>
      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Store Settings</CardTitle>
            <CardDescription>Manage your store configuration and preferences.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Store Name - display name for the e-commerce store */}
            <div className="grid gap-2">
              <Label htmlFor="store-name">Store Name</Label>
              <Input
                id="store-name"
                value={(settings.storeName as string) || ''}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, storeName: e.target.value }))
                }
                placeholder="ShopForge"
              />
            </div>

            {/* Tax Rate - percentage applied to all taxable orders */}
            <div className="grid gap-2">
              <Label htmlFor="tax-rate">Tax Rate (%)</Label>
              <Input
                id="tax-rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={settings.taxRate ?? ''}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    taxRate: parseFloat(e.target.value) || 0,
                  }))
                }
                placeholder="0.00"
              />
            </div>

            {/* Free Shipping Minimum - orders above this amount get free shipping */}
            <div className="grid gap-2">
              <Label htmlFor="free-shipping">Free Shipping Minimum ($)</Label>
              <Input
                id="free-shipping"
                type="number"
                step="0.01"
                min="0"
                value={settings.freeShippingMin ?? ''}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    freeShippingMin: parseFloat(e.target.value) || 0,
                  }))
                }
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500">
                Orders above this amount qualify for free shipping
              </p>
            </div>

            {/* Currency - determines the store's display currency */}
            <div className="grid gap-2">
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={(settings.currency as string) || 'USD'}
                onValueChange={(value) =>
                  setSettings((prev) => ({ ...prev, currency: value }))
                }
              >
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                  <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                  <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
                  <SelectItem value="CNY">CNY - Chinese Yuan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Save button - aligned to the right with minimum width */}
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving} className="min-w-[120px]">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
