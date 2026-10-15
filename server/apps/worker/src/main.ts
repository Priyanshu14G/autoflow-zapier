import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { WorkerModule } from './worker.module';

async function bootstrap() {
  const logger = new Logger('AutoFlow-Worker');
  const app = await NestFactory.createApplicationContext(WorkerModule);

  app.enableShutdownHooks();

  logger.log('AutoFlow Worker Process started and listening to BullMQ queues...');
}

void bootstrap();
