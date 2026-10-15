export enum ErrorCategory {
  TRANSIENT = 'TRANSIENT',
  AUTH = 'AUTH',
  VALIDATION = 'VALIDATION',
  TIMEOUT = 'TIMEOUT',
  PERMANENT = 'PERMANENT',
}

export interface ClassifiedError {
  category: ErrorCategory;
  isRetryable: boolean;
  message: string;
  statusCode?: number;
}

export class ErrorClassifier {
  /**
   * Inspects error object, HTTP status codes, and network error codes
   * to categorize into retryable (transient/timeout) or non-retryable (auth/validation/permanent).
   */
  static classify(error: unknown): ClassifiedError {
    if (!error) {
      return {
        category: ErrorCategory.PERMANENT,
        isRetryable: false,
        message: 'Unknown error occurred',
      };
    }

    const err = error as Record<string, unknown>;
    const message = typeof err.message === 'string' ? err.message : String(error);
    const code = typeof err.code === 'string' ? err.code : '';
    const status =
      typeof err.status === 'number'
        ? err.status
        : typeof err.statusCode === 'number'
          ? err.statusCode
          : undefined;

    // Timeout errors
    if (
      code === 'ETIMEDOUT' ||
      code === 'ESOCKETTIMEDOUT' ||
      code === 'ECONNABORTED' ||
      message.toLowerCase().includes('timeout')
    ) {
      return {
        category: ErrorCategory.TIMEOUT,
        isRetryable: true,
        message,
        statusCode: 408,
      };
    }

    // Network / Transient connection errors
    if (
      code === 'ECONNRESET' ||
      code === 'ECONNREFUSED' ||
      code === 'EAI_AGAIN' ||
      code === 'ENOTFOUND' ||
      status === 429 || // Rate limit
      (status !== undefined && status >= 502 && status <= 504) // Bad Gateway / Service Unavailable / Gateway Timeout
    ) {
      return {
        category: ErrorCategory.TRANSIENT,
        isRetryable: true,
        message,
        statusCode: status,
      };
    }

    // Authentication & Authorization errors
    if (status === 401 || status === 403) {
      return {
        category: ErrorCategory.AUTH,
        isRetryable: false,
        message,
        statusCode: status,
      };
    }

    // Input Validation / Bad Request errors
    if (status === 400 || status === 422) {
      return {
        category: ErrorCategory.VALIDATION,
        isRetryable: false,
        message,
        statusCode: status,
      };
    }

    // Default to permanent error
    return {
      category: ErrorCategory.PERMANENT,
      isRetryable: false,
      message,
      statusCode: status,
    };
  }

  /**
   * Calculates exponential backoff delay in milliseconds with jitter
   */
  static calculateBackoffDelay(
    attempt: number,
    baseDelayMs = 2000,
    maxDelayMs = 120000,
  ): number {
    const exponential = baseDelayMs * Math.pow(2, attempt - 1);
    const jitter = Math.floor(Math.random() * 500);
    return Math.min(exponential + jitter, maxDelayMs);
  }
}
