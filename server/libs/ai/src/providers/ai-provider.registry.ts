import { Injectable, Logger } from '@nestjs/common';
import { AiProvider, AiCompletionRequest, AiCompletionResponse, AiProviderError } from './ai-provider.interface';

/**
 * Central AI Provider Registry.
 *
 * Providers are registered by their `providerId` and looked up at runtime.
 * Model-to-provider routing: the registry first checks if a provider is
 * explicitly specified, then falls back to scanning supported model lists.
 */
@Injectable()
export class AiProviderRegistry {
  private readonly logger = new Logger(AiProviderRegistry.name);
  private readonly providers = new Map<string, AiProvider>();

  /**
   * Register an AI provider. Called during module initialization.
   */
  register(provider: AiProvider): void {
    this.providers.set(provider.providerId, provider);
    this.logger.log(
      `Registered AI provider: ${provider.providerId} (models: ${provider.supportedModels.join(', ')})`,
    );
  }

  /**
   * Resolve the appropriate provider for a given model + optional explicit provider.
   * @throws {AiProviderError} if no matching provider found
   */
  resolve(model: string, explicitProvider?: string): AiProvider {
    // Explicit override takes priority
    if (explicitProvider) {
      const provider = this.providers.get(explicitProvider);
      if (!provider) {
        throw new AiProviderError(
          explicitProvider,
          `Provider '${explicitProvider}' is not registered. Available: ${this.listProviders().join(', ')}`,
        );
      }
      return provider;
    }

    // Auto-detect provider by scanning supported model lists
    for (const provider of this.providers.values()) {
      if ((provider.supportedModels as readonly string[]).includes(model)) {
        return provider;
      }
    }

    // Fallback: check prefix matching (e.g. "gpt-" → openai, "claude-" → anthropic)
    const modelLower = model.toLowerCase();
    if (modelLower.startsWith('gpt-') || modelLower.startsWith('o1') || modelLower.startsWith('o3')) {
      const openai = this.providers.get('openai');
      if (openai) return openai;
    }
    if (modelLower.startsWith('claude-')) {
      const anthropic = this.providers.get('anthropic');
      if (anthropic) return anthropic;
    }
    if (modelLower.startsWith('gemini-')) {
      const gemini = this.providers.get('gemini');
      if (gemini) return gemini;
    }

    throw new AiProviderError(
      'registry',
      `No provider found for model '${model}'. Available providers: ${this.listProviders().join(', ')}`,
    );
  }

  /**
   * Execute a completion through the resolved provider.
   */
  async complete(
    request: AiCompletionRequest,
    explicitProvider?: string,
  ): Promise<AiCompletionResponse> {
    const provider = this.resolve(request.model, explicitProvider);
    this.logger.debug(`Routing model '${request.model}' to provider '${provider.providerId}'`);
    return provider.complete(request);
  }

  listProviders(): string[] {
    return [...this.providers.keys()];
  }
}
