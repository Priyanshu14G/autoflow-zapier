import { Injectable } from '@nestjs/common';
import { BaseConnector } from '../../core/base.connector';
import {
  ActionExecutionContext,
  ActionExecutionResult,
  AuthType,
} from '../../core/connector.interface';

@Injectable()
export class DiscordConnector extends BaseConnector {
  readonly id = 'discord';
  readonly name = 'Discord';
  readonly description = 'Post notifications and messages to Discord channels via Webhooks';
  readonly category = 'COMMUNICATION' as const;
  readonly icon = 'message-square';
  readonly authType: AuthType = 'NONE';

  constructor() {
    super();

    this.registerAction({
      key: 'send_webhook_message',
      name: 'Send Webhook Message',
      description: 'Sends a message to a Discord channel via incoming webhook',
      inputSchema: {
        webhookUrl: {
          type: 'string',
          label: 'Discord Webhook URL',
          description: 'Discord Webhook URL (from Server Settings > Integrations)',
          required: true,
          placeholder: 'https://discord.com/api/webhooks/...',
        },
        content: {
          type: 'string',
          label: 'Message Content',
          description: 'The message body (supports Discord markdown)',
          required: true,
        },
        username: {
          type: 'string',
          label: 'Bot Username Override',
          description: 'Override the default webhook name',
        },
        avatarUrl: {
          type: 'string',
          label: 'Avatar URL Override',
          description: 'URL of image to use for the avatar',
        },
      },
      outputSchema: {
        delivered: { type: 'boolean', label: 'Delivered' },
        timestamp: { type: 'string', label: 'Timestamp' },
      },
      execute: (context) => this.sendWebhookMessage(context),
    });
  }

  private async sendWebhookMessage(context: ActionExecutionContext): Promise<ActionExecutionResult> {
    const { input } = context;
    const webhookUrl = String(input.webhookUrl || '').trim();
    const content = String(input.content || '').trim();

    if (!webhookUrl) {
      return { success: false, data: {}, error: 'Discord Webhook URL is required' };
    }
    if (!content) {
      return { success: false, data: {}, error: 'Message content is required' };
    }

    const payload: Record<string, unknown> = { content };
    if (input.username) payload.username = String(input.username);
    if (input.avatarUrl) payload.avatar_url = String(input.avatarUrl);

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Discord webhooks return 204 No Content on success
      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          data: { status: response.status },
          error: `Discord webhook failed (${response.status}): ${errorText}`,
        };
      }

      return {
        success: true,
        data: {
          delivered: true,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, data: {}, error: `Failed to call Discord webhook: ${message}` };
    }
  }
}
