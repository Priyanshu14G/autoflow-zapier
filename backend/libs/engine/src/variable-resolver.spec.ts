import { VariableResolver, ExecutionContext } from './variable-resolver';

describe('VariableResolver', () => {
  const baseContext: ExecutionContext = {
    trigger: {
      email: 'alice@example.com',
      amount: 4500,
      nested: { city: 'London', tags: ['vip', 'gold'] },
    },
    steps: {
      parseEmail: {
        output: { domain: 'example.com', user: 'alice' },
        status: 'SUCCESS',
      },
      calculateTotal: {
        output: { total: 9000, currency: 'USD' },
        status: 'SUCCESS',
      },
    },
    run: {
      id: 'run-abc-123',
      workflowId: 'wf-xyz',
      startedAt: '2024-01-01T00:00:00.000Z',
      triggeredBy: 'schedule',
    },
    env: {
      SMTP_HOST: 'mail.example.com',
    },
  };

  describe('resolveString', () => {
    it('resolves a single trigger variable', () => {
      expect(VariableResolver.resolveString('{{trigger.email}}', baseContext)).toBe(
        'alice@example.com',
      );
    });

    it('resolves a numeric trigger variable as a number (single-token fast path)', () => {
      expect(VariableResolver.resolveString('{{trigger.amount}}', baseContext)).toBe(4500);
    });

    it('resolves nested trigger fields', () => {
      expect(
        VariableResolver.resolveString('{{trigger.nested.city}}', baseContext),
      ).toBe('London');
    });

    it('resolves array index access', () => {
      expect(VariableResolver.resolveString('{{trigger.nested.tags.0}}', baseContext)).toBe('vip');
    });

    it('resolves step output', () => {
      expect(
        VariableResolver.resolveString('{{steps.parseEmail.output.domain}}', baseContext),
      ).toBe('example.com');
    });

    it('resolves step status', () => {
      expect(
        VariableResolver.resolveString('{{steps.parseEmail.status}}', baseContext),
      ).toBe('SUCCESS');
    });

    it('resolves run metadata', () => {
      expect(VariableResolver.resolveString('{{run.id}}', baseContext)).toBe('run-abc-123');
    });

    it('resolves env variables', () => {
      expect(VariableResolver.resolveString('{{env.SMTP_HOST}}', baseContext)).toBe(
        'mail.example.com',
      );
    });

    it('resolves multiple tokens embedded in a string', () => {
      const result = VariableResolver.resolveString(
        'Hello {{trigger.email}}, total is {{steps.calculateTotal.output.total}}',
        baseContext,
      );
      expect(result).toBe('Hello alice@example.com, total is 9000');
    });

    it('returns empty string for unknown path', () => {
      const result = VariableResolver.resolveString('{{trigger.nonexistent}}', baseContext);
      expect(result).toBe('');
    });

    it('returns undefined for unknown namespace in single-token mode', () => {
      const result = VariableResolver.resolveString('{{unknown.key}}', baseContext);
      expect(result).toBeUndefined();
    });

    it('handles whitespace inside tokens', () => {
      expect(VariableResolver.resolveString('{{  trigger.email  }}', baseContext)).toBe(
        'alice@example.com',
      );
    });
  });

  describe('resolve (deep)', () => {
    it('resolves strings inside an object recursively', () => {
      const template = {
        to: '{{trigger.email}}',
        subject: 'Your order total is {{steps.calculateTotal.output.total}}',
        metadata: {
          runId: '{{run.id}}',
        },
      };

      const result = VariableResolver.resolve(template, baseContext) as Record<string, unknown>;
      expect(result.to).toBe('alice@example.com');
      expect(result.subject).toBe('Your order total is 9000');
      expect((result.metadata as Record<string, string>).runId).toBe('run-abc-123');
    });

    it('resolves strings inside arrays', () => {
      const template = ['{{trigger.email}}', '{{run.id}}'];
      const result = VariableResolver.resolve(template, baseContext) as string[];
      expect(result[0]).toBe('alice@example.com');
      expect(result[1]).toBe('run-abc-123');
    });

    it('returns non-string primitives unchanged', () => {
      expect(VariableResolver.resolve(42, baseContext)).toBe(42);
      expect(VariableResolver.resolve(true, baseContext)).toBe(true);
      expect(VariableResolver.resolve(null, baseContext)).toBeNull();
    });
  });

  describe('deepGet', () => {
    it('returns root object when keys is empty', () => {
      expect(VariableResolver.deepGet({ a: 1 }, [])).toEqual({ a: 1 });
    });

    it('returns undefined for null intermediate value', () => {
      expect(VariableResolver.deepGet(null, ['a'])).toBeUndefined();
    });

    it('supports array index access', () => {
      expect(VariableResolver.deepGet(['x', 'y', 'z'], ['1'])).toBe('y');
    });

    it('returns undefined for non-numeric key on array', () => {
      expect(VariableResolver.deepGet(['x', 'y'], ['bad'])).toBeUndefined();
    });
  });

  describe('buildContext', () => {
    it('separates trigger from step outputs', () => {
      const contextData: Record<string, unknown> = {
        trigger: { orderId: '123' },
        sendEmail: { output: { messageId: 'msg-1' }, status: 'SUCCESS' },
      };
      const ctx = VariableResolver.buildContext(
        { id: 'r1', workflowId: 'wf1', startedAt: new Date('2024-01-01'), triggeredBy: null },
        contextData,
      );
      expect(ctx.trigger).toEqual({ orderId: '123' });
      expect(ctx.steps.sendEmail).toEqual({ output: { messageId: 'msg-1' }, status: 'SUCCESS' });
      expect(ctx.run.id).toBe('r1');
    });
  });
});
