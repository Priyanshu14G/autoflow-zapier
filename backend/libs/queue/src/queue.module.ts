import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QUEUE_NAMES } from './queue.constants';
import { QueueService } from './queue.service';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        if (redisUrl) {
          return {
            connection: {
              url: redisUrl,
              maxRetriesPerRequest: null,
              lazyConnect: true,
              retryStrategy: (times: number) => Math.min(times * 100, 3000),
            },
          };
        }

        const host = configService.get<string>('REDIS_HOST', 'localhost');
        const port = configService.get<number>('REDIS_PORT', 6379);
        const password = configService.get<string>('REDIS_PASSWORD') || undefined;
        const useTls =
          configService.get<string>('REDIS_TLS') === 'true' ||
          host.includes('upstash.io');

        return {
          connection: {
            host,
            port,
            password,
            tls: useTls ? {} : undefined,
            maxRetriesPerRequest: null,
            lazyConnect: true,
            retryStrategy: (times: number) => Math.min(times * 100, 3000),
          },
        };
      },
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.WORKFLOW_EXECUTION },
      { name: QUEUE_NAMES.STEP_EXECUTION },
      { name: QUEUE_NAMES.SCHEDULED_WORKFLOWS },
      { name: QUEUE_NAMES.WEBHOOK_PROCESSING },
      { name: QUEUE_NAMES.RETRY_PROCESSING },
      { name: QUEUE_NAMES.MAINTENANCE },
    ),
  ],
  providers: [QueueService],
  exports: [BullModule, QueueService],
})
export class QueueModule {}
