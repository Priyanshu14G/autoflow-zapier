import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from './queue.constants';

export interface WorkflowExecutionJobData {
  runId: string;
  workflowId: string;
  versionId: string;
  triggerPayload?: Record<string, unknown>;
}

export interface StepExecutionJobData {
  runId: string;
  versionId: string;
  nodeKey: string;
  inputData?: Record<string, unknown>;
  retryCount?: number;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.WORKFLOW_EXECUTION)
    private readonly workflowQueue: Queue<WorkflowExecutionJobData>,
    @InjectQueue(QUEUE_NAMES.STEP_EXECUTION)
    private readonly stepQueue: Queue<StepExecutionJobData>,
    @InjectQueue(QUEUE_NAMES.RETRY_PROCESSING)
    private readonly retryQueue: Queue<StepExecutionJobData>,
  ) {}

  async enqueueWorkflowExecution(
    data: WorkflowExecutionJobData,
    idempotencyKey?: string,
  ) {
    const jobId = idempotencyKey ? `wf-run:${idempotencyKey}` : `wf-run:${data.runId}`;
    this.logger.log(`Enqueueing workflow execution job ${jobId} for workflow ${data.workflowId}`);

    return this.workflowQueue.add('execute-workflow', data, {
      jobId,
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
  }

  async enqueueStepExecution(data: StepExecutionJobData) {
    const jobId = `step:${data.runId}:${data.nodeKey}:${data.retryCount || 0}`;
    this.logger.log(`Enqueueing step execution job ${jobId}`);

    return this.stepQueue.add('execute-step', data, {
      jobId,
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
  }

  async enqueueRetry(data: StepExecutionJobData, delayMs: number) {
    const jobId = `retry:${data.runId}:${data.nodeKey}:${data.retryCount || 1}`;
    this.logger.log(`Enqueueing retry job ${jobId} with delay of ${delayMs}ms`);

    return this.retryQueue.add('retry-step', data, {
      jobId,
      delay: delayMs,
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
  }
}
