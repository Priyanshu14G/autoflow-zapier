import { Role } from '../enums';

export enum Permission {
  // Organization permissions
  ORG_READ = 'ORG_READ',
  ORG_UPDATE = 'ORG_UPDATE',
  ORG_DELETE = 'ORG_DELETE',
  ORG_MANAGE_MEMBERS = 'ORG_MANAGE_MEMBERS',
  ORG_MANAGE_BILLING = 'ORG_MANAGE_BILLING',

  // Workspace permissions
  WORKSPACE_CREATE = 'WORKSPACE_CREATE',
  WORKSPACE_READ = 'WORKSPACE_READ',
  WORKSPACE_UPDATE = 'WORKSPACE_UPDATE',
  WORKSPACE_DELETE = 'WORKSPACE_DELETE',

  // Workflow permissions
  WORKFLOW_CREATE = 'WORKFLOW_CREATE',
  WORKFLOW_READ = 'WORKFLOW_READ',
  WORKFLOW_UPDATE = 'WORKFLOW_UPDATE',
  WORKFLOW_DELETE = 'WORKFLOW_DELETE',
  WORKFLOW_PUBLISH = 'WORKFLOW_PUBLISH',
  WORKFLOW_EXECUTE = 'WORKFLOW_EXECUTE',

  // Connection & Webhook permissions
  CONNECTION_MANAGE = 'CONNECTION_MANAGE',
  WEBHOOK_MANAGE = 'WEBHOOK_MANAGE',
  API_KEY_MANAGE = 'API_KEY_MANAGE',

  // Execution & Audit Logs
  EXECUTION_READ = 'EXECUTION_READ',
  AUDIT_LOG_READ = 'AUDIT_LOG_READ',
}

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  [Role.OWNER]: Object.values(Permission),
  [Role.ADMIN]: [
    Permission.ORG_READ,
    Permission.ORG_UPDATE,
    Permission.ORG_MANAGE_MEMBERS,
    Permission.WORKSPACE_CREATE,
    Permission.WORKSPACE_READ,
    Permission.WORKSPACE_UPDATE,
    Permission.WORKSPACE_DELETE,
    Permission.WORKFLOW_CREATE,
    Permission.WORKFLOW_READ,
    Permission.WORKFLOW_UPDATE,
    Permission.WORKFLOW_DELETE,
    Permission.WORKFLOW_PUBLISH,
    Permission.WORKFLOW_EXECUTE,
    Permission.CONNECTION_MANAGE,
    Permission.WEBHOOK_MANAGE,
    Permission.API_KEY_MANAGE,
    Permission.EXECUTION_READ,
    Permission.AUDIT_LOG_READ,
  ],
  [Role.EDITOR]: [
    Permission.ORG_READ,
    Permission.WORKSPACE_READ,
    Permission.WORKFLOW_CREATE,
    Permission.WORKFLOW_READ,
    Permission.WORKFLOW_UPDATE,
    Permission.WORKFLOW_PUBLISH,
    Permission.WORKFLOW_EXECUTE,
    Permission.CONNECTION_MANAGE,
    Permission.WEBHOOK_MANAGE,
    Permission.EXECUTION_READ,
  ],
  [Role.VIEWER]: [
    Permission.ORG_READ,
    Permission.WORKSPACE_READ,
    Permission.WORKFLOW_READ,
    Permission.EXECUTION_READ,
  ],
};

export function hasPermission(role: Role, requiredPermission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.includes(requiredPermission) : false;
}
