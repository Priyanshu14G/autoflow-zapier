import { Workflow, Integration, Template, WorkflowRun, User, Workspace } from '../types';
import { INITIAL_WORKFLOWS, INITIAL_INTEGRATIONS, INITIAL_TEMPLATES, INITIAL_RUNS } from './mockData';

const WORKFLOWS_KEY = 'autoflow_workflows_v1';
const INTEGRATIONS_KEY = 'autoflow_integrations_v1';
const RUNS_KEY = 'autoflow_runs_v1';
const USER_KEY = 'autoflow_user_v1';
const WORKSPACE_KEY = 'autoflow_workspace_v1';

export const INITIAL_USER: User = {
  id: 'usr_alex_01',
  name: 'Alex Chen',
  email: 'alex.ops@autoflow.io',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
  role: 'owner',
  createdAt: '2026-08-01T10:00:00Z',
};

export const INITIAL_WORKSPACES: Workspace[] = [
  {
    id: 'ws-main',
    name: 'Acme Production',
    slug: 'acme-production',
    plan: 'pro',
    ownerId: 'usr_alex_01',
    membersCount: 4,
    activeWorkflowsCount: 4,
  },
  {
    id: 'ws-staging',
    name: 'Dev Staging Lab',
    slug: 'dev-staging',
    plan: 'starter',
    ownerId: 'usr_alex_01',
    membersCount: 2,
    activeWorkflowsCount: 1,
  },
  {
    id: 'ws-personal',
    name: 'Personal Sandbox',
    slug: 'personal-sandbox',
    plan: 'free',
    ownerId: 'usr_alex_01',
    membersCount: 1,
    activeWorkflowsCount: 1,
  }
];

export class StorageService {
  // Workflows
  static getWorkflows(): Workflow[] {
    try {
      const data = localStorage.getItem(WORKFLOWS_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn('Failed to read workflows from localStorage', e);
    }
    this.saveWorkflows(INITIAL_WORKFLOWS);
    return INITIAL_WORKFLOWS;
  }

  static saveWorkflows(workflows: Workflow[]): void {
    try {
      localStorage.setItem(WORKFLOWS_KEY, JSON.stringify(workflows));
    } catch (e) {
      console.warn('Failed to write workflows to localStorage', e);
    }
  }

  static getWorkflowById(id: string): Workflow | null {
    const list = this.getWorkflows();
    return list.find((w) => w.id === id) || null;
  }

  static saveWorkflow(workflow: Workflow): void {
    const list = this.getWorkflows();
    const index = list.findIndex((w) => w.id === workflow.id);
    const updated = { ...workflow, updatedAt: new Date().toISOString() };
    if (index >= 0) {
      list[index] = updated;
    } else {
      list.unshift(updated);
    }
    this.saveWorkflows(list);
  }

  static createWorkflow(partial?: Partial<Workflow>): Workflow {
    const id = `wf-${Date.now().toString(36)}`;
    const secret = `sec_${Math.random().toString(36).substring(2, 10)}`;
    const newWf: Workflow = {
      id,
      workspaceId: 'ws-main',
      name: partial?.name || 'Untitled Workflow',
      description: partial?.description || 'Automated multi-step pipeline.',
      status: 'draft',
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastRunAt: null,
      totalRuns: 0,
      successRate: 0,
      webhookSecret: secret,
      nodes: partial?.nodes || [
        {
          id: 'node-1',
          type: 'workflowNode',
          position: { x: 100, y: 150 },
          data: {
            title: 'Webhook: Trigger Event',
            subtitle: 'Listens for incoming HTTP POST',
            app: 'http',
            category: 'trigger',
            configured: true,
            config: { path: `/webhooks/${id}` },
            outputs: [
              { key: 'trigger.body', label: 'Payload Body', example: '{"id": 101, "event": "user.signup"}' },
              { key: 'trigger.timestamp', label: 'Timestamp', example: new Date().toISOString() }
            ]
          }
        }
      ],
      edges: partial?.edges || [],
      versions: [
        {
          version: 1,
          createdAt: new Date().toISOString(),
          createdByName: 'Alex Chen',
          notes: 'Initial workflow creation',
          nodesCount: (partial?.nodes || []).length || 1
        }
      ]
    };
    const list = this.getWorkflows();
    list.unshift(newWf);
    this.saveWorkflows(list);
    return newWf;
  }

  static duplicateWorkflow(id: string): Workflow | null {
    const original = this.getWorkflowById(id);
    if (!original) return null;
    const copy: Workflow = {
      ...original,
      id: `wf-${Date.now().toString(36)}`,
      name: `${original.name} (Copy)`,
      status: 'draft',
      totalRuns: 0,
      successRate: 0,
      lastRunAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      webhookSecret: `sec_${Math.random().toString(36).substring(2, 10)}`,
      versions: [
        {
          version: 1,
          createdAt: new Date().toISOString(),
          createdByName: 'Alex Chen',
          notes: `Duplicated from ${original.name}`,
          nodesCount: original.nodes.length
        }
      ]
    };
    const list = this.getWorkflows();
    list.unshift(copy);
    this.saveWorkflows(list);
    return copy;
  }

  static deleteWorkflow(id: string): void {
    const list = this.getWorkflows().filter((w) => w.id !== id);
    this.saveWorkflows(list);
  }

  static toggleWorkflowStatus(id: string): Workflow | null {
    const list = this.getWorkflows();
    const wf = list.find((w) => w.id === id);
    if (!wf) return null;
    wf.status = wf.status === 'active' ? 'paused' : 'active';
    wf.updatedAt = new Date().toISOString();
    this.saveWorkflows(list);
    return wf;
  }

  // Integrations
  static getIntegrations(): Integration[] {
    try {
      const data = localStorage.getItem(INTEGRATIONS_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn(e);
    }
    this.saveIntegrations(INITIAL_INTEGRATIONS);
    return INITIAL_INTEGRATIONS;
  }

  static saveIntegrations(integrations: Integration[]): void {
    try {
      localStorage.setItem(INTEGRATIONS_KEY, JSON.stringify(integrations));
    } catch (e) {
      console.warn(e);
    }
  }

  static toggleIntegrationConnection(id: string, accountName?: string): Integration | null {
    const list = this.getIntegrations();
    const item = list.find((i) => i.id === id);
    if (!item) return null;
    if (item.connected) {
      item.connected = false;
      item.connectedAccount = undefined;
      item.connectedAt = undefined;
    } else {
      item.connected = true;
      item.connectedAccount = accountName || `${item.slug}.verified@workspace.io`;
      item.connectedAt = new Date().toISOString();
    }
    this.saveIntegrations(list);
    return item;
  }

  // Runs
  static getRuns(): WorkflowRun[] {
    try {
      const data = localStorage.getItem(RUNS_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn(e);
    }
    this.saveRuns(INITIAL_RUNS);
    return INITIAL_RUNS;
  }

  static saveRuns(runs: WorkflowRun[]): void {
    try {
      localStorage.setItem(RUNS_KEY, JSON.stringify(runs));
    } catch (e) {
      console.warn(e);
    }
  }

  static addRun(run: WorkflowRun): void {
    const list = this.getRuns();
    list.unshift(run);
    if (list.length > 100) list.pop();
    this.saveRuns(list);

    // Update parent workflow run stats
    const wfs = this.getWorkflows();
    const wf = wfs.find((w) => w.id === run.workflowId);
    if (wf) {
      wf.totalRuns += 1;
      wf.lastRunAt = run.completedAt || run.startedAt;
      const wfRuns = list.filter((r) => r.workflowId === wf.id);
      const successes = wfRuns.filter((r) => r.status === 'success').length;
      wf.successRate = Number(((successes / wfRuns.length) * 100).toFixed(1));
      this.saveWorkflows(wfs);
    }
  }

  // Templates
  static getTemplates(): Template[] {
    return INITIAL_TEMPLATES;
  }

  // Current User
  static getCurrentUser(): User {
    try {
      const data = localStorage.getItem(USER_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn(e);
    }
    return INITIAL_USER;
  }

  static saveCurrentUser(user: User): void {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (e) {
      console.warn(e);
    }
  }

  // Current Workspace
  static getCurrentWorkspace(): Workspace {
    try {
      const data = localStorage.getItem(WORKSPACE_KEY);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.warn(e);
    }
    return INITIAL_WORKSPACES[0];
  }

  static saveCurrentWorkspace(ws: Workspace): void {
    try {
      localStorage.setItem(WORKSPACE_KEY, JSON.stringify(ws));
    } catch (e) {
      console.warn(e);
    }
  }
}
