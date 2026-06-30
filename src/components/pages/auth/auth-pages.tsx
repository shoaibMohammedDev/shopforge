/**
 * @file auth-pages.tsx
 * @description Authentication page components for the ShopForge e-commerce application.
 * Provides both Login and Register forms with validation, API integration,
 * and animated transitions for a polished authentication experience.
 *
 * @keyfeatures
 * - Login form with email/password authentication and "Remember me" option
 * - Register form with name, email, password, and confirm password fields
 * - Zod schema validation with react-hook-form integration
 * - Password visibility toggle (show/hide) for all password fields
 * - API authentication via /auth endpoint with login/register action differentiation
 * - Toast notifications for success and error states
 * - Social login placeholder (Google — coming soon, disabled)
 * - Cross-navigation between login and register pages
 * - Framer Motion fade-in-up entrance animations
 * - Responsive centered card layout with ShopForge branding
 */

'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod/v4'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import {
  ShoppingBag,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Loader2,
  Chrome,
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
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Zod validation schema for the login form.
 * Requires a valid email and a non-empty password.
 * The "rememberMe" checkbox is optional and defaults to false.
 */
const loginSchema = z.object({
  email: z.email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
})

/** Inferred TypeScript type from the login Zod schema */
type LoginFormValues = z.infer<typeof loginSchema>

/**
 * Zod validation schema for the registration form.
 * Validates name (min 2 chars), email, password (min 8 chars),
 * and password confirmation. Uses a refine() to ensure passwords match.
 */
const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

/** Inferred TypeScript type from the register Zod schema */
type RegisterFormValues = z.infer<typeof registerSchema>

// ============================================================================
// Animations
// ============================================================================

/**
 * Shared Framer Motion animation variant for the auth card entrance.
 * Applies a fade-in with upward slide for a smooth page transition effect.
 */
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
}

// ============================================================================
// LoginPage
// ============================================================================

/**
 * LoginPage renders the sign-in form for existing users.
 * Provides email/password authentication with optional "Remember me",
 * a password visibility toggle, and a placeholder Google social login button.
 * On successful login, the user profile is stored in the auth store and
 * the user is redirected to the home page.
 *
 * @state showPassword - Controls password field visibility toggle (text vs. password input)
 * @state isLoading    - Whether the login API request is currently in flight
 *
 * @store login   - Auth store action to save the authenticated user profile
 * @store navigate - Router store action for page navigation
 */
export function LoginPage() {
  const navigate = useRouterStore((s) => s.navigate)
  const login = useAuthStore((s) => s.login)
  /** Toggle between masked and visible password input */
  const [showPassword, setShowPassword] = useState(false)
  /** Loading state during the authentication API call */
  const [isLoading, setIsLoading] = useState(false)

  // Initialize the login form with Zod resolver and default values
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  })

  /**
   * Handles login form submission.
   * Sends credentials to the /auth API endpoint with a "login" action.
   * On success, stores the user profile in the auth store, shows a welcome toast,
   * and navigates to the home page. On failure, displays an error toast.
   *
   * @param values - Validated form values containing email, password, and rememberMe
   */
  const onSubmit = async (values: LoginFormValues) => {
    // Set loading state
    setIsLoading(true)
    try {
      // Call the authentication API with login action
      const result = await api.post<{ user: UserProfile }>('/auth', {
        action: 'login',
        email: values.email,
        password: values.password,
      })

      if (result.success && result.data) {
        // Login successful — store user profile and navigate home
        login(result.data.user)
        toast({
          title: 'Welcome back!',
          description: 'You have been logged in successfully.',
        })
        navigate('home')
      } else {
        // API returned a failure — display the error message
        toast({
          title: 'Login failed',
          description: result.error || 'Invalid email or password',
          variant: 'destructive',
        })
      }
    } catch {
      // Network or unexpected error
      toast({
        title: 'Login failed',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      })
    } finally {
      // Always clear loading state
      setIsLoading(false)
    }
  }

  return (
    /* Full-height centered container for the login card */
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <motion.div {...fadeInUp} className="w-full max-w-md">
        <Card className="border shadow-lg">
          {/* Card header with ShopForge branding and welcome message */}
          <CardHeader className="text-center space-y-4 pb-6">
            {/* ShopForge logo and brand name */}
            <div className="flex justify-center">
              <div className="flex items-center gap-2 text-primary">
                <ShoppingBag className="size-8" />
                <span className="text-2xl font-bold">ShopForge</span>
              </div>
            </div>
            <div>
              <CardTitle className="text-xl">Welcome back</CardTitle>
              <CardDescription>
                Sign in to your account to continue
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Email input field with envelope icon */}
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-9"
                    {...form.register('email')}
                  />
                </div>
                {/* Email validation error message */}
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              {/* Password input field with lock icon and visibility toggle */}
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    className="pl-9 pr-9"
                    {...form.register('password')}
                  />
                  {/* Toggle button to show/hide password characters */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                {/* Password validation error message */}
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              {/* Remember me checkbox and forgot password link */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember-me"
                    onCheckedChange={(checked) =>
                      form.setValue('rememberMe', checked === true)
                    }
                  />
                  <Label
                    htmlFor="remember-me"
                    className="text-sm text-muted-foreground cursor-pointer"
                  >
                    Remember me
                  </Label>
                </div>
                {/* Forgot password link — placeholder for future functionality */}
                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              {/* Login submit button — shows spinner while loading */}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            {/* Divider with "OR CONTINUE WITH" text */}
            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                OR CONTINUE WITH
              </span>
            </div>

            {/* Social login button — Google (disabled, coming soon) */}
            <Button
              variant="outline"
              className="w-full"
              disabled
              title="Social login coming soon"
            >
              <Chrome className="mr-2 size-4" />
              Continue with Google
            </Button>
          </CardContent>

          {/* Footer with link to register page */}
          <CardFooter className="justify-center pb-6">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                className="text-primary hover:underline font-medium"
                onClick={() => navigate('register')}
              >
                Sign up
              </button>
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}

// ============================================================================
// RegisterPage
// ============================================================================

/**
 * RegisterPage renders the sign-up form for new users.
 * Collects name, email, password, and password confirmation with validation.
 * Includes individual password visibility toggles for both password fields.
 * On successful registration, the user is automatically logged in and
 * redirected to the home page.
 *
 * @state showPassword        - Controls visibility toggle for the password field
 * @state showConfirmPassword - Controls visibility toggle for the confirm password field
 * @state isLoading           - Whether the registration API request is currently in flight
 *
 * @store login    - Auth store action to save the authenticated user profile (auto-login after register)
 * @store navigate - Router store action for page navigation
 */
export function RegisterPage() {
  const navigate = useRouterStore((s) => s.navigate)
  const login = useAuthStore((s) => s.login)
  /** Toggle between masked and visible password input */
  const [showPassword, setShowPassword] = useState(false)
  /** Toggle between masked and visible confirm password input */
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  /** Loading state during the registration API call */
  const [isLoading, setIsLoading] = useState(false)

  // Initialize the register form with Zod resolver and default values
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  /**
   * Handles registration form submission.
   * Sends the user's name, email, and password to the /auth API endpoint
   * with a "register" action. On success, automatically logs the user in
   * (stores profile in auth store), shows a welcome toast, and navigates
   * to the home page. On failure, displays an error toast.
   *
   * @param values - Validated form values containing name, email, password, and confirmPassword
   */
  const onSubmit = async (values: RegisterFormValues) => {
    // Set loading state
    setIsLoading(true)
    try {
      // Call the authentication API with register action
      const result = await api.post<{ user: UserProfile }>('/auth', {
        action: 'register',
        email: values.email,
        password: values.password,
        name: values.name,
      })

      if (result.success && result.data) {
        // Registration successful — auto-login and navigate home
        login(result.data.user)
        toast({
          title: 'Account created!',
          description: 'Welcome to ShopForge. You are now signed in.',
        })
        navigate('home')
      } else {
        // API returned a failure — display the error message
        toast({
          title: 'Registration failed',
          description: result.error || 'Could not create account',
          variant: 'destructive',
        })
      }
    } catch {
      // Network or unexpected error
      toast({
        title: 'Registration failed',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      })
    } finally {
      // Always clear loading state
      setIsLoading(false)
    }
  }

  return (
    /* Full-height centered container for the register card */
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <motion.div {...fadeInUp} className="w-full max-w-md">
        <Card className="border shadow-lg">
          {/* Card header with ShopForge branding and create account message */}
          <CardHeader className="text-center space-y-4 pb-6">
            {/* ShopForge logo and brand name */}
            <div className="flex justify-center">
              <div className="flex items-center gap-2 text-primary">
                <ShoppingBag className="size-8" />
                <span className="text-2xl font-bold">ShopForge</span>
              </div>
            </div>
            <div>
              <CardTitle className="text-xl">Create an account</CardTitle>
              <CardDescription>
                Start shopping with ShopForge today
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Full name input field with user icon */}
              <div className="space-y-2">
                <Label htmlFor="register-name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="register-name"
                    type="text"
                    placeholder="John Doe"
                    className="pl-9"
                    {...form.register('name')}
                  />
                </div>
                {/* Name validation error message */}
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              {/* Email input field with envelope icon */}
              <div className="space-y-2">
                <Label htmlFor="register-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-9"
                    {...form.register('email')}
                  />
                </div>
                {/* Email validation error message */}
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              {/* Password input field with lock icon and visibility toggle */}
              <div className="space-y-2">
                <Label htmlFor="register-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 8 characters"
                    className="pl-9 pr-9"
                    {...form.register('password')}
                  />
                  {/* Toggle button to show/hide password characters */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                {/* Password validation error message */}
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.password.message}
                  </p>
                )}
              </div>

              {/* Confirm password field with lock icon and visibility toggle */}
              <div className="space-y-2">
                <Label htmlFor="register-confirm-password">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="register-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    className="pl-9 pr-9"
                    {...form.register('confirmPassword')}
                  />
                  {/* Toggle button to show/hide confirm password characters */}
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                {/* Confirm password validation error message (includes mismatch check) */}
                {form.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>

              {/* Register submit button — shows spinner while loading */}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>
          </CardContent>

          {/* Footer with link to login page for existing users */}
          <CardFooter className="justify-center pb-6">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <button
                type="button"
                className="text-primary hover:underline font-medium"
                onClick={() => navigate('login')}
              >
                Sign in
              </button>
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}
