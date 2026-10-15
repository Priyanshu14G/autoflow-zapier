import React, { useState } from 'react';
import { User, Workspace } from '../../types';
import { StorageService, INITIAL_WORKSPACES } from '../../services/storageService';
import {
  LayoutDashboard,
  GitBranch,
  LayoutGrid,
  Zap,
  Activity,
  BarChart3,
  Users,
  CreditCard,
  Settings,
  ChevronDown,
  Check,
  Plus,
  LogOut,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'workflows'
  | 'templates'
  | 'integrations'
  | 'runs'
  | 'analytics'
  | 'team'
  | 'billing'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  currentUser: User;
  currentWorkspace: Workspace;
  onSelectWorkspace: (ws: Workspace) => void;
  onOpenAIArchitect: () => void;
  onOpenAuthModal: () => void;
  workflowsCount: number;
  runsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  currentWorkspace,
  onSelectWorkspace,
  onOpenAIArchitect,
  onOpenAuthModal,
  workflowsCount,
  runsCount,
}) => {
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const workspaces = INITIAL_WORKSPACES;

  const navItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ReactNode;
    badge?: number | string;
  }> = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'workflows',
      label: 'Workflows',
      icon: <GitBranch className="w-4 h-4" />,
      badge: workflowsCount,
    },
    {
      id: 'templates',
      label: 'Templates',
      icon: <LayoutGrid className="w-4 h-4" />,
    },
    {
      id: 'integrations',
      label: 'Integrations',
      icon: <Zap className="w-4 h-4" />,
    },
    {
      id: 'runs',
      label: 'Runs & History',
      icon: <Activity className="w-4 h-4" />,
      badge: runsCount > 0 ? runsCount : undefined,
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      id: 'team',
      label: 'Team',
      icon: <Users className="w-4 h-4" />,
    },
    {
      id: 'billing',
      label: 'Billing',
      icon: <CreditCard className="w-4 h-4" />,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  return (
    <aside className="w-64 h-screen bg-neutral-950 border-r border-neutral-800/80 flex flex-col shrink-0 select-none z-20">
      {/* Workspace Switcher Top Bar */}
      <div className="p-3 border-b border-neutral-800/80 relative">
        <button
          onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
          className="w-full flex items-center justify-between p-2 rounded-xl bg-neutral-900/60 hover:bg-neutral-800/60 border border-neutral-800/80 transition-colors text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-indigo-400">
                {currentWorkspace.name.substring(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-semibold text-neutral-100 truncate leading-tight">
                {currentWorkspace.name}
              </h3>
              <span className="text-[10px] text-neutral-500 font-mono capitalize">
                {currentWorkspace.plan} Plan
              </span>
            </div>
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${
              isWorkspaceMenuOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Workspace Dropdown */}
        {isWorkspaceMenuOpen && (
          <div className="absolute top-14 left-3 right-3 z-50 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl p-1.5 space-y-1 animate-in fade-in duration-100">
            <div className="px-2 py-1 text-[10px] uppercase tracking-wider font-semibold text-neutral-500">
              Workspaces
            </div>
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => {
                  onSelectWorkspace(ws);
                  setIsWorkspaceMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium text-left transition-colors ${
                  currentWorkspace.id === ws.id
                    ? 'bg-indigo-600/20 text-indigo-200'
                    : 'text-neutral-300 hover:bg-neutral-800/60'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-5 h-5 rounded bg-neutral-800 flex items-center justify-center text-[10px] font-bold text-neutral-400">
                    {ws.name.substring(0, 1)}
                  </span>
                  <span className="truncate">{ws.name}</span>
                </div>
                {currentWorkspace.id === ws.id && (
                  <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* AI Quick Generator Prompt Button */}
      <div className="px-3 pt-3">
        <button
          onClick={onOpenAIArchitect}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600/30 via-purple-600/30 to-pink-600/20 border border-indigo-500/30 hover:border-indigo-400/50 text-indigo-200 hover:text-white text-xs font-semibold shadow-sm transition-all group"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
          <span>Ask AI to Build Workflow</span>
        </button>
      </div>

      {/* Main Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-neutral-800/90 text-white font-semibold shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={isActive ? 'text-indigo-400' : 'text-neutral-400'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded-md ${
                    isActive
                      ? 'bg-indigo-500/20 text-indigo-300'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Tasks Usage Card in Pro Plan */}
      <div className="p-3 mx-3 mb-2 rounded-xl bg-neutral-900/40 border border-neutral-800/80 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-neutral-400 font-medium">Monthly Tasks</span>
          <span className="font-mono text-neutral-300">14,280 / 25k</span>
        </div>
        <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full w-[57%]" />
        </div>
        <div className="flex items-center justify-between pt-0.5 text-[10px]">
          <span className="text-neutral-500">Resets in 18 days</span>
          <button
            onClick={() => onSelectTab('billing')}
            className="text-indigo-400 hover:text-indigo-300 font-medium"
          >
            Upgrade
          </button>
        </div>
      </div>

      {/* User Profile Footer */}
      <div className="p-3 border-t border-neutral-800/80 relative">
        <div className="flex items-center justify-between p-2 rounded-xl bg-neutral-900/40 hover:bg-neutral-800/40 border border-neutral-800/60 transition-colors">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden">
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                currentUser.name.charAt(0)
              )}
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-neutral-200 block truncate">
                {currentUser.name}
              </span>
              <span className="text-[10px] text-neutral-400 font-mono block truncate">
                {currentUser.email}
              </span>
            </div>
          </div>

          <button
            onClick={onOpenAuthModal}
            title="Switch user or login"
            className="p-1 text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
