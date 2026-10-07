import { Request } from 'express';
import { Role } from '@libs/domain';

export interface AuthenticatedUser {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}

export interface TenantContext {
  organizationId: string;
  workspaceId?: string;
  role: Role;
}

export interface RequestWithUser extends Request {
  user: AuthenticatedUser;
  tenant?: TenantContext;
}
