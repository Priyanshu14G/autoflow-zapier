import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantGuard } from '@libs/common';
import { PrismaService } from '@libs/database';
import { Permission, Role } from '@libs/domain';

describe('TenantGuard (Multi-Tenancy & RBAC)', () => {
  let guard: TenantGuard;
  let reflector: Reflector;
  let prisma: any;

  beforeEach(() => {
    reflector = new Reflector();
    prisma = {
      workspace: {
        findUnique: jest.fn(),
      },
      organizationMember: {
        findUnique: jest.fn(),
      },
    };
    guard = new TenantGuard(reflector, prisma as PrismaService);
  });

  function createMockContext(user: any, params: any = {}, body: any = {}): ExecutionContext {
    const request = {
      user,
      params,
      body,
      query: {},
      tenant: undefined,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  }

  it('should allow access when user is a member of the organization', async () => {
    const context = createMockContext({ id: 'user-1' }, { orgId: 'org-1' });

    prisma.organizationMember.findUnique.mockResolvedValue({
      organizationId: 'org-1',
      userId: 'user-1',
      role: Role.EDITOR,
    });

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const canActivate = await guard.canActivate(context);
    expect(canActivate).toBe(true);

    const req = context.switchToHttp().getRequest();
    expect(req.tenant).toEqual({
      organizationId: 'org-1',
      workspaceId: undefined,
      role: Role.EDITOR,
    });
  });

  it('should strictly deny access when user is not a member of the requested organization', async () => {
    const context = createMockContext({ id: 'user-1' }, { orgId: 'org-forbidden' });

    prisma.organizationMember.findUnique.mockResolvedValue(null);

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should deny access if user does not possess required role', async () => {
    const context = createMockContext({ id: 'user-1' }, { orgId: 'org-1' });

    prisma.organizationMember.findUnique.mockResolvedValue({
      organizationId: 'org-1',
      userId: 'user-1',
      role: Role.VIEWER,
    });

    // Mock route requiring OWNER or ADMIN role
    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === 'roles') return [Role.OWNER, Role.ADMIN];
      return undefined;
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should permit access if user possesses required permission', async () => {
    const context = createMockContext({ id: 'user-1' }, { orgId: 'org-1' });

    prisma.organizationMember.findUnique.mockResolvedValue({
      organizationId: 'org-1',
      userId: 'user-1',
      role: Role.ADMIN,
    });

    jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === 'permissions') return [Permission.ORG_MANAGE_MEMBERS];
      return undefined;
    });

    const canActivate = await guard.canActivate(context);
    expect(canActivate).toBe(true);
  });
});
