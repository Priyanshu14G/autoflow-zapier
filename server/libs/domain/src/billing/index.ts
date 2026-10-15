export enum SubscriptionPlan {
  FREE = 'FREE',
  PRO = 'PRO',
  BUSINESS = 'BUSINESS',
}

export enum UsageMetric {
  WORKFLOW_RUNS = 'WORKFLOW_RUNS',
  STEP_RUNS = 'STEP_RUNS',
  API_CALLS = 'API_CALLS',
  AI_CALLS = 'AI_CALLS',
  EXECUTION_DURATION_MS = 'EXECUTION_DURATION_MS',
}

export interface PlanEntitlements {
  maxWorkflows: number; // -1 for unlimited
  maxTasksPerMonth: number; // -1 for unlimited
  maxTeamMembers: number; // -1 for unlimited
  maxExecutionTimeMs: number; // per step timeout limit
  availableIntegrations: string[]; // ['*'] for all
}

export const PLAN_ENTITLEMENTS: Record<SubscriptionPlan, PlanEntitlements> = {
  [SubscriptionPlan.FREE]: {
    maxWorkflows: 5,
    maxTasksPerMonth: 1000,
    maxTeamMembers: 2,
    maxExecutionTimeMs: 30000,
    availableIntegrations: ['http', 'transform', 'email'],
  },
  [SubscriptionPlan.PRO]: {
    maxWorkflows: 50,
    maxTasksPerMonth: 50000,
    maxTeamMembers: 10,
    maxExecutionTimeMs: 120000,
    availableIntegrations: ['http', 'transform', 'email', 'slack', 'discord', 'ai'],
  },
  [SubscriptionPlan.BUSINESS]: {
    maxWorkflows: -1,
    maxTasksPerMonth: 500000,
    maxTeamMembers: -1,
    maxExecutionTimeMs: 300000,
    availableIntegrations: ['*'],
  },
};
