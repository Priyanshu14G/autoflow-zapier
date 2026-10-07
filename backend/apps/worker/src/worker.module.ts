import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configuration } from '@libs/common';
import { DatabaseModule } from '@libs/database';
import { QueueModule } from '@libs/queue';
import { WorkflowExecutionProcessor } from './processors/workflow-execution.processor';
import { StepExecutionProcessor } from './processors/step-execution.processor';
import { RetryExecutionProcessor } from './processors/retry-execution.processor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env', '.env.local'],
    }),
    DatabaseModule,
    QueueModule,
  ],
  providers: [
    WorkflowExecutionProcessor,
    StepExecutionProcessor,
    RetryExecutionProcessor,
  ],
})
export class WorkerModule {}
