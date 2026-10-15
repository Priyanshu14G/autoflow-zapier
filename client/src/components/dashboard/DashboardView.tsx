import React, { useState } from 'react';
import { Workflow, WorkflowRun } from '../../types';
import { AppIcon } from '../ui/AppIcon';
import {
  GitBranch,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Plus,
  Play,
  RotateCw,
  ExternalLink,
  Zap,
  BarChart2
} from 'lucide-react';

interface DashboardViewProps {
  workflows: Workflow[];
  runs: WorkflowRun[];
  onCreateWorkflow: () => void;
  onExploreTemplates: () => void;
  onOpenAIArchitect: () => void;
  onSelectWorkflow: (workflow: Workflow) => void;
  onSelectRun: (run: WorkflowRun) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  workflows,
  runs,
  onCreateWorkflow,
  onExploreTemplates,
  onOpenAIArchitect,
  onSelectWorkflow,
  onSelectRun,
}) => {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');

  const activeWorkflowsCount = workflows.filter((w) => w.status === 'active').length;
  const totalRunsCount = workflows.reduce((acc, w) => acc + w.totalRuns, 0);
  const successfulRunsCount = runs.filter((r) => r.status === 'success').length;
  const failedRunsCount = runs.filter((r) => r.status === 'failed').length;
  const overallSuccessRate =
    runs.length > 0 ? Number(((successfulRunsCount / runs.length) * 100).toFixed(1)) : 99.4;

  // Chart data simulation
  const chartBars = [
    { label: 'Mon', runs: 320, successRate: 99.2 },
    { label: 'Tue', runs: 410, successRate: 98.8 },
    { label: 'Wed', runs: 580, successRate: 99.6 },
    { label: 'Thu', runs: 490, successRate: 99.1 },
    { label: 'Fri', runs: 640, successRate: 99.8 },
    { label: 'Sat', runs: 280, successRate: 100 },
    { label: 'Sun', runs: 310, successRate: 99.4 },
  ];
  const maxRuns = Math.max(...chartBars.map((b) => b.runs));

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Welcome & Quick CTAs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-100 tracking-tight">
            Automation Orchestration Center
          </h2>
          <div className="flex items-center gap-2 text-xs text-neutral-400 mt-1">
            <span>Production Engine Status: Nominal</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-400 font-mono">99.98% Uptime</span>
            <span aria-hidden="true">·</span>
            <span>All Background Workers Active</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenAIArchitect}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/40 border border-indigo-500/30 text-indigo-300 text-xs font-semibold shadow-sm transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate with AI</span>
          </button>
          <button
            onClick={onExploreTemplates}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 text-xs font-semibold shadow-sm transition-colors"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Explore Templates</span>
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

      {/* METRIC STATS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
          <span className="text-xs text-neutral-400 block font-medium">Active Workflows</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-neutral-100 tabular-nums">
              {activeWorkflowsCount}
            </span>
            <span className="text-[11px] text-neutral-500 font-mono">/ {workflows.length} total</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
          <span className="text-xs text-neutral-400 block font-medium">Total Executions</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-neutral-100 tabular-nums">
              {totalRunsCount.toLocaleString()}
            </span>
            <span className="text-[11px] text-emerald-400 font-mono">+12.4%</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
          <span className="text-xs text-neutral-400 block font-medium">Success Rate</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
              {overallSuccessRate}%
            </span>
            <span className="text-[11px] text-neutral-500 font-mono">nominal</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
          <span className="text-xs text-neutral-400 block font-medium">Failed Runs</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-rose-400 tabular-nums">
              {failedRunsCount}
            </span>
            <span className="text-[11px] text-neutral-500 font-mono">needs review</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
          <span className="text-xs text-neutral-400 block font-medium">Tasks Consumed</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-neutral-100 tabular-nums">
              14,280
            </span>
            <span className="text-[11px] text-neutral-500 font-mono">/ 25k plan</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800/80">
          <span className="text-xs text-neutral-400 block font-medium">Time Saved</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-indigo-400 tabular-nums">
              148 hrs
            </span>
            <span className="text-[11px] text-neutral-500 font-mono">this month</span>
          </div>
        </div>
      </div>

      {/* EXECUTION ACTIVITY CHART & WORKFLOW DISTRIBUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Execution Activity Chart */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-neutral-900/40 border border-neutral-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-neutral-100">Workflow Execution Activity</h3>
              <p className="text-xs text-neutral-400">Total job throughput and task invocations</p>
            </div>

            <div className="flex items-center gap-1 p-1 bg-neutral-950 border border-neutral-800 rounded-lg">
              {(['24h', '7d', '30d'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    timeRange === r
                      ? 'bg-neutral-800 text-white font-semibold'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Bar Chart Visualization */}
          <div className="pt-6 pb-2">
            <div className="h-44 flex items-end justify-between gap-3 px-2">
              {chartBars.map((bar, i) => {
                const heightPercent = Math.round((bar.runs / maxRuns) * 100);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="text-[10px] font-mono text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      {bar.runs} runs
                    </div>
                    <div className="w-full bg-neutral-800/80 rounded-t-lg overflow-hidden h-36 flex items-end">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-lg transition-all duration-300 group-hover:from-indigo-500 group-hover:to-indigo-300"
                      />
                    </div>
                    <span className="text-[11px] font-medium text-neutral-400">{bar.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-xs text-neutral-400">
            <span>Average Execution Latency: <strong className="text-neutral-200 font-mono">1,420ms</strong></span>
            <span>Peak Hour: <strong className="text-neutral-200 font-mono">14:00 - 16:00 UTC</strong></span>
          </div>
        </div>

        {/* Right: Quick Active Pipelines */}
        <div className="p-5 rounded-2xl bg-neutral-900/40 border border-neutral-800/80 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-neutral-100">Top Active Pipelines</h3>
              <span className="text-xs text-indigo-400 font-mono">Live</span>
            </div>

            <div className="space-y-2.5">
              {workflows.slice(0, 4).map((wf) => (
                <div
                  key={wf.id}
                  onClick={() => onSelectWorkflow(wf)}
                  className="p-3 rounded-xl bg-neutral-950/60 hover:bg-neutral-800/40 border border-neutral-800/80 hover:border-neutral-700 transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="min-w-0 pr-2">
                    <h4 className="text-xs font-semibold text-neutral-200 group-hover:text-white truncate">
                      {wf.name}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-mono mt-0.5">
                      <span>{wf.totalRuns.toLocaleString()} runs</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-emerald-400">{wf.successRate}% OK</span>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-neutral-500 group-hover:text-neutral-200 group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={onExploreTemplates}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 text-xs text-neutral-300 hover:text-white font-medium transition-colors"
          >
            <span>Browse 20+ Prebuilt Templates</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* RECENT WORKFLOW RUNS TABLE */}
      <div className="rounded-2xl bg-neutral-900/40 border border-neutral-800/80 overflow-hidden space-y-0">
        <div className="p-5 border-b border-neutral-800/80 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-neutral-100">Recent Workflow Executions</h3>
            <p className="text-xs text-neutral-400">Click any run to inspect step-by-step payloads & logs</p>
          </div>
          <span className="text-xs font-mono text-neutral-400">Showing last {runs.length} runs</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-800/80 bg-neutral-950/60 text-neutral-400 font-medium">
                <th className="py-3 px-5">Workflow</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Trigger Source</th>
                <th className="py-3 px-4">Steps</th>
                <th className="py-3 px-4 font-mono">Duration</th>
                <th className="py-3 px-5 text-right font-mono">Started</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {runs.slice(0, 5).map((run) => (
                <tr
                  key={run.id}
                  onClick={() => onSelectRun(run)}
                  className="hover:bg-neutral-800/40 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-5 font-semibold text-neutral-200">
                    {run.workflowName}
                  </td>
                  <td className="py-3 px-4">
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
                  <td className="py-3 px-4 text-neutral-400 truncate max-w-xs font-mono text-[11px]">
                    {run.triggerSource}
                  </td>
                  <td className="py-3 px-4 text-neutral-300 font-mono">
                    {run.stepsCount} steps
                  </td>
                  <td className="py-3 px-4 text-neutral-300 font-mono tabular-nums">
                    {run.durationMs}ms
                  </td>
                  <td className="py-3 px-5 text-neutral-400 text-right font-mono text-[11px]">
                    {new Date(run.startedAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
