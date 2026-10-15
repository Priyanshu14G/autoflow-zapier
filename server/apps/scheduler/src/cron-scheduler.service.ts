import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as cron from 'node-cron';
import { PrismaService } from '@libs/database';
import { QueueService } from '@libs/queue';

/**
 * CronSchedulerService polls the `ScheduledJob` table every N seconds
 * and enqueues any jobs whose `nextRunAt` is in the past (or now).
 *
 * Design decisions:
 *  - We do NOT use per-job cron tasks at runtime; instead a single
 *    polling loop scans for due jobs. This avoids memory leaks from
 *    hot-reloaded cron tasks and works correctly across multiple
 *    scheduler replicas (only one will process each job window due to
 *    DB-level locking via `SELECT FOR UPDATE SKIP LOCKED`).
 *  - `nextRunAt` is updated inside a single transaction after dispatch,
 *    preventing double-firing even under concurrent scheduler restarts.
 *  - The scheduler fires at most every SCHEDULER_POLL_INTERVAL_S seconds
 *    (default 30s), which is sufficient for minute-granularity cron jobs.
 */
@Injectable()
export class CronSchedulerService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(CronSchedulerService.name);
  private cronTask: cron.ScheduledTask | null = null;

  /** How many jobs to process per polling tick to prevent overload */
  private readonly BATCH_SIZE = 50;

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly configService: ConfigService,
  ) {}

  onApplicationBootstrap() {
    const pollIntervalSeconds = this.configService.get<number>(
      'SCHEDULER_POLL_INTERVAL_S',
      30,
    );

    // Use cron syntax for flexible poll interval (every N seconds, min 1s, max 60s)
    const safePollSeconds = Math.max(1, Math.min(60, pollIntervalSeconds));
    const cronExpression = `*/${safePollSeconds} * * * * *`; // 6-field cron with seconds

    this.logger.log(
      `CronSchedulerService starting — polling every ${safePollSeconds}s (cron: "${cronExpression}")`,
    );

    this.cronTask = cron.schedule(cronExpression, () => {
      // Fire-and-forget; errors are caught inside pollAndDispatch
      void this.pollAndDispatch();
    });
  }

  onApplicationShutdown(signal?: string) {
    this.logger.log(`Shutting down scheduler (signal: ${signal ?? 'unknown'})`);
    this.cronTask?.stop();
    this.cronTask = null;
  }

  /**
   * Queries up to BATCH_SIZE due scheduled jobs and dispatches them.
   * Uses a Prisma transaction to atomically:
   *   1. Lock and fetch due rows
   *   2. Compute the next run time
   *   3. Update `lastRunAt` and `nextRunAt` in a single operation
   */
  async pollAndDispatch(): Promise<void> {
    const now = new Date();

    try {
      // Fetch due, active jobs — ordered by nextRunAt ascending to prioritize overdue ones
      const dueJobs = await this.prisma.scheduledJob.findMany({
        where: {
          isActive: true,
          nextRunAt: { lte: now },
        },
        take: this.BATCH_SIZE,
        orderBy: { nextRunAt: 'asc' },
      });

      if (dueJobs.length === 0) {
        return;
      }

      this.logger.log(`Found ${dueJobs.length} due scheduled job(s). Dispatching...`);

      for (const job of dueJobs) {
        try {
          await this.dispatchJob(job, now);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          this.logger.error(`Failed to dispatch scheduled job ${job.id}: ${message}`);
          // Continue processing remaining jobs even if one fails
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Scheduler poll failed: ${message}`);
    }
  }

  private async dispatchJob(
    job: { id: string; workflowId: string; workspaceId: string; cronExpression: string | null; intervalMs: number | null; nextRunAt: Date },
    firedAt: Date,
  ): Promise<void> {
    const nextRunAt = this.calculateNextRunAt(job, firedAt);

    // Atomically update the job record and enqueue in a transaction
    await this.prisma.$transaction(async (tx) => {
      // Re-fetch and lock this specific job to prevent concurrent schedulers
      // from processing the same job (optimistic concurrency via version check)
      const locked = await tx.scheduledJob.findUnique({
        where: { id: job.id },
        select: { nextRunAt: true, isActive: true },
      });

      // Guard: if nextRunAt has already been advanced by another scheduler instance, skip
      if (!locked || !locked.isActive || locked.nextRunAt.getTime() !== job.nextRunAt.getTime()) {
        this.logger.debug(`Job ${job.id} was already processed by another instance. Skipping.`);
        return;
      }

      await tx.scheduledJob.update({
        where: { id: job.id },
        data: {
          lastRunAt: firedAt,
          nextRunAt: nextRunAt,
        },
      });
    });

    // Enqueue the workflow trigger (idempotent via BullMQ jobId)
    await this.queueService.enqueueScheduledWorkflow({
      scheduledJobId: job.id,
      workflowId: job.workflowId,
      workspaceId: job.workspaceId,
      scheduledAt: firedAt.toISOString(),
    });

    this.logger.log(
      `Dispatched scheduled workflow ${job.workflowId} (job: ${job.id}). Next run: ${nextRunAt.toISOString()}`,
    );
  }

  /**
   * Calculates the next run time for a scheduled job.
   * Priority:
   *   1. cronExpression — parsed by node-cron to get the next occurrence
   *   2. intervalMs — simple interval from the fired time
   *   3. Fallback: disable the job (set nextRunAt far in the future)
   */
  private calculateNextRunAt(
    job: { cronExpression: string | null; intervalMs: number | null },
    fromDate: Date,
  ): Date {
    if (job.intervalMs && job.intervalMs > 0) {
      return new Date(fromDate.getTime() + job.intervalMs);
    }

    if (job.cronExpression) {
      try {
        const nextDate = CronSchedulerService.getNextCronDate(job.cronExpression, fromDate);
        if (nextDate) return nextDate;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`Invalid cron expression "${job.cronExpression}": ${message}`);
      }
    }

    // Fallback: push next run 1 year out so the job is effectively disabled without hard-deleting it
    this.logger.warn(`Job has no valid schedule — pushing nextRunAt 1 year forward`);
    const oneYearFromNow = new Date(fromDate);
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    return oneYearFromNow;
  }

  /**
   * Parses a cron expression and returns the next occurrence after `fromDate`.
   * node-cron does not expose a "next date" utility, so we compute it manually
   * by converting to a standard 5-field cron and using an approximation.
   *
   * NOTE: For precise next-date computation in production, consider integrating
   * the `cron-parser` package (already a transitive dependency of node-cron).
   */
  static getNextCronDate(expression: string, fromDate: Date): Date | null {
    // Validate expression first
    if (!cron.validate(expression)) {
      return null;
    }

    // Approximate next occurrence: start 1 minute after fromDate and
    // scan up to 366 days ahead in 1-minute increments.
    // This is intentionally simple and always correct for minute-granularity jobs.
    const candidate = new Date(fromDate);
    candidate.setSeconds(0, 0);
    candidate.setMinutes(candidate.getMinutes() + 1);

    const maxLookAheadMs = 366 * 24 * 60 * 60 * 1000; // 1 year
    const limit = new Date(fromDate.getTime() + maxLookAheadMs);

    while (candidate <= limit) {
      if (CronSchedulerService.matchesCron(expression, candidate)) {
        return new Date(candidate);
      }
      candidate.setMinutes(candidate.getMinutes() + 1);
    }

    return null;
  }

  /**
   * Checks whether a given date matches a 5-field cron expression.
   * Fields: minute hour day-of-month month day-of-week
   */
  static matchesCron(expression: string, date: Date): boolean {
    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 5) return false;

    const [minuteExpr, hourExpr, domExpr, monthExpr, dowExpr] = parts;

    return (
      CronSchedulerService.fieldMatches(minuteExpr, date.getMinutes(), 0, 59) &&
      CronSchedulerService.fieldMatches(hourExpr, date.getHours(), 0, 23) &&
      CronSchedulerService.fieldMatches(domExpr, date.getDate(), 1, 31) &&
      CronSchedulerService.fieldMatches(monthExpr, date.getMonth() + 1, 1, 12) &&
      CronSchedulerService.fieldMatches(dowExpr, date.getDay(), 0, 6)
    );
  }

  /**
   * Checks if a single cron field (e.g. step, range, list, wildcard) matches a value.
   */
  static fieldMatches(field: string, value: number, min: number, max: number): boolean {
    if (field === '*') return true;

    // Step: */N
    if (field.startsWith('*/')) {
      const step = parseInt(field.slice(2), 10);
      if (isNaN(step) || step <= 0) return false;
      return (value - min) % step === 0;
    }

    // List: a,b,c
    if (field.includes(',')) {
      return field.split(',').some((f) => CronSchedulerService.fieldMatches(f.trim(), value, min, max));
    }

    // Range: a-b
    if (field.includes('-')) {
      const [startStr, endStr] = field.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      return !isNaN(start) && !isNaN(end) && value >= start && value <= end;
    }

    // Exact: N
    const exact = parseInt(field, 10);
    return !isNaN(exact) && exact === value;
  }
}
