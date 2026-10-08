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
