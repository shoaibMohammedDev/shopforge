/**
 * @file logger/index.ts
 * @description Structured logging service for ShopForge.
 *   Provides an enterprise-grade logger with log levels, contextual metadata,
 *   JSON/text formatting, child logger derivation, and async execution timing.
 *   All output goes through `console.*` so it integrates seamlessly with
 *   serverless platforms, container orchestration, and local development.
 *
 * Key Responsibilities:
 *   - Emit structured log entries with timestamp, level, service name, and context
 *   - Respect a configurable minimum log level (debug ≤ info ≤ warn ≤ error)
 *   - Format entries as JSON (for production log aggregators) or human-readable
 *     text (for local development)
 *   - Support child loggers that inherit configuration but carry a scoped service name
 *   - Provide `measure()` for timing async operations and logging their duration
 */

import { appConfig } from '@/lib/config'

/** Supported log severity levels, ordered from most to least verbose. */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Arbitrary key-value metadata attached to a log entry.
 * Used for contextual information such as request IDs, user IDs, etc.
 */
interface LogContext {
  [key: string]: unknown
}

/**
 * Internal representation of a fully resolved log entry before formatting.
 * All fields are optional except the core four (timestamp, level, message, service).
 */
interface LogEntry {
  /** ISO-8601 timestamp of when the entry was created. */
  timestamp: string
  /** Severity level of this entry. */
  level: LogLevel
  /** Human-readable log message. */
  message: string
  /** Service/module identifier that produced the entry. */
  service: string
  /** Optional contextual metadata. */
  context?: LogContext
  /** Optional distributed tracing ID for request correlation. */
  traceId?: string
  /** Execution duration in milliseconds (set by `measure()`). */
  duration?: number
}

/**
 * Numeric priority for each log level. Higher values are more severe.
 * Used by `shouldLog` to compare the entry's level against the configured minimum.
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

/**
 * Logger — configurable structured logger with level filtering and formatting.
 *
 * Each instance carries a `service` name that is included in every log entry,
 * making it easy to filter logs by subsystem (e.g. "shopforge:api",
 * "shopforge:payment") in log aggregation tools.
 */
class Logger {
  /** Identifier included in every log entry to indicate its source subsystem. */
  private service: string
  /** Minimum severity level; entries below this threshold are silently discarded. */
  private minLevel: LogLevel
  /** Output format: "json" for machines, "text" for humans in a terminal. */
  private format: 'json' | 'text'

  /**
   * Create a new Logger instance.
   *
   * Reads the minimum level and format from `appConfig`, so changes to
   * environment variables take effect on the next Logger construction.
   *
   * @param service - Dot-separated service name (e.g. "shopforge", "shopforge:api").
   *                  Defaults to "app".
   */
  constructor(service: string = 'app') {
    this.service = service
    this.minLevel = appConfig.logging.level
    this.format = appConfig.logging.format
  }

  /**
   * Determine whether a log entry at the given level should be emitted.
   *
   * Compares the numeric priority of `level` against `this.minLevel`.
   * For example, if `minLevel` is "info" (1), then "debug" (0) is suppressed
   * but "info" (1), "warn" (2), and "error" (3) are emitted.
   *
   * @param level - The severity level of the prospective log entry.
   * @returns `true` if the entry should be emitted, `false` otherwise.
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.minLevel]
  }

  /**
   * Serialise a `LogEntry` into a string suitable for output.
   *
   * - **JSON mode**: produces a single-line JSON object for consumption by
   *   log aggregators (Datadog, CloudWatch, ELK, etc.).
   * - **Text mode**: produces a human-readable line with aligned columns,
   *   key=value context pairs, and a parenthesised duration suffix.
   *
   * @param entry - The log entry to format.
   * @returns A formatted string ready for `console.*` output.
   */
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

  /**
   * Internal dispatch method that all public logging methods delegate to.
   *
   * Checks the level filter, constructs the `LogEntry`, formats it, and
   * routes it to the appropriate `console.*` method.
   *
   * @param level    - Severity level for this entry.
   * @param message  - Human-readable log message.
   * @param context  - Optional structured metadata to include.
   * @param duration - Optional elapsed time in milliseconds (set by `measure`).
   */
  private log(level: LogLevel, message: string, context?: LogContext, duration?: number) {
    if (!this.shouldLog(level)) return

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.service,
      // Only include context/duration keys when they have meaningful values
      ...(context && Object.keys(context).length > 0 ? { context } : {}),
      ...(duration !== undefined ? { duration } : {}),
    }

    const formatted = this.formatEntry(entry)

    // Route to the correct console method so that Node.js / platform
    // log-level filtering and colouring work as expected
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

  /**
   * Log a debug-level message.
   *
   * Use for verbose diagnostic information that is typically disabled
   * in production (e.g. variable values, function entry/exit).
   *
   * @param message - Log message.
   * @param context - Optional structured metadata.
   */
  debug(message: string, context?: LogContext) {
    this.log('debug', message, context)
  }

  /**
   * Log an info-level message.
   *
   * Use for general operational messages (e.g. "Server started", "Email sent").
   *
   * @param message - Log message.
   * @param context - Optional structured metadata.
   */
  info(message: string, context?: LogContext) {
    this.log('info', message, context)
  }

  /**
   * Log a warning-level message.
   *
   * Use for recoverable issues that deserve attention but don't break
   * the current operation (e.g. deprecated API usage, retryable failures).
   *
   * @param message - Log message.
   * @param context - Optional structured metadata.
   */
  warn(message: string, context?: LogContext) {
    this.log('warn', message, context)
  }

  /**
   * Log an error-level message.
   *
   * Use for unrecoverable failures that require immediate investigation.
   *
   * @param message - Log message.
   * @param context - Optional structured metadata (consider including `error` key).
   */
  error(message: string, context?: LogContext) {
    this.log('error', message, context)
  }

  /**
   * Create a child logger that inherits configuration but uses a scoped service name.
   *
   * The child's service name is appended to the parent's with a colon separator
   * (e.g. parent "shopforge" + child "api" → "shopforge:api"). This makes it
   * trivial to filter logs by subsystem in log aggregation tools.
   *
   * @param service - Subsystem name to append.
   * @returns A new `Logger` instance with the combined service name.
   */
  child(service: string): Logger {
    const child = new Logger(`${this.service}:${service}`)
    return child
  }

  /**
   * Measure the execution time of an async function and log the result.
   *
   * Records the start time with `performance.now()`, awaits the callback,
   * then logs a completion or failure entry with the elapsed duration.
   * If the callback throws, the error is logged and re-thrown so the
   * caller can still handle it.
   *
   * @typeParam T - Return type of the measured function.
   * @param label   - Descriptive label for the log entry (e.g. "createPaymentIntent").
   * @param fn      - The async function whose execution should be timed.
   * @param context - Optional additional metadata to include in the log entry.
   * @returns The value returned by `fn`.
   * @throws Re-throws any error thrown by `fn` after logging it.
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
// Pre-created loggers avoid the need to instantiate Logger at every call site.

/** Root logger for the entire ShopForge application. */
export const logger = new Logger('shopforge')
/** Logger scoped to API route handlers. */
export const apiLogger = logger.child('api')
/** Logger scoped to database operations. */
export const dbLogger = logger.child('db')
/** Logger scoped to authentication flows. */
export const authLogger = logger.child('auth')
/** Logger scoped to order processing. */
export const orderLogger = logger.child('order')
/** Logger scoped to payment processing. */
export const paymentLogger = logger.child('payment')
/** Logger scoped to email delivery. */
export const emailLogger = logger.child('email')

/** Re-export the Logger class for custom instantiations if needed. */
export { Logger }
