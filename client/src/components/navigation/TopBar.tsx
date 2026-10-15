import React from 'react';
import { NavTab } from './Sidebar';
import {
  Search,
  Plus,
  Sparkles,
  Bell,
  HelpCircle,
  Command
} from 'lucide-react';

interface TopBarProps {
  activeTab: NavTab;
  workspaceName: string;
  onCreateWorkflow: () => void;
  onOpenAIArchitect: () => void;
  onSearchClick?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  workspaceName,
  onCreateWorkflow,
  onOpenAIArchitect,
}) => {
  const tabTitles: Record<NavTab, string> = {
    dashboard: 'Dashboard Overview',
    workflows: 'Workflows & Automations',
    templates: 'Template Marketplace',
    integrations: 'Connected Integrations',
    runs: 'Execution Runs & Logs',
    analytics: 'Performance Analytics',
    team: 'Team & Permissions',
    billing: 'Billing & Subscriptions',
    settings: 'Workspace Settings',
  };

  return (
    <header className="h-14 border-b border-neutral-800/80 bg-neutral-950/80 backdrop-blur-md px-6 flex items-center justify-between shrink-0 z-10">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-neutral-400 font-medium">{workspaceName}</span>
        <span className="text-neutral-600">/</span>
        <h1 className="text-neutral-100 font-semibold">{tabTitles[activeTab]}</h1>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Quick Search Bar */}
        <div className="relative hidden md:flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-2.5 text-neutral-500" />
          <input
            type="text"
            placeholder="Quick search..."
            className="w-48 lg:w-64 bg-neutral-900 border border-neutral-800 rounded-lg pl-8 pr-8 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <div className="absolute right-2 flex items-center gap-0.5 text-[10px] font-mono text-neutral-500 bg-neutral-800 px-1.5 py-0.5 rounded">
            <Command className="w-2.5 h-2.5" /> K
          </div>
        </div>

        {/* AI Architect button */}
        <button
          onClick={onOpenAIArchitect}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/50 hover:bg-indigo-900/50 border border-indigo-500/30 text-indigo-300 text-xs font-medium transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Ask AI Architect</span>
        </button>

        {/* Create Workflow primary CTA */}
        <button
          onClick={onCreateWorkflow}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Workflow</span>
        </button>
      </div>
    </header>
  );
};
