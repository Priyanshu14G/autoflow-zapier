import { Injectable } from '@nestjs/common';
import { BaseConnector } from '../../core/base.connector';
import {
  ActionExecutionContext,
  ActionExecutionResult,
  AuthType,
} from '../../core/connector.interface';

@Injectable()
export class TransformConnector extends BaseConnector {
  readonly id = 'transform';
  readonly name = 'Data Utilities & Transform';
  readonly description = 'Format, manipulate, parse JSON, and transform data payloads within your workflow';
  readonly category = 'CORE' as const;
  readonly icon = 'code';
  readonly authType: AuthType = 'NONE';

  constructor() {
    super();

    this.registerAction({
      key: 'json_parse',
      name: 'Parse JSON String',
      description: 'Parses a JSON string into a structured JavaScript object',
      inputSchema: {
        text: {
          type: 'string',
          label: 'JSON String',
          description: 'The JSON string to parse',
          required: true,
        },
      },
      outputSchema: {
        parsed: { type: 'object', label: 'Parsed Object' },
      },
      execute: async (context) => {
        const raw = String(context.input.text || '').trim();
        try {
          const parsed = JSON.parse(raw);
          return { success: true, data: { parsed } };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          return { success: false, data: {}, error: `Failed to parse JSON: ${message}` };
        }
      },
    });

    this.registerAction({
      key: 'json_stringify',
      name: 'Stringify to JSON',
      description: 'Converts an object or array to a JSON string representation',
      inputSchema: {
        data: {
          type: 'object',
          label: 'Input Data',
          description: 'The object to convert to JSON string',
          required: true,
        },
        pretty: {
          type: 'boolean',
          label: 'Pretty Print (Indented)',
          default: false,
        },
      },
      outputSchema: {
        jsonString: { type: 'string', label: 'JSON String' },
      },
      execute: async (context) => {
        try {
          const pretty = Boolean(context.input.pretty);
          const jsonString = pretty
            ? JSON.stringify(context.input.data, null, 2)
            : JSON.stringify(context.input.data);
          return { success: true, data: { jsonString } };
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          return { success: false, data: {}, error: `Failed to serialize to JSON: ${message}` };
        }
      },
    });

    this.registerAction({
      key: 'format_text',
      name: 'Format Text',
      description: 'Apply string transformations such as uppercase, lowercase, trim, or replace',
      inputSchema: {
        text: { type: 'string', label: 'Text', required: true },
        operation: {
          type: 'string',
          label: 'Operation',
          enum: ['uppercase', 'lowercase', 'trim', 'length'],
          default: 'trim',
          required: true,
        },
      },
      outputSchema: {
        result: { type: 'string', label: 'Transformed Text' },
      },
      execute: async (context) => {
        const text = String(context.input.text ?? '');
        const op = String(context.input.operation || 'trim').toLowerCase();

        switch (op) {
          case 'uppercase':
            return { success: true, data: { result: text.toUpperCase() } };
          case 'lowercase':
            return { success: true, data: { result: text.toLowerCase() } };
          case 'length':
            return { success: true, data: { length: text.length, result: String(text.length) } };
          case 'trim':
          default:
            return { success: true, data: { result: text.trim() } };
        }
      },
    });
  }
}
