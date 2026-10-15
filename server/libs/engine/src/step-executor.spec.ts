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

  // ── AI Node Tests ─────────────────────────────────────────────────────────

  describe('NodeType.AI', () => {
    const aiNode = {
      nodeKey: 'summarize_text',
      type: NodeType.AI,
      config: {
        model: 'gpt-4o-mini',
        provider: 'openai',
        systemPrompt: 'You are a helpful assistant.',
        prompt: 'Summarize: {{trigger.userId}} has balance {{trigger.amount}}',
        maxTokens: 200,
        temperature: 0.3,
        responseFormat: 'text',
      },
    };

    const mockAiDispatcher = {
      complete: jest.fn().mockResolvedValue({
        text: 'User user_123 has a balance of 250.',
        usage: { promptTokens: 25, completionTokens: 15, totalTokens: 40 },
        model: 'gpt-4o-mini',
        provider: 'openai',
        latencyMs: 142,
      }),
    };

    beforeEach(() => {
      mockAiDispatcher.complete.mockClear();
    });

    it('returns stub output when no aiDispatcher is provided', async () => {
      const result = await StepExecutor.executeWithTimeout(
        aiNode,
        {},
        mockContext,
        5000,
        undefined,
        undefined,
        undefined,
      );

      expect(result.output.status).toBe('stub');
      expect(result.output.model).toBe('gpt-4o-mini');
      expect(result.output.text).toContain('[AI node stub');
    });

    it('calls aiDispatcher.complete with resolved prompt variables', async () => {
      await StepExecutor.executeWithTimeout(
        aiNode,
        {},
        mockContext,
        5000,
        undefined,
        undefined,
        mockAiDispatcher,
      );

      expect(mockAiDispatcher.complete).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4o-mini',
          provider: 'openai',
          messages: expect.arrayContaining([
            { role: 'system', content: 'You are a helpful assistant.' },
            {
              role: 'user',
              content: 'Summarize: user_123 has balance 250',
            },
          ]),
          maxTokens: 200,
          temperature: 0.3,
          responseFormat: 'text',
        }),
      );
    });

    it('returns structured output with model, provider, usage and latency', async () => {
      const result = await StepExecutor.executeWithTimeout(
        aiNode,
        {},
        mockContext,
        5000,
        undefined,
        undefined,
        mockAiDispatcher,
      );

      expect(result.output).toMatchObject({
        status: 'success',
        model: 'gpt-4o-mini',
        provider: 'openai',
        text: 'User user_123 has a balance of 250.',
        usage: { promptTokens: 25, completionTokens: 15, totalTokens: 40 },
        latencyMs: 142,
      });
      expect(typeof result.output.completedAt).toBe('string');
    });

    it('includes json field in output when aiDispatcher returns json', async () => {
      const jsonDispatcher = {
        complete: jest.fn().mockResolvedValue({
          text: '{"summary": "user_123 balance is 250"}',
          json: { summary: 'user_123 balance is 250' },
          usage: { promptTokens: 10, completionTokens: 8, totalTokens: 18 },
          model: 'gpt-4o-mini',
          provider: 'openai',
          latencyMs: 90,
        }),
      };

      const jsonNode = {
        ...aiNode,
        config: { ...aiNode.config, responseFormat: 'json' },
      };

      const result = await StepExecutor.executeWithTimeout(
        jsonNode,
        {},
        mockContext,
        5000,
        undefined,
        undefined,
        jsonDispatcher,
      );

      expect(result.output.json).toEqual({ summary: 'user_123 balance is 250' });
    });

    it('defaults to JSON.stringify(input) as prompt when no prompt template configured', async () => {
      const nodeWithoutPrompt = {
        nodeKey: 'ai_passthrough',
        type: NodeType.AI,
        config: {
          model: 'gemini-1.5-flash',
        },
      };

      const dispatcher = {
        complete: jest.fn().mockResolvedValue({
          text: 'Processed',
          usage: { promptTokens: 5, completionTokens: 3, totalTokens: 8 },
          model: 'gemini-1.5-flash',
          provider: 'gemini',
          latencyMs: 50,
        }),
      };

      await StepExecutor.executeWithTimeout(
        nodeWithoutPrompt,
        { data: 'test' },
        mockContext,
        5000,
        undefined,
        undefined,
        dispatcher,
      );

      expect(dispatcher.complete).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining('data'),
            }),
          ]),
        }),
      );
    });
  });
});
