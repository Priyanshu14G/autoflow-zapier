import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '@libs/database';
import { QUEUE_NAMES, QueueService, ScheduledWorkflowJobData } from '@libs/queue';
import { RunStatus, WorkflowStatus } from '@libs/domain';
import { Prisma } from '@prisma/client';

/**
 * Processes jobs from the SCHEDULED_WORKFLOWS queue.
 * Each job represents a single cron/interval trigger for a workflow.
 *
 * Responsibilities:
 *  1. Validate the workflow still exists and is published + active.
 *  2. Create a WorkflowRun record with the scheduled trigger payload.
 *  3. Enqueue the run to the WORKFLOW_EXECUTION queue to start stepping.
 */
@Processor(QUEUE_NAMES.SCHEDULED_WORKFLOWS)
export class ScheduledWorkflowProcessor extends WorkerHost {
  private readonly logger = new Logger(ScheduledWorkflowProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {
    super();
  }

  async process(job: Job<ScheduledWorkflowJobData>): Promise<void> {
    const { scheduledJobId, workflowId, workspaceId, scheduledAt } = job.data;

    this.logger.log(
      `Processing scheduled trigger: workflowId=${workflowId}, scheduledJobId=${scheduledJobId}, scheduledAt=${scheduledAt}`,
    );

    // 1. Load the workflow and its latest published version
    const workflow = await this.prisma.workflow.findUnique({
      where: { id: workflowId },
      include: {
        versions: {
          where: { status: WorkflowStatus.PUBLISHED },
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    });

    if (!workflow) {
      this.logger.warn(`Scheduled trigger skipped: workflow ${workflowId} not found`);
      return;
    }

    if (!workflow.isActive) {
      this.logger.warn(`Scheduled trigger skipped: workflow ${workflowId} is inactive`);
      return;
    }

    const version = workflow.versions[0];
    if (!version) {
      this.logger.warn(
        `Scheduled trigger skipped: no published version for workflow ${workflowId}`,
      );
      return;
    }

    // 2. Build trigger payload
    const triggerPayload: Record<string, unknown> = {
      source: 'schedule',
      scheduledJobId,
      scheduledAt,
      workspaceId,
    };

    // 3. Create the WorkflowRun record
    const run = await this.prisma.workflowRun.create({
      data: {
        workflowId,
        versionId: version.id,
        status: RunStatus.PENDING,
        triggerType: `schedule:${scheduledJobId}`,
        triggerPayload: triggerPayload as Prisma.InputJsonObject,
        contextData: {
          trigger: triggerPayload,
        } as Prisma.InputJsonObject,
      },
    });

    this.logger.log(`Created workflow run ${run.id} for scheduled workflow ${workflowId}`);

    // 4. Enqueue the run for step-by-step execution
    await this.queueService.enqueueWorkflowExecution({
      runId: run.id,
      workflowId,
      versionId: version.id,
      triggerPayload,
    });
  }
}
