import { Module } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { WorkflowsController } from './workflows.controller';
import { DatabaseModule } from '@libs/database';
import { QueueModule } from '@libs/queue';
import { ApiKeysModule } from '../api-keys/api-keys.module';

@Module({
  imports: [DatabaseModule, QueueModule, ApiKeysModule],
  controllers: [WorkflowsController],
  providers: [WorkflowsService],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}
