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

interface StoreSettings {
  storeName?: string
  taxRate?: number
  freeShippingMin?: number
  currency?: string
  [key: string]: unknown
}

export function AdminSettingsContent() {
  const [settings, setSettings] = useState<StoreSettings>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

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
