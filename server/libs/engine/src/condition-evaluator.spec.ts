import { ConditionEvaluator, ConditionNode } from './condition-evaluator';
import { ExecutionContext } from './variable-resolver';

describe('ConditionEvaluator', () => {
  const context: ExecutionContext = {
    trigger: {
      amount: 4500,
      status: 'active',
      email: 'alice@example.com',
      flag: true,
    },
    steps: {
      parseData: {
        output: { score: 95, tag: 'premium' },
        status: 'SUCCESS',
      },
    },
    run: { id: 'r1', workflowId: 'wf1', startedAt: '2024-01-01T00:00:00.000Z' },
    env: {},
  };

  // ── Leaf: existence operators ────────────────────────────────────────────

  it('exists: returns true when field has a value', () => {
    const condition: ConditionNode = {
      kind: 'leaf',
      field: '{{trigger.amount}}',
      operator: 'exists',
    };
    expect(ConditionEvaluator.evaluate(condition, context).passed).toBe(true);
  });

  it('notExists: returns true when field is missing', () => {
    const condition: ConditionNode = {
      kind: 'leaf',
      field: '{{trigger.nonExistent}}',
      operator: 'notExists',
    };
    expect(ConditionEvaluator.evaluate(condition, context).passed).toBe(true);
  });

  // ── Leaf: boolean operators ──────────────────────────────────────────────

  it('isTrue: matches boolean true', () => {
    const condition: ConditionNode = {
      kind: 'leaf',
      field: '{{trigger.flag}}',
      operator: 'isTrue',
    };
    expect(ConditionEvaluator.evaluate(condition, context).passed).toBe(true);
  });

  it('isFalse: fails for boolean true', () => {
    const condition: ConditionNode = {
      kind: 'leaf',
      field: '{{trigger.flag}}',
      operator: 'isFalse',
    };
    expect(ConditionEvaluator.evaluate(condition, context).passed).toBe(false);
  });

  // ── Leaf: equality operators ─────────────────────────────────────────────

  it('eq: compares string value', () => {
    const condition: ConditionNode = {
      kind: 'leaf',
      field: '{{trigger.status}}',
      operator: 'eq',
      value: 'active',
    };
    expect(ConditionEvaluator.evaluate(condition, context).passed).toBe(true);
  });

  it('eq: fails for different value', () => {
    const condition: ConditionNode = {
      kind: 'leaf',
      field: '{{trigger.status}}',
      operator: 'eq',
      value: 'inactive',
    };
    expect(ConditionEvaluator.evaluate(condition, context).passed).toBe(false);
  });

  it('neq: passes for different value', () => {
    const condition: ConditionNode = {
      kind: 'leaf',
      field: '{{trigger.status}}',
      operator: 'neq',
      value: 'inactive',
    };
    expect(ConditionEvaluator.evaluate(condition, context).passed).toBe(true);
  });

  // ── Leaf: numeric comparison ─────────────────────────────────────────────

  it('gt: passes when field > value', () => {
    const condition: ConditionNode = {
      kind: 'leaf',
      field: '{{trigger.amount}}',
      operator: 'gt',
      value: 1000,
    };
    expect(ConditionEvaluator.evaluate(condition, context).passed).toBe(true);
  });

  it('gt: fails when field <= value', () => {
    const condition: ConditionNode = {
      kind: 'leaf',
      field: '{{trigger.amount}}',
      operator: 'gt',
      value: 5000,
    };
    expect(ConditionEvaluator.evaluate(condition, context).passed).toBe(false);
  });

  it('lte: passes when field <= value', () => {
    const condition: ConditionNode = {
      kind: 'leaf',
      field: '{{trigger.amount}}',
      operator: 'lte',
      value: 4500,
    };
    expect(ConditionEvaluator.evaluate(condition, context).passed).toBe(true);
  });

  it('gte: passes when field == value', () => {
    const condition: ConditionNode = {
      kind: 'leaf',
      field: '{{steps.parseData.output.score}}',
      operator: 'gte',
      value: 95,
    };
    expect(ConditionEvaluator.evaluate(condition, context).passed).toBe(true);
  });

  // ── Leaf: string operators ───────────────────────────────────────────────

  it('contains: passes when field contains substring', () => {
    const condition: ConditionNode = {
      kind: 'leaf',
      field: '{{trigger.email}}',
      operator: 'contains',
      value: 'example',
    };
    expect(ConditionEvaluator.evaluate(condition, context).passed).toBe(true);
  });

  it('startsWith: passes when field starts with prefix', () => {
    const condition: ConditionNode = {
      kind: 'leaf',
      field: '{{trigger.email}}',
      operator: 'startsWith',
      value: 'alice',
    };
    expect(ConditionEvaluator.evaluate(condition, context).passed).toBe(true);
  });

  it('endsWith: passes when field ends with suffix', () => {
    const condition: ConditionNode = {
      kind: 'leaf',
      field: '{{trigger.email}}',
      operator: 'endsWith',
      value: '.com',
    };
    expect(ConditionEvaluator.evaluate(condition, context).passed).toBe(true);
  });

  it('matches: regex match passes', () => {
    const condition: ConditionNode = {
      kind: 'leaf',
      field: '{{trigger.email}}',
      operator: 'matches',
      value: '^alice@.*\\.com$',
    };
    expect(ConditionEvaluator.evaluate(condition, context).passed).toBe(true);
  });

  it('matches: rejects overly long regex', () => {
    const condition: ConditionNode = {
      kind: 'leaf',
      field: '{{trigger.email}}',
      operator: 'matches',
      value: 'a'.repeat(257),
    };
    const result = ConditionEvaluator.evaluate(condition, context);
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('Error evaluating condition');
  });

  // ── Group: AND logic ─────────────────────────────────────────────────────

  it('AND group: passes when all conditions pass', () => {
    const condition: ConditionNode = {
      kind: 'group',
      logic: 'AND',
      conditions: [
        { kind: 'leaf', field: '{{trigger.amount}}', operator: 'gt', value: 1000 },
        { kind: 'leaf', field: '{{trigger.status}}', operator: 'eq', value: 'active' },
      ],
    };
    expect(ConditionEvaluator.evaluate(condition, context).passed).toBe(true);
  });

  it('AND group: fails when any condition fails', () => {
    const condition: ConditionNode = {
      kind: 'group',
      logic: 'AND',
      conditions: [
        { kind: 'leaf', field: '{{trigger.amount}}', operator: 'gt', value: 1000 },
        { kind: 'leaf', field: '{{trigger.status}}', operator: 'eq', value: 'inactive' },
      ],
    };
    expect(ConditionEvaluator.evaluate(condition, context).passed).toBe(false);
  });

  // ── Group: OR logic ──────────────────────────────────────────────────────

  it('OR group: passes when at least one condition passes', () => {
    const condition: ConditionNode = {
      kind: 'group',
      logic: 'OR',
      conditions: [
        { kind: 'leaf', field: '{{trigger.status}}', operator: 'eq', value: 'inactive' },
        { kind: 'leaf', field: '{{trigger.amount}}', operator: 'gt', value: 100 },
      ],
    };
    expect(ConditionEvaluator.evaluate(condition, context).passed).toBe(true);
  });

  it('OR group: fails when all conditions fail', () => {
    const condition: ConditionNode = {
      kind: 'group',
      logic: 'OR',
      conditions: [
        { kind: 'leaf', field: '{{trigger.status}}', operator: 'eq', value: 'inactive' },
        { kind: 'leaf', field: '{{trigger.amount}}', operator: 'gt', value: 99999 },
      ],
    };
    expect(ConditionEvaluator.evaluate(condition, context).passed).toBe(false);
  });

  it('Empty AND group defaults to true', () => {
    const condition: ConditionNode = {
      kind: 'group',
      logic: 'AND',
      conditions: [],
    };
    expect(ConditionEvaluator.evaluate(condition, context).passed).toBe(true);
  });

  // ── Nested groups ────────────────────────────────────────────────────────

  it('Nested AND/OR groups evaluate correctly', () => {
    // (amount > 1000 AND status == active) OR (score >= 90)
    const condition: ConditionNode = {
      kind: 'group',
      logic: 'OR',
      conditions: [
        {
          kind: 'group',
          logic: 'AND',
          conditions: [
            { kind: 'leaf', field: '{{trigger.amount}}', operator: 'gt', value: 1000 },
            { kind: 'leaf', field: '{{trigger.status}}', operator: 'eq', value: 'active' },
          ],
        },
        {
          kind: 'leaf',
          field: '{{steps.parseData.output.score}}',
          operator: 'gte',
          value: 90,
        },
      ],
    };
    expect(ConditionEvaluator.evaluate(condition, context).passed).toBe(true);
  });

  // ── validate() ──────────────────────────────────────────────────────────

  it('validate: returns empty array for valid leaf', () => {
    const condition: ConditionNode = {
      kind: 'leaf',
      field: '{{trigger.amount}}',
      operator: 'gt',
      value: 100,
    };
    expect(ConditionEvaluator.validate(condition)).toHaveLength(0);
  });

  it('validate: returns errors for invalid logic type', () => {
    const condition = {
      kind: 'group',
      logic: 'XOR', // invalid
      conditions: [],
    } as unknown as ConditionNode;
    const errors = ConditionEvaluator.validate(condition);
    expect(errors.length).toBeGreaterThan(0);
  });
});
