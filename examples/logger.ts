/**
 * Professional logging system for @webviewjs/webview examples
 * 
 * Provides structured logging with object-based messages for better debugging
 * and monitoring capabilities.
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  ERROR = 'ERROR'
}

export interface LogEntry {
  level: LogLevel
  timestamp: string
  message: string
  data?: Record<string, any>
  context?: string
}

class Logger {
  private context: string

  constructor(context: string = 'App') {
    this.context = context
  }

  /**
   * Format timestamp for log entries
   */
  private getTimestamp(): string {
    return new Date().toISOString()
  }

  /**
   * Convert BigInt values to strings for JSON serialization
   */
  private jsonReplacer(key: string, value: any): any {
    if (typeof value === 'bigint') {
      return value.toString()
    }
    return value
  }

  /**
   * Format log entry with colors and structure
   */
  private formatLog(entry: LogEntry): string {
    const { level, timestamp, message, data } = entry
    
    const colors = {
      [LogLevel.DEBUG]: '\x1b[36m',    // Cyan
      [LogLevel.INFO]: '\x1b[34m',     // Blue
      [LogLevel.SUCCESS]: '\x1b[32m',  // Green
      [LogLevel.WARNING]: '\x1b[33m',  // Yellow
      [LogLevel.ERROR]: '\x1b[31m'     // Red
    }
    
    const reset = '\x1b[0m'
    const color = colors[level] || ''
    
    let output = `${color}[${level}]${reset} ${timestamp} [${this.context}] ${message}`
    
    if (data) {
      output += `\n${JSON.stringify(data, this.jsonReplacer.bind(this), 2)}`
    }
    
    return output
  }

  /**
   * Create and log an entry
   */
  private log(level: LogLevel, message: string, data?: Record<string, any>): void {
    const entry: LogEntry = {
      level,
      timestamp: this.getTimestamp(),
      message,
      data,
      context: this.context
    }
    
    console.log(this.formatLog(entry))
  }

  /**
   * Log debug information
   */
  debug(message: string, data?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, data)
  }

  /**
   * Log general information
   */
  info(message: string, data?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, data)
  }

  /**
   * Log successful operation
   */
  success(message: string, data?: Record<string, any>): void {
    this.log(LogLevel.SUCCESS, message, data)
  }

  /**
   * Log warning message
   */
  warning(message: string, data?: Record<string, any>): void {
    this.log(LogLevel.WARNING, message, data)
  }

  /**
   * Log error message
   */
  error(message: string, data?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, data)
  }

  /**
   * Log object data directly
   */
  object(label: string, data: any): void {
    this.info(`${label}:`, { data })
  }

  /**
   * Print section separator
   */
  section(title: string): void {
    const line = '═'.repeat(60)
    console.log(`\n${line}`)
    console.log(`  ${title}`)
    console.log(`${line}\n`)
  }

  /**
   * Print banner
   */
  banner(title: string, subtitle?: string): void {
    console.log(` ${title}${' '.repeat(58 - title.length)}`)
    if (subtitle) {
      console.log(` ${subtitle}${' '.repeat(58 - subtitle.length)}`)
    }
  }
}

/**
 * Create a new logger instance
 */
export function createLogger(context: string): Logger {
  return new Logger(context)
}

/**
 * Default logger for general use
 */
export const logger = new Logger('App')
