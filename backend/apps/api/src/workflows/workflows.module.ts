import { Module } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { WorkflowsController } from './workflows.controller';
import { DatabaseModule } from '@libs/database';
import { QueueModule } from '@libs/queue';

@Module({
  imports: [DatabaseModule, QueueModule],
  controllers: [WorkflowsController],
  providers: [WorkflowsService],
  exports: [WorkflowsService],
})
export class WorkflowsModule {}
