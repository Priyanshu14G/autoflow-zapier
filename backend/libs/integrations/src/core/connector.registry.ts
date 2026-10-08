import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  ActionExecutionContext,
  ActionExecutionResult,
  Connector,
} from './connector.interface';

@Injectable()
export class ConnectorRegistry {
  private readonly logger = new Logger(ConnectorRegistry.name);
  private readonly connectors = new Map<string, Connector>();

  register(connector: Connector): void {
    if (this.connectors.has(connector.id)) {
      this.logger.warn(`Overwriting existing connector with id '${connector.id}'`);
    }
    this.connectors.set(connector.id, connector);
    this.logger.log(`Registered connector: ${connector.id} with ${connector.actions.size} action(s)`);
  }

  getConnector(id: string): Connector | undefined {
    return this.connectors.get(id);
  }

  hasConnector(id: string): boolean {
    return this.connectors.has(id);
  }

  listConnectors(): Array<ReturnType<Connector['toMetadata']>> {
    return Array.from(this.connectors.values()).map((c) => {
      if ('toMetadata' in c && typeof (c as any).toMetadata === 'function') {
        return (c as any).toMetadata();
      }
      return {
        id: c.id,
        name: c.name,
        description: c.description,
        category: c.category,
        icon: c.icon,
        authType: c.authType,
        authFields: c.authFields,
        actions: Array.from(c.actions.values()).map(({ key, name, description, inputSchema, outputSchema }) => ({
          key,
          name,
          description,
          inputSchema,
          outputSchema,
        })),
      };
    });
  }

  async executeAction(
    connectorId: string,
    actionKey: string,
    context: ActionExecutionContext,
  ): Promise<ActionExecutionResult> {
    const connector = this.connectors.get(connectorId);
    if (!connector) {
      throw new NotFoundException(`Connector with id '${connectorId}' not found`);
    }

    const action = connector.getAction(actionKey);
    if (!action) {
      throw new NotFoundException(
        `Action '${actionKey}' not found in connector '${connectorId}'. Available actions: ${Array.from(connector.actions.keys()).join(', ')}`,
      );
    }

    this.logger.log(`Executing connector action: ${connectorId}.${actionKey}`);
    return action.execute(context);
  }
}
