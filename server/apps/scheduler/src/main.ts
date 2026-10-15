import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SchedulerModule } from './scheduler.module';

async function bootstrap() {
  const logger = new Logger('AutoFlow-Scheduler');
  const app = await NestFactory.createApplicationContext(SchedulerModule);

  app.enableShutdownHooks();

  logger.log('AutoFlow Scheduler Process initialized.');
}

void bootstrap();
