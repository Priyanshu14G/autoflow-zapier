import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WorkflowsService } from './workflows.service';
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  SaveWorkflowDraftDto,
  ExecuteWorkflowDto,
} from './dto/workflow.dto';
import { JwtOrApiKeyAuthGuard, TenantGuard, RequirePermissions } from '@libs/common';
import { Permission } from '@libs/domain';

@ApiTags('Workflows')
@ApiBearerAuth('bearer')
@UseGuards(JwtOrApiKeyAuthGuard, TenantGuard)
@Controller('workspaces/:workspaceId/workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Post()
  @RequirePermissions(Permission.WORKFLOW_CREATE)
  @ApiOperation({ summary: 'Create a new workflow with initial draft version' })
  @ApiResponse({ status: 201, description: 'Workflow created successfully' })
  create(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateWorkflowDto,
  ) {
    return this.workflowsService.create(workspaceId, dto);
  }

  @Get()
  @RequirePermissions(Permission.WORKFLOW_READ)
  @ApiOperation({ summary: 'List all workflows in a workspace' })
  @ApiResponse({ status: 200, description: 'List of workflows' })
  list(@Param('workspaceId') workspaceId: string) {
    return this.workflowsService.listByWorkspace(workspaceId);
  }

  @Get(':workflowId')
  @RequirePermissions(Permission.WORKFLOW_READ)
  @ApiOperation({ summary: 'Get workflow details with draft and published versions' })
  @ApiResponse({ status: 200, description: 'Workflow details retrieved successfully' })
  getById(
    @Param('workspaceId') workspaceId: string,
    @Param('workflowId') workflowId: string,
  ) {
    return this.workflowsService.getById(workspaceId, workflowId);
  }

  @Patch(':workflowId')
  @RequirePermissions(Permission.WORKFLOW_UPDATE)
  @ApiOperation({ summary: 'Update workflow metadata' })
  @ApiResponse({ status: 200, description: 'Workflow updated successfully' })
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('workflowId') workflowId: string,
    @Body() dto: UpdateWorkflowDto,
  ) {
    return this.workflowsService.update(workspaceId, workflowId, dto);
  }

  @Put(':workflowId/draft')
  @RequirePermissions(Permission.WORKFLOW_UPDATE)
  @ApiOperation({ summary: 'Save workflow draft nodes and edges (auto-forks new draft if published)' })
  @ApiResponse({ status: 200, description: 'Workflow draft saved successfully' })
  saveDraft(
    @Param('workspaceId') workspaceId: string,
    @Param('workflowId') workflowId: string,
    @Body() dto: SaveWorkflowDraftDto,
  ) {
    return this.workflowsService.saveDraft(workspaceId, workflowId, dto);
  }

  @Post(':workflowId/validate')
  @RequirePermissions(Permission.WORKFLOW_READ)
  @ApiOperation({ summary: 'Validate workflow graph structure without publishing' })
  @ApiResponse({ status: 200, description: 'Workflow graph validation results' })
  validate(
    @Param('workspaceId') workspaceId: string,
    @Param('workflowId') workflowId: string,
  ) {
    return this.workflowsService.validateDraft(workspaceId, workflowId);
  }

  @Post(':workflowId/publish')
  @RequirePermissions(Permission.WORKFLOW_PUBLISH)
  @ApiOperation({ summary: 'Validate and publish draft workflow version' })
  @ApiResponse({ status: 200, description: 'Workflow published successfully' })
  publish(
    @Param('workspaceId') workspaceId: string,
    @Param('workflowId') workflowId: string,
  ) {
    return this.workflowsService.publish(workspaceId, workflowId);
  }

  @Get(':workflowId/versions')
  @RequirePermissions(Permission.WORKFLOW_READ)
  @ApiOperation({ summary: 'List all historical versions of a workflow' })
  @ApiResponse({ status: 200, description: 'List of workflow versions' })
  listVersions(
    @Param('workspaceId') workspaceId: string,
    @Param('workflowId') workflowId: string,
  ) {
    return this.workflowsService.listVersions(workspaceId, workflowId);
  }

  @Get(':workflowId/versions/:versionNumber')
  @RequirePermissions(Permission.WORKFLOW_READ)
  @ApiOperation({ summary: 'Get an immutable snapshot of a specific workflow version' })
  @ApiResponse({ status: 200, description: 'Workflow version snapshot retrieved successfully' })
  getVersion(
    @Param('workspaceId') workspaceId: string,
    @Param('workflowId') workflowId: string,
    @Param('versionNumber', ParseIntPipe) versionNumber: number,
  ) {
    return this.workflowsService.getVersion(workspaceId, workflowId, versionNumber);
  }

  @Delete(':workflowId')
  @RequirePermissions(Permission.WORKFLOW_DELETE)
  @ApiOperation({ summary: 'Delete a workflow and its versions' })
  @ApiResponse({ status: 200, description: 'Workflow deleted successfully' })
  delete(
    @Param('workspaceId') workspaceId: string,
    @Param('workflowId') workflowId: string,
  ) {
    return this.workflowsService.delete(workspaceId, workflowId);
  }

  @Post(':workflowId/execute')
  @HttpCode(HttpStatus.ACCEPTED)
  @RequirePermissions(Permission.WORKFLOW_EXECUTE)
  @ApiOperation({ summary: 'Trigger a workflow execution asynchronously (returns 202 Accepted with runId)' })
  @ApiResponse({ status: 202, description: 'Workflow execution queued' })
  execute(
    @Param('workspaceId') workspaceId: string,
    @Param('workflowId') workflowId: string,
    @Body() dto: ExecuteWorkflowDto,
  ) {
    return this.workflowsService.trigger(workspaceId, workflowId, dto);
  }

  @Get(':workflowId/runs')
  @RequirePermissions(Permission.EXECUTION_READ)
  @ApiOperation({ summary: 'List workflow execution runs' })
  @ApiResponse({ status: 200, description: 'List of workflow runs' })
  listRuns(
    @Param('workspaceId') workspaceId: string,
    @Param('workflowId') workflowId: string,
  ) {
    return this.workflowsService.listRuns(workspaceId, workflowId);
  }

  @Get(':workflowId/runs/:runId')
  @RequirePermissions(Permission.EXECUTION_READ)
  @ApiOperation({ summary: 'Get workflow run execution details and step history' })
  @ApiResponse({ status: 200, description: 'Workflow run details retrieved' })
  getRun(
    @Param('workspaceId') workspaceId: string,
    @Param('workflowId') workflowId: string,
    @Param('runId') runId: string,
  ) {
    return this.workflowsService.getRun(workspaceId, workflowId, runId);
  }

  @Post(':workflowId/runs/:runId/cancel')
  @RequirePermissions(Permission.WORKFLOW_EXECUTE)
  @ApiOperation({ summary: 'Cancel an in-flight or pending workflow run' })
  @ApiResponse({ status: 200, description: 'Workflow run cancelled' })
  cancelRun(
    @Param('workspaceId') workspaceId: string,
    @Param('workflowId') workflowId: string,
    @Param('runId') runId: string,
  ) {
    return this.workflowsService.cancelRun(workspaceId, workflowId, runId);
  }
}
