import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as cron from 'node-cron';
import { PrismaService } from '@libs/database';
import { CreateScheduledJobDto, UpdateScheduledJobDto } from './dto/scheduled-job.dto';

@Injectable()
export class ScheduledJobsService {
  private readonly logger = new Logger(ScheduledJobsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(workspaceId: string, dto: CreateScheduledJobDto) {
    // Validate that at least one scheduling mechanism is provided
    if (!dto.cronExpression && !dto.intervalMs) {
      throw new BadRequestException(
        'You must provide either a cronExpression or an intervalMs to schedule a job',
      );
    }

    if (dto.cronExpression && dto.intervalMs) {
      throw new BadRequestException(
        'Provide either cronExpression or intervalMs — not both',
      );
    }

    // Validate the cron expression if provided
    if (dto.cronExpression && !cron.validate(dto.cronExpression)) {
      throw new BadRequestException(
        `Invalid cron expression: "${dto.cronExpression}". Expected 5-field standard cron format (e.g. "0 9 * * 1-5").`,
      );
    }

    // Validate that the workflow belongs to this workspace
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: dto.workflowId, workspaceId },
    });
    if (!workflow) {
      throw new NotFoundException(`Workflow '${dto.workflowId}' not found in this workspace`);
    }

    // Calculate first run time
    const nextRunAt = this.calculateNextRunAt(dto, new Date());

    const job = await this.prisma.scheduledJob.create({
      data: {
        workspaceId,
        workflowId: dto.workflowId,
        cronExpression: dto.cronExpression ?? null,
        intervalMs: dto.intervalMs ?? null,
        nextRunAt,
        isActive: true,
      },
    });

    this.logger.log(
      `Created scheduled job ${job.id} for workflow ${dto.workflowId}. Next run: ${nextRunAt.toISOString()}`,
    );

    return job;
  }

  async list(workspaceId: string) {
    return this.prisma.scheduledJob.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(workspaceId: string, jobId: string) {
    const job = await this.prisma.scheduledJob.findFirst({
      where: { id: jobId, workspaceId },
    });
    if (!job) {
      throw new NotFoundException(`Scheduled job '${jobId}' not found`);
    }
    return job;
  }

  async update(workspaceId: string, jobId: string, dto: UpdateScheduledJobDto) {
    const job = await this.prisma.scheduledJob.findFirst({
      where: { id: jobId, workspaceId },
    });
    if (!job) {
      throw new NotFoundException(`Scheduled job '${jobId}' not found`);
    }

    if (dto.cronExpression && dto.intervalMs) {
      throw new BadRequestException('Provide either cronExpression or intervalMs — not both');
    }

    if (dto.cronExpression && !cron.validate(dto.cronExpression)) {
      throw new BadRequestException(
        `Invalid cron expression: "${dto.cronExpression}"`,
      );
    }

    // Recalculate nextRunAt if the schedule changes
    const scheduleChanged = dto.cronExpression !== undefined || dto.intervalMs !== undefined;
    const effectiveCron = dto.cronExpression ?? (dto.cronExpression === undefined ? job.cronExpression : null);
    const effectiveInterval = dto.intervalMs ?? (dto.intervalMs === undefined ? job.intervalMs : null);

    const nextRunAt = scheduleChanged
      ? this.calculateNextRunAt(
          { cronExpression: effectiveCron ?? undefined, intervalMs: effectiveInterval ?? undefined },
          new Date(),
        )
      : job.nextRunAt;

    return this.prisma.scheduledJob.update({
      where: { id: jobId },
      data: {
        ...(dto.cronExpression !== undefined ? { cronExpression: dto.cronExpression, intervalMs: null } : {}),
        ...(dto.intervalMs !== undefined ? { intervalMs: dto.intervalMs, cronExpression: null } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(scheduleChanged ? { nextRunAt } : {}),
      },
    });
  }

  async delete(workspaceId: string, jobId: string) {
    const job = await this.prisma.scheduledJob.findFirst({
      where: { id: jobId, workspaceId },
    });
    if (!job) {
      throw new NotFoundException(`Scheduled job '${jobId}' not found`);
    }
    await this.prisma.scheduledJob.delete({ where: { id: jobId } });
    return { message: 'Scheduled job deleted' };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private calculateNextRunAt(
    dto: { cronExpression?: string; intervalMs?: number },
    from: Date,
  ): Date {
    if (dto.intervalMs && dto.intervalMs > 0) {
      return new Date(from.getTime() + dto.intervalMs);
    }

    if (dto.cronExpression) {
      // Approximate next occurrence: scan forward in 1-minute increments
      const candidate = new Date(from);
      candidate.setSeconds(0, 0);
      candidate.setMinutes(candidate.getMinutes() + 1);

      const limit = new Date(from.getTime() + 366 * 24 * 60 * 60 * 1000);

      while (candidate <= limit) {
        if (this.matchesCron(dto.cronExpression, candidate)) {
          return new Date(candidate);
        }
        candidate.setMinutes(candidate.getMinutes() + 1);
      }
    }

    // Fallback: 1 hour from now
    return new Date(from.getTime() + 60 * 60 * 1000);
  }

  private matchesCron(expression: string, date: Date): boolean {
    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 5) return false;
    const [minuteExpr, hourExpr, domExpr, monthExpr, dowExpr] = parts;

    return (
      this.fieldMatches(minuteExpr, date.getMinutes(), 0, 59) &&
      this.fieldMatches(hourExpr, date.getHours(), 0, 23) &&
      this.fieldMatches(domExpr, date.getDate(), 1, 31) &&
      this.fieldMatches(monthExpr, date.getMonth() + 1, 1, 12) &&
      this.fieldMatches(dowExpr, date.getDay(), 0, 6)
    );
  }

  private fieldMatches(field: string, value: number, min: number, _max: number): boolean {
    if (field === '*') return true;
    if (field.startsWith('*/')) {
      const step = parseInt(field.slice(2), 10);
      return !isNaN(step) && step > 0 && (value - min) % step === 0;
    }
    if (field.includes(',')) {
      return field.split(',').some((f) => this.fieldMatches(f.trim(), value, min, _max));
    }
    if (field.includes('-')) {
      const [s, e] = field.split('-').map(Number);
      return !isNaN(s) && !isNaN(e) && value >= s && value <= e;
    }
    const exact = parseInt(field, 10);
    return !isNaN(exact) && exact === value;
  }
}
