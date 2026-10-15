export type AuthType = 'NONE' | 'API_KEY' | 'BEARER_TOKEN' | 'BASIC' | 'OAUTH2' | 'CUSTOM';

export interface PropertySchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  label: string;
  description?: string;
  required?: boolean;
  default?: unknown;
  enum?: string[];
  placeholder?: string;
}

export interface ActionDefinition {
  key: string;
  name: string;
  description: string;
  inputSchema: Record<string, PropertySchema>;
  outputSchema?: Record<string, PropertySchema>;
  execute(context: ActionExecutionContext): Promise<ActionExecutionResult>;
}

export interface ActionExecutionContext {
  input: Record<string, unknown>;
  credentials?: Record<string, unknown>;
  connection?: {
    id: string;
    name: string;
    authType: string;
    metadata?: Record<string, unknown>;
  };
  workspaceId?: string;
  timeoutMs?: number;
}

export interface ActionExecutionResult {
  success: boolean;
  data: Record<string, unknown>;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface ConnectorMetadata {
  id: string;
  name: string;
  description: string;
  category: 'CORE' | 'COMMUNICATION' | 'PRODUCTIVITY' | 'DEV_TOOLS' | 'MARKETING';
  icon?: string;
  authType: AuthType;
  authFields?: Record<string, PropertySchema>;
}

export interface Connector extends ConnectorMetadata {
  actions: Map<string, ActionDefinition>;
  getAction(actionKey: string): ActionDefinition | undefined;
}

export interface ConnectorSummary extends ConnectorMetadata {
  actions: Omit<ActionDefinition, 'execute'>[];
}
