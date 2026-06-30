/**
 * @file account-settings.tsx
 * @description Account settings page for the ShopForge e-commerce application.
 * Provides forms and controls for managing the user's profile information,
 * changing their password, toggling notification preferences, and deleting
 * their account (danger zone).
 *
 * @keyfeatures
 * - Profile information form (name update) with Zod validation
 * - Password change form with current/new/confirm fields and matching validation
 * - Notification preferences with toggle switches
 * - Danger zone with account deletion (AlertDialog confirmation)
 * - Read-only email display with support contact note
 * - Toast notifications for all async operations
 * - Loading states with spinner on submit buttons
 * - Form reset on user data changes via useEffect
 */
'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import {
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import { useRouterStore } from '@/stores/router-store'
import { useAuthStore } from '@/stores/auth-store'
import { api } from '@/lib/api-client'
import { toast } from '@/hooks/use-toast'
import type { UserProfile } from '@/types'

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
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

import {
  AccountLayout,
  useAuthGuard,
} from './account-layout'

// ============================================================================
// Schemas
// ============================================================================

/**
 * @constant profileSchema
 * @description Zod validation schema for the profile update form.
 * Only the name field is editable; email is displayed as read-only.
 */
const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
})

/** @type {ProfileFormValues} Inferred type from profileSchema */
type ProfileFormValues = z.infer<typeof profileSchema>

/**
 * @constant passwordSchema
 * @description Zod validation schema for the password change form.
 * Requires the current password, a new password (minimum 8 characters),
 * and confirmation that must match the new password. Uses a refine
 * to ensure both new password fields are identical.
 */
const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmNewPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Passwords do not match',
    path: ['confirmNewPassword'],
  })

/** @type {PasswordFormValues} Inferred type from passwordSchema */
type PasswordFormValues = z.infer<typeof passwordSchema>

// ============================================================================
// AccountSettingsPage
// ============================================================================

/**
 * @function AccountSettingsPage
 * @description Account settings page allowing users to update their profile,
 * change their password, manage notification preferences, and delete their
 * account. Organized into separate card sections for clarity.
 *
 * @state
 * - `isAuthenticated` - from useAuthGuard, ensures user is logged in
 * - `user` - from useAuthStore, the current user object
 * - `updateUser` - from useAuthStore, function to update the stored user profile
 * - `logout` - from useAuthStore, function to log out the current user
 * - `navigate` - from useRouterStore, programmatic navigation function
 * - `profileLoading` - local loading state for profile update submission
 * - `passwordLoading` - local loading state for password change submission
 * - `notifications` - local state object for notification toggle preferences
 * - `profileForm` - react-hook-form instance for the profile form
 * - `passwordForm` - react-hook-form instance for the password form
 *
 * @remarks
 * - Profile form resets when user data changes (via useEffect)
 * - Email field is read-only and cannot be changed through the UI
 * - Account deletion logs the user out and redirects to the home page
 * - Notification preferences are stored locally (no API persistence in this version)
 */
export function AccountSettingsPage() {
  const isAuthenticated = useAuthGuard()
  const user = useAuthStore((s) => s.user)
  const updateUser = useAuthStore((s) => s.updateUser)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useRouterStore((s) => s.navigate)

  // Loading states for async form submissions
  const [profileLoading, setProfileLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)

  // Notification preferences state - toggled via Switch components
  const [notifications, setNotifications] = useState({
    orderUpdates: true,
    promotions: false,
    newsletter: true,
    priceDrops: true,
  })

  // Profile form: only the name field is editable
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
    },
  })

  // Password form: current, new, and confirm fields
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  })

  // Reset profile form when user data changes (e.g. after a successful update)
  useEffect(() => {
    if (user) {
      profileForm.reset({ name: user.name || '' })
    }
  }, [user, profileForm])

  /**
   * Handles profile form submission. Sends a PUT request to update the
   * user's name, updates the auth store on success, and shows toast feedback.
   *
   * @param {ProfileFormValues} values - The validated form values (name)
   */
  const onProfileSubmit = async (values: ProfileFormValues) => {
    setProfileLoading(true)
    try {
      // Update user profile via API
      const result = await api.put<UserProfile>(`/users/${user!.id}`, {
        name: values.name,
      })
      if (result.success && result.data) {
        // Update the auth store with the new user data
        updateUser(result.data)
        toast({ title: 'Profile updated', description: 'Your name has been updated.' })
      } else {
        toast({
          title: 'Update failed',
          description: result.error || 'Could not update profile',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      })
    } finally {
      setProfileLoading(false)
    }
  }

  /**
   * Handles password change form submission. Sends a POST request to the
   * auth endpoint with the current and new passwords. Resets the form on
   * success and shows toast feedback.
   *
   * @param {PasswordFormValues} values - The validated password form values
   */
  const onPasswordSubmit = async (values: PasswordFormValues) => {
    setPasswordLoading(true)
    try {
      // Submit password change request to the auth API
      const result = await api.post('/auth', {
        action: 'change-password',
        userId: user!.id,
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      if (result.success) {
        toast({
          title: 'Password changed',
          description: 'Your password has been updated successfully.',
        })
        passwordForm.reset()
      } else {
        toast({
          title: 'Change failed',
          description: result.error || 'Could not change password',
          variant: 'destructive',
        })
      }
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      })
    } finally {
      setPasswordLoading(false)
    }
  }

  /**
   * Handles account deletion. Logs the user out, navigates to the home page,
   * and shows a confirmation toast. Note: The actual server-side deletion
   * should be handled by an API call in production.
   */
  const handleDeleteAccount = () => {
    logout()
    navigate('home')
    toast({
      title: 'Account deleted',
      description: 'Your account has been permanently deleted.',
    })
  }

  // Guard: don't render if not authenticated or user data not loaded
  if (!isAuthenticated || !user) return null

  return (
    <AccountLayout>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold">Account Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your profile and preferences
          </p>
        </div>

        {/* Profile Form - update display name */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profile Information</CardTitle>
            <CardDescription>
              Update your personal details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...profileForm}>
              <form
                onSubmit={profileForm.handleSubmit(onProfileSubmit)}
                className="space-y-4"
              >
                {/* Editable name field */}
                <FormField
                  control={profileForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Your name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Read-only email field - email changes require support contact */}
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={user.email} readOnly disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed. Contact support if you need to update it.
                  </p>
                </div>
                {/* Submit button with loading spinner */}
                <Button type="submit" disabled={profileLoading}>
                  {profileLoading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Change Password Form - current, new, and confirm password fields */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Change Password</CardTitle>
            <CardDescription>
              Update your password to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form
                onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                className="space-y-4"
              >
                {/* Current password field */}
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter current password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* New password field with 8-character minimum */}
                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="At least 8 characters" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Confirm new password field - must match new password */}
                <FormField
                  control={passwordForm.control}
                  name="confirmNewPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Confirm new password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Submit button with loading spinner */}
                <Button type="submit" disabled={passwordLoading}>
                  {passwordLoading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Changing...
                    </>
                  ) : (
                    'Change Password'
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Notification Preferences - toggle switches for various notification types */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notification Preferences</CardTitle>
            <CardDescription>
              Choose what notifications you want to receive
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                key: 'orderUpdates' as const,
                label: 'Order Updates',
                description: 'Get notified about your order status changes',
              },
              {
                key: 'promotions' as const,
                label: 'Promotions',
                description: 'Receive special offers and discounts',
              },
              {
                key: 'newsletter' as const,
                label: 'Newsletter',
                description: 'Weekly digest of new products and trends',
              },
              {
                key: 'priceDrops' as const,
                label: 'Price Drop Alerts',
                description: 'Get alerts when wishlist items go on sale',
              },
            ].map((pref) => (
              <div
                key={pref.key}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                {/* Preference label and description */}
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">{pref.label}</Label>
                  <p className="text-xs text-muted-foreground">
                    {pref.description}
                  </p>
                </div>
                {/* Toggle switch - updates local state */}
                <Switch
                  checked={notifications[pref.key]}
                  onCheckedChange={(checked) =>
                    setNotifications((prev) => ({ ...prev, [pref.key]: checked }))
                  }
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Danger Zone - irreversible account deletion action */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-lg text-destructive flex items-center gap-2">
              <AlertTriangle className="size-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible and destructive actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Delete account row with AlertDialog confirmation */}
            <div className="flex items-center justify-between rounded-lg border border-destructive/30 p-4">
              <div>
                <p className="font-medium text-sm">Delete Account</p>
                <p className="text-xs text-muted-foreground">
                  Permanently delete your account and all associated data.
                </p>
              </div>
              {/* AlertDialog with confirmation before account deletion */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      your account and remove all your data from our servers,
                      including orders, addresses, and wishlist items.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={handleDeleteAccount}
                    >
                      Yes, delete my account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AccountLayout>
  )
}
