// Type declarations for optional dependencies
declare module 'resend' {
  interface SendEmailParams {
    from: string
    to: string | string[]
    subject: string
    html: string
    text?: string
  }

  interface EmailResponse {
    id: string
  }

  interface ResendError {
    message: string
  }

  interface SendResult {
    data: EmailResponse | null
    error: ResendError | null
  }

  class Resend {
    constructor(apiKey: string)
    emails: {
      send: (params: SendEmailParams) => Promise<SendResult>
    }
  }

  export default Resend
}
