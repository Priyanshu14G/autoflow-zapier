export const QUEUE_NAMES = {
  WORKFLOW_EXECUTION: 'workflow-execution',
  STEP_EXECUTION: 'step-execution',
  SCHEDULED_WORKFLOWS: 'scheduled-workflows',
  WEBHOOK_PROCESSING: 'webhook-processing',
  RETRY_PROCESSING: 'retry-processing',
  MAINTENANCE: 'maintenance',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
