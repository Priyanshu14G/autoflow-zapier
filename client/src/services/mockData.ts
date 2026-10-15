import { Workflow, Integration, Template, WorkflowRun, PricingPlan } from '../types';

export const INITIAL_INTEGRATIONS: Integration[] = [
  {
    id: 'int-gmail',
    name: 'Gmail',
    slug: 'gmail',
    category: 'Communication',
    description: 'Trigger automations on new emails, search mailboxes, and send styled emails.',
    iconBg: '#EA4335',
    iconColor: '#FFFFFF',
    connected: true,
    connectedAccount: 'alex.ops@autoflow.io',
    connectedAt: '2026-09-12T14:20:00Z',
    authMethod: 'OAuth 2.0',
    docsUrl: 'https://developers.google.com/gmail/api',
    triggers: [
      {
        id: 'gmail-new-email',
        name: 'New Email Received',
        description: 'Triggers when a new message matches an optional query filter.',
        type: 'polling',
        outputs: [
          { key: 'trigger.sender', label: 'Sender Email', example: 'client@company.com' },
          { key: 'trigger.subject', label: 'Email Subject', example: 'Enterprise contract approval' },
          { key: 'trigger.body', label: 'Plain Text Body', example: 'Looking forward to kicking off phase 2.' },
          { key: 'trigger.receivedAt', label: 'Timestamp', example: '2026-10-07T10:15:00Z' }
        ]
      },
      {
        id: 'gmail-new-attachment',
        name: 'New Attachment in Email',
        description: 'Triggers when an email contains file attachments.',
        type: 'polling',
        outputs: [
          { key: 'trigger.fileName', label: 'File Name', example: 'invoice_2026_10.pdf' },
          { key: 'trigger.fileUrl', label: 'File Download URL', example: 'https://mail.google.com/...' }
        ]
      }
    ],
    actions: [
      {
        id: 'gmail-send-email',
        name: 'Send Email',
        description: 'Dispatches an email through your connected Google Workspace account.',
        inputs: [
          { key: 'to', label: 'Recipient Email', type: 'string', required: true, placeholder: 'name@example.com' },
          { key: 'subject', label: 'Subject', type: 'string', required: true, placeholder: 'Notification regarding {{trigger.subject}}' },
          { key: 'body', label: 'Body (HTML or Markdown)', type: 'textarea', required: true, placeholder: 'Hi there, here is your summary...' }
        ],
        outputs: [
          { key: 'step.messageId', label: 'Sent Message ID', example: 'msg_98410293' },
          { key: 'step.deliveredAt', label: 'Delivered Timestamp', example: '2026-10-07T10:15:02Z' }
        ]
      }
    ]
  },
  {
    id: 'int-slack',
    name: 'Slack',
    slug: 'slack',
    category: 'Communication',
    description: 'Post rich block messages, notify incident channels, and trigger workflows from slash commands.',
    iconBg: '#4A154B',
    iconColor: '#FFFFFF',
    connected: true,
    connectedAccount: 'AutoFlow Workspace (#alerts)',
    connectedAt: '2026-08-30T09:00:00Z',
    authMethod: 'OAuth 2.0',
    docsUrl: 'https://api.slack.com',
    triggers: [
      {
        id: 'slack-new-message',
        name: 'New Message in Public Channel',
        description: 'Triggers when a message is posted to a specific channel.',
        type: 'webhook',
        outputs: [
          { key: 'trigger.channel', label: 'Channel Name', example: '#support' },
          { key: 'trigger.user', label: 'User Name', example: 'sarah_pm' },
          { key: 'trigger.text', label: 'Message Text', example: 'Production database alert' }
        ]
      }
    ],
    actions: [
      {
        id: 'slack-send-message',
        name: 'Send Channel Message',
        description: 'Sends a formatted message to any Slack channel or DM.',
        inputs: [
          { key: 'channel', label: 'Channel', type: 'string', required: true, placeholder: '#general or #alerts' },
          { key: 'message', label: 'Message Text', type: 'textarea', required: true, placeholder: '🚀 Automated Alert: {{step_2.summary}}' }
        ],
        outputs: [
          { key: 'step.ts', label: 'Slack Timestamp', example: '1728312000.000100' },
          { key: 'step.channelId', label: 'Channel ID', example: 'C0489AB12' }
        ]
      }
    ]
  },
  {
    id: 'int-gemini',
    name: 'Gemini AI',
    slug: 'gemini',
    category: 'AI',
    description: 'Autonomous reasoning, summarization, structured entity extraction, and sentiment analysis powered by Gemini 3.8 Flash.',
    iconBg: '#1E1B4B',
    iconColor: '#818CF8',
    connected: true,
    connectedAccount: 'Gemini Native Runtime Engine',
    connectedAt: '2026-01-01T00:00:00Z',
    authMethod: 'Service Account',
    docsUrl: 'https://ai.google.dev',
    triggers: [],
    actions: [
      {
        id: 'gemini-summarize',
        name: 'Summarize Text',
        description: 'Condenses raw text, email threads, or documents into executive bullet points.',
        inputs: [
          { key: 'input_text', label: 'Input Text / Payload', type: 'textarea', required: true, placeholder: '{{trigger.body}}' },
          { key: 'max_sentences', label: 'Max Length (Sentences)', type: 'number', required: false, placeholder: '3' }
        ],
        outputs: [
          { key: 'step.summary', label: 'AI Summary', example: 'Customer wants to upgrade to 500 licenses by next Monday.' },
          { key: 'step.sentiment', label: 'Sentiment', example: 'positive' }
        ]
      },
      {
        id: 'gemini-classify',
        name: 'Classify & Route',
        description: 'Categorizes input into predefined classes (e.g. Bug, Feature Request, Billing, Spam).',
        inputs: [
          { key: 'input_text', label: 'Content', type: 'textarea', required: true, placeholder: '{{trigger.text}}' },
          { key: 'categories', label: 'Categories (comma-separated)', type: 'string', required: true, placeholder: 'Billing, Technical Bug, Feature Request, High Urgency' }
        ],
        outputs: [
          { key: 'step.category', label: 'Assigned Category', example: 'Technical Bug' },
          { key: 'step.confidence', label: 'Confidence Score', example: '0.96' }
        ]
      },
      {
        id: 'gemini-extract',
        name: 'Extract Structured JSON',
        description: 'Parses unstructured text into clean JSON schema keys.',
        inputs: [
          { key: 'input_text', label: 'Unstructured Text', type: 'textarea', required: true, placeholder: '{{trigger.body}}' },
          { key: 'schema_fields', label: 'Fields to Extract', type: 'string', required: true, placeholder: 'company_name, budget, timeline, contact_person' }
        ],
        outputs: [
          { key: 'step.extractedJson', label: 'Structured JSON', example: '{"company":"Acme","budget":"$50k"}' }
        ]
      }
    ]
  },
  {
    id: 'int-sheets',
    name: 'Google Sheets',
    slug: 'sheets',
    category: 'Productivity',
    description: 'Read rows, append new data, lookup records, and keep spreadsheets in real-time sync.',
    iconBg: '#0F9D58',
    iconColor: '#FFFFFF',
    connected: true,
    connectedAccount: 'alex.ops@autoflow.io',
    connectedAt: '2026-09-12T14:21:00Z',
    authMethod: 'OAuth 2.0',
    docsUrl: 'https://developers.google.com/sheets/api',
    triggers: [
      {
        id: 'sheets-new-row',
        name: 'New Row Added',
        description: 'Triggers when a new row is appended to a worksheet.',
        type: 'polling',
        outputs: [
          { key: 'trigger.rowId', label: 'Row Index', example: '42' },
          { key: 'trigger.values', label: 'Row Values (Array)', example: '["Alex", "alex@acme.com", "Pro"]' }
        ]
      }
    ],
    actions: [
      {
        id: 'sheets-append-row',
        name: 'Append Row',
        description: 'Appends a new record to the end of a spreadsheet.',
        inputs: [
          { key: 'spreadsheetId', label: 'Spreadsheet ID or Name', type: 'string', required: true, placeholder: 'Inbound Pipeline 2026' },
          { key: 'worksheet', label: 'Sheet Tab', type: 'string', required: false, placeholder: 'Sheet1' },
          { key: 'values', label: 'Row Values (Comma-separated or JSON)', type: 'textarea', required: true, placeholder: '{{trigger.sender}}, {{step_2.summary}}, {{step_2.sentiment}}' }
        ],
        outputs: [
          { key: 'step.updatedRange', label: 'Updated Range', example: 'Sheet1!A45:D45' },
          { key: 'step.rowsAdded', label: 'Rows Added', example: '1' }
        ]
      }
    ]
  },
  {
    id: 'int-github',
    name: 'GitHub',
    slug: 'github',
    category: 'Developer Tools',
    description: 'Trigger on new issues, PRs, pushed commits, or releases; automate triage and labeling.',
    iconBg: '#24292E',
    iconColor: '#FFFFFF',
    connected: true,
    connectedAccount: 'autoflow-bot (org/core)',
    connectedAt: '2026-09-01T11:00:00Z',
    authMethod: 'OAuth 2.0',
    docsUrl: 'https://docs.github.com/rest',
    triggers: [
      {
        id: 'github-new-issue',
        name: 'New Issue Opened',
        description: 'Triggers immediately when a user creates an issue in a repository.',
        type: 'webhook',
        outputs: [
          { key: 'trigger.issueNumber', label: 'Issue #', example: '#1084' },
          { key: 'trigger.title', label: 'Issue Title', example: 'Connection timeout on cluster node 2' },
          { key: 'trigger.body', label: 'Issue Body', example: 'Stacktrace indicates memory limit exceeded.' },
          { key: 'trigger.author', label: 'Author Username', example: 'dev_carter' }
        ]
      }
    ],
    actions: [
      {
        id: 'github-create-comment',
        name: 'Add Issue Comment',
        description: 'Posts a response comment on a repository issue or pull request.',
        inputs: [
          { key: 'repository', label: 'Repository', type: 'string', required: true, placeholder: 'org/core' },
          { key: 'issueNumber', label: 'Issue Number', type: 'string', required: true, placeholder: '{{trigger.issueNumber}}' },
          { key: 'comment', label: 'Comment Markdown', type: 'textarea', required: true, placeholder: 'Automated AI Triage: {{step_2.summary}}' }
        ],
        outputs: [
          { key: 'step.commentId', label: 'Comment ID', example: '98273641' }
        ]
      }
    ]
  },
  {
    id: 'int-postgres',
    name: 'PostgreSQL',
    slug: 'postgresql',
    category: 'Databases',
    description: 'Direct SQL queries, insert rows, update records, and run database transactions.',
    iconBg: '#336791',
    iconColor: '#FFFFFF',
    connected: true,
    connectedAccount: 'production-db.internal (pg_user)',
    connectedAt: '2026-08-15T18:00:00Z',
    authMethod: 'Connection String',
    docsUrl: 'https://www.postgresql.org/docs',
    triggers: [],
    actions: [
      {
        id: 'postgres-query',
        name: 'Execute SQL Query',
        description: 'Executes a parameterized SQL query and returns result rows.',
        inputs: [
          { key: 'sql', label: 'SQL Query', type: 'textarea', required: true, placeholder: 'SELECT * FROM users WHERE status = $1' },
          { key: 'params', label: 'Query Parameters (JSON array)', type: 'string', required: false, placeholder: '["active"]' }
        ],
        outputs: [
          { key: 'step.rows', label: 'Returned Rows (JSON)', example: '[{"id": 1, "name": "Alice"}]' },
          { key: 'step.rowCount', label: 'Row Count', example: '1' }
        ]
      },
      {
        id: 'postgres-insert',
        name: 'Insert Row',
        description: 'Inserts a new record into a chosen database table.',
        inputs: [
          { key: 'table', label: 'Table Name', type: 'string', required: true, placeholder: 'audit_logs' },
          { key: 'data', label: 'Record JSON', type: 'textarea', required: true, placeholder: '{"event": "{{trigger.name}}", "timestamp": "NOW()"}' }
        ],
        outputs: [
          { key: 'step.insertedId', label: 'Inserted Primary Key', example: '99201' }
        ]
      }
    ]
  },
  {
    id: 'int-http',
    name: 'HTTP / Webhook',
    slug: 'http',
    category: 'Developer Tools',
    description: 'Send custom REST API requests with headers, query parameters, auth tokens, and raw payloads.',
    iconBg: '#4F46E5',
    iconColor: '#FFFFFF',
    connected: true,
    connectedAccount: 'Generic Web Client',
    connectedAt: '2026-01-01T00:00:00Z',
    authMethod: 'API Key',
    docsUrl: 'https://developer.mozilla.org/en-US/docs/Web/HTTP',
    triggers: [
      {
        id: 'http-webhook',
        name: 'Catch Hook / Inbound Webhook',
        description: 'Provides a unique URL that listens for incoming HTTP POST/GET requests.',
        type: 'webhook',
        outputs: [
          { key: 'trigger.body', label: 'JSON Body', example: '{"action": "signup", "id": 100}' },
          { key: 'trigger.headers', label: 'Request Headers', example: '{"content-type": "application/json"}' }
        ]
      }
    ],
    actions: [
      {
        id: 'http-request',
        name: 'Make HTTP Request',
        description: 'Calls any third-party REST API with full HTTP verb support.',
        inputs: [
          { key: 'method', label: 'Method', type: 'select', required: true, options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
          { key: 'url', label: 'Endpoint URL', type: 'string', required: true, placeholder: 'https://api.acme.com/v1/orders' },
          { key: 'headers', label: 'Headers (JSON)', type: 'textarea', required: false, placeholder: '{"Authorization": "Bearer token"}' },
          { key: 'body', label: 'Request Body (JSON)', type: 'textarea', required: false, placeholder: '{"data": "{{step_2.summary}}"}' }
        ],
        outputs: [
          { key: 'step.statusCode', label: 'HTTP Status Code', example: '200' },
          { key: 'step.responseBody', label: 'Response Body', example: '{"ok": true}' }
        ]
      }
    ]
  },
  {
    id: 'int-notion',
    name: 'Notion',
    slug: 'notion',
    category: 'Productivity',
    description: 'Create database pages, update Kanban cards, and maintain team documentation.',
    iconBg: '#000000',
    iconColor: '#FFFFFF',
    connected: false,
    authMethod: 'OAuth 2.0',
    docsUrl: 'https://developers.notion.com',
    triggers: [],
    actions: [
      {
        id: 'notion-create-page',
        name: 'Create Database Item',
        description: 'Creates a new entry in an existing Notion database.',
        inputs: [
          { key: 'databaseId', label: 'Database ID', type: 'string', required: true, placeholder: 'Notion Database ID' },
          { key: 'title', label: 'Item Title', type: 'string', required: true, placeholder: '{{trigger.subject}}' },
          { key: 'content', label: 'Page Content', type: 'textarea', required: false, placeholder: '{{step_2.summary}}' }
        ],
        outputs: [
          { key: 'step.pageUrl', label: 'Notion Page URL', example: 'https://notion.so/page_9821' }
        ]
      }
    ]
  },
  {
    id: 'int-discord',
    name: 'Discord',
    slug: 'discord',
    category: 'Communication',
    description: 'Dispatch embeds and messages to Discord channels via webhooks or bot token.',
    iconBg: '#5865F2',
    iconColor: '#FFFFFF',
    connected: false,
    authMethod: 'OAuth 2.0',
    docsUrl: 'https://discord.com/developers/docs/intro',
    triggers: [],
    actions: [
      {
        id: 'discord-send-message',
        name: 'Send Channel Message',
        description: 'Dispatches a message or embed to a Discord channel.',
        inputs: [
          { key: 'webhookUrl', label: 'Discord Webhook URL', type: 'string', required: true, placeholder: 'https://discord.com/api/webhooks/...' },
          { key: 'content', label: 'Message Content', type: 'textarea', required: true, placeholder: '🚀 Automated Alert: {{step_2.summary}}' }
        ],
        outputs: [
          { key: 'step.id', label: 'Discord Message ID', example: '109841289412' }
        ]
      }
    ]
  },
  {
    id: 'int-telegram',
    name: 'Telegram',
    slug: 'telegram',
    category: 'Communication',
    description: 'Send direct alerts and bot notifications to Telegram groups or private chats.',
    iconBg: '#229ED9',
    iconColor: '#FFFFFF',
    connected: false,
    authMethod: 'API Key',
    docsUrl: 'https://core.telegram.org/bots/api',
    triggers: [],
    actions: [
      {
        id: 'telegram-send',
        name: 'Send Bot Message',
        description: 'Sends a Telegram message to a designated Chat ID.',
        inputs: [
          { key: 'chatId', label: 'Chat ID', type: 'string', required: true, placeholder: '-100123456789' },
          { key: 'text', label: 'Message Text', type: 'textarea', required: true, placeholder: '🚨 Alert: {{step_2.summary}}' }
        ],
        outputs: [
          { key: 'step.messageId', label: 'Telegram Message ID', example: '58412' }
        ]
      }
    ]
  },
  {
    id: 'int-stripe',
    name: 'Stripe',
    slug: 'stripe',
    category: 'Finance',
    description: 'Listen to invoice payments, subscriptions, failed charges, and checkout sessions.',
    iconBg: '#635BFF',
    iconColor: '#FFFFFF',
    connected: false,
    authMethod: 'API Key',
    docsUrl: 'https://stripe.com/docs/api',
    triggers: [
      {
        id: 'stripe-payment-failed',
        name: 'Invoice Payment Failed',
        description: 'Triggers when a subscription charge or customer invoice fails.',
        type: 'webhook',
        outputs: [
          { key: 'trigger.customerId', label: 'Customer ID', example: 'cus_89412' },
          { key: 'trigger.amountDue', label: 'Amount Due', example: '$240.00' },
          { key: 'trigger.customerEmail', label: 'Customer Email', example: 'billing@enterprise.io' }
        ]
      }
    ],
    actions: []
  }
];

export const INITIAL_WORKFLOWS: Workflow[] = [
  {
    id: 'wf-1',
    workspaceId: 'ws-main',
    name: 'Customer Inbound AI Triage',
    description: 'Ingests new inbound customer inquiries, extracts urgency & sentiment with Gemini 3.8 Flash, saves lead records to Google Sheets, and pings the on-duty team on Slack.',
    status: 'active',
    version: 4,
    createdAt: '2026-09-01T10:00:00Z',
    updatedAt: '2026-10-06T19:30:00Z',
    lastRunAt: '2026-10-07T11:24:12Z',
    totalRuns: 1420,
    successRate: 99.2,
    webhookSecret: 'sec_k89x20f9241',
    nodes: [
      {
        id: 'node-1',
        type: 'workflowNode',
        position: { x: 80, y: 140 },
        data: {
          title: 'Gmail: Inbound Support Email',
          subtitle: 'Matches query: label:inbound is:unread',
          app: 'gmail',
          category: 'trigger',
          configured: true,
          config: {
            filter: 'label:inbound',
            account: 'alex.ops@autoflow.io'
          },
          outputs: [
            { key: 'trigger.sender', label: 'Sender Email', example: 'sarah.miller@fintech.io' },
            { key: 'trigger.subject', label: 'Subject', example: 'Enterprise SLA & Multi-region questions' },
            { key: 'trigger.body', label: 'Email Body', example: 'We are expanding to EU and need SOC2 compliance docs and custom pricing for 80 seats.' }
          ]
        }
      },
      {
        id: 'node-2',
        type: 'workflowNode',
        position: { x: 420, y: 140 },
        data: {
          title: 'Gemini AI: Summarize & Urgency',
          subtitle: 'Model: gemini-3.8-flash',
          app: 'gemini',
          category: 'ai',
          configured: true,
          config: {
            model: 'gemini-3.8-flash',
            instruction: 'Extract seat count, target region, urgency level, and a concise 2-sentence executive summary.',
            promptTemplate: 'Analyze customer email:\nSubject: {{trigger.subject}}\nBody: {{trigger.body}}'
          },
          outputs: [
            { key: 'step_2.summary', label: 'Executive Summary', example: 'Fintech enterprise prospect seeking 80-seat EU expansion with SOC2 verification.' },
            { key: 'step_2.urgency', label: 'Urgency Level', example: 'High' },
            { key: 'step_2.potentialARR', label: 'Estimated Deal Size', example: '$48,000/yr' }
          ]
        }
      },
      {
        id: 'node-3',
        type: 'workflowNode',
        position: { x: 760, y: 80 },
        data: {
          title: 'Google Sheets: Append Lead',
          subtitle: 'Spreadsheet: Q4 Inbound Pipeline',
          app: 'sheets',
          category: 'action',
          configured: true,
          config: {
            spreadsheetId: 'Q4 Inbound Pipeline',
            values: '{{trigger.sender}}, {{step_2.summary}}, {{step_2.urgency}}'
          },
          outputs: [
            { key: 'step_3.rowId', label: 'Appended Row Index', example: '284' }
          ]
        }
      },
      {
        id: 'node-4',
        type: 'workflowNode',
        position: { x: 760, y: 260 },
        data: {
          title: 'Slack: Alert #growth-inbound',
          subtitle: 'Channel: #growth-inbound',
          app: 'slack',
          category: 'action',
          configured: true,
          config: {
            channel: '#growth-inbound',
            message: '🎯 High Intent Lead: {{trigger.sender}}\nSummary: {{step_2.summary}}\nUrgency: {{step_2.urgency}}'
          },
          outputs: [
            { key: 'step_4.ts', label: 'Message Timestamp', example: '1728312252.000100' }
          ]
        }
      }
    ],
    edges: [
      { id: 'e1-2', source: 'node-1', target: 'node-2', animated: true },
      { id: 'e2-3', source: 'node-2', target: 'node-3', animated: true },
      { id: 'e2-4', source: 'node-2', target: 'node-4', animated: true }
    ],
    versions: [
      { version: 4, createdAt: '2026-10-06T19:30:00Z', createdByName: 'Alex Chen', notes: 'Added deal size estimation variable', nodesCount: 4 },
      { version: 3, createdAt: '2026-09-28T14:15:00Z', createdByName: 'Sarah Miller', notes: 'Upgraded to Gemini 3.8 Flash model', nodesCount: 4 },
      { version: 2, createdAt: '2026-09-15T09:00:00Z', createdByName: 'Alex Chen', notes: 'Added Google Sheets destination', nodesCount: 3 },
      { version: 1, createdAt: '2026-09-01T10:00:00Z', createdByName: 'Alex Chen', notes: 'Initial workflow build', nodesCount: 2 }
    ]
  },
  {
    id: 'wf-2',
    workspaceId: 'ws-main',
    name: 'GitHub Issue AI Sentinel',
    description: 'Autonomous DevOps pipeline: detects newly opened GitHub issues, evaluates severity & potential root causes with Gemini, and dispatches to on-call engineers.',
    status: 'active',
    version: 2,
    createdAt: '2026-09-10T14:00:00Z',
    updatedAt: '2026-10-05T12:00:00Z',
    lastRunAt: '2026-10-07T09:41:00Z',
    totalRuns: 582,
    successRate: 98.4,
    webhookSecret: 'sec_gh992147bb',
    nodes: [
      {
        id: 'node-1',
        type: 'workflowNode',
        position: { x: 100, y: 150 },
        data: {
          title: 'GitHub: New Issue Opened',
          subtitle: 'Repo: org/core-platform',
          app: 'github',
          category: 'trigger',
          configured: true,
          config: { repository: 'org/core-platform' },
          outputs: [
            { key: 'trigger.issueNumber', label: 'Issue Number', example: '#491' },
            { key: 'trigger.title', label: 'Title', example: 'Unhandled promise rejection in worker thread pool' },
            { key: 'trigger.body', label: 'Description', example: 'After 15 minutes of heavy load, thread worker terminates with SIGABRT.' }
          ]
        }
      },
      {
        id: 'node-2',
        type: 'workflowNode',
        position: { x: 440, y: 150 },
        data: {
          title: 'Gemini AI: Code Triage',
          subtitle: 'Model: gemini-3.8-flash',
          app: 'gemini',
          category: 'ai',
          configured: true,
          config: {
            instruction: 'Analyze bug report, determine severity (P0/P1/P2) and suggest code locations to inspect.'
          },
          outputs: [
            { key: 'step_2.severity', label: 'Calculated Severity', example: 'P1-High' },
            { key: 'step_2.suggestedFix', label: 'Inspection Area', example: 'Review worker pool cleanup handlers in server/workers.ts' }
          ]
        }
      },
      {
        id: 'node-3',
        type: 'workflowNode',
        position: { x: 780, y: 150 },
        data: {
          title: 'Slack: Alert #incident-room',
          subtitle: 'Channel: #incident-room',
          app: 'slack',
          category: 'action',
          configured: true,
          config: {
            channel: '#incident-room',
            message: '⚠️ Issue {{trigger.issueNumber}}: {{trigger.title}}\nSeverity: {{step_2.severity}}\nHint: {{step_2.suggestedFix}}'
          },
          outputs: [
            { key: 'step_3.ts', label: 'Dispatched Timestamp', example: '1728312000.000100' }
          ]
        }
      }
    ],
    edges: [
      { id: 'e1-2', source: 'node-1', target: 'node-2', animated: true },
      { id: 'e2-3', source: 'node-2', target: 'node-3', animated: true }
    ],
    versions: [
      { version: 2, createdAt: '2026-10-05T12:00:00Z', createdByName: 'Sarah Miller', notes: 'Include suggested code inspection hint', nodesCount: 3 },
      { version: 1, createdAt: '2026-09-10T14:00:00Z', createdByName: 'Sarah Miller', notes: 'First implementation', nodesCount: 3 }
    ]
  },
  {
    id: 'wf-3',
    workspaceId: 'ws-main',
    name: 'Stripe Churn Recovery Automation',
    description: 'Catches failed charge events, validates subscription status, sends an empathetic dunning email, and notifies account executives on Slack.',
    status: 'active',
    version: 3,
    createdAt: '2026-09-18T16:00:00Z',
    updatedAt: '2026-10-04T11:00:00Z',
    lastRunAt: '2026-10-06T22:15:00Z',
    totalRuns: 230,
    successRate: 96.5,
    webhookSecret: 'sec_str82348aa',
    nodes: [
      {
        id: 'node-1',
        type: 'workflowNode',
        position: { x: 100, y: 150 },
        data: {
          title: 'Webhook: Stripe Invoice Failed',
          subtitle: 'Event: invoice.payment_failed',
          app: 'stripe',
          category: 'trigger',
          configured: true,
          config: { event: 'invoice.payment_failed' },
          outputs: [
            { key: 'trigger.customerId', label: 'Customer ID', example: 'cus_99410' },
            { key: 'trigger.amountDue', label: 'Amount Due', example: '$299.00' },
            { key: 'trigger.customerEmail', label: 'Email', example: 'accounting@nordicdesign.co' }
          ]
        }
      },
      {
        id: 'node-2',
        type: 'workflowNode',
        position: { x: 440, y: 150 },
        data: {
          title: 'Gmail: Send Billing Reminder',
          subtitle: 'Recipient: {{trigger.customerEmail}}',
          app: 'gmail',
          category: 'action',
          configured: true,
          config: {
            to: '{{trigger.customerEmail}}',
            subject: 'Quick update needed for your AutoFlow subscription',
            body: 'Hi there, your card ending in 4242 was declined for {{trigger.amountDue}}. Please update your billing details.'
          },
          outputs: [
            { key: 'step_2.messageId', label: 'Sent Message ID', example: 'msg_841029' }
          ]
        }
      },
      {
        id: 'node-3',
        type: 'workflowNode',
        position: { x: 780, y: 150 },
        data: {
          title: 'Slack: Alert #finance-alerts',
          subtitle: 'Channel: #finance-alerts',
          app: 'slack',
          category: 'action',
          configured: true,
          config: {
            channel: '#finance-alerts',
            message: '💳 Dunning alert for {{trigger.customerEmail}} ({{trigger.amountDue}}). Reminder sent.'
          },
          outputs: [
            { key: 'step_3.ts', label: 'Timestamp', example: '1728312000.000100' }
          ]
        }
      }
    ],
    edges: [
      { id: 'e1-2', source: 'node-1', target: 'node-2', animated: true },
      { id: 'e2-3', source: 'node-2', target: 'node-3', animated: true }
    ],
    versions: [
      { version: 3, createdAt: '2026-10-04T11:00:00Z', createdByName: 'Alex Chen', notes: 'Optimized email wording', nodesCount: 3 }
    ]
  },
  {
    id: 'wf-4',
    workspaceId: 'ws-main',
    name: 'Weekly Executive Metric Synthesizer',
    description: 'Scheduled every Monday at 09:00: queries PostgreSQL for key metrics, summarizes trends via Gemini AI, and sends an executive digest.',
    status: 'paused',
    version: 1,
    createdAt: '2026-09-22T08:00:00Z',
    updatedAt: '2026-09-29T10:00:00Z',
    lastRunAt: '2026-10-05T09:00:00Z',
    totalRuns: 48,
    successRate: 100,
    nodes: [
      {
        id: 'node-1',
        type: 'workflowNode',
        position: { x: 100, y: 150 },
        data: {
          title: 'Schedule: Every Monday 09:00',
          subtitle: 'Cron: 0 9 * * 1 (UTC)',
          app: 'schedule',
          category: 'trigger',
          configured: true,
          config: { cron: '0 9 * * 1' },
          outputs: [
            { key: 'trigger.timestamp', label: 'Run Timestamp', example: '2026-10-05T09:00:00Z' }
          ]
        }
      },
      {
        id: 'node-2',
        type: 'workflowNode',
        position: { x: 440, y: 150 },
        data: {
          title: 'PostgreSQL: Aggregate Run Stats',
          subtitle: 'Database: production-db',
          app: 'postgresql',
          category: 'action',
          configured: true,
          config: {
            sql: 'SELECT count(*) as runs, avg(duration_ms) as latency FROM workflow_runs WHERE started_at >= NOW() - INTERVAL \'7 days\';'
          },
          outputs: [
            { key: 'step_2.rows', label: 'Metrics JSON', example: '[{"runs": 28410, "latency": 340}]' }
          ]
        }
      },
      {
        id: 'node-3',
        type: 'workflowNode',
        position: { x: 780, y: 150 },
        data: {
          title: 'Gemini AI: Draft Executive Brief',
          subtitle: 'Model: gemini-3.8-flash',
          app: 'gemini',
          category: 'ai',
          configured: true,
          config: {
            instruction: 'Draft a crisp 3-bullet summary with WOW factors and operational health status.'
          },
          outputs: [
            { key: 'step_3.brief', label: 'Drafted Brief', example: 'Weekly throughput +14% WoW with 99.8% nominal health.' }
          ]
        }
      }
    ],
    edges: [
      { id: 'e1-2', source: 'node-1', target: 'node-2', animated: false },
      { id: 'e2-3', source: 'node-2', target: 'node-3', animated: false }
    ],
    versions: [
      { version: 1, createdAt: '2026-09-22T08:00:00Z', createdByName: 'Alex Chen', notes: 'Initial schedule build', nodesCount: 3 }
    ]
  },
  {
    id: 'wf-5',
    workspaceId: 'ws-main',
    name: 'New Lead HubSpot & Notion Sync',
    description: 'Listens for custom signup webhooks, normalizes payload attributes, creates HubSpot CRM contact, and logs Notion record.',
    status: 'draft',
    version: 1,
    createdAt: '2026-10-02T16:00:00Z',
    updatedAt: '2026-10-02T16:00:00Z',
    lastRunAt: null,
    totalRuns: 0,
    successRate: 0,
    webhookSecret: 'sec_hb910248cc',
    nodes: [
      {
        id: 'node-1',
        type: 'workflowNode',
        position: { x: 100, y: 150 },
        data: {
          title: 'Webhook: Catch Incoming POST',
          subtitle: 'Endpoint: /webhooks/signup',
          app: 'http',
          category: 'trigger',
          configured: true,
          config: { path: '/webhooks/signup' },
          outputs: [
            { key: 'trigger.email', label: 'User Email', example: 'lead@enterprise.com' },
            { key: 'trigger.name', label: 'Full Name', example: 'Elena Rostova' }
          ]
        }
      },
      {
        id: 'node-2',
        type: 'workflowNode',
        position: { x: 440, y: 150 },
        data: {
          title: 'Notion: Create Contact Card',
          subtitle: 'Database: Contacts CRM',
          app: 'notion',
          category: 'action',
          configured: false,
          config: {},
          outputs: [
            { key: 'step_2.pageUrl', label: 'Notion Page URL', example: 'https://notion.so/...' }
          ]
        }
      }
    ],
    edges: [
      { id: 'e1-2', source: 'node-1', target: 'node-2', animated: false }
    ],
    versions: [
      { version: 1, createdAt: '2026-10-02T16:00:00Z', createdByName: 'David Kim', notes: 'Draft setup', nodesCount: 2 }
    ]
  }
];

export const INITIAL_TEMPLATES: Template[] = [
  {
    id: 'tpl-1',
    name: 'Gmail → AI Summarization → Slack',
    description: 'Monitor high-priority Gmail inboxes, synthesize email content with Gemini 3.8 Flash, and broadcast concise summaries to Slack.',
    category: 'Communication',
    apps: ['gmail', 'gemini', 'slack'],
    stepsCount: 3,
    popular: true,
    workflowData: {
      nodes: [
        {
          id: 'n1',
          type: 'workflowNode',
          position: { x: 80, y: 150 },
          data: {
            title: 'Gmail: New Customer Email',
            subtitle: 'Label: Inquiries',
            app: 'gmail',
            category: 'trigger',
            configured: true,
            config: { query: 'label:inquiries' },
            outputs: [
              { key: 'trigger.sender', label: 'Sender', example: 'user@acme.com' },
              { key: 'trigger.subject', label: 'Subject', example: 'Need help with API' },
              { key: 'trigger.body', label: 'Body', example: 'We are experiencing rate limits on batch ingest...' }
            ]
          }
        },
        {
          id: 'n2',
          type: 'workflowNode',
          position: { x: 420, y: 150 },
          data: {
            title: 'Gemini AI: Summarize & Sentiment',
            subtitle: 'gemini-3.8-flash',
            app: 'gemini',
            category: 'ai',
            configured: true,
            config: { instruction: 'Summarize email body into 2 key points and detect urgency.' },
            outputs: [
              { key: 'step_2.summary', label: 'Summary', example: 'User encountering rate limits during batch ingest.' },
              { key: 'step_2.sentiment', label: 'Urgency', example: 'Medium' }
            ]
          }
        },
        {
          id: 'n3',
          type: 'workflowNode',
          position: { x: 760, y: 150 },
          data: {
            title: 'Slack: Send Channel Alert',
            subtitle: '#customer-pulse',
            app: 'slack',
            category: 'action',
            configured: true,
            config: { channel: '#customer-pulse', message: '📩 {{trigger.sender}}: {{step_2.summary}}' },
            outputs: [{ key: 'step_3.ts', label: 'Message TS', example: '1728312000.1' }]
          }
        }
      ],
      edges: [
        { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
        { id: 'e2-3', source: 'n2', target: 'n3', animated: true }
      ]
    }
  },
  {
    id: 'tpl-2',
    name: 'GitHub Issue → Gemini AI Triage → Slack',
    description: 'Autonomous incident response: classifies new GitHub issues by severity and dispatches alerts directly to the engineering channel.',
    category: 'Developer Tools',
    apps: ['github', 'gemini', 'slack'],
    stepsCount: 3,
    popular: true,
    workflowData: {
      nodes: [
        {
          id: 'n1',
          type: 'workflowNode',
          position: { x: 80, y: 150 },
          data: {
            title: 'GitHub: New Issue Opened',
            subtitle: 'Event: issues.opened',
            app: 'github',
            category: 'trigger',
            configured: true,
            config: { repository: 'org/backend' },
            outputs: [
              { key: 'trigger.issueNumber', label: 'Issue #', example: '#249' },
              { key: 'trigger.title', label: 'Title', example: 'Memory leak in redis cache' },
              { key: 'trigger.body', label: 'Body', example: 'Cache nodes crash after 6h.' }
            ]
          }
        },
        {
          id: 'n2',
          type: 'workflowNode',
          position: { x: 420, y: 150 },
          data: {
            title: 'Gemini AI: Severity & Root Cause',
            subtitle: 'gemini-3.8-flash',
            app: 'gemini',
            category: 'ai',
            configured: true,
            config: { instruction: 'Determine severity (P0/P1/P2) and give diagnostic suggestions.' },
            outputs: [
              { key: 'step_2.severity', label: 'Severity', example: 'P1-High' },
              { key: 'step_2.suggestion', label: 'Suggestion', example: 'Investigate TTL expiration callbacks.' }
            ]
          }
        },
        {
          id: 'n3',
          type: 'workflowNode',
          position: { x: 760, y: 150 },
          data: {
            title: 'Slack: Alert #incident-room',
            subtitle: '#incident-room',
            app: 'slack',
            category: 'action',
            configured: true,
            config: { channel: '#incident-room', message: '⚠️ Issue {{trigger.issueNumber}}: {{trigger.title}} [{{step_2.severity}}]' },
            outputs: [{ key: 'step_3.ts', label: 'TS', example: '1728312000.2' }]
          }
        }
      ],
      edges: [
        { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
        { id: 'e2-3', source: 'n2', target: 'n3', animated: true }
      ]
    }
  },
  {
    id: 'tpl-3',
    name: 'Google Form → Google Sheets → Slack Alert',
    description: 'Capture inbound contact requests, format submissions into Google Sheets, and notify internal teams without manual copy-pasting.',
    category: 'Productivity',
    apps: ['sheets', 'slack'],
    stepsCount: 2,
    popular: false,
    workflowData: {
      nodes: [
        {
          id: 'n1',
          type: 'workflowNode',
          position: { x: 100, y: 150 },
          data: {
            title: 'Google Sheets: New Form Entry',
            subtitle: 'Trigger on new row',
            app: 'sheets',
            category: 'trigger',
            configured: true,
            config: { spreadsheet: 'Inbound Inquiries' },
            outputs: [
              { key: 'trigger.name', label: 'Name', example: 'Marcus Vance' },
              { key: 'trigger.email', label: 'Email', example: 'marcus@vance.co' }
            ]
          }
        },
        {
          id: 'n2',
          type: 'workflowNode',
          position: { x: 460, y: 150 },
          data: {
            title: 'Slack: Broadcast Submission',
            subtitle: '#leads',
            app: 'slack',
            category: 'action',
            configured: true,
            config: { channel: '#leads', message: '🎉 New lead: {{trigger.name}} ({{trigger.email}})' },
            outputs: [{ key: 'step_2.ts', label: 'TS', example: '1728312000.3' }]
          }
        }
      ],
      edges: [{ id: 'e1-2', source: 'n1', target: 'n2', animated: true }]
    }
  },
  {
    id: 'tpl-4',
    name: 'New Customer → Stripe → CRM → Slack',
    description: 'When a new payment succeeds in Stripe, enrich user persona with Gemini AI and notify executive stakeholders.',
    category: 'Finance',
    apps: ['stripe', 'gemini', 'slack'],
    stepsCount: 3,
    popular: true,
    workflowData: {
      nodes: [
        {
          id: 'n1',
          type: 'workflowNode',
          position: { x: 80, y: 150 },
          data: {
            title: 'Stripe: Payment Succeeded',
            subtitle: 'Event: charge.succeeded',
            app: 'stripe',
            category: 'trigger',
            configured: true,
            config: { event: 'charge.succeeded' },
            outputs: [
              { key: 'trigger.customer', label: 'Customer', example: 'Jordan Blake' },
              { key: 'trigger.amount', label: 'Amount', example: '$499.00' }
            ]
          }
        },
        {
          id: 'n2',
          type: 'workflowNode',
          position: { x: 420, y: 150 },
          data: {
            title: 'Gemini AI: Account Analysis',
            subtitle: 'Analyze customer potential',
            app: 'gemini',
            category: 'ai',
            configured: true,
            config: { instruction: 'Calculate lifetime valuation and suggest VIP perks.' },
            outputs: [
              { key: 'step_2.tier', label: 'Calculated Tier', example: 'Platinum Enterprise' }
            ]
          }
        },
        {
          id: 'n3',
          type: 'workflowNode',
          position: { x: 760, y: 150 },
          data: {
            title: 'Slack: Celebrate New Revenue',
            subtitle: '#revenue-wins',
            app: 'slack',
            category: 'action',
            configured: true,
            config: { channel: '#revenue-wins', message: '💰 New ${{trigger.amount}} payment from {{trigger.customer}} [{{step_2.tier}}]!' },
            outputs: [{ key: 'step_3.ts', label: 'TS', example: '1728312000.4' }]
          }
        }
      ],
      edges: [
        { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
        { id: 'e2-3', source: 'n2', target: 'n3', animated: true }
      ]
    }
  },
  {
    id: 'tpl-5',
    name: 'Gmail → AI Summarization → Notion Database',
    description: 'Transform customer emails into organized Notion documentation cards with automated tags and structured takeaways.',
    category: 'Productivity',
    apps: ['gmail', 'gemini', 'notion'],
    stepsCount: 3,
    popular: false,
    workflowData: {
      nodes: [
        {
          id: 'n1',
          type: 'workflowNode',
          position: { x: 80, y: 150 },
          data: {
            title: 'Gmail: Inbound Feedback',
            subtitle: 'Subject contains: Feedback',
            app: 'gmail',
            category: 'trigger',
            configured: true,
            config: { query: 'subject:feedback' },
            outputs: [
              { key: 'trigger.sender', label: 'Sender', example: 'claire@agency.io' },
              { key: 'trigger.subject', label: 'Subject', example: 'Feedback on canvas UI' },
              { key: 'trigger.body', label: 'Body', example: 'The canvas pan speed is incredible...' }
            ]
          }
        },
        {
          id: 'n2',
          type: 'workflowNode',
          position: { x: 420, y: 150 },
          data: {
            title: 'Gemini AI: Categorize Feedback',
            subtitle: 'Extract UX themes',
            app: 'gemini',
            category: 'ai',
            configured: true,
            config: { instruction: 'Categorize into UX, Feature, or Performance.' },
            outputs: [
              { key: 'step_2.category', label: 'Category', example: 'UX Delight' },
              { key: 'step_2.summary', label: 'Summary', example: 'Praised canvas smoothness and pan speed.' }
            ]
          }
        },
        {
          id: 'n3',
          type: 'workflowNode',
          position: { x: 760, y: 150 },
          data: {
            title: 'Notion: Create Product Card',
            subtitle: 'Product Roadmap DB',
            app: 'notion',
            category: 'action',
            configured: true,
            config: { databaseId: 'roadmap_db', title: '{{trigger.subject}}' },
            outputs: [{ key: 'step_3.pageUrl', label: 'Notion Page', example: 'https://notion.so/item-991' }]
          }
        }
      ],
      edges: [
        { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
        { id: 'e2-3', source: 'n2', target: 'n3', animated: true }
      ]
    }
  },
  {
    id: 'tpl-6',
    name: 'Daily Report → Gemini AI → Email Digest',
    description: 'Scheduled every morning: aggregates database transactions, writes an executive narrative with Gemini, and delivers via email.',
    category: 'Operations',
    apps: ['schedule', 'postgresql', 'gemini', 'gmail'],
    stepsCount: 4,
    popular: false,
    workflowData: {
      nodes: [
        {
          id: 'n1',
          type: 'workflowNode',
          position: { x: 60, y: 150 },
          data: {
            title: 'Schedule: Daily 08:00 AM',
            subtitle: 'Cron: 0 8 * * *',
            app: 'schedule',
            category: 'trigger',
            configured: true,
            config: { cron: '0 8 * * *' },
            outputs: [{ key: 'trigger.date', label: 'Date', example: '2026-10-07' }]
          }
        },
        {
          id: 'n2',
          type: 'workflowNode',
          position: { x: 340, y: 150 },
          data: {
            title: 'PostgreSQL: Fetch Daily KPIs',
            subtitle: 'DB: prod_cluster',
            app: 'postgresql',
            category: 'action',
            configured: true,
            config: { sql: 'SELECT count(*) FROM orders WHERE date = today()' },
            outputs: [{ key: 'step_2.orders', label: 'Order Count', example: '1,429' }]
          }
        },
        {
          id: 'n3',
          type: 'workflowNode',
          position: { x: 620, y: 150 },
          data: {
            title: 'Gemini AI: Compose Brief',
            subtitle: 'gemini-3.8-flash',
            app: 'gemini',
            category: 'ai',
            configured: true,
            config: { instruction: 'Write an inspiring 3-sentence executive update.' },
            outputs: [{ key: 'step_3.narrative', label: 'Digest Text', example: 'Record day with 1,429 orders processed.' }]
          }
        },
        {
          id: 'n4',
          type: 'workflowNode',
          position: { x: 900, y: 150 },
          data: {
            title: 'Gmail: Dispatch Daily Digest',
            subtitle: 'To: leadership@company.com',
            app: 'gmail',
            category: 'action',
            configured: true,
            config: { to: 'leadership@company.com', subject: 'Morning Executive Brief - {{trigger.date}}' },
            outputs: [{ key: 'step_4.status', label: 'Sent', example: 'true' }]
          }
        }
      ],
      edges: [
        { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
        { id: 'e2-3', source: 'n2', target: 'n3', animated: true },
        { id: 'e3-4', source: 'n3', target: 'n4', animated: true }
      ]
    }
  },
  {
    id: 'tpl-7',
    name: 'Webhook → Gemini AI → PostgreSQL Insert',
    description: 'High-throughput event ingestion: accepts JSON payloads via secure webhook URL, enriches entities with Gemini AI, and inserts into Postgres.',
    category: 'Developer Tools',
    apps: ['http', 'gemini', 'postgresql'],
    stepsCount: 3,
    popular: true,
    workflowData: {
      nodes: [
        {
          id: 'n1',
          type: 'workflowNode',
          position: { x: 80, y: 150 },
          data: {
            title: 'Webhook: Catch Incoming Payload',
            subtitle: 'POST /webhooks/ingest',
            app: 'http',
            category: 'trigger',
            configured: true,
            config: { path: '/webhooks/ingest' },
            outputs: [
              { key: 'trigger.userId', label: 'User ID', example: 'usr_84120' },
              { key: 'trigger.feedback', label: 'Raw Feedback', example: 'Loved the fast onboarding.' }
            ]
          }
        },
        {
          id: 'n2',
          type: 'workflowNode',
          position: { x: 420, y: 150 },
          data: {
            title: 'Gemini AI: Extract Tags & Score',
            subtitle: 'gemini-3.8-flash',
            app: 'gemini',
            category: 'ai',
            configured: true,
            config: { instruction: 'Extract sentiment score and key feature keywords.' },
            outputs: [
              { key: 'step_2.sentimentScore', label: 'Score', example: '0.94' },
              { key: 'step_2.tags', label: 'Tags', example: '["onboarding", "speed"]' }
            ]
          }
        },
        {
          id: 'n3',
          type: 'workflowNode',
          position: { x: 760, y: 150 },
          data: {
            title: 'PostgreSQL: Upsert Record',
            subtitle: 'Table: customer_intelligence',
            app: 'postgresql',
            category: 'action',
            configured: true,
            config: { table: 'customer_intelligence' },
            outputs: [{ key: 'step_3.rows', label: 'Inserted Row', example: '1' }]
          }
        }
      ],
      edges: [
        { id: 'e1-2', source: 'n1', target: 'n2', animated: true },
        { id: 'e2-3', source: 'n2', target: 'n3', animated: true }
      ]
    }
  }
];

export const INITIAL_RUNS: WorkflowRun[] = [
  {
    id: 'run-9041',
    workflowId: 'wf-1',
    workflowName: 'Customer Inbound AI Triage',
    status: 'success',
    startedAt: '2026-10-07T11:24:12Z',
    completedAt: '2026-10-07T11:24:14Z',
    durationMs: 1840,
    triggerSource: 'Gmail Poller (msg_98412)',
    stepsCount: 4,
    tasksConsumed: 4,
    steps: [
      {
        id: 'st-1',
        nodeId: 'node-1',
        nodeTitle: 'Gmail: Inbound Support Email',
        app: 'gmail',
        status: 'success',
        startedAt: '2026-10-07T11:24:12.100Z',
        finishedAt: '2026-10-07T11:24:12.420Z',
        durationMs: 320,
        input: { filter: 'label:inbound is:unread' },
        output: {
          sender: 'sarah.miller@fintech.io',
          subject: 'Enterprise SLA & Multi-region questions',
          body: 'We are expanding to EU and need SOC2 compliance docs and custom pricing for 80 seats.'
        },
        requestPayload: { query: 'label:inbound', maxResults: 1 },
        responsePayload: { messages: [{ id: 'msg_98412', threadId: 'thr_881' }] }
      },
      {
        id: 'st-2',
        nodeId: 'node-2',
        nodeTitle: 'Gemini AI: Summarize & Urgency',
        app: 'gemini',
        status: 'success',
        startedAt: '2026-10-07T11:24:12.430Z',
        finishedAt: '2026-10-07T11:24:13.250Z',
        durationMs: 820,
        input: {
          prompt: 'Analyze customer email:\nSubject: Enterprise SLA & Multi-region questions\nBody: We are expanding to EU and need SOC2 compliance docs and custom pricing for 80 seats.'
        },
        output: {
          summary: 'Fintech enterprise prospect seeking 80-seat EU expansion with SOC2 verification.',
          urgency: 'High',
          potentialARR: '$48,000/yr'
        },
        requestPayload: { model: 'gemini-3.8-flash', temperature: 0.2 },
        responsePayload: { candidateTokens: 114, totalDuration: '820ms' }
      },
      {
        id: 'st-3',
        nodeId: 'node-3',
        nodeTitle: 'Google Sheets: Append Lead',
        app: 'sheets',
        status: 'success',
        startedAt: '2026-10-07T11:24:13.260Z',
        finishedAt: '2026-10-07T11:24:13.610Z',
        durationMs: 350,
        input: {
          spreadsheet: 'Q4 Inbound Pipeline',
          values: ['sarah.miller@fintech.io', 'Fintech enterprise prospect seeking 80-seat EU expansion with SOC2 verification.', 'High']
        },
        output: { updatedRange: 'Sheet1!A284:C284', rowsAdded: 1 },
        requestPayload: { range: 'Sheet1!A:C', valueInputOption: 'USER_ENTERED' },
        responsePayload: { updatedCells: 3 }
      },
      {
        id: 'st-4',
        nodeId: 'node-4',
        nodeTitle: 'Slack: Alert #growth-inbound',
        app: 'slack',
        status: 'success',
        startedAt: '2026-10-07T11:24:13.620Z',
        finishedAt: '2026-10-07T11:24:13.940Z',
        durationMs: 320,
        input: {
          channel: '#growth-inbound',
          message: '🎯 High Intent Lead: sarah.miller@fintech.io\nSummary: Fintech enterprise prospect seeking 80-seat EU expansion with SOC2 verification.\nUrgency: High'
        },
        output: { ok: true, ts: '1728312253.940100', channel: 'C0489AB12' },
        requestPayload: { channel: 'C0489AB12', text: '🎯 High Intent Lead...' },
        responsePayload: { ok: true }
      }
    ]
  },
  {
    id: 'run-9040',
    workflowId: 'wf-2',
    workflowName: 'GitHub Issue AI Sentinel',
    status: 'success',
    startedAt: '2026-10-07T09:41:00Z',
    completedAt: '2026-10-07T09:41:01Z',
    durationMs: 1420,
    triggerSource: 'GitHub Webhook (Event #491)',
    stepsCount: 3,
    tasksConsumed: 3,
    steps: [
      {
        id: 'st-201',
        nodeId: 'node-1',
        nodeTitle: 'GitHub: New Issue Opened',
        app: 'github',
        status: 'success',
        startedAt: '2026-10-07T09:41:00.050Z',
        finishedAt: '2026-10-07T09:41:00.180Z',
        durationMs: 130,
        input: { repo: 'org/core-platform' },
        output: {
          issueNumber: '#491',
          title: 'Unhandled promise rejection in worker thread pool',
          body: 'After 15 minutes of heavy load, thread worker terminates with SIGABRT.'
        }
      },
      {
        id: 'st-202',
        nodeId: 'node-2',
        nodeTitle: 'Gemini AI: Code Triage',
        app: 'gemini',
        status: 'success',
        startedAt: '2026-10-07T09:41:00.190Z',
        finishedAt: '2026-10-07T09:41:01.050Z',
        durationMs: 860,
        input: { prompt: 'Analyze bug report...' },
        output: {
          severity: 'P1-High',
          suggestedFix: 'Review worker pool cleanup handlers in server/workers.ts'
        }
      },
      {
        id: 'st-203',
        nodeId: 'node-3',
        nodeTitle: 'Slack: Alert #incident-room',
        app: 'slack',
        status: 'success',
        startedAt: '2026-10-07T09:41:01.060Z',
        finishedAt: '2026-10-07T09:41:01.470Z',
        durationMs: 410,
        input: { channel: '#incident-room' },
        output: { ok: true, ts: '1728306061.470000' }
      }
    ]
  },
  {
    id: 'run-9039',
    workflowId: 'wf-3',
    workflowName: 'Stripe Churn Recovery Automation',
    status: 'failed',
    startedAt: '2026-10-06T22:15:00Z',
    completedAt: '2026-10-06T22:15:02Z',
    durationMs: 2110,
    triggerSource: 'Stripe Webhook (evt_391024)',
    stepsCount: 3,
    tasksConsumed: 2,
    errorMessage: 'Gmail API Rate Limit (429 Too Many Requests): User daily quota exceeded for account.',
    steps: [
      {
        id: 'st-301',
        nodeId: 'node-1',
        nodeTitle: 'Webhook: Stripe Invoice Failed',
        app: 'stripe',
        status: 'success',
        startedAt: '2026-10-06T22:15:00.100Z',
        finishedAt: '2026-10-06T22:15:00.310Z',
        durationMs: 210,
        input: { event: 'invoice.payment_failed' },
        output: {
          customerId: 'cus_99410',
          amountDue: '$299.00',
          customerEmail: 'accounting@nordicdesign.co'
        }
      },
      {
        id: 'st-302',
        nodeId: 'node-2',
        nodeTitle: 'Gmail: Send Billing Reminder',
        app: 'gmail',
        status: 'failed',
        startedAt: '2026-10-06T22:15:00.320Z',
        finishedAt: '2026-10-06T22:15:02.210Z',
        durationMs: 1890,
        input: { to: 'accounting@nordicdesign.co', subject: 'Quick update needed' },
        output: null,
        errorMessage: 'Gmail API Rate Limit (429 Too Many Requests): User daily quota exceeded for account.',
        requestPayload: { to: 'accounting@nordicdesign.co' },
        responsePayload: { error: { code: 429, message: 'Resource exhausted: quota exceeded.' } }
      },
      {
        id: 'st-303',
        nodeId: 'node-3',
        nodeTitle: 'Slack: Alert #finance-alerts',
        app: 'slack',
        status: 'pending',
        startedAt: '2026-10-06T22:15:02.220Z',
        finishedAt: null,
        durationMs: 0,
        input: {},
        output: null
      }
    ]
  },
  {
    id: 'run-9038',
    workflowId: 'wf-1',
    workflowName: 'Customer Inbound AI Triage',
    status: 'success',
    startedAt: '2026-10-06T18:40:21Z',
    completedAt: '2026-10-06T18:40:23Z',
    durationMs: 1720,
    triggerSource: 'Gmail Poller (msg_98319)',
    stepsCount: 4,
    tasksConsumed: 4,
    steps: [
      {
        id: 'st-11',
        nodeId: 'node-1',
        nodeTitle: 'Gmail: Inbound Support Email',
        app: 'gmail',
        status: 'success',
        startedAt: '2026-10-06T18:40:21.050Z',
        finishedAt: '2026-10-06T18:40:21.320Z',
        durationMs: 270,
        input: {},
        output: { sender: 'ben@matrixlabs.dev', subject: 'Integration webhook limits' }
      },
      {
        id: 'st-12',
        nodeId: 'node-2',
        nodeTitle: 'Gemini AI: Summarize & Urgency',
        app: 'gemini',
        status: 'success',
        startedAt: '2026-10-06T18:40:21.330Z',
        finishedAt: '2026-10-06T18:40:22.120Z',
        durationMs: 790,
        input: {},
        output: { summary: 'Developer requesting high concurrency webhook plan.', urgency: 'Medium' }
      },
      {
        id: 'st-13',
        nodeId: 'node-3',
        nodeTitle: 'Google Sheets: Append Lead',
        app: 'sheets',
        status: 'success',
        startedAt: '2026-10-06T18:40:22.130Z',
        finishedAt: '2026-10-06T18:40:22.450Z',
        durationMs: 320,
        input: {},
        output: { rowId: '283' }
      },
      {
        id: 'st-14',
        nodeId: 'node-4',
        nodeTitle: 'Slack: Alert #growth-inbound',
        app: 'slack',
        status: 'success',
        startedAt: '2026-10-06T18:40:22.460Z',
        finishedAt: '2026-10-06T18:40:22.770Z',
        durationMs: 310,
        input: {},
        output: { ok: true }
      }
    ]
  },
  {
    id: 'run-9037',
    workflowId: 'wf-4',
    workflowName: 'Weekly Executive Metric Synthesizer',
    status: 'success',
    startedAt: '2026-10-05T09:00:00Z',
    completedAt: '2026-10-05T09:00:02Z',
    durationMs: 2240,
    triggerSource: 'Cron Scheduler',
    stepsCount: 3,
    tasksConsumed: 3,
    steps: [
      {
        id: 'st-41',
        nodeId: 'node-1',
        nodeTitle: 'Schedule: Every Monday 09:00',
        app: 'schedule',
        status: 'success',
        startedAt: '2026-10-05T09:00:00.010Z',
        finishedAt: '2026-10-05T09:00:00.050Z',
        durationMs: 40,
        input: {},
        output: { timestamp: '2026-10-05T09:00:00Z' }
      },
      {
        id: 'st-42',
        nodeId: 'node-2',
        nodeTitle: 'PostgreSQL: Aggregate Run Stats',
        app: 'postgresql',
        status: 'success',
        startedAt: '2026-10-05T09:00:00.060Z',
        finishedAt: '2026-10-05T09:00:00.780Z',
        durationMs: 720,
        input: {},
        output: { rows: [{ runs: 28410, latency: 340 }] }
      },
      {
        id: 'st-43',
        nodeId: 'node-3',
        nodeTitle: 'Gemini AI: Draft Executive Brief',
        app: 'gemini',
        status: 'success',
        startedAt: '2026-10-05T09:00:00.790Z',
        finishedAt: '2026-10-05T09:00:02.250Z',
        durationMs: 1460,
        input: {},
        output: { brief: 'Weekly throughput +14% WoW with 99.8% nominal health.' }
      }
    ]
  }
];

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    audience: 'For exploring automations & prototypes',
    priceMonthly: 0,
    tasksMonthly: 100,
    activeWorkflowsLimit: 3,
    checkFrequency: 'Every 15 minutes',
    features: [
      '100 tasks / month',
      '3 active workflows',
      '15-minute polling cadence',
      'Single-step Gemini AI runs',
      'Community support'
    ]
  },
  {
    id: 'starter',
    name: 'Starter',
    audience: 'For early-stage teams & makers',
    priceMonthly: 29,
    tasksMonthly: 5000,
    activeWorkflowsLimit: 20,
    checkFrequency: 'Every 5 minutes',
    features: [
      '5,000 tasks / month',
      '20 active workflows',
      '5-minute polling interval',
      'Multi-step branching & filters',
      'Webhook listener endpoints',
      'Email support (24h response)'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    audience: 'For scaling operations & high volume',
    priceMonthly: 99,
    tasksMonthly: 25000,
    activeWorkflowsLimit: 'Unlimited',
    checkFrequency: 'Real-time & 1 minute',
    popular: true,
    features: [
      '25,000 tasks / month',
      'Unlimited active workflows',
      '1-minute polling + instant webhooks',
      'Gemini 3.8 Flash AI reasoning engine',
      'Unlimited workspace collaborators',
      'Auto-retry with exponential backoff',
      'Priority support'
    ]
  },
  {
    id: 'business',
    name: 'Business',
    audience: 'For enterprise missions & SOC2 compliance',
    priceMonthly: 299,
    tasksMonthly: 100000,
    activeWorkflowsLimit: 'Unlimited',
    checkFrequency: 'Real-time & 30 seconds',
    features: [
      '100,000 tasks / month',
      'Dedicated background worker pool',
      'Custom webhook retry policies',
      'Role-based access control (RBAC)',
      'Audit log exports (PostgreSQL-ready)',
      'Custom SLA & dedicated account manager'
    ]
  }
];
