import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ScheduledJobsService } from './scheduled-jobs.service';
import { CreateScheduledJobDto, UpdateScheduledJobDto } from './dto/scheduled-job.dto';
import { JwtAuthGuard, TenantGuard, RequirePermissions } from '@libs/common';
import { Permission } from '@libs/domain';

@ApiTags('Scheduled Jobs')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('workspaces/:workspaceId/scheduled-jobs')
export class ScheduledJobsController {
  constructor(private readonly scheduledJobsService: ScheduledJobsService) {}

  @Post()
  @RequirePermissions(Permission.WORKFLOW_EXECUTE)
  @ApiOperation({ summary: 'Create a new scheduled workflow trigger (cron or interval)' })
  @ApiResponse({ status: 201, description: 'Scheduled job created. The scheduler will pick it up on next poll.' })
  create(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateScheduledJobDto,
  ) {
    return this.scheduledJobsService.create(workspaceId, dto);
  }

  @Get()
  @RequirePermissions(Permission.WORKSPACE_READ)
  @ApiOperation({ summary: 'List all scheduled jobs in a workspace' })
  @ApiResponse({ status: 200, description: 'List of scheduled jobs' })
  list(@Param('workspaceId') workspaceId: string) {
    return this.scheduledJobsService.list(workspaceId);
  }

  @Get(':jobId')
  @RequirePermissions(Permission.WORKSPACE_READ)
  @ApiOperation({ summary: 'Get a scheduled job by ID' })
  @ApiResponse({ status: 200, description: 'Scheduled job details' })
  getById(
    @Param('workspaceId') workspaceId: string,
    @Param('jobId') jobId: string,
  ) {
    return this.scheduledJobsService.getById(workspaceId, jobId);
  }

  @Patch(':jobId')
  @RequirePermissions(Permission.WORKFLOW_EXECUTE)
  @ApiOperation({ summary: 'Update schedule expression, interval, or active status' })
  @ApiResponse({ status: 200, description: 'Scheduled job updated' })
  update(
    @Param('workspaceId') workspaceId: string,
    @Param('jobId') jobId: string,
    @Body() dto: UpdateScheduledJobDto,
  ) {
    return this.scheduledJobsService.update(workspaceId, jobId, dto);
  }

  @Delete(':jobId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.WORKFLOW_EXECUTE)
  @ApiOperation({ summary: 'Delete a scheduled job' })
  @ApiResponse({ status: 200, description: 'Scheduled job deleted' })
  delete(
    @Param('workspaceId') workspaceId: string,
    @Param('jobId') jobId: string,
  ) {
    return this.scheduledJobsService.delete(workspaceId, jobId);
  }
}
