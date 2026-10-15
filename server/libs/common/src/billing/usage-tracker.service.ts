import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@libs/database';
import { UsageMetric } from '@libs/domain';

export interface MonthlyUsageSummary {
  periodStart: Date;
  periodEnd: Date;
  workflowRuns: number;
  stepRuns: number;
  apiCalls: number;
  aiCalls: number;
  executionDurationMs: number;
}

@Injectable()
export class UsageTrackerService {
  private readonly logger = new Logger(UsageTrackerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns start and end timestamps for the current UTC calendar month.
   */
  getCurrentBillingPeriod(): { periodStart: Date; periodEnd: Date } {
    const now = new Date();
    const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const periodEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999),
    );
    return { periodStart, periodEnd };
  }

  /**
   * Records a usage metric asynchronously (fire-and-forget).
   * Safe to invoke from worker pipelines without failing caller requests.
   */
  recordMetric(
    organizationId: string,
    metric: UsageMetric,
    quantity = 1,
  ): void {
    if (!organizationId) return;

    this.writeMetricAsync(organizationId, metric, quantity).catch((err: unknown) => {
      this.logger.error(
        `Failed to record usage metric [${metric} x${quantity}] for org ${organizationId}: ${String(err)}`,
      );
    });
  }

  /**
   * Records a usage metric and awaits DB write.
   */
  async recordMetricAndAwait(
    organizationId: string,
    metric: UsageMetric,
    quantity = 1,
  ): Promise<void> {
    if (!organizationId) return;
    await this.writeMetricAsync(organizationId, metric, quantity);
  }

  /**
   * Aggregates usage metrics for an organization during the current calendar month.
   */
  async getMonthlyUsage(organizationId: string): Promise<MonthlyUsageSummary> {
    const { periodStart, periodEnd } = this.getCurrentBillingPeriod();

    const records = await this.prisma.usageRecord.findMany({
      where: {
        organizationId,
        periodStart: { gte: periodStart },
      },
    });

    const summary: MonthlyUsageSummary = {
      periodStart,
      periodEnd,
      workflowRuns: 0,
      stepRuns: 0,
      apiCalls: 0,
      aiCalls: 0,
      executionDurationMs: 0,
    };

    for (const record of records) {
      switch (record.metric) {
        case UsageMetric.WORKFLOW_RUNS:
          summary.workflowRuns += record.quantity;
          break;
        case UsageMetric.STEP_RUNS:
          summary.stepRuns += record.quantity;
          break;
        case UsageMetric.API_CALLS:
          summary.apiCalls += record.quantity;
          break;
        case UsageMetric.AI_CALLS:
          summary.aiCalls += record.quantity;
          break;
        case UsageMetric.EXECUTION_DURATION_MS:
          summary.executionDurationMs += record.quantity;
          break;
        default:
          break;
      }
    }

    return summary;
  }

  private async writeMetricAsync(
    organizationId: string,
    metric: UsageMetric,
    quantity: number,
  ): Promise<void> {
    const { periodStart, periodEnd } = this.getCurrentBillingPeriod();

    await this.prisma.usageRecord.create({
      data: {
        organizationId,
        metric,
        quantity,
        periodStart,
        periodEnd,
      },
    });
  }
}
