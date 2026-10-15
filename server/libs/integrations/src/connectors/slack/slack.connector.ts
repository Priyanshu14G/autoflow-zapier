import { Injectable, Logger } from '@nestjs/common';
import { BaseConnector } from '../../core/base.connector';
import {
  ActionExecutionContext,
  ActionExecutionResult,
  AuthType,
} from '../../core/connector.interface';

@Injectable()
export class SlackConnector extends BaseConnector {
  private readonly logger = new Logger(SlackConnector.name);
  readonly id = 'slack';
  readonly name = 'Slack';
  readonly description = 'Post messages to Slack channels or incoming webhooks';
  readonly category = 'COMMUNICATION' as const;
  readonly icon = 'slack';
  readonly authType: AuthType = 'BEARER_TOKEN';
  readonly authFields = {
    token: {
      type: 'string' as const,
      label: 'Bot User OAuth Token',
      description: 'Slack Bot token starting with xoxb-',
      placeholder: 'xoxb-...',
      required: false,
    },
  };

  constructor() {
    super();

    this.registerAction({
      key: 'send_webhook_message',
      name: 'Send Webhook Message',
      description: 'Posts a formatted message to a Slack Incoming Webhook URL',
      inputSchema: {
        webhookUrl: {
          type: 'string',
          label: 'Webhook URL',
          description: 'Slack Incoming Webhook URL',
          required: true,
          placeholder: 'https://hooks.slack.com/services/...',
        },
        text: {
          type: 'string',
          label: 'Message Text',
          description: 'The plain text message to send',
          required: true,
        },
        blocks: {
          type: 'array',
          label: 'Block Kit Blocks',
          description: 'Optional Slack Block Kit UI components array',
        },
      },
      outputSchema: {
        sent: { type: 'boolean', label: 'Message Sent' },
        timestamp: { type: 'string', label: 'Timestamp' },
      },
      execute: (context) => this.sendWebhookMessage(context),
    });

    this.registerAction({
      key: 'post_message',
      name: 'Post Channel Message (API)',
      description: 'Posts a message to a channel using a Slack Bot Token',
      inputSchema: {
        channel: {
          type: 'string',
          label: 'Channel',
          description: 'Channel ID or name (#general or C1234567890)',
          required: true,
        },
        text: {
          type: 'string',
          label: 'Message Text',
          description: 'The message content to post',
          required: true,
        },
      },
      outputSchema: {
        ok: { type: 'boolean', label: 'OK' },
        channel: { type: 'string', label: 'Channel ID' },
        ts: { type: 'string', label: 'Timestamp' },
      },
      execute: (context) => this.postChannelMessage(context),
    });
  }

  private async sendWebhookMessage(context: ActionExecutionContext): Promise<ActionExecutionResult> {
    const { input } = context;
    const webhookUrl = String(input.webhookUrl || '').trim();
    const text = String(input.text || '').trim();

    if (!webhookUrl) {
      return { success: false, data: {}, error: 'Slack Webhook URL is required' };
    }
    if (!text) {
      return { success: false, data: {}, error: 'Message text is required' };
    }

    const payload: Record<string, unknown> = { text };
    if (input.blocks && Array.isArray(input.blocks)) {
      payload.blocks = input.blocks;
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          data: { status: response.status },
          error: `Slack webhook failed (${response.status}): ${errorText}`,
        };
      }

      return {
        success: true,
        data: {
          sent: true,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, data: {}, error: `Failed to call Slack webhook: ${message}` };
    }
  }

  private async postChannelMessage(context: ActionExecutionContext): Promise<ActionExecutionResult> {
    const { input, credentials } = context;
    const channel = String(input.channel || '').trim();
    const text = String(input.text || '').trim();
    const token = credentials?.token || credentials?.botToken;

    if (!channel) {
      return { success: false, data: {}, error: 'Channel is required' };
    }
    if (!text) {
      return { success: false, data: {}, error: 'Message text is required' };
    }
    if (!token) {
      return { success: false, data: {}, error: 'Slack Bot token is required to post to channel' };
    }

    try {
      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ channel, text }),
      });

      const body = (await response.json()) as Record<string, unknown>;
      if (!body.ok) {
        return {
          success: false,
          data: body,
          error: `Slack API error: ${String(body.error || 'Unknown error')}`,
        };
      }

      return {
        success: true,
        data: {
          ok: true,
          channel: body.channel as string,
          ts: body.ts as string,
        },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, data: {}, error: `Failed to post to Slack: ${message}` };
    }
  }
}
