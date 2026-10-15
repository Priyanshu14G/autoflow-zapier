import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AiProvider,
  AiCompletionRequest,
  AiCompletionResponse,
  AiProviderError,
} from './ai-provider.interface';

/**
 * Google Gemini provider adapter.
 * Uses the Gemini generateContent REST API (v1beta).
 * Supports Gemini 1.5 Pro, 1.5 Flash, and Gemini 2.0 model families.
 */
@Injectable()
export class GeminiProvider implements AiProvider {
  readonly providerId = 'gemini';
  readonly supportedModels = [
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.0-pro',
  ] as const;

  private readonly logger = new Logger(GeminiProvider.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('GEMINI_API_KEY', '');
    this.baseUrl = this.config.get<string>(
      'GEMINI_BASE_URL',
      'https://generativelanguage.googleapis.com/v1beta',
    );
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    if (!this.apiKey) {
      throw new AiProviderError(
        this.providerId,
        'GEMINI_API_KEY is not configured',
      );
    }

    const startTime = Date.now();

    // Separate system messages from the conversation turn
    const systemParts = request.messages
      .filter((m) => m.role === 'system')
      .map((m) => ({ text: m.content }));

    const conversationContents = request.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const body: Record<string, unknown> = {
      contents: conversationContents,
      ...(systemParts.length > 0 && {
        systemInstruction: { parts: systemParts },
      }),
      generationConfig: {
        ...(request.maxTokens && { maxOutputTokens: request.maxTokens }),
        ...(request.temperature !== undefined && {
          temperature: request.temperature,
        }),
        ...(request.responseFormat === 'json' && {
          responseMimeType: 'application/json',
        }),
      },
    };

    const url = `${this.baseUrl}/models/${request.model}:generateContent?key=${this.apiKey}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      candidates: Array<{
        content: { parts: Array<{ text: string }> };
      }>;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      };
    };

    const text =
      data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ?? '';
    const latencyMs = Date.now() - startTime;

    this.logger.debug(
      `Gemini [${request.model}] completed in ${latencyMs}ms, ${data.usageMetadata?.totalTokenCount ?? 0} tokens`,
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
        promptTokens: data.usageMetadata?.promptTokenCount ?? 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
        totalTokens: data.usageMetadata?.totalTokenCount ?? 0,
      },
      model: request.model,
      provider: this.providerId,
      latencyMs,
    };
  }
}
