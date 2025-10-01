/**
 * Logger utility for OCR2
 * Provides structured logging with context
 */

import { Logger, LogEntry } from './types';

/**
 * Log levels in order of severity
 */
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
} as const;

/**
 * Current log level from environment
 */
const CURRENT_LOG_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL as keyof typeof LOG_LEVELS] ?? LOG_LEVELS.INFO;

/**
 * Format timestamp for logging
 */
function formatTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Format log entry for console output
 */
function formatLogEntry(entry: LogEntry): string {
  const timestamp = entry.timestamp.substring(11, 19); // Extract HH:MM:SS
  const level = entry.level.padEnd(5);
  const context = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
  
  return `[${timestamp}] [${level}] ${entry.message}${context}`;
}

/**
 * Get color for log level (for console output)
 */
function getLogColor(level: LogEntry['level']): string {
  switch (level) {
    case 'DEBUG': return '\x1b[36m'; // Cyan
    case 'INFO': return '\x1b[32m';  // Green
    case 'WARN': return '\x1b[33m';  // Yellow
    case 'ERROR': return '\x1b[31m'; // Red
    default: return '\x1b[0m';       // Reset
  }
}

/**
 * Log a message with the specified level
 */
function log(level: LogEntry['level'], message: string, context?: Record<string, any>, component?: string): void {
  // Check if this log level should be output
  if (LOG_LEVELS[level] < CURRENT_LOG_LEVEL) {
    return;
  }

  const entry: LogEntry = {
    timestamp: formatTimestamp(),
    level,
    message: component ? `[${component}] ${message}` : message,
    context,
  };

  // Format for console
  const color = getLogColor(level);
  const reset = '\x1b[0m';
  const formatted = formatLogEntry(entry);
  
  // Output to appropriate stream
  if (level === 'ERROR') {
    console.error(`${color}${formatted}${reset}`);
  } else if (level === 'WARN') {
    console.warn(`${color}${formatted}${reset}`);
  } else {
    console.log(`${color}${formatted}${reset}`);
  }

  // In production, you might want to send logs to a service like Vercel's logging
  // or a third-party service like LogRocket, Sentry, etc.
  if (process.env.NODE_ENV === 'production' && level === 'ERROR') {
    // Example: Send error logs to monitoring service
    // await sendToMonitoringService(entry);
  }
}

/**
 * Create a logger instance with a component name
 */
export function createLogger(component: string): Logger {
  return {
    info: (message: string, context?: Record<string, any>) => log('INFO', message, context, component),
    warn: (message: string, context?: Record<string, any>) => log('WARN', message, context, component),
    error: (message: string, context?: Record<string, any>) => log('ERROR', message, context, component),
    debug: (message: string, context?: Record<string, any>) => log('DEBUG', message, context, component),
  };
}

/**
 * Default logger instance
 */
export const logger = createLogger('OCR2');

/**
 * Performance measurement utility
 */
export function measurePerformance<T>(
  operation: () => Promise<T>,
  operationName: string,
  component?: string
): Promise<{ result: T; duration: number }> {
  return new Promise(async (resolve, reject) => {
    const start = Date.now();
    const opLogger = component ? createLogger(component) : logger;
    
    try {
      opLogger.debug(`Starting ${operationName}`);
      const result = await operation();
      const duration = Date.now() - start;
      
      opLogger.info(`Completed ${operationName}`, { 
        duration: `${duration}ms`,
        durationMs: duration 
      });
      
      resolve({ result, duration });
    } catch (error) {
      const duration = Date.now() - start;
      
      opLogger.error(`Failed ${operationName}`, { 
        duration: `${duration}ms`,
        durationMs: duration,
        error: error instanceof Error ? error.message : String(error)
      });
      
      reject(error);
    }
  });
}

/**
 * Create a timer for long-running operations
 */
export function createTimer(name: string, component?: string) {
  const start = Date.now();
  const timerLogger = component ? createLogger(component) : logger;
  
  timerLogger.debug(`Timer started: ${name}`);
  
  return {
    checkpoint: (checkpointName: string) => {
      const elapsed = Date.now() - start;
      timerLogger.debug(`Timer checkpoint: ${name} - ${checkpointName}`, { elapsed: `${elapsed}ms` });
    },
    
    finish: (context?: Record<string, any>) => {
      const total = Date.now() - start;
      timerLogger.info(`Timer finished: ${name}`, { 
        total: `${total}ms`,
        totalMs: total,
        ...context 
      });
      return total;
    }
  };
}

/**
 * Log memory usage (useful for debugging)
 */
export function logMemoryUsage(component?: string): void {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage();
    const memLogger = component ? createLogger(component) : logger;
    
    memLogger.debug('Memory usage', {
      rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(usage.external / 1024 / 1024)}MB`,
    });
  }
}
