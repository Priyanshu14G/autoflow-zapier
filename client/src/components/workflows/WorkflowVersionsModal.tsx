import React from 'react';
import { Workflow, WorkflowVersion } from '../../types';
import { useToast } from '../ui/Toast';
import { History, X, RotateCcw, Clock, Check, User } from 'lucide-react';

interface WorkflowVersionsModalProps {
  workflow: Workflow;
  isOpen: boolean;
  onClose: () => void;
  onRestoreVersion?: (version: WorkflowVersion) => void;
}

export const WorkflowVersionsModal: React.FC<WorkflowVersionsModalProps> = ({
  workflow,
  isOpen,
  onClose,
  onRestoreVersion,
}) => {
  if (!isOpen) return null;
  const { showToast } = useToast();

  const versions = workflow.versions || [
    {
      version: workflow.version || 1,
      createdAt: workflow.updatedAt,
      createdByName: 'Alex Chen',
      notes: 'Current production release',
      nodesCount: workflow.nodes.length,
    },
  ];

  const handleRestore = (ver: WorkflowVersion) => {
    if (ver.version === workflow.version) {
      showToast('This version is already active', 'info');
      return;
    }
    onRestoreVersion?.(ver);
    showToast(`Restored workflow to Version ${ver.version}`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 px-6 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-100">Workflow Version History</h3>
              <p className="text-xs text-neutral-400">
                {workflow.name} · Current v{workflow.version || 1}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
          {versions.map((ver) => {
            const isCurrent = ver.version === (workflow.version || 1);

            return (
              <div
                key={ver.version}
                className={`p-4 rounded-xl border transition-all flex items-center justify-between gap-4 ${
                  isCurrent
                    ? 'bg-indigo-950/20 border-indigo-500/40 shadow-sm'
                    : 'bg-neutral-950/50 border-neutral-800/80 hover:border-neutral-700'
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-neutral-200">
                      Version {ver.version}
                    </span>
                    {isCurrent && (
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        Current Active
                      </span>
                    )}
                    <span className="text-[11px] text-neutral-500 font-mono">
                      · {ver.nodesCount} steps
                    </span>
                  </div>

                  <p className="text-xs text-neutral-300 font-medium">{ver.notes}</p>

                  <div className="flex items-center gap-3 text-[11px] text-neutral-500 pt-0.5">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" /> {ver.createdByName}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" /> {new Date(ver.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {!isCurrent && (
                  <button
                    onClick={() => handleRestore(ver)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Rollback</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-neutral-800 bg-neutral-950/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
