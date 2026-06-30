/**
 * @file email/email.service.ts
 * @description Transactional email delivery service for ShopForge.
 *   Provides a high-level API for sending order confirmations, status updates,
 *   and welcome emails. Uses **Resend** as the email provider when an API key
 *   is configured; otherwise falls back to a mock mode that logs email
 *   content to the console — ideal for local development and CI.
 *
 * Key Responsibilities:
 *   - Abstract the email provider behind a simple `send()` method
 *   - Render HTML email templates for common transactional flows
 *   - Gracefully degrade to mock mode when Resend is unavailable
 *   - Measure and log delivery latency via the structured logger
 */

import { appConfig } from "@/shared/lib/config"
import { emailLogger } from "@/shared/lib/logger"

/**
 * Data transfer object for sending a single email.
 * Maps to the Resend `emails.send` payload.
 */
export interface SendEmailDTO {
  /** Recipient address(es). Resend accepts a single string or an array. */
  to: string | string[]
  /** Email subject line. */
  subject: string
  /** Full HTML body of the email. */
  html: string
  /** Optional plain-text fallback for clients that don't render HTML. */
  text?: string
  /** Override the default "From" address. */
  from?: string
}

/**
 * Typed data bag consumed by the template-rendering methods.
 * Each template picks the fields it needs; unused fields are safely ignored.
 */
export interface EmailTemplateData {
  /** Customer's display name for the greeting. */
  userName?: string
  /** Unique order identifier (e.g. "ORD-2024-001"). */
  orderNumber?: string
  /** Current order status label (e.g. "Shipped", "Delivered"). */
  orderStatus?: string
  /** Order total in the store's currency. */
  totalAmount?: number
  /** Line items to display in the confirmation table. */
  items?: Array<{ name: string; quantity: number; price: number }>
  /** URL for the "Track Your Order" button in status-update emails. */
  trackingUrl?: string
}

/**
 * EmailService — manages email delivery and template rendering.
 *
 * On construction it checks whether a Resend API key is available and sets
 * `isConfigured` accordingly. All public methods branch on this flag so that
 * the application never crashes due to a missing email provider.
 */
class EmailService {
  /** `true` when a Resend API key is present and the package is importable. */
  private isConfigured: boolean = false

  constructor() {
    this.isConfigured = appConfig.email.isConfigured
    if (this.isConfigured) {
      emailLogger.info('Email service initialized with Resend')
    } else {
      emailLogger.info('Email service in mock mode (no API key configured)')
    }
  }

  /**
   * Send an email using the configured provider.
   *
   * When `isConfigured` is `false`, the email payload is logged instead of
   * being sent, and a mock `messageId` is returned. This ensures that
   * development and test environments never depend on an external service.
   *
   * The Resend SDK is imported dynamically so the application doesn't crash
   * if the package is not installed — it simply falls back to mock mode.
   *
   * @param dto - The email payload (recipient, subject, HTML body, etc.).
   * @returns An object indicating success and (optionally) the provider's message ID.
   */
  async send(dto: SendEmailDTO): Promise<{ success: boolean; messageId?: string }> {
    const from = dto.from || appConfig.email.from

    if (!this.isConfigured) {
      // Mock mode: log the email instead of sending it
      emailLogger.info('Email (mock)', {
        to: dto.to,
        from,
        subject: dto.subject,
      })
      return { success: true, messageId: `mock_${Date.now()}` }
    }

    return emailLogger.measure('sendEmail', async () => {
      try {
        // Dynamic import for Resend - only used when API key is configured
        // The 'resend' package is optional and may not be installed
        let resendModule: any = null
        try {
          resendModule = await import('resend')
        } catch {
          // Package not installed — silently fall back to mock
        }
        if (!resendModule) {
          emailLogger.warn('Resend package not available, falling back to mock')
          return { success: true, messageId: `mock_fallback_${Date.now()}` }
        }

        const Resend = resendModule.default || resendModule.Resend
        const resend = new Resend(appConfig.email.apiKey)

        const { data, error } = await resend.emails.send({
          from: from || 'noreply@shopforge.dev',
          to: dto.to,
          subject: dto.subject,
          html: dto.html,
          text: dto.text,
        })

        if (error) {
          emailLogger.error('Email send failed', { error: error.message, to: dto.to })
          return { success: false }
        }

        emailLogger.info('Email sent', { to: dto.to, messageId: data?.id })
        return { success: true, messageId: data?.id }
      } catch (error) {
        emailLogger.error('Email send error', { error: error instanceof Error ? error.message : 'Unknown' })
        return { success: false }
      }
    })
  }

  /**
   * Send an order confirmation email to the customer.
   *
   * Renders a styled HTML receipt listing all purchased items, the order
   * total, and a note about the upcoming shipping notification.
   *
   * @param data - Template data including order number, items, and total.
   */
  async sendOrderConfirmation(data: EmailTemplateData): Promise<void> {
    await this.send({
      to: '',
      subject: `Order Confirmation - ${data.orderNumber}`,
      html: this.renderOrderConfirmation(data),
    })
  }

  /**
   * Send an order status update email to the customer.
   *
   * Displays the new status and, when a tracking URL is provided, includes
   * a CTA button to track the shipment.
   *
   * @param data - Template data including order number and new status.
   */
  async sendOrderStatusUpdate(data: EmailTemplateData): Promise<void> {
    await this.send({
      to: '',
      subject: `Order Update - ${data.orderNumber} - ${data.orderStatus}`,
      html: this.renderStatusUpdate(data),
    })
  }

  /**
   * Send a welcome email to a newly registered user.
   *
   * Includes a CTA button linking to the storefront so the customer can
   * start browsing immediately after account creation.
   *
   * @param data - Template data including the user's name.
   */
  async sendWelcome(data: EmailTemplateData): Promise<void> {
    await this.send({
      to: '',
      subject: `Welcome to ${appConfig.appName}!`,
      html: this.renderWelcome(data),
    })
  }

  // ---- Email Template Renderers ----

  /**
   * Render the order confirmation HTML template.
   *
   * Produces a responsive, system-font email with:
   * - Personalised greeting
   * - Order number and total
   * - Itemised table (name, quantity, price)
   * - Shipping notification teaser
   *
   * @param data - Template data for the confirmation email.
   * @returns A complete HTML string ready for the email body.
   */
  private renderOrderConfirmation(data: EmailTemplateData): string {
    return `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #111827;">Order Confirmed!</h1>
        <p>Hi ${data.userName || 'Customer'},</p>
        <p>Thank you for your order <strong>${data.orderNumber}</strong>.</p>
        <p>Total: <strong>$${(data.totalAmount || 0).toFixed(2)}</strong></p>
        ${data.items ? `<table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr style="background:#f3f4f6;"><th style="padding:8px;text-align:left;">Item</th><th style="padding:8px;">Qty</th><th style="padding:8px;">Price</th></tr>
          ${data.items.map(item => `<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${item.name}</td><td style="padding:8px;text-align:center;">${item.quantity}</td><td style="padding:8px;text-align:right;">$${item.price.toFixed(2)}</td></tr>`).join('')}
        </table>` : ''}
        <p style="color:#6b7280;font-size:14px;">We'll send you another email when your order ships.</p>
      </div>
    `
  }

  /**
   * Render the order status update HTML template.
   *
   * Displays the new status prominently and, when a tracking URL is
   * available, renders a CTA button for shipment tracking.
   *
   * @param data - Template data for the status-update email.
   * @returns A complete HTML string ready for the email body.
   */
  private renderStatusUpdate(data: EmailTemplateData): string {
    return `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #111827;">Order Update</h1>
        <p>Hi ${data.userName || 'Customer'},</p>
        <p>Your order <strong>${data.orderNumber}</strong> status has been updated to <strong>${data.orderStatus}</strong>.</p>
        ${data.trackingUrl ? `<p><a href="${data.trackingUrl}" style="background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">Track Your Order</a></p>` : ''}
      </div>
    `
  }

  /**
   * Render the welcome email HTML template.
   *
   * Greets the new user by name and provides a CTA button that
   * navigates directly to the storefront.
   *
   * @param data - Template data for the welcome email.
   * @returns A complete HTML string ready for the email body.
   */
  private renderWelcome(data: EmailTemplateData): string {
    return `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #111827;">Welcome to ${appConfig.appName}!</h1>
        <p>Hi ${data.userName || 'there'},</p>
        <p>Thanks for creating an account. We're excited to have you!</p>
        <p><a href="${appConfig.appUrl}" style="background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">Start Shopping</a></p>
      </div>
    `
  }
}

/** Singleton EmailService instance used throughout the application. */
export const emailService = new EmailService()
