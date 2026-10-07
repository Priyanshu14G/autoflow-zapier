import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  AddOrganizationMemberDto,
  UpdateOrganizationMemberRoleDto,
} from './dto/organization.dto';
import {
  JwtAuthGuard,
  TenantGuard,
  CurrentUser,
  AuthenticatedUser,
  RequirePermissions,
} from '@libs/common';
import { Permission } from '@libs/domain';

@ApiTags('Organizations')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgService: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new organization' })
  @ApiResponse({ status: 201, description: 'Organization created successfully' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.orgService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all organizations the user belongs to' })
  @ApiResponse({ status: 200, description: 'List of user organizations' })
  listUserOrganizations(@CurrentUser() user: AuthenticatedUser) {
    return this.orgService.listUserOrganizations(user.id);
  }

  @Get(':orgId')
  @RequirePermissions(Permission.ORG_READ)
  @ApiOperation({ summary: 'Get organization details' })
  @ApiResponse({ status: 200, description: 'Organization retrieved successfully' })
  getById(@Param('orgId') orgId: string) {
    return this.orgService.getById(orgId);
  }

  @Patch(':orgId')
  @RequirePermissions(Permission.ORG_UPDATE)
  @ApiOperation({ summary: 'Update organization name' })
  @ApiResponse({ status: 200, description: 'Organization updated successfully' })
  update(
    @Param('orgId') orgId: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.orgService.update(orgId, dto);
  }

  @Get(':orgId/members')
  @RequirePermissions(Permission.ORG_READ)
  @ApiOperation({ summary: 'List members of an organization' })
  @ApiResponse({ status: 200, description: 'List of organization members' })
  listMembers(@Param('orgId') orgId: string) {
    return this.orgService.listMembers(orgId);
  }

  @Post(':orgId/members')
  @RequirePermissions(Permission.ORG_MANAGE_MEMBERS)
  @ApiOperation({ summary: 'Add a member to an organization' })
  @ApiResponse({ status: 201, description: 'Member added successfully' })
  addMember(
    @Param('orgId') orgId: string,
    @Body() dto: AddOrganizationMemberDto,
  ) {
    return this.orgService.addMember(orgId, dto);
  }

  @Patch(':orgId/members/:userId')
  @RequirePermissions(Permission.ORG_MANAGE_MEMBERS)
  @ApiOperation({ summary: 'Update role of an organization member' })
  @ApiResponse({ status: 200, description: 'Member role updated successfully' })
  updateMemberRole(
    @Param('orgId') orgId: string,
    @Param('userId') memberUserId: string,
    @Body() dto: UpdateOrganizationMemberRoleDto,
  ) {
    return this.orgService.updateMemberRole(orgId, memberUserId, dto);
  }

  @Delete(':orgId/members/:userId')
  @RequirePermissions(Permission.ORG_MANAGE_MEMBERS)
  @ApiOperation({ summary: 'Remove a member from an organization' })
  @ApiResponse({ status: 200, description: 'Member removed successfully' })
  removeMember(
    @Param('orgId') orgId: string,
    @Param('userId') memberUserId: string,
  ) {
    return this.orgService.removeMember(orgId, memberUserId);
  }
}
