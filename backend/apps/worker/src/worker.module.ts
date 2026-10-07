import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configuration } from '@libs/common';
import { DatabaseModule } from '@libs/database';
import { QueueModule } from '@libs/queue';

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
})
export class WorkerModule {}
