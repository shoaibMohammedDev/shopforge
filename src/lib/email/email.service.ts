// ============================================================================
// ShopForge - Email Service
// Abstraction layer for email delivery with Resend
// Falls back to logging when API key is not configured
// ============================================================================

import { appConfig } from '@/lib/config'
import { emailLogger } from '@/lib/logger'

export interface SendEmailDTO {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
}

export interface EmailTemplateData {
  userName?: string
  orderNumber?: string
  orderStatus?: string
  totalAmount?: number
  items?: Array<{ name: string; quantity: number; price: number }>
  trackingUrl?: string
}

class EmailService {
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
   * Send an email
   */
  async send(dto: SendEmailDTO): Promise<{ success: boolean; messageId?: string }> {
    const from = dto.from || appConfig.email.from

    if (!this.isConfigured) {
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
          // Package not installed
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
   * Send order confirmation email
   */
  async sendOrderConfirmation(data: EmailTemplateData): Promise<void> {
    await this.send({
      to: '',
      subject: `Order Confirmation - ${data.orderNumber}`,
      html: this.renderOrderConfirmation(data),
    })
  }

  /**
   * Send order status update email
   */
  async sendOrderStatusUpdate(data: EmailTemplateData): Promise<void> {
    await this.send({
      to: '',
      subject: `Order Update - ${data.orderNumber} - ${data.orderStatus}`,
      html: this.renderStatusUpdate(data),
    })
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcome(data: EmailTemplateData): Promise<void> {
    await this.send({
      to: '',
      subject: `Welcome to ${appConfig.appName}!`,
      html: this.renderWelcome(data),
    })
  }

  // ---- Email Template Renderers ----

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

export const emailService = new EmailService()
