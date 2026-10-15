import { Module } from '@nestjs/common';
import { IntegrationsModule } from '@libs/integrations';
import { ConnectionsController } from './connections.controller';

@Module({
  imports: [IntegrationsModule],
  controllers: [ConnectionsController],
})
export class ConnectionsModule {}
