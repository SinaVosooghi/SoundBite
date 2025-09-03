"use strict";
/**
 * Lambda structured logger utility
 * Provides structured logging for AWS Lambda functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LambdaLogger = void 0;
class LambdaLogger {
    constructor(component) {
        this.component = component;
    }
    formatLog(level, message, context) {
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
        }
        else {
            console.warn(JSON.stringify(logEntry));
        }
    }
    info(message, context) {
        this.formatLog('INFO', message, context);
    }
    warn(message, context) {
        this.formatLog('WARN', message, context);
    }
    error(message, context) {
        this.formatLog('ERROR', message, context);
    }
    debug(message, context) {
        // Only log debug in development
        if (process.env.NODE_ENV === 'development') {
            this.formatLog('DEBUG', message, context);
        }
    }
}
exports.LambdaLogger = LambdaLogger;
