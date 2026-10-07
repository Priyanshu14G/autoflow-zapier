import React, { useState } from 'react';
import { Workflow, WorkflowRun } from '../../types';
import { AppIcon } from '../ui/AppIcon';
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Zap,
  Activity,
  Layers,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface AnalyticsViewProps {
  workflows: Workflow[];
  runs: WorkflowRun[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ workflows, runs }) => {
  const [timeframe, setTimeframe] = useState<'today' | '7d' | '30d' | '90d'>('7d');

  const totalRuns = workflows.reduce((acc, w) => acc + w.totalRuns, 0);
  const successRate = 99.2;
  const avgLatencyMs = 1240;
  const tasksUsed = 14280;

  const topIntegrations = [
    { name: 'Gemini AI', slug: 'gemini', invocations: 18410, share: 38 },
    { name: 'Slack', slug: 'slack', invocations: 12900, share: 26 },
    { name: 'Gmail', slug: 'gmail', invocations: 8200, share: 17 },
    { name: 'Google Sheets', slug: 'sheets', invocations: 5100, share: 11 },
    { name: 'PostgreSQL', slug: 'postgresql', invocations: 3900, share: 8 },
  ];

  const hourlyTrends = [
    { hour: '00:00', runs: 85 },
    { hour: '04:00', runs: 42 },
    { hour: '08:00', runs: 380 },
    { hour: '12:00', runs: 620 },
    { hour: '16:00', runs: 590 },
    { hour: '20:00', runs: 240 },
  ];
  const maxHourly = Math.max(...hourlyTrends.map((h) => h.runs));

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-100 tracking-tight">
            Performance Analytics
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Operational metrics, provider throughput, and resource consumption telemetry.
          </p>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded-xl">
          {(['today', '7d', '30d', '90d'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-3 py-1 text-xs font-medium rounded-lg capitalize transition-colors ${
                timeframe === t
                  ? 'bg-neutral-800 text-white font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {t === 'today' ? 'Today' : `${t.replace('d', '')} Days`}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-neutral-900/40 border border-neutral-800/80 space-y-2">
          <span className="text-xs text-neutral-400 font-medium">Total Invocations</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-neutral-100 tabular-nums">
              {totalRuns.toLocaleString()}
            </span>
            <span className="flex items-center text-xs text-emerald-400 font-mono">
              <ArrowUpRight className="w-3.5 h-3.5" /> +14.2%
            </span>
          </div>
          <span className="text-[11px] text-neutral-500 font-mono block">vs previous cycle</span>
        </div>

        <div className="p-5 rounded-2xl bg-neutral-900/40 border border-neutral-800/80 space-y-2">
          <span className="text-xs text-neutral-400 font-medium">Platform Success Rate</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
              {successRate}%
            </span>
            <span className="text-xs text-neutral-500 font-mono">nominal</span>
          </div>
          <span className="text-[11px] text-neutral-500 font-mono block">0.8% error budget</span>
        </div>

        <div className="p-5 rounded-2xl bg-neutral-900/40 border border-neutral-800/80 space-y-2">
          <span className="text-xs text-neutral-400 font-medium">Average Execution Latency</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-neutral-100 tabular-nums">
              {avgLatencyMs}ms
            </span>
            <span className="flex items-center text-xs text-emerald-400 font-mono">
              <ArrowDownRight className="w-3.5 h-3.5" /> -82ms
            </span>
          </div>
          <span className="text-[11px] text-neutral-500 font-mono block">p95: 1,890ms</span>
        </div>

        <div className="p-5 rounded-2xl bg-neutral-900/40 border border-neutral-800/80 space-y-2">
          <span className="text-xs text-neutral-400 font-medium">Tasks Consumed</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-neutral-100 tabular-nums">
              {tasksUsed.toLocaleString()}
            </span>
            <span className="text-xs text-neutral-400 font-mono">57% quota</span>
          </div>
          <span className="text-[11px] text-neutral-500 font-mono block">10,720 remaining</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Execution Volume Trend */}
        <div className="p-5 rounded-2xl bg-neutral-900/40 border border-neutral-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-neutral-100">Hourly Throughput</h3>
              <p className="text-xs text-neutral-400">Peak task concurrency by UTC hour</p>
            </div>
            <span className="text-xs font-mono text-indigo-400">UTC Timezone</span>
          </div>

          <div className="pt-6 pb-2">
            <div className="h-44 flex items-end justify-between gap-3 px-2">
              {hourlyTrends.map((h, i) => {
                const heightPercent = Math.round((h.runs / maxHourly) * 100);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="text-[10px] font-mono text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      {h.runs} runs
                    </div>
                    <div className="w-full bg-neutral-800/80 rounded-t-lg overflow-hidden h-36 flex items-end">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full bg-indigo-500 rounded-t-lg transition-all group-hover:bg-indigo-400"
                      />
                    </div>
                    <span className="text-[11px] font-medium text-neutral-400 font-mono">{h.hour}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Most-Used Integrations */}
        <div className="p-5 rounded-2xl bg-neutral-900/40 border border-neutral-800/80 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-neutral-100">Most-Used Integrations</h3>
            <p className="text-xs text-neutral-400">Task consumption breakdown by service</p>
          </div>

          <div className="space-y-3 pt-2">
            {topIntegrations.map((item) => (
              <div key={item.slug} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-neutral-800 flex items-center justify-center shrink-0">
                      <AppIcon app={item.slug} size={12} />
                    </div>
                    <span className="font-semibold text-neutral-200">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-neutral-400">{item.invocations.toLocaleString()} calls</span>
                    <span className="text-indigo-400 font-semibold">{item.share}%</span>
                  </div>
                </div>

                <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${item.share}%` }}
                    className="h-full bg-indigo-500 rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
