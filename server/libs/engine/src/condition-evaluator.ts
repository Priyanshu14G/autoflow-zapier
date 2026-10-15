/**
 * ConditionEvaluator: Pure, sandboxed evaluation of filter/branch conditions.
 *
 * Supports:
 *   - Primitive operators: eq, neq, gt, lt, gte, lte
 *   - String operators: contains, startsWith, endsWith, matches (regex)
 *   - Existence operators: exists, notExists
 *   - Boolean operators: isTrue, isFalse
 *   - Compound groups: AND/OR with nested conditions
 *
 * All field references are resolved via VariableResolver before comparison.
 * No eval() or dynamic code execution is used.
 */

import { VariableResolver, ExecutionContext } from './variable-resolver';

// ─── Condition schema types ───────────────────────────────────────────────────

export type ComparisonOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'lt'
  | 'gte'
  | 'lte'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'matches'
  | 'exists'
  | 'notExists'
  | 'isTrue'
  | 'isFalse';

export interface LeafCondition {
  kind: 'leaf';
  /** Dot-notation path or template string, e.g. "{{trigger.amount}}" */
  field: string;
  operator: ComparisonOperator;
  /** For unary operators (exists, notExists, isTrue, isFalse), value may be omitted */
  value?: unknown;
}

export interface GroupCondition {
  kind: 'group';
  logic: 'AND' | 'OR';
  conditions: ConditionNode[];
}

export type ConditionNode = LeafCondition | GroupCondition;

export interface ConditionEvaluationResult {
  passed: boolean;
  /** Human-readable reason for the result (useful for debugging) */
  reason: string;
}

// ─── Evaluator ────────────────────────────────────────────────────────────────

export class ConditionEvaluator {
  /**
   * Evaluates a single ConditionNode tree against the execution context.
   */
  static evaluate(
    condition: ConditionNode,
    context: ExecutionContext,
  ): ConditionEvaluationResult {
    if (condition.kind === 'group') {
      return this.evaluateGroup(condition, context);
    }
    return this.evaluateLeaf(condition, context);
  }

  // ── Group evaluation ─────────────────────────────────────────────────────

  private static evaluateGroup(
    group: GroupCondition,
    context: ExecutionContext,
  ): ConditionEvaluationResult {
    if (group.conditions.length === 0) {
      return { passed: true, reason: 'Empty condition group defaults to true' };
    }

    const results = group.conditions.map((c) => this.evaluate(c, context));

    if (group.logic === 'AND') {
      const firstFail = results.find((r) => !r.passed);
      if (firstFail) {
        return { passed: false, reason: `AND group failed: ${firstFail.reason}` };
      }
      return { passed: true, reason: 'All AND conditions passed' };
    }

    // OR: pass if any child passes
    const firstPass = results.find((r) => r.passed);
    if (firstPass) {
      return { passed: true, reason: `OR group passed: ${firstPass.reason}` };
    }
    return {
      passed: false,
      reason: `OR group failed: all ${results.length} conditions failed`,
    };
  }

  // ── Leaf evaluation ───────────────────────────────────────────────────────

  private static evaluateLeaf(
    leaf: LeafCondition,
    context: ExecutionContext,
  ): ConditionEvaluationResult {
    // Resolve the field reference
    const resolvedField = VariableResolver.resolveString(leaf.field, context);

    // Resolve the comparison value if it's a string template
    const resolvedValue =
      typeof leaf.value === 'string'
        ? VariableResolver.resolveString(leaf.value, context)
        : leaf.value;

    const reason = `field="${leaf.field}" op="${leaf.operator}" value="${String(leaf.value)}"`;

    try {
      const passed = this.applyOperator(resolvedField, leaf.operator, resolvedValue);
      return { passed, reason: passed ? `Passed: ${reason}` : `Failed: ${reason}` };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { passed: false, reason: `Error evaluating condition: ${message}` };
    }
  }

  // ── Operator dispatch ─────────────────────────────────────────────────────

  private static applyOperator(
    fieldValue: unknown,
    operator: ComparisonOperator,
    compareValue: unknown,
  ): boolean {
    switch (operator) {
      case 'exists':
        return fieldValue !== null && fieldValue !== undefined;

      case 'notExists':
        return fieldValue === null || fieldValue === undefined;

      case 'isTrue':
        return fieldValue === true || fieldValue === 'true' || fieldValue === 1;

      case 'isFalse':
        return fieldValue === false || fieldValue === 'false' || fieldValue === 0;

      case 'eq':
        // Use loose equality for cross-type comparisons (e.g., number vs. string from templates)
        return fieldValue == compareValue;

      case 'neq':
        return fieldValue != compareValue;

      case 'gt':
        return Number(fieldValue) > Number(compareValue);

      case 'lt':
        return Number(fieldValue) < Number(compareValue);

      case 'gte':
        return Number(fieldValue) >= Number(compareValue);

      case 'lte':
        return Number(fieldValue) <= Number(compareValue);

      case 'contains': {
        const str = String(fieldValue ?? '');
        return str.includes(String(compareValue ?? ''));
      }

      case 'startsWith': {
        const str = String(fieldValue ?? '');
        return str.startsWith(String(compareValue ?? ''));
      }

      case 'endsWith': {
        const str = String(fieldValue ?? '');
        return str.endsWith(String(compareValue ?? ''));
      }

      case 'matches': {
        const str = String(fieldValue ?? '');
        const pattern = String(compareValue ?? '');
        // Reject patterns that could cause ReDoS: limit length and disallow nested quantifiers
        if (pattern.length > 256) {
          throw new Error('Regex pattern exceeds maximum allowed length of 256 characters');
        }
        const regex = new RegExp(pattern);
        return regex.test(str);
      }

      default: {
        const exhaustive: never = operator;
        throw new Error(`Unknown operator: ${String(exhaustive)}`);
      }
    }
  }

  /**
   * Validates a ConditionNode tree without evaluating it.
   * Returns an array of validation error strings. Empty array = valid.
   */
  static validate(condition: ConditionNode): string[] {
    const errors: string[] = [];
    this.validateNode(condition, errors, 'root');
    return errors;
  }

  private static validateNode(node: ConditionNode, errors: string[], path: string): void {
    if (node.kind === 'group') {
      if (!['AND', 'OR'].includes(node.logic)) {
        errors.push(`${path}: invalid logic "${node.logic}", must be AND or OR`);
      }
      node.conditions.forEach((child, i) =>
        this.validateNode(child, errors, `${path}.conditions[${i}]`),
      );
    } else {
      if (!node.field || typeof node.field !== 'string') {
        errors.push(`${path}: field must be a non-empty string`);
      }
      if (!node.operator) {
        errors.push(`${path}: operator is required`);
      }
      const unaryOperators: ComparisonOperator[] = [
        'exists',
        'notExists',
        'isTrue',
        'isFalse',
      ];
      const requiresValue = !unaryOperators.includes(node.operator);
      if (requiresValue && node.value === undefined && node.value === null) {
        errors.push(`${path}: operator "${node.operator}" requires a value`);
      }
    }
  }
}
