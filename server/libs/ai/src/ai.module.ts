import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiProviderRegistry } from './providers/ai-provider.registry';
import { OpenAiProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { AnthropicProvider } from './providers/anthropic.provider';

/**
 * AiModule registers all AI provider adapters and the central registry.
 *
 * Import this module into any app that needs AI node execution (i.e. Worker).
 * Providers are registered on module init via OnModuleInit lifecycle hook.
 */
@Module({
  imports: [ConfigModule],
  providers: [
    AiProviderRegistry,
    OpenAiProvider,
    GeminiProvider,
    AnthropicProvider,
  ],
  exports: [AiProviderRegistry],
})
export class AiModule implements OnModuleInit {
  constructor(
    private readonly registry: AiProviderRegistry,
    private readonly openai: OpenAiProvider,
    private readonly gemini: GeminiProvider,
    private readonly anthropic: AnthropicProvider,
  ) {}

  onModuleInit(): void {
    this.registry.register(this.openai);
    this.registry.register(this.gemini);
    this.registry.register(this.anthropic);
  }
}
