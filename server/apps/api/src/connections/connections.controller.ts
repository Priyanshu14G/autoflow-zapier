import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Optional,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ConnectionService, ConnectorRegistry } from '@libs/integrations';
import { PrismaService } from '@libs/database';
import { CreateConnectionDto } from './dto/create-connection.dto';
import {
  JwtAuthGuard,
  TenantGuard,
  RequirePermissions,
  CurrentUser,
  AuthenticatedUser,
  AuditLogService,
} from '@libs/common';
import { Permission } from '@libs/domain';

@ApiTags('Connections & Integrations')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('workspaces/:workspaceId')
export class ConnectionsController {
  constructor(
    private readonly connectionService: ConnectionService,
    private readonly connectorRegistry: ConnectorRegistry,
    private readonly prisma: PrismaService,
    @Optional() private readonly auditLogService?: AuditLogService,
  ) {}

  @Get('integrations')
  @RequirePermissions(Permission.WORKSPACE_READ)
  @ApiOperation({ summary: 'Browse connector catalog with action schemas' })
  @ApiResponse({ status: 200, description: 'List of available connectors and their action definitions' })
  listIntegrations() {
    return this.connectorRegistry.listConnectors();
  }

  @Post('connections')
  @RequirePermissions(Permission.CONNECTION_MANAGE)
  @ApiOperation({ summary: 'Create a new encrypted integration connection' })
  @ApiResponse({ status: 201, description: 'Connection created successfully' })
  async createConnection(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateConnectionDto,
  ) {
    const connection = await this.connectionService.createConnection(workspaceId, dto);
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { organizationId: true },
    });
    if (ws) {
      this.auditLogService?.log({
        organizationId: ws.organizationId,
        userId: user.id,
        action: 'CONNECTION_CREATED',
        entityType: 'CONNECTION',
        entityId: connection.id,
        metadata: { integration: dto.integration, name: dto.name },
      });
    }
    return connection;
  }

  @Get('connections')
  @RequirePermissions(Permission.WORKSPACE_READ)
  @ApiOperation({ summary: 'List all connections in workspace (credentials omitted)' })
  @ApiQuery({ name: 'integration', required: false, description: 'Filter by connector identifier' })
  @ApiResponse({ status: 200, description: 'List of connections' })
  listConnections(
    @Param('workspaceId') workspaceId: string,
    @Query('integration') integration?: string,
  ) {
    return this.connectionService.listConnections(workspaceId, integration);
  }

  @Get('connections/:id')
  @RequirePermissions(Permission.WORKSPACE_READ)
  @ApiOperation({ summary: 'Get details of a specific connection' })
  @ApiResponse({ status: 200, description: 'Connection summary' })
  getConnection(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.connectionService.getConnection(workspaceId, id);
  }

  @Delete('connections/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.CONNECTION_MANAGE)
  @ApiOperation({ summary: 'Delete/revoke an integration connection' })
  @ApiResponse({ status: 204, description: 'Connection deleted' })
  async deleteConnection(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const res = await this.connectionService.deleteConnection(workspaceId, id);
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { organizationId: true },
    });
    if (ws) {
      this.auditLogService?.log({
        organizationId: ws.organizationId,
        userId: user.id,
        action: 'CONNECTION_DELETED',
        entityType: 'CONNECTION',
        entityId: id,
      });
    }
    return res;
  }
}
