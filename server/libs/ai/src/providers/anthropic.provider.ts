import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AiProvider,
  AiCompletionRequest,
  AiCompletionResponse,
  AiProviderError,
} from './ai-provider.interface';

/**
 * Anthropic Claude provider adapter.
 * Uses the Messages API (anthropic-version: 2023-06-01).
 * Supports Claude 3.5 Sonnet, Claude 3 Haiku, and Claude 3 Opus.
 */
@Injectable()
export class AnthropicProvider implements AiProvider {
  readonly providerId = 'anthropic';
  readonly supportedModels = [
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022',
    'claude-3-opus-20240229',
    'claude-3-sonnet-20240229',
    'claude-3-haiku-20240307',
  ] as const;

  private readonly logger = new Logger(AnthropicProvider.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly apiVersion = '2023-06-01';

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('ANTHROPIC_API_KEY', '');
    this.baseUrl = this.config.get<string>(
      'ANTHROPIC_BASE_URL',
      'https://api.anthropic.com/v1',
    );
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    if (!this.apiKey) {
      throw new AiProviderError(
        this.providerId,
        'ANTHROPIC_API_KEY is not configured',
      );
    }

    const startTime = Date.now();

    // Anthropic separates system prompt from conversation messages
    const systemContent = request.messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n');

    const conversationMessages = request.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));

    const body: Record<string, unknown> = {
      model: request.model,
      max_tokens: request.maxTokens ?? 4096,
      messages: conversationMessages,
      ...(systemContent && { system: systemContent }),
      ...(request.temperature !== undefined && {
        temperature: request.temperature,
      }),
    };

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': this.apiVersion,
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new AiProviderError(
        this.providerId,
        `Network error: ${String(err)}`,
        undefined,
        err,
      );
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'unknown error');
      throw new AiProviderError(
        this.providerId,
        `API error ${response.status}: ${errorText}`,
        response.status,
      );
    }

    const data = (await response.json()) as {
      content: Array<{ type: string; text?: string }>;
      usage: { input_tokens: number; output_tokens: number };
      model: string;
    };

    const text =
      data.content
        .filter((c) => c.type === 'text')
        .map((c) => c.text ?? '')
        .join('') ?? '';

    const latencyMs = Date.now() - startTime;

    this.logger.debug(
      `Anthropic [${request.model}] completed in ${latencyMs}ms, ${(data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0)} tokens`,
    );

    let json: Record<string, unknown> | undefined;
    if (request.responseFormat === 'json') {
      try {
        json = JSON.parse(text) as Record<string, unknown>;
      } catch {
        json = undefined;
      }
    }

    return {
      text,
      json,
      usage: {
        promptTokens: data.usage?.input_tokens ?? 0,
        completionTokens: data.usage?.output_tokens ?? 0,
        totalTokens:
          (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
      },
      model: data.model ?? request.model,
      provider: this.providerId,
      latencyMs,
    };
  }
}
