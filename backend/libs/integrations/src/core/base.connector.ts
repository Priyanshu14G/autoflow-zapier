import {
  ActionDefinition,
  AuthType,
  Connector,
  ConnectorMetadata,
  PropertySchema,
} from './connector.interface';

export abstract class BaseConnector implements Connector {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly category: ConnectorMetadata['category'];
  readonly icon?: string;
  abstract readonly authType: AuthType;
  readonly authFields?: Record<string, PropertySchema>;

  readonly actions = new Map<string, ActionDefinition>();

  protected registerAction(action: ActionDefinition): void {
    this.actions.set(action.key, action);
  }

  getAction(actionKey: string): ActionDefinition | undefined {
    return this.actions.get(actionKey);
  }

  toMetadata(): ConnectorMetadata & { actions: Omit<ActionDefinition, 'execute'>[] } {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      category: this.category,
      icon: this.icon,
      authType: this.authType,
      authFields: this.authFields,
      actions: Array.from(this.actions.values()).map(({ key, name, description, inputSchema, outputSchema }) => ({
        key,
        name,
        description,
        inputSchema,
        outputSchema,
      })),
    };
  }
}
