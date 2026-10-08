/**
 * Unified interface for all AI provider adapters.
 * Each provider (OpenAI, Gemini, Anthropic) must implement this contract.
 */

export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiCompletionRequest {
  /** The model identifier (e.g. "gpt-4o", "gemini-1.5-pro", "claude-3-5-sonnet-20241022") */
  model: string;
  messages: AiMessage[];
  /** Maximum tokens to generate. Provider default used if not specified. */
  maxTokens?: number;
  /** Sampling temperature [0.0, 2.0]. Lower = more deterministic. */
  temperature?: number;
  /** Optional JSON schema for structured output (if provider supports it) */
  responseFormat?: 'text' | 'json';
}

export interface AiCompletionResponse {
  /** The generated completion text */
  text: string;
  /** Parsed JSON object if responseFormat was 'json' */
  json?: Record<string, unknown>;
  /** Usage statistics from the provider */
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Which model was ultimately used */
  model: string;
  /** Which provider was used */
  provider: string;
  /** Latency in milliseconds for this call */
  latencyMs: number;
}

export interface AiProvider {
  /** Unique identifier for this provider (e.g. "openai", "gemini", "anthropic") */
  readonly providerId: string;

  /** List of model IDs this provider can handle */
  readonly supportedModels: readonly string[];

  /**
   * Execute a chat completion request.
   * @throws {AiProviderError} if the request fails
   */
  complete(request: AiCompletionRequest): Promise<AiCompletionResponse>;
}

export class AiProviderError extends Error {
  constructor(
    public readonly provider: string,
    message: string,
    public readonly statusCode?: number,
    public readonly cause?: unknown,
  ) {
    super(`[${provider}] ${message}`);
    this.name = 'AiProviderError';
  }
}
