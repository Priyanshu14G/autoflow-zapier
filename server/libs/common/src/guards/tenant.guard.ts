import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@libs/database';
import { Permission, Role, hasPermission } from '@libs/domain';
import { RequestWithUser } from '../interfaces/auth-request.interface';
import { PERMISSIONS_KEY, ROLES_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException('User is not authenticated');
    }

    const params = request.params;
    const body = request.body || {};
    const query = request.query || {};

    let organizationId =
      params.orgId ||
      params.organizationId ||
      body.organizationId ||
      query.organizationId;
    const workspaceId =
      params.workspaceId || body.workspaceId || query.workspaceId;

    // If workspaceId is provided, resolve organizationId from workspace
    if (workspaceId && !organizationId) {
      const workspace = await this.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { organizationId: true },
      });

      if (!workspace) {
        throw new NotFoundException(`Workspace '${workspaceId}' not found`);
      }

      organizationId = workspace.organizationId;
    }

    if (!organizationId) {
      // If no organization or workspace is targeted, permit request (e.g. org listing)
      return true;
    }

    // Verify user's membership in the organization
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'Access denied: You do not belong to this organization',
      );
    }

    const userRole = membership.role as Role;

    // Attach verified tenant context to request
    request.tenant = {
      organizationId,
      workspaceId,
      role: userRole,
    };

    // Check role requirements
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(userRole)) {
        throw new ForbiddenException(
          `Insufficient role: Required [${requiredRoles.join(', ')}], user has '${userRole}'`,
        );
      }
    }

    // Check permission requirements
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasAllPermissions = requiredPermissions.every((perm) =>
        hasPermission(userRole, perm),
      );

      if (!hasAllPermissions) {
        throw new ForbiddenException(
          `Insufficient permissions: Required [${requiredPermissions.join(', ')}] for role '${userRole}'`,
        );
      }
    }

    return true;
  }
}
