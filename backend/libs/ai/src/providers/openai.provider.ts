import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AiProvider,
  AiCompletionRequest,
  AiCompletionResponse,
  AiProviderError,
} from './ai-provider.interface';

/**
 * OpenAI provider adapter.
 * Uses the OpenAI Chat Completions API via native fetch.
 * Supports GPT-4o, GPT-4 Turbo, GPT-3.5 Turbo, and o1/o3 model families.
 */
@Injectable()
export class OpenAiProvider implements AiProvider {
  readonly providerId = 'openai';
  readonly supportedModels = [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-4-turbo',
    'gpt-4',
    'gpt-3.5-turbo',
    'o1-mini',
    'o1-preview',
  ] as const;

  private readonly logger = new Logger(OpenAiProvider.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('OPENAI_API_KEY', '');
    this.baseUrl = this.config.get<string>(
      'OPENAI_BASE_URL',
      'https://api.openai.com/v1',
    );
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    if (!this.apiKey) {
      throw new AiProviderError(
        this.providerId,
        'OPENAI_API_KEY is not configured',
      );
    }

    const startTime = Date.now();

    const body: Record<string, unknown> = {
      model: request.model,
      messages: request.messages,
      ...(request.maxTokens && { max_tokens: request.maxTokens }),
      ...(request.temperature !== undefined && {
        temperature: request.temperature,
      }),
      ...(request.responseFormat === 'json' && {
        response_format: { type: 'json_object' },
      }),
    };

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
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
      choices: Array<{ message: { content: string } }>;
      usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
      model: string;
    };

    const text = data.choices[0]?.message?.content ?? '';
    const latencyMs = Date.now() - startTime;

    this.logger.debug(
      `OpenAI [${request.model}] completed in ${latencyMs}ms, ${data.usage?.total_tokens ?? 0} tokens`,
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
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
      model: data.model ?? request.model,
      provider: this.providerId,
      latencyMs,
    };
  }
}
