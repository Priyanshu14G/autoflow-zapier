import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { Request } from 'express';
import { WebhooksService } from './webhooks.service';
import { CreateWebhookDto, UpdateWebhookDto } from './dto/webhook.dto';
import { JwtAuthGuard, TenantGuard, RequirePermissions } from '@libs/common';
import { Permission } from '@libs/domain';

/**
 * Webhook controller is split into two sections:
 *
 * 1. Authenticated management endpoints (under /workspaces/:workspaceId/webhooks)
 *    Requires JWT + tenant guard — used by the platform frontend.
 *
 * 2. Public ingest endpoint (/ingest/:publicId)
 *    No authentication — validates HMAC signature instead.
 *    Receives raw Buffer body (configured in main.ts via rawBodyParser).
 */
@ApiTags('Webhooks')
@Controller()
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  // ─── Authenticated Management Endpoints ────────────────────────────────────

  @Post('workspaces/:workspaceId/webhooks')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiBearerAuth('bearer')
  @RequirePermissions(Permission.WEBHOOK_MANAGE)
  @ApiOperation({ summary: 'Create a new webhook endpoint for a workspace' })
  @ApiResponse({ status: 201, description: 'Webhook created. The ingestUrl is ready to receive events.' })
  create(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateWebhookDto,
    @Req() req: Request,
  ) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return this.webhooksService.create(workspaceId, dto, baseUrl);
  }

  @Get('workspaces/:workspaceId/webhooks')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiBearerAuth('bearer')
  @RequirePermissions(Permission.WORKSPACE_READ)
  @ApiOperation({ summary: 'List all webhook endpoints in a workspace' })
  @ApiResponse({ status: 200, description: 'List of webhook endpoints' })
  list(@Param('workspaceId') workspaceId: string, @Req() req: Request) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return this.webhooksService.list(workspaceId, baseUrl);
  }

  @Get('workspaces/:workspaceId/webhooks/:webhookId')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiBearerAuth('bearer')
  @RequirePermissions(Permission.WORKSPACE_READ)
  @ApiOperation({ summary: 'Get webhook details' })
  @ApiResponse({ status: 200, description: 'Webhook details' })
  getById(
    @Param('workspaceId') workspaceId: string,
    @Param('webhookId') webhookId: string,
    @Req() req: Request,
  ) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return this.webhooksService.getById(workspaceId, webhookId, baseUrl);
  }

  @Patch('workspaces/:workspaceId/webhooks/:webhookId')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiBearerAuth('bearer')
  @RequirePermissions(Permission.WEBHOOK_MANAGE)
  @ApiOperation({ summary: 'Update webhook — reassign workflow, rotate secret, enable/disable' })
  @ApiResponse({ status: 200, description: 'Webhook updated' })
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('webhookId') webhookId: string,
    @Body() dto: UpdateWebhookDto,
    @Req() req: Request,
  ) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return this.webhooksService.update(workspaceId, webhookId, dto, baseUrl);
  }

  @Post('workspaces/:workspaceId/webhooks/:webhookId/rotate-secret')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiBearerAuth('bearer')
  @RequirePermissions(Permission.WEBHOOK_MANAGE)
  @ApiOperation({ summary: 'Rotate webhook signing secret — returns new secret once' })
  @ApiResponse({
    status: 200,
    description: 'New secret returned exactly once. Store it securely — it cannot be retrieved again.',
  })
  rotateSecret(
    @Param('workspaceId') workspaceId: string,
    @Param('webhookId') webhookId: string,
    @Req() req: Request,
  ) {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return this.webhooksService.rotateSecret(workspaceId, webhookId, baseUrl);
  }

  @Delete('workspaces/:workspaceId/webhooks/:webhookId')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiBearerAuth('bearer')
  @RequirePermissions(Permission.WEBHOOK_MANAGE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook deleted' })
  delete(
    @Param('workspaceId') workspaceId: string,
    @Param('webhookId') webhookId: string,
  ) {
    return this.webhooksService.delete(workspaceId, webhookId);
  }

  // ─── Public Ingest Endpoint ────────────────────────────────────────────────

  @Post('ingest/:publicId')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Public webhook ingest — receives events and triggers the attached workflow',
    description:
      'No authentication required. If the webhook has a secret, the request must include a valid ' +
      'X-Webhook-Signature: sha256=<hmac-sha256-hex> header computed over the raw request body.',
  })
  @ApiHeader({
    name: 'X-Webhook-Signature',
    required: false,
    description: 'HMAC-SHA256 signature: sha256=<hex>. Required when webhook has a secret configured.',
  })
  @ApiResponse({ status: 202, description: 'Webhook accepted and workflow execution enqueued' })
  @ApiResponse({ status: 401, description: 'Missing signature on a secret-protected webhook' })
  @ApiResponse({ status: 403, description: 'Signature verification failed' })
  @ApiResponse({ status: 404, description: 'Webhook not found or disabled' })
  async ingest(
    @Param('publicId') publicId: string,
    @Req() req: Request,
    @Headers('x-webhook-signature') signatureHeader?: string,
  ) {
    // rawBody is populated by the rawBody middleware configured in main.ts
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody ?? Buffer.from('{}');
    return this.webhooksService.ingest(publicId, rawBody, signatureHeader);
  }
}
