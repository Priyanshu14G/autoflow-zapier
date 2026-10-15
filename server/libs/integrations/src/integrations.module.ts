import { Module, Global, OnModuleInit } from '@nestjs/common';
import { DatabaseModule } from '@libs/database';
import { EncryptionService } from './encryption/encryption.service';
import { ConnectorRegistry } from './core/connector.registry';
import { ConnectionService } from './connections/connection.service';
import { HttpConnector } from './connectors/http/http.connector';
import { EmailConnector } from './connectors/email/email.connector';
import { SlackConnector } from './connectors/slack/slack.connector';
import { DiscordConnector } from './connectors/discord/discord.connector';
import { TransformConnector } from './connectors/transform/transform.connector';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [
    EncryptionService,
    ConnectorRegistry,
    ConnectionService,
    HttpConnector,
    EmailConnector,
    SlackConnector,
    DiscordConnector,
    TransformConnector,
  ],
  exports: [
    EncryptionService,
    ConnectorRegistry,
    ConnectionService,
    HttpConnector,
    EmailConnector,
    SlackConnector,
    DiscordConnector,
    TransformConnector,
  ],
})
export class IntegrationsModule implements OnModuleInit {
  constructor(
    private readonly registry: ConnectorRegistry,
    private readonly httpConnector: HttpConnector,
    private readonly emailConnector: EmailConnector,
    private readonly slackConnector: SlackConnector,
    private readonly discordConnector: DiscordConnector,
    private readonly transformConnector: TransformConnector,
  ) {}

  onModuleInit() {
    this.registry.register(this.httpConnector);
    this.registry.register(this.emailConnector);
    this.registry.register(this.slackConnector);
    this.registry.register(this.discordConnector);
    this.registry.register(this.transformConnector);
  }
}
