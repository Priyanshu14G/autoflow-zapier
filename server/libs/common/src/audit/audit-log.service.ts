import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@libs/database';

export interface AuditLogEntry {
  organizationId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * AuditLogService writes structured audit events to the `audit_logs` table.
 *
 * Design decisions:
 *  - Fire-and-forget: log writes never block the main request path.
 *    Errors are caught and logged to the application logger only.
 *  - Accepts optional metadata for flexible per-event context.
 *  - Centralized so that all writes go through a single, testable service.
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records an audit event asynchronously (fire-and-forget).
   * Never throws — errors are swallowed to protect the caller.
   */
  log(entry: AuditLogEntry): void {
    this.writeAsync(entry).catch((err: unknown) => {
      this.logger.error(
        `Failed to write audit log [${entry.action} on ${entry.entityType}:${entry.entityId}]: ${String(err)}`,
      );
    });
  }

  /**
   * Records an audit event and awaits the DB write.
   * Use when the caller needs to guarantee the log was written
   * (e.g. in critical compliance workflows).
   */
  async logAndAwait(entry: AuditLogEntry): Promise<void> {
    await this.writeAsync(entry);
  }

  async findByOrganization(
    organizationId: string,
    options?: {
      entityType?: string;
      userId?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    return this.prisma.auditLog.findMany({
      where: {
        organizationId,
        ...(options?.entityType ? { entityType: options.entityType } : {}),
        ...(options?.userId ? { userId: options.userId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    });
  }

  private async writeAsync(entry: AuditLogEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        organizationId: entry.organizationId,
        userId: entry.userId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        ipAddress: entry.ipAddress ?? null,
        userAgent: entry.userAgent ?? null,
        metadata: (entry.metadata as Prisma.InputJsonValue) ?? undefined,
      },
    });
  }
}
