import { NodeType } from '@libs/domain';
import { WorkflowNodeDefinition } from './graph-validator';
import { ExecutionContext, VariableResolver } from './variable-resolver';
import { ConditionEvaluator, ConditionNode } from './condition-evaluator';

export interface StepExecutionResult {
  output: Record<string, unknown>;
  durationMs: number;
}

export interface ActionDispatcher {
  executeAction(
    connectorId: string,
    actionKey: string,
    context: {
      input: Record<string, unknown>;
      credentials?: Record<string, unknown>;
      timeoutMs?: number;
    },
  ): Promise<{
    success: boolean;
    data: Record<string, unknown>;
    error?: string;
  }>;
}

/**
 * Interface for AI completion dispatch — keeps engine lib free of @libs/ai dependency.
 * The worker injects a concrete implementation backed by AiProviderRegistry.
 */
export interface AiDispatcher {
  complete(request: {
    model: string;
    provider?: string;
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    maxTokens?: number;
    temperature?: number;
    responseFormat?: 'text' | 'json';
  }): Promise<{
    text: string;
    json?: Record<string, unknown>;
    usage: { promptTokens: number; completionTokens: number; totalTokens: number };
    model: string;
    provider: string;
    latencyMs: number;
  }>;
}

export class TimeoutError extends Error {
  constructor(message = 'Step execution timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class StepExecutor {
  /**
   * Executes a node operation within a guaranteed maximum timeout window.
   * All template variables in `rawInput` are resolved against the execution context
   * before the node receives them.
   */
  static async executeWithTimeout(
    node: WorkflowNodeDefinition,
    rawInput: Record<string, unknown>,
    context: ExecutionContext,
    timeoutMs = 30000,
    dispatcher?: ActionDispatcher,
    credentials?: Record<string, unknown>,
    aiDispatcher?: AiDispatcher,
  ): Promise<StepExecutionResult> {
    const startTime = Date.now();

    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => {
        reject(new TimeoutError(`Step '${node.nodeKey}' exceeded timeout of ${timeoutMs}ms`));
      }, timeoutMs);

      // Prevent the timer from keeping the Node.js process alive unnecessarily
      if (typeof timer.unref === 'function') {
        timer.unref();
      }
    });

    // Resolve all template variables in the input before dispatching
    const resolvedInput = VariableResolver.resolve(rawInput, context) as Record<string, unknown>;
    const executionPromise = this.dispatchNode(
      node,
      resolvedInput,
      context,
      timeoutMs,
      dispatcher,
      credentials,
      aiDispatcher,
    );

    const output = await Promise.race([executionPromise, timeoutPromise]);
    const durationMs = Date.now() - startTime;

    return { output, durationMs };
  }

  private static async dispatchNode(
    node: WorkflowNodeDefinition,
    input: Record<string, unknown>,
    context: ExecutionContext,
    timeoutMs: number,
    dispatcher?: ActionDispatcher,
    credentials?: Record<string, unknown>,
    aiDispatcher?: AiDispatcher,
  ): Promise<Record<string, unknown>> {
    switch (node.type) {
      case NodeType.TRIGGER:
      case NodeType.WEBHOOK:
        // Trigger nodes emit the trigger payload as-is
        return {
          receivedAt: new Date().toISOString(),
          ...input,
        };

      case NodeType.TRANSFORM: {
        if (dispatcher && node.operation) {
          const transformResult = await dispatcher.executeAction(
            node.integration || 'transform',
            node.operation,
            { input, credentials, timeoutMs },
          );

          if (!transformResult.success) {
            throw new Error(transformResult.error || `Transform operation '${node.operation}' failed`);
          }

          return {
            transformed: true,
            timestamp: new Date().toISOString(),
            ...transformResult.data,
          };
        }

        // Simple passthrough/mapping fallback
        return {
          transformed: true,
          timestamp: new Date().toISOString(),
          data: input,
        };
      }

      case NodeType.DELAY: {
        const delayMs = typeof node.config?.delayMs === 'number' ? node.config.delayMs : 100;
        await new Promise((resolve) => setTimeout(resolve, Math.min(delayMs, 5000)));
        return { delayedMs: delayMs, resumedAt: new Date().toISOString() };
      }

      case NodeType.CONDITION: {
        const conditionConfig = node.config?.condition as ConditionNode | undefined;

        if (!conditionConfig) {
          // No condition configured — pass through by default
          return { evaluated: true, passed: true, reason: 'No condition configured', ...input };
        }

        const validationErrors = ConditionEvaluator.validate(conditionConfig);
        if (validationErrors.length > 0) {
          throw new Error(`Invalid condition configuration: ${validationErrors.join('; ')}`);
        }

        const result = ConditionEvaluator.evaluate(conditionConfig, context);
        return {
          evaluated: true,
          passed: result.passed,
          reason: result.reason,
        };
      }

      case NodeType.AI: {
        const aiConfig = node.config as Record<string, unknown> | undefined;
        const model = (aiConfig?.model as string | undefined) ?? 'gpt-4o-mini';
        const providerHint = aiConfig?.provider as string | undefined;
        const systemPrompt = aiConfig?.systemPrompt as string | undefined;
        const userPromptTemplate = aiConfig?.prompt as string | undefined;
        const maxTokens = typeof aiConfig?.maxTokens === 'number' ? aiConfig.maxTokens : undefined;
        const temperature = typeof aiConfig?.temperature === 'number' ? aiConfig.temperature : undefined;
        const responseFormat = (aiConfig?.responseFormat as 'text' | 'json' | undefined) ?? 'text';

        // Resolve the user prompt template using variable resolver
        const userPrompt = userPromptTemplate
          ? (VariableResolver.resolve(userPromptTemplate, context) as string)
          : JSON.stringify(input);

        if (!aiDispatcher) {
          // No AI dispatcher — return stub in non-worker contexts
          return {
            status: 'stub',
            model,
            prompt: userPrompt,
            text: '[AI node stub — no dispatcher configured]',
            usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          };
        }

        const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
        if (systemPrompt) {
          messages.push({ role: 'system', content: systemPrompt });
        }
        messages.push({ role: 'user', content: userPrompt });

        const aiResult = await aiDispatcher.complete({
          model,
          provider: providerHint,
          messages,
          maxTokens,
          temperature,
          responseFormat,
        });

        return {
          status: 'success',
          model: aiResult.model,
          provider: aiResult.provider,
          text: aiResult.text,
          ...(aiResult.json && { json: aiResult.json }),
          usage: aiResult.usage,
          latencyMs: aiResult.latencyMs,
          completedAt: new Date().toISOString(),
        };
      }

      case NodeType.ACTION:
      default: {
        if (dispatcher && node.integration && node.operation) {
          const actionResult = await dispatcher.executeAction(
            node.integration,
            node.operation,
            {
              input,
              credentials,
              timeoutMs,
            },
          );

          if (!actionResult.success) {
            throw new Error(actionResult.error || `Action '${node.integration}.${node.operation}' execution failed`);
          }

          return {
            status: 'success',
            executedAt: new Date().toISOString(),
            integration: node.integration,
            operation: node.operation,
            ...actionResult.data,
          };
        }

        // Fallback stub if no dispatcher provided or integration undefined
        return {
          status: 'success',
          executedAt: new Date().toISOString(),
          integration: node.integration,
          operation: node.operation,
          payload: input,
        };
      }
    }
  }
}
