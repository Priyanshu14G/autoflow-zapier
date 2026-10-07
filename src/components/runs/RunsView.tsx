import React, { useState } from 'react';
import { WorkflowRun, RunStatus } from '../../types';
import { RunDetailDrawer } from './RunDetailDrawer';
import {
  Search,
  CheckCircle2,
  AlertCircle,
  Activity,
  Clock,
  RotateCw,
  Filter,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

interface RunsViewProps {
  runs: WorkflowRun[];
  onRetryWorkflow: (run: WorkflowRun) => void;
}

export const RunsView: React.FC<RunsViewProps> = ({ runs, onRetryWorkflow }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | RunStatus>('all');
  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(null);

  const filteredRuns = runs.filter((r) => {
    const matchesSearch =
      r.workflowName.toLowerCase().includes(search.toLowerCase()) ||
      r.triggerSource.toLowerCase().includes(search.toLowerCase()) ||
      (r.errorMessage && r.errorMessage.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-100 tracking-tight">
            Execution Runs & Monitoring
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Real-time audit log of all workflow triggers, worker task invocations, and step responses.
          </p>
        </div>

        <span className="text-xs font-mono text-neutral-400 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-xl">
          {runs.length} Total Logged Invocations
        </span>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-2xl bg-neutral-900/40 border border-neutral-800/80">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search runs by workflow, trigger source, or error..."
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-neutral-950 border border-neutral-800 rounded-xl">
          {(['all', 'success', 'failed', 'running'] as const).map((st) => (
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

      {/* Runs Table */}
      <div className="rounded-2xl bg-neutral-900/40 border border-neutral-800/80 overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-neutral-800/80 bg-neutral-950/60 text-neutral-400 font-medium">
              <th className="py-3 px-5">Workflow</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Trigger Source</th>
              <th className="py-3 px-4">Tasks Used</th>
              <th className="py-3 px-4 font-mono">Duration</th>
              <th className="py-3 px-4 font-mono">Started Time</th>
              <th className="py-3 px-5 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/60">
            {filteredRuns.map((run) => (
              <tr
                key={run.id}
                onClick={() => setSelectedRun(run)}
                className="hover:bg-neutral-800/30 transition-colors cursor-pointer group"
              >
                <td className="py-3.5 px-5">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-neutral-100 group-hover:text-indigo-300 transition-colors block">
                      {run.workflowName}
                    </span>
                    <span className="text-[10px] font-mono text-neutral-500 block">
                      #{run.id}
                    </span>
                  </div>
                </td>

                <td className="py-3.5 px-4 whitespace-nowrap">
                  {run.status === 'success' && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Success
                    </span>
                  )}
                  {run.status === 'failed' && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-rose-400">
                      <AlertCircle className="w-3.5 h-3.5" /> Failed
                    </span>
                  )}
                  {run.status === 'running' && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-indigo-400 animate-pulse">
                      <Activity className="w-3.5 h-3.5" /> Running
                    </span>
                  )}
                </td>

                <td className="py-3.5 px-4 text-neutral-400 max-w-xs truncate font-mono text-[11px]">
                  {run.triggerSource}
                </td>

                <td className="py-3.5 px-4 text-neutral-300 font-mono">
                  {run.tasksConsumed} tasks
                </td>

                <td className="py-3.5 px-4 text-neutral-300 font-mono tabular-nums">
                  {run.durationMs}ms
                </td>

                <td className="py-3.5 px-4 text-neutral-400 font-mono text-[11px] whitespace-nowrap">
                  {new Date(run.startedAt).toLocaleString()}
                </td>

                <td className="py-3.5 px-5 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRun(run);
                    }}
                    className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-neutral-100 px-2 py-1 rounded bg-neutral-800/60 hover:bg-neutral-800 transition-colors ml-auto"
                  >
                    <span>Inspect</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </td>
              </tr>
            ))}

            {filteredRuns.length === 0 && (
              <tr>
                <td colSpan={7} className="py-16 text-center text-neutral-500">
                  <Clock className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                  <p className="text-xs font-medium text-neutral-400">No runs match criteria</p>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Try modifying the status filter or search parameters.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Drawer */}
      {selectedRun && (
        <RunDetailDrawer
          run={selectedRun}
          onClose={() => setSelectedRun(null)}
          onRetryWorkflow={onRetryWorkflow}
        />
      )}
    </div>
  );
};
