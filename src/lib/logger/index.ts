// ============================================================================
// ShopForge - Structured Logger Service
// Enterprise-grade logging with levels, context, and structured output
// ============================================================================

import { appConfig } from '@/lib/config'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: unknown
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  service: string
  context?: LogContext
  traceId?: string
  duration?: number
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

class Logger {
  private service: string
  private minLevel: LogLevel
  private format: 'json' | 'text'

  constructor(service: string = 'app') {
    this.service = service
    this.minLevel = appConfig.logging.level
    this.format = appConfig.logging.format
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.minLevel]
  }

  private formatEntry(entry: LogEntry): string {
    if (this.format === 'json') {
      return JSON.stringify(entry)
    }
    // Human-readable format for development
    const { timestamp, level, message, service, context, duration } = entry
    const prefix = `[${timestamp}] ${level.toUpperCase().padEnd(5)} [${service}]`
    const suffix = duration ? ` (${duration}ms)` : ''
    const ctxStr = context && Object.keys(context).length > 0
      ? ' ' + Object.entries(context).map(([k, v]) => `${k}=${v}`).join(' ')
      : ''
    return `${prefix} ${message}${ctxStr}${suffix}`
  }

  private log(level: LogLevel, message: string, context?: LogContext, duration?: number) {
    if (!this.shouldLog(level)) return

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.service,
      ...(context && Object.keys(context).length > 0 ? { context } : {}),
      ...(duration !== undefined ? { duration } : {}),
    }

    const formatted = this.formatEntry(entry)

    switch (level) {
      case 'error':
        console.error(formatted)
        break
      case 'warn':
        console.warn(formatted)
        break
      case 'info':
        console.info(formatted)
        break
      case 'debug':
        console.debug(formatted)
        break
    }
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context)
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context)
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context)
  }

  error(message: string, context?: LogContext) {
    this.log('error', message, context)
  }

  /**
   * Create a child logger with inherited config but different service name
   */
  child(service: string): Logger {
    const child = new Logger(`${this.service}:${service}`)
    return child
  }

  /**
   * Measure execution time of an async function
   */
  async measure<T>(label: string, fn: () => Promise<T>, context?: LogContext): Promise<T> {
    const start = performance.now()
    try {
      const result = await fn()
      const duration = Math.round(performance.now() - start)
      this.info(`${label} completed`, { ...context, duration })
      return result
    } catch (error) {
      const duration = Math.round(performance.now() - start)
      this.error(`${label} failed`, {
        ...context,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      throw error
    }
  }
}

// ---- Singleton instances for common services ----
export const logger = new Logger('shopforge')
export const apiLogger = logger.child('api')
export const dbLogger = logger.child('db')
export const authLogger = logger.child('auth')
export const orderLogger = logger.child('order')
export const paymentLogger = logger.child('payment')
export const emailLogger = logger.child('email')

export { Logger }
