// ============================================================================
// ShopForge - Stripe Payment Service
// Abstraction layer for payment processing with Stripe
// Falls back to mock mode when Stripe keys are not configured
// ============================================================================

import { appConfig } from '@/lib/config'
import { paymentLogger, apiLogger } from '@/lib/logger'
import crypto from 'crypto'

export interface CreatePaymentIntentDTO {
  orderId: string
  amount: number
  currency?: string
  metadata?: Record<string, string>
}

export interface PaymentIntentResult {
  clientSecret: string
  paymentIntentId: string
  status: string
}

export interface WebhookEvent {
  type: string
  data: { object: Record<string, unknown> }
}

class StripeService {
  private stripe: unknown = null
  private isConfigured: boolean = false

  constructor() {
    this.isConfigured = appConfig.stripe.isConfigured
    if (this.isConfigured) {
      // Dynamically import Stripe only when configured
      try {
        const Stripe = require('stripe')
        this.stripe = new Stripe(appConfig.stripe.secretKey!, {
          apiVersion: '2024-06-20',
          typescript: true,
        })
        apiLogger.info('Stripe payment service initialized')
      } catch {
        this.isConfigured = false
        apiLogger.warn('Stripe package not available, using mock mode')
      }
    }
  }

  /**
   * Create a payment intent for an order
   */
  async createPaymentIntent(dto: CreatePaymentIntentDTO): Promise<PaymentIntentResult> {
    if (!this.isConfigured || !this.stripe) {
      return paymentLogger.measure('createPaymentIntent:mock', async () => ({
        clientSecret: `pi_mock_${crypto.randomUUID()}_secret_mock`,
        paymentIntentId: `pi_${crypto.randomUUID()}`,
        status: 'requires_payment_method',
      }))
    }

    return paymentLogger.measure('createPaymentIntent', async () => {
      const stripe = this.stripe as any
      const intent = await stripe.paymentIntents.create({
        amount: Math.round(dto.amount * 100), // Stripe expects cents
        currency: dto.currency || 'usd',
        metadata: {
          orderId: dto.orderId,
          ...dto.metadata,
        },
        automatic_payment_methods: { enabled: true },
      })

      paymentLogger.info('Payment intent created', {
        orderId: dto.orderId,
        intentId: intent.id,
        amount: dto.amount,
      })

      return {
        clientSecret: intent.client_secret,
        paymentIntentId: intent.id,
        status: intent.status,
      }
    })
  }

  /**
   * Confirm a payment was successful (called after Stripe webhook)
   */
  async confirmPayment(paymentIntentId: string): Promise<{ success: boolean; orderId?: string }> {
    if (!this.isConfigured || !this.stripe) {
      return { success: true } // Mock mode
    }

    const stripe = this.stripe as any
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (intent.status === 'succeeded') {
      paymentLogger.info('Payment confirmed', { paymentIntentId })
      return { success: true, orderId: intent.metadata?.orderId }
    }

    paymentLogger.warn('Payment not successful', { paymentIntentId, status: intent.status })
    return { success: false }
  }

  /**
   * Process a refund
   */
  async refundPayment(paymentIntentId: string, amount?: number): Promise<{ success: boolean; refundId?: string }> {
    if (!this.isConfigured || !this.stripe) {
      return { success: true, refundId: `re_mock_${crypto.randomUUID()}` }
    }

    const stripe = this.stripe as any
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined,
    })

    paymentLogger.info('Refund processed', { paymentIntentId, refundId: refund.id })
    return { success: true, refundId: refund.id }
  }

  /**
   * Verify Stripe webhook signature
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string): WebhookEvent | null {
    if (!this.isConfigured || !this.stripe) {
      return null
    }

    try {
      const stripe = this.stripe as any
      const event = stripe.webhooks.constructEvent(
        payload,
        signature,
        appConfig.stripe.webhookSecret!
      )
      return event as WebhookEvent
    } catch (err) {
      paymentLogger.error('Webhook signature verification failed', {
        error: err instanceof Error ? err.message : 'Unknown error',
      })
      return null
    }
  }
}

export const stripeService = new StripeService()
