export type UserRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: UserRole;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'starter' | 'pro' | 'business';
  ownerId: string;
  membersCount: number;
  activeWorkflowsCount: number;
}

export type WorkflowStatus = 'active' | 'paused' | 'draft';

export type NodeCategory = 'trigger' | 'action' | 'logic' | 'ai' | 'utility';

export interface NodeOutputVariable {
  key: string;
  label: string;
  example: string;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
}

export interface WorkflowNodeData {
  title: string;
  subtitle: string;
  app: string;
  category: NodeCategory;
  configured: boolean;
  iconName?: string;
  color?: string;
  config: Record<string, any>;
  outputs: NodeOutputVariable[];
  status?: 'idle' | 'running' | 'success' | 'failed';
  lastRunOutput?: any;
}

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: WorkflowNodeData;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
  style?: Record<string, any>;
}

export interface WorkflowVersion {
  version: number;
  createdAt: string;
  createdByName: string;
  notes: string;
  nodesCount: number;
}

export interface Workflow {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  createdAt: string;
  updatedAt: string;
  lastRunAt: string | null;
  totalRuns: number;
  successRate: number; // 0 - 100
  webhookSecret?: string;
  version: number;
  versions?: WorkflowVersion[];
}

export type RunStatus = 'running' | 'success' | 'failed' | 'cancelled';

export interface StepRun {
  id: string;
  nodeId: string;
  nodeTitle: string;
  app: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  startedAt: string;
  finishedAt: string | null;
  durationMs: number;
  input: Record<string, any>;
  output: Record<string, any> | null;
  errorMessage?: string;
  requestPayload?: any;
  responsePayload?: any;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  workflowName: string;
  status: RunStatus;
  startedAt: string;
  completedAt: string | null;
  durationMs: number;
  triggerSource: string;
  stepsCount: number;
  steps: StepRun[];
  errorMessage?: string;
  tasksConsumed: number;
}

export interface IntegrationAction {
  id: string;
  name: string;
  description: string;
  inputs: Array<{
    key: string;
    label: string;
    type: 'string' | 'textarea' | 'select' | 'boolean' | 'number';
    required: boolean;
    placeholder?: string;
    options?: string[];
  }>;
  outputs: NodeOutputVariable[];
}

export interface IntegrationTrigger {
  id: string;
  name: string;
  description: string;
  type: 'polling' | 'webhook' | 'schedule';
  outputs: NodeOutputVariable[];
}

export interface Integration {
  id: string;
  name: string;
  slug: string;
  category: 'Communication' | 'Productivity' | 'CRM' | 'Developer Tools' | 'Marketing' | 'Finance' | 'Databases' | 'AI' | 'E-commerce' | 'Storage';
  description: string;
  iconBg: string;
  iconColor: string;
  connected: boolean;
  connectedAccount?: string;
  connectedAt?: string;
  authMethod: 'OAuth 2.0' | 'API Key' | 'Connection String' | 'Webhook' | 'Service Account';
  triggers: IntegrationTrigger[];
  actions: IntegrationAction[];
  docsUrl: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  apps: string[];
  stepsCount: number;
  popular?: boolean;
  workflowData: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  };
}

export interface PricingPlan {
  id: 'free' | 'starter' | 'pro' | 'business';
  name: string;
  audience: string;
  priceMonthly: number;
  tasksMonthly: number;
  activeWorkflowsLimit: number | 'Unlimited';
  checkFrequency: string;
  features: string[];
  popular?: boolean;
}
