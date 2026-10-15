import { AiProviderRegistry } from '../src/providers/ai-provider.registry';
import {
  AiProvider,
  AiCompletionRequest,
  AiCompletionResponse,
  AiProviderError,
} from '../src/providers/ai-provider.interface';

// ── Fake providers for testing ──────────────────────────────────────────────

class FakeOpenAiProvider implements AiProvider {
  readonly providerId = 'openai';
  readonly supportedModels = ['gpt-4o', 'gpt-4o-mini'] as const;

  async complete(req: AiCompletionRequest): Promise<AiCompletionResponse> {
    return {
      text: `OpenAI response for: ${req.messages.at(-1)?.content ?? ''}`,
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      model: req.model,
      provider: this.providerId,
      latencyMs: 100,
    };
  }
}

class FakeGeminiProvider implements AiProvider {
  readonly providerId = 'gemini';
  readonly supportedModels = ['gemini-1.5-pro', 'gemini-1.5-flash'] as const;

  async complete(req: AiCompletionRequest): Promise<AiCompletionResponse> {
    return {
      text: `Gemini response for: ${req.messages.at(-1)?.content ?? ''}`,
      usage: { promptTokens: 8, completionTokens: 15, totalTokens: 23 },
      model: req.model,
      provider: this.providerId,
      latencyMs: 80,
    };
  }
}

class FakeAnthropicProvider implements AiProvider {
  readonly providerId = 'anthropic';
  readonly supportedModels = ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'] as const;

  async complete(req: AiCompletionRequest): Promise<AiCompletionResponse> {
    return {
      text: `Anthropic response for: ${req.messages.at(-1)?.content ?? ''}`,
      usage: { promptTokens: 12, completionTokens: 25, totalTokens: 37 },
      model: req.model,
      provider: this.providerId,
      latencyMs: 120,
    };
  }
}

// ── Test suite ───────────────────────────────────────────────────────────────

describe('AiProviderRegistry', () => {
  let registry: AiProviderRegistry;
  let openai: FakeOpenAiProvider;
  let gemini: FakeGeminiProvider;
  let anthropic: FakeAnthropicProvider;

  beforeEach(() => {
    registry = new AiProviderRegistry();
    openai = new FakeOpenAiProvider();
    gemini = new FakeGeminiProvider();
    anthropic = new FakeAnthropicProvider();

    registry.register(openai);
    registry.register(gemini);
    registry.register(anthropic);
  });

  describe('register + listProviders', () => {
    it('lists all registered provider IDs', () => {
      expect(registry.listProviders()).toEqual(
        expect.arrayContaining(['openai', 'gemini', 'anthropic']),
      );
    });
  });

  describe('resolve', () => {
    it('resolves by explicit supported model — openai', () => {
      const provider = registry.resolve('gpt-4o');
      expect(provider.providerId).toBe('openai');
    });

    it('resolves by explicit supported model — gemini', () => {
      const provider = registry.resolve('gemini-1.5-pro');
      expect(provider.providerId).toBe('gemini');
    });

    it('resolves by explicit supported model — anthropic', () => {
      const provider = registry.resolve('claude-3-5-sonnet-20241022');
      expect(provider.providerId).toBe('anthropic');
    });

    it('resolves by explicit provider override regardless of model', () => {
      const provider = registry.resolve('gpt-4o', 'gemini');
      expect(provider.providerId).toBe('gemini');
    });

    it('resolves via gpt- prefix fallback for unknown model', () => {
      const provider = registry.resolve('gpt-99-turbo');
      expect(provider.providerId).toBe('openai');
    });

    it('resolves via claude- prefix fallback for unknown model', () => {
      const provider = registry.resolve('claude-4-opus');
      expect(provider.providerId).toBe('anthropic');
    });

    it('resolves via gemini- prefix fallback for unknown model', () => {
      const provider = registry.resolve('gemini-3.0-ultra');
      expect(provider.providerId).toBe('gemini');
    });

    it('throws AiProviderError for unknown model with no prefix match', () => {
      expect(() => registry.resolve('unknown-model-xyz')).toThrow(AiProviderError);
    });

    it('throws AiProviderError for unregistered explicit provider', () => {
      expect(() => registry.resolve('gpt-4o', 'cohere')).toThrow(AiProviderError);
    });
  });

  describe('complete', () => {
    it('completes with openai provider for gpt-4o model', async () => {
      const result = await registry.complete({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'Hello world' }],
      });

      expect(result.provider).toBe('openai');
      expect(result.text).toContain('OpenAI response for: Hello world');
      expect(result.usage.totalTokens).toBe(30);
      expect(result.latencyMs).toBe(100);
    });

    it('completes with gemini provider for gemini-1.5-flash model', async () => {
      const result = await registry.complete({
        model: 'gemini-1.5-flash',
        messages: [{ role: 'user', content: 'Summarize this' }],
      });

      expect(result.provider).toBe('gemini');
      expect(result.text).toContain('Gemini response for: Summarize this');
    });

    it('completes with anthropic provider for claude model', async () => {
      const result = await registry.complete({
        model: 'claude-3-haiku-20240307',
        messages: [{ role: 'user', content: 'Translate this' }],
      });

      expect(result.provider).toBe('anthropic');
      expect(result.text).toContain('Anthropic response for: Translate this');
    });

    it('routes to explicit provider override', async () => {
      const result = await registry.complete(
        {
          model: 'gpt-4o', // would normally route to openai
          messages: [{ role: 'user', content: 'Test' }],
        },
        'gemini', // override to gemini
      );

      expect(result.provider).toBe('gemini');
    });
  });
});
