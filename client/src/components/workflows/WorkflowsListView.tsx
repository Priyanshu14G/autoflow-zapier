import React, { useState } from 'react';
import { Workflow, WorkflowStatus } from '../../types';
import { AppIcon } from '../ui/AppIcon';
import { useToast } from '../ui/Toast';
import {
  Search,
  Plus,
  Play,
  Copy,
  Trash2,
  Edit3,
  MoreVertical,
  History,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowUpDown,
  Filter,
  Layers,
  Power
} from 'lucide-react';

interface WorkflowsListViewProps {
  workflows: Workflow[];
  onSelectWorkflow: (wf: Workflow) => void;
  onCreateWorkflow: () => void;
  onOpenAIArchitect: () => void;
  onDuplicateWorkflow: (wfId: string) => void;
  onDeleteWorkflow: (wfId: string) => void;
  onToggleStatus: (wfId: string) => void;
  onOpenVersions: (wf: Workflow) => void;
}

export const WorkflowsListView: React.FC<WorkflowsListViewProps> = ({
  workflows,
  onSelectWorkflow,
  onCreateWorkflow,
  onOpenAIArchitect,
  onDuplicateWorkflow,
  onDeleteWorkflow,
  onToggleStatus,
  onOpenVersions,
}) => {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | WorkflowStatus>('all');
  const [sortBy, setSortBy] = useState<'lastRun' | 'name' | 'runs' | 'successRate'>('lastRun');
  const [menuOpenWfId, setMenuOpenWfId] = useState<string | null>(null);

  // Rename modal state
  const [renamingWf, setRenamingWf] = useState<Workflow | null>(null);
  const [newName, setNewName] = useState('');

  const filteredWorkflows = workflows
    .filter((wf) => {
      const matchesSearch =
        wf.name.toLowerCase().includes(search.toLowerCase()) ||
        wf.description.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || wf.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'runs') return b.totalRuns - a.totalRuns;
      if (sortBy === 'successRate') return b.successRate - a.successRate;
      // Default: lastRun
      const timeA = a.lastRunAt ? new Date(a.lastRunAt).getTime() : 0;
      const timeB = b.lastRunAt ? new Date(b.lastRunAt).getTime() : 0;
      return timeB - timeA;
    });

  const handleSaveRename = () => {
    if (!renamingWf || !newName.trim()) return;
    renamingWf.name = newName.trim();
    showToast('Workflow renamed successfully', 'success');
    setRenamingWf(null);
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-100 tracking-tight">Workflows</h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Create, configure, and monitor automated multi-step pipelines.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenAIArchitect}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/40 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate with AI</span>
          </button>
          <button
            onClick={onCreateWorkflow}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Workflow</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-2xl bg-neutral-900/40 border border-neutral-800/80">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search workflows by name or description..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 p-1 bg-neutral-950 border border-neutral-800 rounded-xl">
            {(['all', 'active', 'paused', 'draft'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 text-xs font-medium rounded-lg capitalize transition-colors ${
                  statusFilter === st
                    ? 'bg-neutral-800 text-white font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="lastRun">Last Execution</option>
            <option value="runs">Most Runs</option>
            <option value="successRate">Success Rate</option>
            <option value="name">Alphabetical</option>
          </select>
        </div>
      </div>

      {/* WORKFLOWS TABLE */}
      <div className="rounded-2xl bg-neutral-900/40 border border-neutral-800/80 overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-neutral-800/80 bg-neutral-950/60 text-neutral-400 font-medium">
              <th className="py-3 px-5">Workflow Name & Details</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Steps / Apps</th>
              <th className="py-3 px-4">Total Runs</th>
              <th className="py-3 px-4">Success Rate</th>
              <th className="py-3 px-4">Last Execution</th>
              <th className="py-3 px-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/60">
            {filteredWorkflows.map((wf) => {
              const uniqueApps = Array.from(new Set(wf.nodes.map((n) => n.data.app)));

              return (
                <tr
                  key={wf.id}
                  className="hover:bg-neutral-800/30 transition-colors group"
                >
                  {/* Name & Description */}
                  <td
                    onClick={() => onSelectWorkflow(wf)}
                    className="py-4 px-5 cursor-pointer max-w-sm"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-neutral-100 group-hover:text-indigo-300 transition-colors">
                          {wf.name}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-500">
                          v{wf.version || 1}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 line-clamp-1 leading-relaxed">
                        {wf.description}
                      </p>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    <button
                      onClick={() => onToggleStatus(wf.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                        wf.status === 'active'
                          ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/40'
                          : wf.status === 'paused'
                          ? 'bg-amber-950/40 border-amber-500/30 text-amber-300 hover:bg-amber-900/40'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          wf.status === 'active'
                            ? 'bg-emerald-400 animate-pulse'
                            : wf.status === 'paused'
                            ? 'bg-amber-400'
                            : 'bg-neutral-500'
                        }`}
                      />
                      <span className="capitalize">{wf.status}</span>
                    </button>
                  </td>

                  {/* Steps & Apps */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center -space-x-1">
                        {uniqueApps.slice(0, 4).map((app, i) => (
                          <div
                            key={i}
                            className="w-5 h-5 rounded-md bg-neutral-800 border border-neutral-700 flex items-center justify-center shrink-0 shadow-sm"
                            title={app}
                          >
                            <AppIcon app={app} size={11} />
                          </div>
                        ))}
                      </div>
                      <span className="text-[11px] text-neutral-400 font-mono">
                        {wf.nodes.length} steps
                      </span>
                    </div>
                  </td>

                  {/* Total Runs */}
                  <td className="py-4 px-4 font-mono text-neutral-200 tabular-nums">
                    {wf.totalRuns.toLocaleString()}
                  </td>

                  {/* Success Rate */}
                  <td className="py-4 px-4">
                    {wf.totalRuns > 0 ? (
                      <span
                        className={`font-mono text-xs tabular-nums ${
                          wf.successRate >= 98
                            ? 'text-emerald-400'
                            : wf.successRate >= 90
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {wf.successRate}%
                      </span>
                    ) : (
                      <span className="text-neutral-500 font-mono">—</span>
                    )}
                  </td>

                  {/* Last Execution */}
                  <td className="py-4 px-4 font-mono text-[11px] text-neutral-400 whitespace-nowrap">
                    {wf.lastRunAt ? (
                      <span>{new Date(wf.lastRunAt).toLocaleDateString()}</span>
                    ) : (
                      <span className="text-neutral-600">Never run</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onSelectWorkflow(wf)}
                        className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors"
                      >
                        Edit
                      </button>

                      <div className="relative">
                        <button
                          onClick={() =>
                            setMenuOpenWfId(menuOpenWfId === wf.id ? null : wf.id)
                          }
                          className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {menuOpenWfId === wf.id && (
                          <div className="absolute right-0 top-8 z-50 w-44 rounded-xl bg-neutral-900 border border-neutral-800 shadow-2xl p-1 space-y-0.5 text-left animate-in fade-in duration-100">
                            <button
                              onClick={() => {
                                setRenamingWf(wf);
                                setNewName(wf.name);
                                setMenuOpenWfId(null);
                              }}
                              className="w-full flex items-center gap-2 p-1.5 text-xs rounded-lg text-neutral-300 hover:bg-neutral-800/80 transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>Rename</span>
                            </button>

                            <button
                              onClick={() => {
                                onDuplicateWorkflow(wf.id);
                                setMenuOpenWfId(null);
                              }}
                              className="w-full flex items-center gap-2 p-1.5 text-xs rounded-lg text-neutral-300 hover:bg-neutral-800/80 transition-colors"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span>Duplicate</span>
                            </button>

                            <button
                              onClick={() => {
                                onOpenVersions(wf);
                                setMenuOpenWfId(null);
                              }}
                              className="w-full flex items-center gap-2 p-1.5 text-xs rounded-lg text-neutral-300 hover:bg-neutral-800/80 transition-colors"
                            >
                              <History className="w-3.5 h-3.5" />
                              <span>Version History</span>
                            </button>

                            <div className="h-px bg-neutral-800 my-1" />

                            <button
                              onClick={() => {
                                onDeleteWorkflow(wf.id);
                                setMenuOpenWfId(null);
                              }}
                              className="w-full flex items-center gap-2 p-1.5 text-xs rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredWorkflows.length === 0 && (
              <tr>
                <td colSpan={7} className="py-16 text-center text-neutral-500">
                  <div className="max-w-xs mx-auto space-y-2">
                    <Layers className="w-8 h-8 text-neutral-600 mx-auto" />
                    <p className="text-xs font-medium text-neutral-400">No workflows found</p>
                    <p className="text-[11px] text-neutral-500">
                      Try adjusting your filters or click "Create Workflow" to build your first automation.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Rename Modal */}
      {renamingWf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-semibold text-neutral-100">Rename Workflow</h3>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-indigo-500"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRenamingWf(null)}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 text-neutral-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRename}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
