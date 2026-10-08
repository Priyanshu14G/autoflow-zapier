import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configuration, AuditModule } from '@libs/common';
import { DatabaseModule } from '@libs/database';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { ConnectionsModule } from './connections/connections.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { ScheduledJobsModule } from './scheduled-jobs/scheduled-jobs.module';
import { ApiKeysModule } from './api-keys/api-keys.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env', '.env.local'],
    }),
    DatabaseModule,
    AuditModule,
    HealthModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    WorkspacesModule,
    WorkflowsModule,
    ConnectionsModule,
    WebhooksModule,
    ScheduledJobsModule,
    ApiKeysModule,
  ],
})
export class AppModule {}
