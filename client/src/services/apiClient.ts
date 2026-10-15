/**
 * apiClient.ts
 * Centralized HTTP client for the AutoFlow backend (http://localhost:4000/api/v1)
 */

const BASE_URL = 'http://localhost:4000/api/v1';
const TOKEN_KEY = 'autoflow_access_token';
const WORKSPACE_ID_KEY = 'autoflow_workspace_id';

// ─── Token helpers ───────────────────────────────────────────────────────────
export const TokenStore = {
  get: (): string | null => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
  isAuthenticated: (): boolean => !!localStorage.getItem(TOKEN_KEY),
};

export const WorkspaceStore = {
  get: (): string | null => localStorage.getItem(WORKSPACE_ID_KEY),
  set: (id: string) => localStorage.setItem(WORKSPACE_ID_KEY, id),
  clear: () => localStorage.removeItem(WORKSPACE_ID_KEY),
};

// ─── Core fetch wrapper ───────────────────────────────────────────────────────
async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  authenticated = true,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (authenticated) {
    const token = TokenStore.get();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let errorMessage = `HTTP ${res.status}`;
    try {
      const errBody = await res.json();
      errorMessage = errBody.message || errBody.error || errorMessage;
    } catch { /* ignore */ }
    throw new Error(errorMessage);
  }

  if (res.status === 204) return undefined as unknown as T;
  return res.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface AuthResponse {
  accessToken: string;
  user: { id: string; email: string; firstName: string | null; lastName: string | null };
  defaultWorkspaceId: string;
}

export const AuthApi = {
  register: (data: { email: string; password: string; firstName?: string; lastName?: string; organizationName?: string }) =>
    request<AuthResponse>('POST', '/auth/register', data, false),

  login: (data: { email: string; password: string }) =>
    request<AuthResponse>('POST', '/auth/login', data, false),

  getMe: () => request<any>('GET', '/auth/me'),
};

// ─── Workflow types ───────────────────────────────────────────────────────────
export interface ApiWorkflow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
  totalRuns?: number;
  successRate?: number;
  lastRunAt?: string | null;
  draft?: { nodes: any[]; edges: any[] };
  published?: { nodes: any[]; edges: any[] };
}

export interface ApiStepRun {
  id: string;
  nodeKey?: string;
  nodeId?: string;
  nodeType?: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'SUCCESS' | 'FAILED' | string;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  inputData?: any;
  outputData?: any;
  errorMessage?: string;
}

export interface ApiRun {
  id: string;
  workflowId: string;
  workflowName?: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | string;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  triggerPayload?: any;
  stepRuns?: ApiStepRun[];
  steps?: ApiStepRun[];
  errorMessage?: string;
}

// ─── Workflow API ─────────────────────────────────────────────────────────────
export const WorkflowApi = {
  list: (workspaceId: string) =>
    request<ApiWorkflow[]>('GET', `/workspaces/${workspaceId}/workflows`),

  get: (workspaceId: string, workflowId: string) =>
    request<ApiWorkflow>('GET', `/workspaces/${workspaceId}/workflows/${workflowId}`),

  create: (workspaceId: string, data: { name: string; description?: string }) =>
    request<ApiWorkflow>('POST', `/workspaces/${workspaceId}/workflows`, data),

  update: (workspaceId: string, workflowId: string, data: { name?: string; description?: string }) =>
    request<ApiWorkflow>('PATCH', `/workspaces/${workspaceId}/workflows/${workflowId}`, data),

  saveDraft: (workspaceId: string, workflowId: string, data: { nodes: any[]; edges: any[] }) =>
    request<ApiWorkflow>('PUT', `/workspaces/${workspaceId}/workflows/${workflowId}/draft`, data),

  publish: (workspaceId: string, workflowId: string) =>
    request<ApiWorkflow>('POST', `/workspaces/${workspaceId}/workflows/${workflowId}/publish`),

  delete: (workspaceId: string, workflowId: string) =>
    request<void>('DELETE', `/workspaces/${workspaceId}/workflows/${workflowId}`),

  execute: (workspaceId: string, workflowId: string, triggerPayload?: any) =>
    request<{ runId: string; status: string }>(
      'POST',
      `/workspaces/${workspaceId}/workflows/${workflowId}/execute`,
      { triggerPayload: triggerPayload || { source: 'manual_ui', timestamp: new Date().toISOString() } },
    ),

  listRuns: (workspaceId: string, workflowId: string) =>
    request<ApiRun[]>('GET', `/workspaces/${workspaceId}/workflows/${workflowId}/runs`),

  getRun: (workspaceId: string, workflowId: string, runId: string) =>
    request<ApiRun>('GET', `/workspaces/${workspaceId}/workflows/${workflowId}/runs/${runId}`),

  cancelRun: (workspaceId: string, workflowId: string, runId: string) =>
    request<void>('POST', `/workspaces/${workspaceId}/workflows/${workflowId}/runs/${runId}/cancel`),

  listAllRuns: (workspaceId: string) =>
    request<ApiRun[]>('GET', `/workspaces/${workspaceId}/runs`).catch(() => [] as ApiRun[]),
};

// ─── Status mappers ───────────────────────────────────────────────────────────
export function mapRunStatus(s: string): 'running' | 'success' | 'failed' | 'cancelled' {
  switch ((s || '').toUpperCase()) {
    case 'RUNNING':
    case 'PENDING':
      return 'running';
    case 'COMPLETED':
    case 'SUCCESS':
      return 'success';
    case 'FAILED':
      return 'failed';
    case 'CANCELLED':
      return 'cancelled';
    default:
      return 'running';
  }
}

export function mapStepStatus(s: string): 'pending' | 'running' | 'success' | 'failed' {
  switch ((s || '').toUpperCase()) {
    case 'PENDING':
      return 'pending';
    case 'RUNNING':
      return 'running';
    case 'COMPLETED':
    case 'SUCCESS':
      return 'success';
    case 'FAILED':
      return 'failed';
    default:
      return 'pending';
  }
}

// ─── Convert ApiWorkflow → frontend Workflow ──────────────────────────────────
export function apiWorkflowToFrontend(w: ApiWorkflow): import('../types').Workflow {
  const nodesData = w.draft?.nodes || w.published?.nodes || [];
  const edgesData = w.draft?.edges || w.published?.edges || [];

  return {
    id: w.id,
    workspaceId: w.workspaceId,
    name: w.name,
    description: w.description || '',
    status: (w.status === 'ACTIVE' ? 'active' : w.status === 'PAUSED' ? 'paused' : 'draft') as any,
    nodes: Array.isArray(nodesData) ? nodesData : [],
    edges: Array.isArray(edgesData) ? edgesData : [],
    createdAt: w.createdAt,
    updatedAt: w.updatedAt,
    lastRunAt: w.lastRunAt || null,
    totalRuns: w.totalRuns || 0,
    successRate: w.successRate || 0,
    version: 1,
    versions: [],
  };
}

// ─── Convert ApiRun → frontend WorkflowRun ────────────────────────────────────
export function apiRunToFrontend(r: ApiRun, workflowName = 'Pipeline Execution'): import('../types').WorkflowRun {
  const stepsList = r.stepRuns || r.steps || [];
  return {
    id: r.id,
    workflowId: r.workflowId,
    workflowName: r.workflowName || workflowName,
    status: mapRunStatus(r.status),
    startedAt: r.startedAt || new Date().toISOString(),
    completedAt: r.completedAt,
    durationMs: r.durationMs || 0,
    triggerSource: r.triggerPayload?.source || 'manual_ui',
    stepsCount: stepsList.length,
    tasksConsumed: stepsList.length || 1,
    errorMessage: r.errorMessage,
    steps: stepsList.map((s, index) => ({
      id: s.id || `step-${index}`,
      nodeId: s.nodeKey || s.nodeId || `step-${index}`,
      nodeTitle: s.nodeKey || s.nodeId || `Step ${index + 1}`,
      app: s.nodeType?.toLowerCase() || 'http',
      status: mapStepStatus(s.status),
      startedAt: s.startedAt || new Date().toISOString(),
      finishedAt: s.completedAt,
      durationMs: s.durationMs || 0,
      input: s.inputData || {},
      output: s.outputData || null,
      errorMessage: s.errorMessage,
      requestPayload: s.inputData,
      responsePayload: s.outputData,
    })),
  };
}
