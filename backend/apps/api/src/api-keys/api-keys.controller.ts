import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/api-key.dto';
import { JwtAuthGuard, TenantGuard, RequirePermissions, CurrentUser } from '@libs/common';
import { AuthenticatedUser } from '@libs/common';
import { Permission } from '@libs/domain';

@ApiTags('API Keys')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('workspaces/:workspaceId/api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @RequirePermissions(Permission.API_KEY_MANAGE)
  @ApiOperation({
    summary: 'Create a new API key',
    description:
      'Returns the full raw key exactly once. Store it securely — it cannot be retrieved again. ' +
      'All subsequent requests only return the key prefix for identification.',
  })
  @ApiResponse({ status: 201, description: 'API key created. Save the returned `key` value immediately.' })
  create(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateApiKeyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.apiKeysService.create(workspaceId, user.id, dto);
  }

  @Get()
  @RequirePermissions(Permission.API_KEY_MANAGE)
  @ApiOperation({ summary: 'List all active API keys for a workspace (credentials omitted)' })
  @ApiResponse({ status: 200, description: 'List of API key records (key prefix only, never full key)' })
  list(@Param('workspaceId') workspaceId: string) {
    return this.apiKeysService.list(workspaceId);
  }

  @Delete(':keyId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.API_KEY_MANAGE)
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiResponse({ status: 200, description: 'API key revoked' })
  revoke(
    @Param('workspaceId') workspaceId: string,
    @Param('keyId') keyId: string,
  ) {
    return this.apiKeysService.revoke(workspaceId, keyId);
  }
}
