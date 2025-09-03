/**
 * Lambda structured logger utility
 * Provides structured logging for AWS Lambda functions
 */

interface LogContext {
  messageId?: string;
  soundbiteId?: string;
  userId?: string;
  voiceId?: string;
  textLength?: number;
  processingTime?: number;
  [key: string]: unknown;
}

export class LambdaLogger {
  private readonly component: string;

  constructor(component: string) {
    this.component = component;
  }

  private formatLog(
    level: string,
    message: string,
    context?: LogContext,
  ): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      component: this.component,
      message,
      ...context,
    };

    // Use console.warn/console.error which are allowed by ESLint
    if (level === 'ERROR') {
      console.error(JSON.stringify(logEntry));
    } else {
      console.warn(JSON.stringify(logEntry));
    }
  }

  info(message: string, context?: LogContext): void {
    this.formatLog('INFO', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.formatLog('WARN', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.formatLog('ERROR', message, context);
  }

  debug(message: string, context?: LogContext): void {
    // Only log debug in development
    if (process.env.NODE_ENV === 'development') {
      this.formatLog('DEBUG', message, context);
    }
  }
}
