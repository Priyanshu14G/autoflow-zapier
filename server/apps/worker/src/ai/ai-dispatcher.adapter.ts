import { Injectable } from '@nestjs/common';
import { AiDispatcher } from '@libs/engine';
import { AiProviderRegistry } from '@libs/ai';

/**
 * AiDispatcherAdapter bridges the AiProviderRegistry from @libs/ai
 * to the AiDispatcher interface expected by the StepExecutor in @libs/engine.
 *
 * This keeps @libs/engine free from a direct dependency on @libs/ai.
 */
@Injectable()
export class AiDispatcherAdapter implements AiDispatcher {
  constructor(private readonly registry: AiProviderRegistry) {}

  async complete(request: {
    model: string;
    provider?: string;
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    maxTokens?: number;
    temperature?: number;
    responseFormat?: 'text' | 'json';
  }) {
    return this.registry.complete(
      {
        model: request.model,
        messages: request.messages,
        maxTokens: request.maxTokens,
        temperature: request.temperature,
        responseFormat: request.responseFormat,
      },
      request.provider,
    );
  }
}
