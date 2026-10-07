import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '@libs/database';
import { QUEUE_NAMES, QueueService, StepExecutionJobData } from '@libs/queue';
import { RunStatus, StepRunStatus } from '@libs/domain';
import {
  DataSanitizer,
  StepExecutor,
  ErrorClassifier,
  VariableResolver,
} from '@libs/engine';
import { Prisma } from '@prisma/client';

const MAX_STEP_RETRIES = 3;

@Processor(QUEUE_NAMES.STEP_EXECUTION)
export class StepExecutionProcessor extends WorkerHost {
  private readonly logger = new Logger(StepExecutionProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {
    super();
  }

  async process(job: Job<StepExecutionJobData>): Promise<void> {
    const { runId, versionId, nodeKey, inputData = {}, retryCount = 0 } = job.data;
    this.logger.log(`Processing step: runId=${runId}, nodeKey=${nodeKey}, attempt=${retryCount + 1}`);

    const run = await this.prisma.workflowRun.findUnique({
      where: { id: runId },
    });

    if (!run || run.status === RunStatus.CANCELLED) {
      this.logger.warn(`Skipping step ${nodeKey}: run ${runId} is cancelled or absent`);
      return;
    }

    const version = await this.prisma.workflowVersion.findUnique({
      where: { id: versionId },
      include: { nodes: true, edges: true },
    });

    if (!version) {
      this.logger.error(`Workflow version ${versionId} missing during step execution`);
      return;
    }

    const targetNode = version.nodes.find((n) => n.nodeKey === nodeKey);
    if (!targetNode) {
      this.logger.error(`Node ${nodeKey} not found in version ${versionId}`);
      return;
    }

    // 1. Upsert step run record to RUNNING
    let stepRun = await this.prisma.stepRun.findFirst({
      where: { workflowRunId: runId, nodeKey },
    });

    const sanitizedInput = DataSanitizer.sanitize(inputData);

    if (!stepRun) {
      stepRun = await this.prisma.stepRun.create({
        data: {
          workflowRunId: runId,
          nodeKey,
          nodeType: targetNode.type,
          status: StepRunStatus.RUNNING,
          inputData: sanitizedInput as Prisma.InputJsonObject,
          startedAt: new Date(),
          retryCount,
        },
      });
    } else {
      stepRun = await this.prisma.stepRun.update({
        where: { id: stepRun.id },
        data: {
          status: StepRunStatus.RUNNING,
          startedAt: new Date(),
          retryCount,
        },
      });
    }

    // 2. Execute step with timeout guard
    try {
      const stepTimeoutMs =
        typeof (targetNode.config as Record<string, unknown>)?.timeoutMs === 'number'
          ? ((targetNode.config as Record<string, unknown>).timeoutMs as number)
          : 30000;

      // Build the execution context so template variables can be resolved
      const currentContext = (run.contextData as Record<string, unknown>) || {};
      const executionContext = VariableResolver.buildContext(
        {
          id: run.id,
          workflowId: run.workflowId,
          startedAt: run.startedAt ?? new Date(),
          triggeredBy: run.triggerType ?? null,
        },
        currentContext,
      );

      const result = await StepExecutor.executeWithTimeout(
        {
          nodeKey: targetNode.nodeKey,
          type: targetNode.type,
          integration: targetNode.integration,
          operation: targetNode.operation,
          config: targetNode.config as Record<string, unknown>,
        },
        inputData,
        executionContext,
        stepTimeoutMs,
      );

      const sanitizedOutput = DataSanitizer.sanitize(result.output);

      // 3. Mark step as SUCCESS
      await this.prisma.stepRun.update({
        where: { id: stepRun.id },
        data: {
          status: StepRunStatus.SUCCESS,
          outputData: sanitizedOutput as Prisma.InputJsonObject,
          completedAt: new Date(),
          durationMs: result.durationMs,
        },
      });

      // 4. Update workflow accumulated contextData
      const updatedContext: Record<string, unknown> = {
        ...currentContext,
        [nodeKey]: sanitizedOutput,
      };

      await this.prisma.workflowRun.update({
        where: { id: runId },
        data: {
          contextData: updatedContext as Prisma.InputJsonObject,
        },
      });

      // 5. Determine downstream nodes
      const downstreamNodeKeys = version.edges
        .filter((e) => e.sourceNode === nodeKey)
        .map((e) => e.targetNode);

      if (downstreamNodeKeys.length > 0) {
        for (const nextNodeKey of downstreamNodeKeys) {
          await this.queueService.enqueueStepExecution({
            runId,
            versionId,
            nodeKey: nextNodeKey,
            inputData: updatedContext,
          });
        }
      } else {
        // Check if all steps in this execution have concluded
        const pendingSteps = await this.prisma.stepRun.count({
          where: {
            workflowRunId: runId,
            status: { in: [StepRunStatus.PENDING, StepRunStatus.RUNNING, StepRunStatus.RETRYING] },
          },
        });

        if (pendingSteps === 0) {
          const runDurationMs = run.startedAt
            ? Date.now() - new Date(run.startedAt).getTime()
            : 0;

          await this.prisma.workflowRun.update({
            where: { id: runId },
            data: {
              status: RunStatus.SUCCESS,
              completedAt: new Date(),
              durationMs: runDurationMs,
            },
          });

          this.logger.log(`Workflow run ${runId} successfully completed in ${runDurationMs}ms`);
        }
      }
    } catch (error) {
      const classified = ErrorClassifier.classify(error);
      this.logger.error(
        `Step ${nodeKey} failed: [${classified.category}] ${classified.message}`,
      );

      // Check retry eligibility
      if (classified.isRetryable && retryCount < MAX_STEP_RETRIES) {
        const nextAttempt = retryCount + 1;
        const delayMs = ErrorClassifier.calculateBackoffDelay(nextAttempt);

        this.logger.warn(
          `Retrying step ${nodeKey} in ${delayMs}ms (attempt ${nextAttempt}/${MAX_STEP_RETRIES})`,
        );

        await this.prisma.stepRun.update({
          where: { id: stepRun.id },
          data: {
            status: StepRunStatus.RETRYING,
            errorMessage: classified.message,
            retryCount: nextAttempt,
          },
        });

        await this.queueService.enqueueRetry(
          {
            runId,
            versionId,
            nodeKey,
            inputData,
            retryCount: nextAttempt,
          },
          delayMs,
        );
      } else {
        // Permanent failure
        const status =
          classified.category === 'TIMEOUT' ? StepRunStatus.TIMED_OUT : StepRunStatus.FAILED;

        await this.prisma.stepRun.update({
          where: { id: stepRun.id },
          data: {
            status,
            errorMessage: classified.message,
            completedAt: new Date(),
          },
        });

        // Fail the workflow run
        await this.prisma.workflowRun.update({
          where: { id: runId },
          data: {
            status: RunStatus.FAILED,
            errorMessage: `Step '${nodeKey}' failed: ${classified.message}`,
            completedAt: new Date(),
          },
        });
      }
    }
  }
}
