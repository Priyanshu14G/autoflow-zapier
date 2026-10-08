import { Injectable } from '@nestjs/common';
import { BaseConnector } from '../../core/base.connector';
import {
  ActionExecutionContext,
  ActionExecutionResult,
  AuthType,
} from '../../core/connector.interface';

@Injectable()
export class HttpConnector extends BaseConnector {
  readonly id = 'http';
  readonly name = 'HTTP / Webhook';
  readonly description = 'Make HTTP requests to any external API or webhook endpoint';
  readonly category = 'CORE' as const;
  readonly icon = 'globe';
  readonly authType: AuthType = 'NONE';

  constructor() {
    super();

    this.registerAction({
      key: 'request',
      name: 'Send HTTP Request',
      description: 'Sends an HTTP request with customizable method, headers, query parameters, body, and auth',
      inputSchema: {
        url: {
          type: 'string',
          label: 'URL',
          description: 'The endpoint URL to request',
          required: true,
          placeholder: 'https://api.example.com/v1/resource',
        },
        method: {
          type: 'string',
          label: 'Method',
          description: 'HTTP request method',
          required: true,
          default: 'GET',
          enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'],
        },
        headers: {
          type: 'object',
          label: 'Headers',
          description: 'Custom HTTP headers',
          required: false,
        },
        queryParams: {
          type: 'object',
          label: 'Query Parameters',
          description: 'URL query parameters',
          required: false,
        },
        body: {
          type: 'object',
          label: 'Body',
          description: 'Request payload (for POST, PUT, PATCH)',
          required: false,
        },
        timeoutMs: {
          type: 'number',
          label: 'Timeout (ms)',
          description: 'Request timeout in milliseconds (max 60000)',
          default: 30000,
        },
      },
      outputSchema: {
        status: { type: 'number', label: 'HTTP Status Code' },
        statusText: { type: 'string', label: 'HTTP Status Text' },
        headers: { type: 'object', label: 'Response Headers' },
        data: { type: 'object', label: 'Response Body' },
        durationMs: { type: 'number', label: 'Duration (ms)' },
      },
      execute: (context) => this.executeRequest(context),
    });
  }

  private async executeRequest(context: ActionExecutionContext): Promise<ActionExecutionResult> {
    const { input, credentials, connection } = context;

    const rawUrl = String(input.url || '').trim();
    if (!rawUrl) {
      return { success: false, data: {}, error: 'URL is required' };
    }

    const method = String(input.method || 'GET').toUpperCase();
    const timeoutMs = Math.min(Number(input.timeoutMs || context.timeoutMs || 30000), 60000);

    // Build URL with query params
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      return { success: false, data: {}, error: `Invalid URL: "${rawUrl}"` };
    }

    if (input.queryParams && typeof input.queryParams === 'object') {
      for (const [key, val] of Object.entries(input.queryParams as Record<string, unknown>)) {
        if (val !== undefined && val !== null) {
          url.searchParams.append(key, String(val));
        }
      }
    }

    // Assemble headers
    const headers: Record<string, string> = {
      'Accept': 'application/json, text/plain, */*',
      'User-Agent': 'AutoFlow-Workflow-Engine/1.0',
    };

    if (input.headers && typeof input.headers === 'object') {
      for (const [k, v] of Object.entries(input.headers as Record<string, unknown>)) {
        if (v !== undefined && v !== null) {
          headers[k] = String(v);
        }
      }
    }

    // Apply credentials / connection auth if provided
    this.applyAuth(headers, credentials, connection);

    // Prepare body
    let body: string | undefined;
    if (['POST', 'PUT', 'PATCH'].includes(method) && input.body !== undefined && input.body !== null) {
      if (typeof input.body === 'object') {
        body = JSON.stringify(input.body);
        if (!headers['Content-Type'] && !headers['content-type']) {
          headers['Content-Type'] = 'application/json';
        }
      } else {
        body = String(input.body);
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const startTime = Date.now();
    try {
      const response = await fetch(url.toString(), {
        method,
        headers,
        body,
        signal: controller.signal,
      });

      const durationMs = Date.now() - startTime;
      clearTimeout(timer);

      // Extract response headers
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((val, key) => {
        responseHeaders[key] = val;
      });

      // Parse response body
      let responseData: unknown;
      const contentType = response.headers.get('content-type') || '';
      const text = await response.text();

      if (contentType.includes('application/json') || (text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))) {
        try {
          responseData = JSON.parse(text);
        } catch {
          responseData = text;
        }
      } else {
        responseData = text;
      }

      const isSuccess = response.ok; // 200-299

      return {
        success: isSuccess,
        data: {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
          data: responseData as Record<string, unknown>,
          durationMs,
        },
        error: isSuccess ? undefined : `HTTP Request failed with status ${response.status} (${response.statusText})`,
        metadata: {
          url: url.toString(),
          method,
          durationMs,
        },
      };
    } catch (err: unknown) {
      clearTimeout(timer);
      const durationMs = Date.now() - startTime;
      const isTimeout = (err as any)?.name === 'AbortError';
      const message = isTimeout
        ? `HTTP request timed out after ${timeoutMs}ms`
        : err instanceof Error
          ? err.message
          : String(err);

      return {
        success: false,
        data: {
          durationMs,
        },
        error: message,
        metadata: {
          url: url.toString(),
          method,
          isTimeout,
        },
      };
    }
  }

  private applyAuth(
    headers: Record<string, string>,
    credentials?: Record<string, unknown>,
    connection?: ActionExecutionContext['connection'],
  ): void {
    if (!credentials) return;

    const authType = connection?.authType || credentials.authType;

    if (authType === 'BEARER_TOKEN' || credentials.token) {
      headers['Authorization'] = `Bearer ${credentials.token || credentials.bearerToken}`;
    } else if (authType === 'BASIC' || (credentials.username && credentials.password)) {
      const basicStr = `${credentials.username}:${credentials.password}`;
      headers['Authorization'] = `Basic ${Buffer.from(basicStr).toString('base64')}`;
    } else if (authType === 'API_KEY' || credentials.apiKey) {
      const headerName = String(credentials.headerName || 'X-API-Key');
      headers[headerName] = String(credentials.apiKey);
    }
  }
}
