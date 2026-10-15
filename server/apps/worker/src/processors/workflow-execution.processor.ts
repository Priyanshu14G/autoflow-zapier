import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Optional } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '@libs/database';
import { QUEUE_NAMES, QueueService, WorkflowExecutionJobData } from '@libs/queue';
import { RunStatus, StepRunStatus, NodeType } from '@libs/domain';
import { DataSanitizer, StepExecutor, VariableResolver } from '@libs/engine';
import { UsageTrackerService } from '@libs/common';
import { AiDispatcherAdapter } from '../ai/ai-dispatcher.adapter';
import { Prisma } from '@prisma/client';

@Processor(QUEUE_NAMES.WORKFLOW_EXECUTION)
export class WorkflowExecutionProcessor extends WorkerHost {
  private readonly logger = new Logger(WorkflowExecutionProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    @Optional() private readonly usageTracker?: UsageTrackerService,
    @Optional() private readonly aiDispatcher?: AiDispatcherAdapter,
  ) {
    super();
  }

  async process(job: Job<WorkflowExecutionJobData>): Promise<void> {
    const { runId, workflowId, versionId, triggerPayload = {} } = job.data;
    this.logger.log(`Processing workflow execution job: runId=${runId}, workflowId=${workflowId}`);

    const run = await this.prisma.workflowRun.findUnique({
      where: { id: runId },
    });

    if (!run || run.status === RunStatus.CANCELLED) {
      this.logger.warn(`Workflow run ${runId} was cancelled or does not exist`);
      return;
    }

    const version = await this.prisma.workflowVersion.findUnique({
      where: { id: versionId },
      include: { nodes: true, edges: true },
    });

    if (!version) {
      this.logger.error(`Workflow version ${versionId} not found for run ${runId}`);
      await this.prisma.workflowRun.update({
        where: { id: runId },
        data: {
          status: RunStatus.FAILED,
          errorMessage: `Workflow version ${versionId} could not be resolved`,
          completedAt: new Date(),
        },
      });
      return;
    }

    // 1. Identify Trigger node
    const triggerNode = version.nodes.find(
      (n) => n.type === NodeType.TRIGGER || n.type === NodeType.WEBHOOK,
    );

    if (!triggerNode) {
      this.logger.error(`No trigger node found in workflow version ${versionId}`);
      await this.prisma.workflowRun.update({
        where: { id: runId },
        data: {
          status: RunStatus.FAILED,
          errorMessage: 'No trigger node defined in published version',
          completedAt: new Date(),
        },
      });
      return;
    }

    // 2. Transition workflow run to RUNNING
    await this.prisma.workflowRun.update({
      where: { id: runId },
      data: {
        status: RunStatus.RUNNING,
        startedAt: new Date(),
      },
    });

    // 3. Execute trigger step
    const sanitizedInput = DataSanitizer.sanitize(triggerPayload);
    const executionContext = VariableResolver.buildContext(
      {
        id: run.id,
        workflowId: run.workflowId,
        startedAt: run.startedAt ?? new Date(),
        triggeredBy: run.triggerType,
      },
      { trigger: sanitizedInput },
    );

    const triggerResult = await StepExecutor.executeWithTimeout(
      {
        nodeKey: triggerNode.nodeKey,
        type: triggerNode.type,
        config: triggerNode.config as Record<string, unknown>,
      },
      triggerPayload,
      executionContext,
      10000,
      undefined,
      undefined,
      this.aiDispatcher,
    );
    const sanitizedOutput = DataSanitizer.sanitize(triggerResult.output);

    // 4. Record trigger step execution
    await this.prisma.stepRun.create({
      data: {
        workflowRunId: runId,
        nodeKey: triggerNode.nodeKey,
        nodeType: triggerNode.type,
        status: StepRunStatus.SUCCESS,
        inputData: sanitizedInput as Prisma.InputJsonObject,
        outputData: sanitizedOutput as Prisma.InputJsonObject,
        startedAt: new Date(),
        completedAt: new Date(),
        durationMs: triggerResult.durationMs,
      },
    });

    // 5. Update contextData on workflow run
    const contextData: Record<string, unknown> = {
      trigger: sanitizedOutput,
      [triggerNode.nodeKey]: sanitizedOutput,
    };

    await this.prisma.workflowRun.update({
      where: { id: runId },
      data: {
        contextData: contextData as Prisma.InputJsonObject,
      },
    });

    // 6. Find downstream nodes from trigger
    const downstreamNodeKeys = version.edges
      .filter((e) => e.sourceNode === triggerNode.nodeKey)
      .map((e) => e.targetNode);

    if (downstreamNodeKeys.length === 0) {
      // Linear workflow with only trigger
      this.logger.log(`Workflow run ${runId} has no downstream actions, marking SUCCESS`);
      await this.prisma.workflowRun.update({
        where: { id: runId },
        data: {
          status: RunStatus.SUCCESS,
          completedAt: new Date(),
          durationMs: triggerResult.durationMs,
        },
      });
      return;
    }

    // 7. Enqueue downstream steps
    for (const nextNodeKey of downstreamNodeKeys) {
      await this.queueService.enqueueStepExecution({
        runId,
        versionId,
        nodeKey: nextNodeKey,
        inputData: contextData,
      });
    }
  }
}
