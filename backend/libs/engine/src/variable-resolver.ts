/**
 * VariableResolver: Safe, sandboxed template variable resolution.
 *
 * Supported syntax:
 *   {{trigger.fieldName}}
 *   {{steps.nodeKey.output.path.to.value}}
 *   {{steps.nodeKey.status}}
 *   {{env.VARIABLE_NAME}}
 *   {{run.id}}, {{run.workflowId}}, {{run.startedAt}}
 *
 * Nested paths are resolved with null-safe deep traversal.
 * No eval(), new Function(), or dynamic code execution is used.
 */

export interface ExecutionContext {
  /** Payload from the trigger event */
  trigger: Record<string, unknown>;

  /** Accumulated step outputs: { [nodeKey]: { output: {...}, status: string } } */
  steps: Record<string, Record<string, unknown>>;

  /** Runtime run metadata */
  run: {
    id: string;
    workflowId: string;
    startedAt: string;
    triggeredBy?: string;
  };

  /** Safe subset of environment variables passed explicitly */
  env?: Record<string, string>;
}

export class VariableResolver {
  /**
   * VARIABLE_PATTERN matches any {{ ... }} expression in a string.
   */
  private static readonly VARIABLE_PATTERN = /\{\{\s*([^}]+?)\s*\}\}/g;

  /**
   * Resolves all template variables in the given value.
   * - Strings: replaces all {{ }} tokens.
   * - Objects/Arrays: deep-recurses and resolves each leaf string.
   * - Primitives: returned as-is.
   */
  static resolve(value: unknown, context: ExecutionContext): unknown {
    if (typeof value === 'string') {
      return this.resolveString(value, context);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.resolve(item, context));
    }

    if (value !== null && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([k, v]) => [
          k,
          this.resolve(v, context),
        ]),
      );
    }

    return value;
  }

  /**
   * Resolves all {{ }} tokens in a single string.
   * If the entire string is a single token and its resolved value is not a string,
   * the raw typed value is returned (preserves objects/arrays/numbers).
   */
  static resolveString(template: string, context: ExecutionContext): unknown {
    const trimmed = template.trim();

    // Fast path: single complete token → return the resolved value as its native type
    const singleMatch = trimmed.match(/^\{\{\s*([^}]+?)\s*\}\}$/);
    if (singleMatch) {
      return this.resolvePath(singleMatch[1].trim(), context);
    }

    // Multiple tokens or tokens embedded in a string → stringify all values
    return template.replace(this.VARIABLE_PATTERN, (_fullMatch, path: string) => {
      const resolved = this.resolvePath(path.trim(), context);
      if (resolved === null || resolved === undefined) {
        return '';
      }
      if (typeof resolved === 'object') {
        return JSON.stringify(resolved);
      }
      return String(resolved);
    });
  }

  /**
   * Resolves a dot-notation path against the execution context.
   *
   * Namespaces:
   *   trigger.*       → context.trigger
   *   steps.*.*       → context.steps[nodeKey][...]
   *   run.*           → context.run
   *   env.*           → context.env
   */
  static resolvePath(path: string, context: ExecutionContext): unknown {
    const segments = path.split('.');

    if (segments.length === 0) {
      return undefined;
    }

    const namespace = segments[0];

    switch (namespace) {
      case 'trigger':
        return this.deepGet(context.trigger, segments.slice(1));

      case 'steps': {
        // steps.<nodeKey>.<field>
        if (segments.length < 2) return undefined;
        const nodeKey = segments[1];
        const stepData = context.steps[nodeKey];
        if (!stepData) return undefined;
        return this.deepGet(stepData, segments.slice(2));
      }

      case 'run':
        return this.deepGet(context.run as unknown as Record<string, unknown>, segments.slice(1));

      case 'env': {
        if (segments.length < 2) return undefined;
        const envKey = segments.slice(1).join('.');
        return context.env?.[envKey] ?? undefined;
      }

      default:
        return undefined;
    }
  }

  /**
   * Null-safe deep property access.
   * Returns undefined if any intermediate value is null/undefined/non-object.
   */
  static deepGet(obj: unknown, keys: string[]): unknown {
    if (keys.length === 0) {
      return obj;
    }

    if (obj === null || obj === undefined || typeof obj !== 'object') {
      return undefined;
    }

    const [head, ...rest] = keys;
    const record = obj as Record<string, unknown>;

    // Support array index access via numeric string keys
    if (Array.isArray(obj)) {
      const index = parseInt(head, 10);
      if (isNaN(index)) return undefined;
      return this.deepGet(obj[index], rest);
    }

    return this.deepGet(record[head], rest);
  }

  /**
   * Builds an ExecutionContext from a workflow run's accumulated contextData.
   * Expects contextData to be shaped: { trigger: {...}, [nodeKey]: { output, status } }
   */
  static buildContext(
    runMeta: { id: string; workflowId: string; startedAt: Date | string; triggeredBy?: string | null },
    contextData: Record<string, unknown>,
    env?: Record<string, string>,
  ): ExecutionContext {
    const { trigger, ...stepOutputs } = contextData;

    return {
      trigger: (trigger as Record<string, unknown>) || {},
      steps: (stepOutputs as Record<string, Record<string, unknown>>) || {},
      run: {
        id: runMeta.id,
        workflowId: runMeta.workflowId,
        startedAt:
          runMeta.startedAt instanceof Date
            ? runMeta.startedAt.toISOString()
            : String(runMeta.startedAt),
        triggeredBy: runMeta.triggeredBy ?? undefined,
      },
      env,
    };
  }
}
