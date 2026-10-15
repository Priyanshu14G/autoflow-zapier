import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { AppIcon } from '../ui/AppIcon';
import { CheckCircle2, AlertCircle, Loader2, Sparkles, MoreVertical, Trash2, Copy } from 'lucide-react';
import { WorkflowNodeData } from '../../types';

export const CustomWorkflowNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as unknown as WorkflowNodeData;
  const isTrigger = nodeData.category === 'trigger';
  const isAi = nodeData.category === 'ai';

  const statusColor = () => {
    switch (nodeData.status) {
      case 'running':
        return 'border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.35)] ring-2 ring-indigo-500/50';
      case 'success':
        return 'border-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.25)]';
      case 'failed':
        return 'border-rose-500/80 shadow-[0_0_15px_rgba(244,63,94,0.25)]';
      default:
        return selected
          ? 'border-indigo-400 shadow-[0_0_18px_rgba(99,102,241,0.25)]'
          : 'border-neutral-800 hover:border-neutral-700 shadow-lg';
    }
  };

  const categoryBadge = () => {
    switch (nodeData.category) {
      case 'trigger':
        return <span className="text-[10px] font-semibold tracking-wider text-amber-400 uppercase">Trigger</span>;
      case 'ai':
        return (
          <span className="flex items-center gap-1 text-[10px] font-semibold tracking-wider text-indigo-400 uppercase">
            <Sparkles className="w-2.5 h-2.5" /> AI Engine
          </span>
        );
      case 'action':
        return <span className="text-[10px] font-semibold tracking-wider text-emerald-400 uppercase">Action</span>;
      case 'logic':
        return <span className="text-[10px] font-semibold tracking-wider text-purple-400 uppercase">Logic</span>;
      default:
        return <span className="text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">Step</span>;
    }
  };

  return (
    <div
      className={`relative min-w-[270px] max-w-[320px] rounded-xl bg-neutral-900/95 backdrop-blur-md border transition-all duration-200 cursor-pointer ${statusColor()}`}
    >
      {/* Incoming Connection Handle (Left) */}
      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !-left-1.5 !bg-indigo-500 !border-2 !border-neutral-950"
        />
      )}

      {/* Header bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-neutral-800/80 bg-neutral-950/40 rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-neutral-800/80 border border-neutral-700/50 flex items-center justify-center shrink-0">
            <AppIcon app={nodeData.app} size={14} />
          </div>
          <div className="flex items-center gap-2">{categoryBadge()}</div>
        </div>

        <div className="flex items-center gap-1.5">
          {nodeData.status === 'running' && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-indigo-400 animate-pulse">
              <Loader2 className="w-3 h-3 animate-spin" /> Running
            </span>
          )}
          {nodeData.status === 'success' && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400">
              <CheckCircle2 className="w-3 h-3" /> OK
            </span>
          )}
          {nodeData.status === 'failed' && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-rose-400">
              <AlertCircle className="w-3 h-3" /> Error
            </span>
          )}
          {!nodeData.status && (
            <span className={`text-[10px] font-mono ${nodeData.configured ? 'text-neutral-400' : 'text-amber-400/80'}`}>
              {nodeData.configured ? 'Configured' : 'Needs Config'}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-3.5 space-y-1.5">
        <h4 className="text-sm font-semibold text-neutral-100 truncate tracking-tight">{nodeData.title}</h4>
        <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
          {nodeData.subtitle || 'Click to configure inputs and variables'}
        </p>

        {/* Dynamic variable preview tag count */}
        {nodeData.outputs && nodeData.outputs.length > 0 && (
          <div className="pt-2 flex items-center gap-2 text-[11px] text-neutral-500 font-mono">
            <span>{nodeData.outputs.length} outputs</span>
            <span aria-hidden="true">·</span>
            <span className="truncate max-w-[140px] text-neutral-400">
              {nodeData.outputs[0]?.key}
            </span>
          </div>
        )}
      </div>

      {/* Outgoing Connection Handle (Right) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !-right-1.5 !bg-indigo-500 !border-2 !border-neutral-950"
      />
    </div>
  );
});

CustomWorkflowNode.displayName = 'CustomWorkflowNode';
