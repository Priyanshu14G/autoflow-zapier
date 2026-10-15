import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  UnauthorizedException,
  Optional,
} from '@nestjs/common';
import { createHmac, timingSafeEqual, randomBytes } from 'crypto';
import { PrismaService } from '@libs/database';
import { QueueService } from '@libs/queue';
import { RunStatus } from '@libs/domain';
import { Prisma } from '@prisma/client';
import { AuditLogService } from '@libs/common';
import { CreateWebhookDto, UpdateWebhookDto } from './dto/webhook.dto';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    @Optional() private readonly auditLogService?: AuditLogService,
  ) {}

  // ─── Management (authenticated) ──────────────────────────────────────────

  async create(workspaceId: string, dto: CreateWebhookDto, baseUrl: string) {
    if (dto.workflowId) {
      const workflow = await this.prisma.workflow.findFirst({
        where: { id: dto.workflowId, workspaceId },
      });
      if (!workflow) {
        throw new NotFoundException(`Workflow '${dto.workflowId}' not found in this workspace`);
      }
    }

    const webhook = await this.prisma.webhook.create({
      data: {
        workspaceId,
        workflowId: dto.workflowId ?? null,
        secret: dto.secret ?? null,
        isActive: true,
      },
    });

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { organizationId: true },
    });
    if (workspace) {
      this.auditLogService?.log({
        organizationId: workspace.organizationId,
        action: 'WEBHOOK_CREATED',
        entityType: 'WEBHOOK',
        entityId: webhook.id,
        metadata: { workflowId: dto.workflowId },
      });
    }

    return this.formatWebhook(webhook, baseUrl);
  }

  async list(workspaceId: string, baseUrl: string) {
    const webhooks = await this.prisma.webhook.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
    return webhooks.map((w) => this.formatWebhook(w, baseUrl));
  }

  async getById(workspaceId: string, webhookId: string, baseUrl: string) {
    const webhook = await this.prisma.webhook.findFirst({
      where: { id: webhookId, workspaceId },
    });
    if (!webhook) {
      throw new NotFoundException(`Webhook '${webhookId}' not found`);
    }
    return this.formatWebhook(webhook, baseUrl);
  }

  async update(workspaceId: string, webhookId: string, dto: UpdateWebhookDto, baseUrl: string) {
    const webhook = await this.prisma.webhook.findFirst({
      where: { id: webhookId, workspaceId },
    });
    if (!webhook) {
      throw new NotFoundException(`Webhook '${webhookId}' not found`);
    }

    if (dto.workflowId) {
      const workflow = await this.prisma.workflow.findFirst({
        where: { id: dto.workflowId, workspaceId },
      });
      if (!workflow) {
        throw new NotFoundException(`Workflow '${dto.workflowId}' not found in this workspace`);
      }
    }

    const updated = await this.prisma.webhook.update({
      where: { id: webhookId },
      data: {
        ...(dto.workflowId !== undefined ? { workflowId: dto.workflowId } : {}),
        ...(dto.secret !== undefined ? { secret: dto.secret || null } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    return this.formatWebhook(updated, baseUrl);
  }

  async delete(workspaceId: string, webhookId: string) {
    const webhook = await this.prisma.webhook.findFirst({
      where: { id: webhookId, workspaceId },
    });
    if (!webhook) {
      throw new NotFoundException(`Webhook '${webhookId}' not found`);
    }
    await this.prisma.webhook.delete({ where: { id: webhookId } });

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { organizationId: true },
    });
    if (workspace) {
      this.auditLogService?.log({
        organizationId: workspace.organizationId,
        action: 'WEBHOOK_DELETED',
        entityType: 'WEBHOOK',
        entityId: webhookId,
      });
    }

    return { message: 'Webhook deleted' };
  }

  async rotateSecret(workspaceId: string, webhookId: string, baseUrl: string) {
    const webhook = await this.prisma.webhook.findFirst({
      where: { id: webhookId, workspaceId },
    });
    if (!webhook) {
      throw new NotFoundException(`Webhook '${webhookId}' not found`);
    }

    const newSecret = randomBytes(32).toString('hex');
    const updated = await this.prisma.webhook.update({
      where: { id: webhookId },
      data: { secret: newSecret },
    });

    return {
      ...this.formatWebhook(updated, baseUrl),
      // Return the raw secret only once, at rotation time
      secret: newSecret,
    };
  }

  // ─── Ingest (public endpoint) ─────────────────────────────────────────────

  /**
   * Receives an inbound webhook payload.
   * 1. Looks up the webhook by its public ID.
   * 2. Verifies the HMAC-SHA256 signature if a secret is configured.
   * 3. Looks up the attached workflow's published version.
   * 4. Creates a WorkflowRun and enqueues it.
   */
  async ingest(
    publicId: string,
    rawBody: Buffer,
    signatureHeader: string | undefined,
  ): Promise<{ runId: string; status: string }> {
    const webhook = await this.prisma.webhook.findUnique({
      where: { publicId },
    });

    if (!webhook || !webhook.isActive) {
      throw new NotFoundException('Webhook endpoint not found or disabled');
    }

    // Signature verification
    if (webhook.secret) {
      if (!signatureHeader) {
        throw new UnauthorizedException(
          'This webhook requires a signature. Provide an X-Webhook-Signature header.',
        );
      }
      this.verifySignature(rawBody, webhook.secret, signatureHeader);
    }

    if (!webhook.workflowId) {
      throw new BadRequestException('This webhook endpoint is not associated with a workflow');
    }

    // Find published version
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: webhook.workflowId },
      include: {
        versions: {
          where: { status: 'PUBLISHED' },
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    });

    if (!workflow || !workflow.isActive || workflow.versions.length === 0) {
      throw new BadRequestException(
        'The workflow associated with this webhook is not published or is inactive',
      );
    }

    const publishedVersion = workflow.versions[0];

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody.toString('utf8')) as Record<string, unknown>;
    } catch {
      // Accept non-JSON payloads as a raw string body
      payload = { body: rawBody.toString('utf8') };
    }

    const run = await this.prisma.workflowRun.create({
      data: {
        workflowId: workflow.id,
        versionId: publishedVersion.id,
        status: RunStatus.PENDING,
        triggerType: 'WEBHOOK',
        triggerPayload: payload as Prisma.InputJsonObject,
      },
    });

    await this.queueService.enqueueWorkflowExecution({
      runId: run.id,
      workflowId: workflow.id,
      versionId: publishedVersion.id,
      triggerPayload: payload,
    });

    this.logger.log(
      `Webhook ${publicId} ingested — run ${run.id} enqueued for workflow ${workflow.id}`,
    );

    return { runId: run.id, status: RunStatus.PENDING };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private verifySignature(rawBody: Buffer, secret: string, providedSignature: string): void {
    // Expected format: sha256=<hex>
    const expectedPrefix = 'sha256=';
    if (!providedSignature.startsWith(expectedPrefix)) {
      throw new ForbiddenException('Webhook signature must be prefixed with "sha256="');
    }

    const providedHash = providedSignature.slice(expectedPrefix.length);
    const expectedHash = createHmac('sha256', secret).update(rawBody).digest('hex');

    let valid = false;
    try {
      valid = timingSafeEqual(
        Buffer.from(providedHash, 'hex'),
        Buffer.from(expectedHash, 'hex'),
      );
    } catch {
      valid = false;
    }

    if (!valid) {
      throw new ForbiddenException('Webhook signature verification failed');
    }
  }

  private formatWebhook(
    webhook: { id: string; publicId: string; workspaceId: string; workflowId: string | null; isActive: boolean; secret: string | null; createdAt: Date; updatedAt: Date },
    baseUrl: string,
  ) {
    return {
      id: webhook.id,
      publicId: webhook.publicId,
      workspaceId: webhook.workspaceId,
      workflowId: webhook.workflowId,
      isActive: webhook.isActive,
      hasSecret: !!webhook.secret,
      ingestUrl: `${baseUrl}/ingest/${webhook.publicId}`,
      createdAt: webhook.createdAt,
      updatedAt: webhook.updatedAt,
    };
  }
}
