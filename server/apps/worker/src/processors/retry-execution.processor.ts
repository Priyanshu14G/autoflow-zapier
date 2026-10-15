import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES, QueueService, StepExecutionJobData } from '@libs/queue';

@Processor(QUEUE_NAMES.RETRY_PROCESSING)
export class RetryExecutionProcessor extends WorkerHost {
  private readonly logger = new Logger(RetryExecutionProcessor.name);

  constructor(private readonly queueService: QueueService) {
    super();
  }

  async process(job: Job<StepExecutionJobData>): Promise<void> {
    const { runId, nodeKey, retryCount } = job.data;
    this.logger.log(`Retry timer elapsed for run ${runId}, node ${nodeKey}. Re-enqueueing to step execution queue.`);

    await this.queueService.enqueueStepExecution({
      ...job.data,
      retryCount,
    });
  }
}
