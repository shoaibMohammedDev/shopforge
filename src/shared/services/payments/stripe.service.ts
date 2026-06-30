/**
 * @file payments/stripe.service.ts
 * @description Stripe payment integration service for ShopForge.
 *   Wraps the Stripe SDK to provide payment intent creation, payment
 *   confirmation, refund processing, and webhook signature verification.
 *   When Stripe API keys are not configured, every method transparently
 *   falls back to **mock mode**, returning realistic-looking IDs so the
 *   application remains fully functional for local development and testing.
 *
 * Key Responsibilities:
 *   - Create Stripe PaymentIntents for checkout flows
 *   - Confirm successful payments (typically triggered by webhooks)
 *   - Process full or partial refunds
 *   - Verify webhook signatures to reject forged requests
 *   - Provide mock responses when Stripe is not configured
 */

import { appConfig } from "@/shared/lib/config"
import { paymentLogger, apiLogger } from "@/shared/lib/logger"
import crypto from 'crypto'

/**
 * Data transfer object for creating a new PaymentIntent.
 * Maps to the parameters required by `stripe.paymentIntents.create()`.
 */
export interface CreatePaymentIntentDTO {
  /** Internal order ID to link the Stripe PaymentIntent back to our order. */
  orderId: string
  /** Payment amount in the store's display currency (e.g. 29.99). Converted to cents internally. */
  amount: number
  /** Three-letter ISO currency code. Defaults to "usd". */
  currency?: string
  /** Arbitrary key-value metadata stored on the Stripe PaymentIntent for auditing. */
  metadata?: Record<string, string>
}

/**
 * Result returned after creating a PaymentIntent.
 * The `clientSecret` is sent to the front-end to initialise Stripe Elements.
 */
export interface PaymentIntentResult {
  /** Client secret used by the front-end to confirm the payment. */
  clientSecret: string
  /** Stripe PaymentIntent ID (e.g. "pi_3Ox…"). */
  paymentIntentId: string
  /** Current status of the PaymentIntent (e.g. "requires_payment_method"). */
  status: string
}

/**
 * Minimal representation of a Stripe webhook event.
 * Only the fields consumed by our webhook handler are typed.
 */
export interface WebhookEvent {
  /** Event type string (e.g. "payment_intent.succeeded"). */
  type: string
  /** The Stripe object that triggered the event. */
  data: { object: Record<string, unknown> }
}

/**
 * StripeService — singleton service encapsulating all Stripe interactions.
 *
 * On construction, it attempts to import and instantiate the Stripe SDK.
 * If the SDK is not installed or the API keys are missing, `isConfigured`
 * is set to `false` and all methods return mock data.
 */
class StripeService {
  /** Stripe SDK instance (typed as `unknown` to avoid hard dependency). */
  private stripe: unknown = null
  /** `true` when Stripe keys are present and the SDK was loaded successfully. */
  private isConfigured: boolean = false

  constructor() {
    this.isConfigured = appConfig.stripe.isConfigured
    if (this.isConfigured) {
      // Dynamically import Stripe only when configured
      // Using require() because Stripe's SDK uses CommonJS and our bundler
      // may tree-shake dynamic import() in certain configurations
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
   * Create a Stripe PaymentIntent for the given order.
   *
   * In live mode, the PaymentIntent is created on Stripe's servers and
   * the `clientSecret` is returned for front-end confirmation. In mock
   * mode, deterministic-looking IDs are generated locally so the checkout
   * flow can be tested end-to-end without Stripe credentials.
   *
   * @param dto - Payment intent creation parameters.
   * @returns A `PaymentIntentResult` containing the client secret, intent ID, and status.
   */
  async createPaymentIntent(dto: CreatePaymentIntentDTO): Promise<PaymentIntentResult> {
    if (!this.isConfigured || !this.stripe) {
      // Mock mode: return plausible IDs so the front-end checkout flow works
      return paymentLogger.measure('createPaymentIntent:mock', async () => ({
        clientSecret: `pi_mock_${crypto.randomUUID()}_secret_mock`,
        paymentIntentId: `pi_${crypto.randomUUID()}`,
        status: 'requires_payment_method',
      }))
    }

    return paymentLogger.measure('createPaymentIntent', async () => {
      const stripe = this.stripe as any
      const intent = await stripe.paymentIntents.create({
        // Stripe expects amounts in the smallest currency unit (cents for USD)
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
   * Confirm that a PaymentIntent has succeeded.
   *
   * Typically called from a webhook handler after Stripe sends a
   * `payment_intent.succeeded` event. Retrieves the intent from Stripe
   * and checks its status.
   *
   * @param paymentIntentId - The Stripe PaymentIntent ID to check.
   * @returns An object with `success: true` and the linked `orderId` if the
   *          payment succeeded, or `success: false` otherwise.
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
   * Process a full or partial refund for a previously captured payment.
   *
   * When `amount` is omitted, Stripe issues a full refund. When provided,
   * the amount must be in the **display currency** (e.g. 10.00 for a
   * $10 refund); it is converted to cents before sending to Stripe.
   *
   * @param paymentIntentId - The Stripe PaymentIntent ID to refund.
   * @param amount          - Optional refund amount in display currency. Omit for a full refund.
   * @returns An object with `success: true` and the Stripe refund ID, or `success: false`.
   */
  async refundPayment(paymentIntentId: string, amount?: number): Promise<{ success: boolean; refundId?: string }> {
    if (!this.isConfigured || !this.stripe) {
      // Mock mode: return a plausible refund ID
      return { success: true, refundId: `re_mock_${crypto.randomUUID()}` }
    }

    const stripe = this.stripe as any
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      // Convert display-currency amount to cents if specified; otherwise
      // omit to let Stripe issue a full refund automatically
      amount: amount ? Math.round(amount * 100) : undefined,
    })

    paymentLogger.info('Refund processed', { paymentIntentId, refundId: refund.id })
    return { success: true, refundId: refund.id }
  }

  /**
   * Verify the signature of an incoming Stripe webhook request.
   *
   * Stripe signs every webhook payload with a secret shared at webhook
   * registration. This method reconstructs the signature using the raw
   * request body and the configured webhook secret, then compares it
   * against the `Stripe-Signature` header. If the signatures match, the
   * payload is authentic; otherwise it should be rejected (4xx).
   *
   * @param payload   - Raw request body (string or Buffer) as received from Stripe.
   * @param signature - Value of the `Stripe-Signature` header.
   * @returns The parsed `WebhookEvent` if the signature is valid, or `null` if
   *          verification fails or Stripe is not configured.
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

/** Singleton StripeService instance used throughout the application. */
export const stripeService = new StripeService()
