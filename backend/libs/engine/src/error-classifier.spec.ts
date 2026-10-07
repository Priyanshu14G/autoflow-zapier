import { ErrorClassifier, ErrorCategory } from './error-classifier';

describe('ErrorClassifier', () => {
  describe('classify', () => {
    it('should classify ETIMEDOUT as TIMEOUT and retryable', () => {
      const result = ErrorClassifier.classify({ code: 'ETIMEDOUT', message: 'Connection timed out' });
      expect(result.category).toBe(ErrorCategory.TIMEOUT);
      expect(result.isRetryable).toBe(true);
    });

    it('should classify ECONNRESET as TRANSIENT and retryable', () => {
      const result = ErrorClassifier.classify({ code: 'ECONNRESET', message: 'Connection reset' });
      expect(result.category).toBe(ErrorCategory.TRANSIENT);
      expect(result.isRetryable).toBe(true);
    });

    it('should classify HTTP 429 (rate limit) as TRANSIENT and retryable', () => {
      const result = ErrorClassifier.classify({ status: 429, message: 'Too Many Requests' });
      expect(result.category).toBe(ErrorCategory.TRANSIENT);
      expect(result.isRetryable).toBe(true);
    });

    it('should classify HTTP 503 (service unavailable) as TRANSIENT and retryable', () => {
      const result = ErrorClassifier.classify({ status: 503, message: 'Service Unavailable' });
      expect(result.category).toBe(ErrorCategory.TRANSIENT);
      expect(result.isRetryable).toBe(true);
    });

    it('should classify HTTP 401 (unauthorized) as AUTH and NOT retryable', () => {
      const result = ErrorClassifier.classify({ status: 401, message: 'Unauthorized' });
      expect(result.category).toBe(ErrorCategory.AUTH);
      expect(result.isRetryable).toBe(false);
    });

    it('should classify HTTP 400 (bad request) as VALIDATION and NOT retryable', () => {
      const result = ErrorClassifier.classify({ status: 400, message: 'Bad Request' });
      expect(result.category).toBe(ErrorCategory.VALIDATION);
      expect(result.isRetryable).toBe(false);
    });

    it('should classify unknown errors as PERMANENT and NOT retryable', () => {
      const result = ErrorClassifier.classify({ status: 500, message: 'Internal Server Error' });
      expect(result.category).toBe(ErrorCategory.PERMANENT);
      expect(result.isRetryable).toBe(false);
    });
  });

  describe('calculateBackoffDelay', () => {
    it('should return increasing delay for each retry attempt', () => {
      const delay1 = ErrorClassifier.calculateBackoffDelay(1, 2000, 120000);
      const delay2 = ErrorClassifier.calculateBackoffDelay(2, 2000, 120000);
      const delay3 = ErrorClassifier.calculateBackoffDelay(3, 2000, 120000);

      // Base delays without jitter: 2000, 4000, 8000
      expect(delay1).toBeGreaterThanOrEqual(2000);
      expect(delay2).toBeGreaterThanOrEqual(4000);
      expect(delay3).toBeGreaterThanOrEqual(8000);
    });

    it('should not exceed maxDelayMs', () => {
      const delay = ErrorClassifier.calculateBackoffDelay(100, 2000, 120000);
      expect(delay).toBeLessThanOrEqual(120000 + 500); // maxDelay + max jitter
    });
  });
});
