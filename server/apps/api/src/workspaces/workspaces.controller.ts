import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto, UpdateWorkspaceDto } from './dto/workspace.dto';
import { JwtAuthGuard, TenantGuard, RequirePermissions } from '@libs/common';
import { Permission } from '@libs/domain';

@ApiTags('Workspaces')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  @RequirePermissions(Permission.WORKSPACE_CREATE)
  @ApiOperation({ summary: 'Create a new workspace within an organization' })
  @ApiResponse({ status: 201, description: 'Workspace created successfully' })
  create(@Body() dto: CreateWorkspaceDto) {
    return this.workspacesService.create(dto);
  }

  @Get()
  @RequirePermissions(Permission.WORKSPACE_READ)
  @ApiOperation({ summary: 'List all workspaces for an organization' })
  @ApiQuery({ name: 'organizationId', required: true, description: 'Organization UUID' })
  @ApiResponse({ status: 200, description: 'List of workspaces' })
  listByOrg(@Query('organizationId') organizationId: string) {
    if (!organizationId) {
      throw new BadRequestException('organizationId query parameter is required');
    }
    return this.workspacesService.listByOrg(organizationId);
  }

  @Get(':workspaceId')
  @RequirePermissions(Permission.WORKSPACE_READ)
  @ApiOperation({ summary: 'Get workspace details' })
  @ApiResponse({ status: 200, description: 'Workspace retrieved successfully' })
  getById(@Param('workspaceId') workspaceId: string) {
    return this.workspacesService.getById(workspaceId);
  }

  @Patch(':workspaceId')
  @RequirePermissions(Permission.WORKSPACE_UPDATE)
  @ApiOperation({ summary: 'Update workspace' })
  @ApiResponse({ status: 200, description: 'Workspace updated successfully' })
  update(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    return this.workspacesService.update(workspaceId, dto);
  }

  @Delete(':workspaceId')
  @RequirePermissions(Permission.WORKSPACE_DELETE)
  @ApiOperation({ summary: 'Delete workspace' })
  @ApiResponse({ status: 200, description: 'Workspace deleted successfully' })
  delete(@Param('workspaceId') workspaceId: string) {
    return this.workspacesService.delete(workspaceId);
  }
}
