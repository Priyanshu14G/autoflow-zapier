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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ConnectionService, ConnectorRegistry } from '@libs/integrations';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { JwtAuthGuard, TenantGuard, RequirePermissions } from '@libs/common';
import { Permission } from '@libs/domain';

@ApiTags('Connections & Integrations')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('workspaces/:workspaceId')
export class ConnectionsController {
  constructor(
    private readonly connectionService: ConnectionService,
    private readonly connectorRegistry: ConnectorRegistry,
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
  createConnection(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateConnectionDto,
  ) {
    return this.connectionService.createConnection(workspaceId, dto);
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
  deleteConnection(
    @Param('workspaceId') workspaceId: string,
    @Param('id') id: string,
  ) {
    return this.connectionService.deleteConnection(workspaceId, id);
  }
}
