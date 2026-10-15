import React, { useState } from 'react';
import { AppIcon } from '../ui/AppIcon';
import {
  Search,
  Sparkles,
  Zap,
  Play,
  Clock,
  Globe,
  Filter,
  Split,
  Timer,
  Terminal,
  Database,
  Mail,
  MessageSquare,
  FileText,
  ChevronDown,
  Layers,
  Plus
} from 'lucide-react';
import { NodeCategory } from '../../types';

export interface PaletteItem {
  id: string;
  title: string;
  subtitle: string;
  app: string;
  category: NodeCategory;
  defaultConfig: Record<string, any>;
  outputs: Array<{ key: string; label: string; example: string }>;
}

const PALETTE_ITEMS: PaletteItem[] = [
  // TRIGGERS
  {
    id: 'trig-webhook',
    title: 'Webhook Received',
    subtitle: 'Catch incoming JSON payload via HTTP POST',
    app: 'http',
    category: 'trigger',
    defaultConfig: { path: '/webhooks/catch' },
    outputs: [
      { key: 'trigger.body', label: 'Payload Body', example: '{"id": 101, "event": "user.signup"}' },
      { key: 'trigger.headers', label: 'Request Headers', example: '{"authorization": "Bearer ..."}' },
      { key: 'trigger.timestamp', label: 'Received Time', example: '2026-10-07T11:00:00Z' }
    ]
  },
  {
    id: 'trig-schedule',
    title: 'Schedule (Cron / Timer)',
    subtitle: 'Run periodically on timer or cron interval',
    app: 'schedule',
    category: 'trigger',
    defaultConfig: { cron: '0 9 * * 1' },
    outputs: [
      { key: 'trigger.timestamp', label: 'Scheduled Time', example: '2026-10-07T09:00:00Z' }
    ]
  },
  {
    id: 'trig-gmail',
    title: 'Gmail: New Email',
    subtitle: 'Trigger when an email matches filter query',
    app: 'gmail',
    category: 'trigger',
    defaultConfig: { filter: 'label:inbox is:unread' },
    outputs: [
      { key: 'trigger.sender', label: 'Sender Email', example: 'client@company.com' },
      { key: 'trigger.subject', label: 'Email Subject', example: 'Request for proposal' },
      { key: 'trigger.body', label: 'Body Content', example: 'Can we schedule an intro demo?' }
    ]
  },
  {
    id: 'trig-github',
    title: 'GitHub: New Issue Opened',
    subtitle: 'Trigger on new issues in chosen repository',
    app: 'github',
    category: 'trigger',
    defaultConfig: { repository: 'org/backend' },
    outputs: [
      { key: 'trigger.issueNumber', label: 'Issue Number', example: '#502' },
      { key: 'trigger.title', label: 'Issue Title', example: 'Database connection retry failure' },
      { key: 'trigger.body', label: 'Issue Body', example: 'Under heavy load, pool throws connection timeout.' }
    ]
  },
  {
    id: 'trig-stripe',
    title: 'Stripe: Payment Failed',
    subtitle: 'Trigger on invoice or charge decline',
    app: 'stripe',
    category: 'trigger',
    defaultConfig: { event: 'invoice.payment_failed' },
    outputs: [
      { key: 'trigger.customerId', label: 'Customer ID', example: 'cus_98412' },
      { key: 'trigger.amountDue', label: 'Amount Due', example: '$299.00' },
      { key: 'trigger.customerEmail', label: 'Customer Email', example: 'billing@client.com' }
    ]
  },
  {
    id: 'trig-manual',
    title: 'Manual Trigger',
    subtitle: 'Trigger workflow manually on demand or button press',
    app: 'manual',
    category: 'trigger',
    defaultConfig: {},
    outputs: [
      { key: 'trigger.user', label: 'Triggered By', example: 'Alex Chen' },
      { key: 'trigger.timestamp', label: 'Timestamp', example: '2026-10-07T11:00:00Z' }
    ]
  },

  // AI
  {
    id: 'ai-summarize',
    title: 'Gemini AI: Summarize',
    subtitle: 'Summarize text, transcripts, or email threads',
    app: 'gemini',
    category: 'ai',
    defaultConfig: {
      model: 'gemini-3.8-flash',
      instruction: 'Summarize the input text into 2 high-impact bullet points.',
      input: '{{trigger.body}}'
    },
    outputs: [
      { key: 'step.summary', label: 'Summary Text', example: 'Customer wants enterprise upgrade for 50 users.' },
      { key: 'step.sentiment', label: 'Sentiment', example: 'Positive' }
    ]
  },
  {
    id: 'ai-classify',
    title: 'Gemini AI: Classify & Route',
    subtitle: 'Route payloads into labels (Bug, Support, Billing, Sales)',
    app: 'gemini',
    category: 'ai',
    defaultConfig: {
      model: 'gemini-3.8-flash',
      categories: 'Bug, Billing, Feature Request, Urgent Inbound',
      input: '{{trigger.body}}'
    },
    outputs: [
      { key: 'step.category', label: 'Assigned Category', example: 'Urgent Inbound' },
      { key: 'step.confidence', label: 'Confidence Score', example: '0.98' }
    ]
  },
  {
    id: 'ai-extract',
    title: 'Gemini AI: Extract Structured JSON',
    subtitle: 'Convert messy text into clean typed JSON properties',
    app: 'gemini',
    category: 'ai',
    defaultConfig: {
      model: 'gemini-3.8-flash',
      schemaFields: 'company_name, contact_email, budget, timeline',
      input: '{{trigger.body}}'
    },
    outputs: [
      { key: 'step.extractedJson', label: 'Extracted JSON', example: '{"company":"Acme","budget":"$50,000"}' }
    ]
  },
  {
    id: 'ai-generate',
    title: 'Gemini AI: Generate Text',
    subtitle: 'Draft personalized replies or custom communications',
    app: 'gemini',
    category: 'ai',
    defaultConfig: {
      model: 'gemini-3.8-flash',
      instruction: 'Draft an empathetic customer success response.',
      promptTemplate: 'Reply to customer inquiry: {{trigger.body}}'
    },
    outputs: [
      { key: 'step.generatedText', label: 'Generated Text', example: 'Hi Sarah, thank you for reaching out...' }
    ]
  },

  // ACTIONS
  {
    id: 'act-slack',
    title: 'Slack: Send Message',
    subtitle: 'Post formatted message or alert to Slack channel',
    app: 'slack',
    category: 'action',
    defaultConfig: { channel: '#general', message: '🚀 New Alert: {{trigger.subject}}' },
    outputs: [
      { key: 'step.ts', label: 'Message Timestamp', example: '1728312000.12' },
      { key: 'step.channelId', label: 'Channel ID', example: 'C0489AB12' }
    ]
  },
  {
    id: 'act-gmail',
    title: 'Gmail: Send Email',
    subtitle: 'Send automated email via connected Workspace account',
    app: 'gmail',
    category: 'action',
    defaultConfig: { to: '{{trigger.sender}}', subject: 'Re: {{trigger.subject}}', body: '{{step_2.summary}}' },
    outputs: [
      { key: 'step.messageId', label: 'Sent Message ID', example: 'msg_9841203' }
    ]
  },
  {
    id: 'act-sheets',
    title: 'Google Sheets: Append Row',
    subtitle: 'Add new data row to an online spreadsheet',
    app: 'sheets',
    category: 'action',
    defaultConfig: { spreadsheetId: 'Leads Pipeline', values: '{{trigger.sender}}, {{step_2.summary}}' },
    outputs: [
      { key: 'step.rowId', label: 'Appended Row ID', example: '145' }
    ]
  },
  {
    id: 'act-http',
    title: 'HTTP Request (REST API)',
    subtitle: 'Make GET, POST, PUT, DELETE call to any endpoint',
    app: 'http',
    category: 'action',
    defaultConfig: { method: 'POST', url: 'https://api.external.com/v1/event', body: '{}' },
    outputs: [
      { key: 'step.statusCode', label: 'Status Code', example: '200' },
      { key: 'step.responseBody', label: 'Response Body', example: '{"success": true}' }
    ]
  },
  {
    id: 'act-postgres',
    title: 'PostgreSQL: Execute Query',
    subtitle: 'Run SQL insert, update or select query',
    app: 'postgresql',
    category: 'action',
    defaultConfig: { sql: 'INSERT INTO events (data) VALUES ($1);' },
    outputs: [
      { key: 'step.rowCount', label: 'Affected Rows', example: '1' }
    ]
  },
  {
    id: 'act-notion',
    title: 'Notion: Create Page',
    subtitle: 'Add item to Notion database or docs page',
    app: 'notion',
    category: 'action',
    defaultConfig: { databaseId: 'Product DB', title: '{{trigger.title}}' },
    outputs: [
      { key: 'step.pageUrl', label: 'Page URL', example: 'https://notion.so/item-912' }
    ]
  },

  // LOGIC
  {
    id: 'logic-filter',
    title: 'Filter: Only Continue If',
    subtitle: 'Halt workflow if condition is not satisfied',
    app: 'logic',
    category: 'logic',
    defaultConfig: { field: '{{step_2.urgency}}', operator: 'equals', value: 'High' },
    outputs: [
      { key: 'step.passed', label: 'Condition Passed', example: 'true' }
    ]
  },
  {
    id: 'logic-delay',
    title: 'Delay: Wait Duration',
    subtitle: 'Pause workflow execution for minutes or hours',
    app: 'schedule',
    category: 'logic',
    defaultConfig: { durationMinutes: 60 },
    outputs: [
      { key: 'step.resumedAt', label: 'Resumed At', example: '2026-10-07T12:00:00Z' }
    ]
  },
  {
    id: 'logic-formatter',
    title: 'Formatter / Transform',
    subtitle: 'Transform text, convert dates, or parse numbers',
    app: 'formatter',
    category: 'logic',
    defaultConfig: { transform: 'uppercase', input: '{{trigger.sender}}' },
    outputs: [
      { key: 'step.result', label: 'Transformed Output', example: 'ALEX@ACME.COM' }
    ]
  }
];

interface NodePaletteProps {
  onAddNode: (item: PaletteItem) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const NodePalette: React.FC<NodePaletteProps> = ({
  onAddNode,
  isCollapsed,
  onToggleCollapse,
}) => {
  const [activeCategory, setActiveCategory] = useState<NodeCategory | 'all'>('all');
  const [search, setSearch] = useState('');

  const categories: Array<{ id: NodeCategory | 'all'; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'trigger', label: 'Triggers' },
    { id: 'ai', label: 'AI' },
    { id: 'action', label: 'Actions' },
    { id: 'logic', label: 'Logic' },
  ];

  const filteredItems = PALETTE_ITEMS.filter((item) => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch =
      !search ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(search.toLowerCase()) ||
      item.app.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="w-80 h-full border-r border-neutral-800/80 bg-neutral-950/95 flex flex-col shrink-0 select-none">
      {/* Header */}
      <div className="p-3.5 border-b border-neutral-800/80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <h3 className="text-xs font-semibold text-neutral-200">Step Library</h3>
          </div>
          <span className="text-[11px] text-neutral-500 font-mono">
            {PALETTE_ITEMS.length} steps
          </span>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search triggers, AI, actions..."
            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat.id
                  ? 'bg-neutral-800 text-white font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Items list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            onClick={() => onAddNode(item)}
            className="group relative p-2.5 rounded-xl border border-neutral-800/80 bg-neutral-900/60 hover:bg-neutral-800/60 hover:border-neutral-700 transition-all cursor-pointer shadow-sm hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-neutral-800/80 border border-neutral-700/50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <AppIcon app={item.app} size={15} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-semibold text-neutral-200 truncate group-hover:text-white">
                      {item.title}
                    </h4>
                  </div>
                  <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed mt-0.5">
                    {item.subtitle}
                  </p>
                </div>
              </div>

              <div className="w-6 h-6 rounded-md bg-neutral-800/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-neutral-300 hover:bg-indigo-600 hover:text-white">
                <Plus className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        ))}

        {filteredItems.length === 0 && (
          <div className="py-12 text-center text-neutral-500 text-xs">
            No components match your search.
          </div>
        )}
      </div>
    </div>
  );
};
