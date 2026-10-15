import { ConnectorRegistry } from './connector.registry';
import { BaseConnector } from './base.connector';
import { NotFoundException } from '@nestjs/common';

class TestConnector extends BaseConnector {
  readonly id = 'test-connector';
  readonly name = 'Test Connector';
  readonly description = 'For testing purposes';
  readonly category = 'DEV_TOOLS' as const;
  readonly authType = 'NONE' as const;

  constructor() {
    super();
    this.registerAction({
      key: 'echo',
      name: 'Echo Action',
      description: 'Echoes back input payload',
      inputSchema: {
        msg: { type: 'string', label: 'Message', required: true },
      },
      execute: async (ctx) => ({
        success: true,
        data: { echoed: ctx.input.msg },
      }),
    });
  }
}

describe('ConnectorRegistry', () => {
  let registry: ConnectorRegistry;

  beforeEach(() => {
    registry = new ConnectorRegistry();
  });

  it('should register and retrieve a connector', () => {
    const connector = new TestConnector();
    registry.register(connector);

    expect(registry.hasConnector('test-connector')).toBe(true);
    expect(registry.getConnector('test-connector')).toBe(connector);
  });

  it('should list all registered connectors and their action schemas', () => {
    const connector = new TestConnector();
    registry.register(connector);

    const list = registry.listConnectors();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('test-connector');
    expect(list[0].actions).toHaveLength(1);
    expect(list[0].actions[0].key).toBe('echo');
  });

  it('should dispatch and execute an action correctly', async () => {
    const connector = new TestConnector();
    registry.register(connector);

    const result = await registry.executeAction('test-connector', 'echo', {
      input: { msg: 'Hello world' },
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ echoed: 'Hello world' });
  });

  it('should throw NotFoundException for unregistered connector', async () => {
    await expect(
      registry.executeAction('unknown-connector', 'action', { input: {} }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException for unknown action in registered connector', async () => {
    const connector = new TestConnector();
    registry.register(connector);

    await expect(
      registry.executeAction('test-connector', 'unknown-action', { input: {} }),
    ).rejects.toThrow(NotFoundException);
  });
});
