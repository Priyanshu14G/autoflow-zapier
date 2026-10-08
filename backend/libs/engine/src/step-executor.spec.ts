import { StepExecutor, TimeoutError } from './step-executor';
import { NodeType } from '@libs/domain';
import { ExecutionContext } from './variable-resolver';

describe('StepExecutor', () => {
  const mockContext: ExecutionContext = {
    trigger: {
      userId: 'user_123',
      amount: 250,
    },
    steps: {
      step_a: {
        output: { status: 'approved' },
      },
    },
    run: {
      id: 'run_999',
      workflowId: 'wf_111',
      startedAt: new Date().toISOString(),
    },
  };

  it('resolves variables in rawInput before dispatching an ACTION node', async () => {
    const node = {
      nodeKey: 'send_receipt',
      type: NodeType.ACTION,
      integration: 'email',
      operation: 'send',
    };

    const rawInput = {
      recipient: '{{trigger.userId}}@example.com',
      total: '{{trigger.amount}}',
      priorStatus: '{{steps.step_a.output.status}}',
    };

    const result = await StepExecutor.executeWithTimeout(node, rawInput, mockContext, 5000);

    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.output).toMatchObject({
      status: 'success',
      integration: 'email',
      operation: 'send',
      payload: {
        recipient: 'user_123@example.com',
        total: 250,
        priorStatus: 'approved',
      },
    });
  });

  it('evaluates CONDITION node with configured condition returning passed: true', async () => {
    const node = {
      nodeKey: 'check_amount',
      type: NodeType.CONDITION,
      config: {
        condition: {
          kind: 'leaf' as const,
          field: '{{trigger.amount}}',
          operator: 'gt' as const,
          value: 100,
        },
      },
    };

    const result = await StepExecutor.executeWithTimeout(node, {}, mockContext, 5000);

    expect(result.output.evaluated).toBe(true);
    expect(result.output.passed).toBe(true);
  });

  it('evaluates CONDITION node with failing condition returning passed: false', async () => {
    const node = {
      nodeKey: 'check_amount',
      type: NodeType.CONDITION,
      config: {
        condition: {
          kind: 'leaf' as const,
          field: '{{trigger.amount}}',
          operator: 'lt' as const,
          value: 100,
        },
      },
    };

    const result = await StepExecutor.executeWithTimeout(node, {}, mockContext, 5000);

    expect(result.output.evaluated).toBe(true);
    expect(result.output.passed).toBe(false);
  });

  it('handles DELAY nodes properly', async () => {
    const node = {
      nodeKey: 'wait_step',
      type: NodeType.DELAY,
      config: {
        delayMs: 50,
      },
    };

    const result = await StepExecutor.executeWithTimeout(node, {}, mockContext, 5000);

    expect(result.output.delayedMs).toBe(50);
    expect(result.durationMs).toBeGreaterThanOrEqual(40);
  });

  it('throws TimeoutError when step exceeds timeout', async () => {
    const node = {
      nodeKey: 'slow_step',
      type: NodeType.DELAY,
      config: {
        delayMs: 200,
      },
    };

    await expect(
      StepExecutor.executeWithTimeout(node, {}, mockContext, 20),
    ).rejects.toThrow(TimeoutError);
  });

  it('delegates to ActionDispatcher when integration and operation are configured', async () => {
    const node = {
      nodeKey: 'notify_slack',
      type: NodeType.ACTION,
      integration: 'slack',
      operation: 'post_message',
    };

    const mockDispatcher = {
      executeAction: jest.fn().mockResolvedValue({
        success: true,
        data: { channel: '#alerts', ts: '12345.67' },
      }),
    };

    const result = await StepExecutor.executeWithTimeout(
      node,
      { channel: '#alerts' },
      mockContext,
      5000,
      mockDispatcher,
      { botToken: 'xoxb-test' },
    );

    expect(mockDispatcher.executeAction).toHaveBeenCalledWith(
      'slack',
      'post_message',
      expect.objectContaining({
        input: { channel: '#alerts' },
        credentials: { botToken: 'xoxb-test' },
      }),
    );
    expect(result.output).toMatchObject({
      status: 'success',
      integration: 'slack',
      operation: 'post_message',
      channel: '#alerts',
      ts: '12345.67',
    });
  });

  it('throws error when ActionDispatcher action execution returns success: false', async () => {
    const node = {
      nodeKey: 'failing_action',
      type: NodeType.ACTION,
      integration: 'http',
      operation: 'request',
    };

    const mockDispatcher = {
      executeAction: jest.fn().mockResolvedValue({
        success: false,
        data: {},
        error: 'Connection refused',
      }),
    };

    await expect(
      StepExecutor.executeWithTimeout(
        node,
        {},
        mockContext,
        5000,
        mockDispatcher,
      ),
    ).rejects.toThrow('Connection refused');
  });
});
