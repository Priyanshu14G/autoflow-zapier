import React, { useState } from 'react';
import { WorkflowRun, StepRun } from '../../types';
import { AppIcon } from '../ui/AppIcon';
import { JSONViewer } from '../ui/JSONViewer';
import { useToast } from '../ui/Toast';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCw,
  Copy,
  ChevronDown,
  ChevronRight,
  Terminal,
  ArrowRight,
  Check
} from 'lucide-react';

interface RunDetailDrawerProps {
  run: WorkflowRun | null;
  onClose: () => void;
  onRetryWorkflow: (run: WorkflowRun) => void;
}

export const RunDetailDrawer: React.FC<RunDetailDrawerProps> = ({
  run,
  onClose,
  onRetryWorkflow,
}) => {
  if (!run) return null;

  const { showToast } = useToast();
  const [selectedStepId, setSelectedStepId] = useState<string>(
    run.steps[0]?.id || ''
  );
  const [copiedError, setCopiedError] = useState(false);

  const selectedStep = run.steps.find((s) => s.id === selectedStepId) || run.steps[0];

  const handleCopyError = () => {
    if (!run.errorMessage) return;
    navigator.clipboard.writeText(run.errorMessage);
    setCopiedError(true);
    showToast('Error message copied to clipboard', 'info');
    setTimeout(() => setCopiedError(false), 2000);
  };

  const handleRetryStep = (step: StepRun) => {
    showToast(`Retrying step: ${step.nodeTitle}...`, 'info');
    setTimeout(() => {
      showToast(`Step "${step.nodeTitle}" completed successfully on retry!`, 'success');
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-neutral-900 border-l border-neutral-800 h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 bg-neutral-950/60 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-neutral-100">{run.workflowName}</h2>
              <span className="text-[11px] font-mono text-neutral-400">
                #{run.id}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <span>Trigger: {run.triggerSource}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{run.durationMs}ms</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-neutral-500">
                {new Date(run.startedAt).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onRetryWorkflow(run)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Retry Workflow</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Error Notice if failed */}
        {run.errorMessage && (
          <div className="p-4 bg-rose-500/10 border-b border-rose-500/20 text-rose-300 text-xs flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block text-rose-200">Execution Error</strong>
                <p className="font-mono text-[11px] mt-0.5 leading-relaxed">{run.errorMessage}</p>
              </div>
            </div>
            <button
              onClick={handleCopyError}
              className="flex items-center gap-1 text-[11px] text-rose-300 hover:text-rose-100 bg-rose-500/20 px-2 py-1 rounded transition-colors shrink-0"
            >
              {copiedError ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedError ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        )}

        {/* Content Body: Split between Step Timeline and Step Details */}
        <div className="flex-1 flex overflow-hidden">
          {/* Step Timeline (Left column) */}
          <div className="w-64 border-r border-neutral-800 bg-neutral-950/40 p-3 overflow-y-auto space-y-1.5 shrink-0">
            <div className="px-2 py-1 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
              Execution Pipeline
            </div>

            {run.steps.map((st, idx) => {
              const isSelected = (selectedStep?.id || '') === st.id;

              return (
                <button
                  key={st.id}
                  onClick={() => setSelectedStepId(st.id)}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors ${
                    isSelected
                      ? 'bg-neutral-800 text-white border border-neutral-700 shadow-sm'
                      : 'text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 rounded bg-neutral-800 flex items-center justify-center shrink-0">
                      <AppIcon app={st.app} size={12} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-medium block truncate">
                        {idx === 0 ? 'Trigger' : `Step ${idx + 1}`}
                      </span>
                      <span className="text-[10px] text-neutral-500 block truncate font-mono">
                        {st.durationMs}ms
                      </span>
                    </div>
                  </div>

                  {st.status === 'success' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  )}
                  {st.status === 'failed' && (
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  )}
                  {st.status === 'pending' && (
                    <Clock className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Step Details & Payloads (Right column) */}
          {selectedStep && (
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80">
                <div>
                  <h3 className="text-xs font-semibold text-neutral-100">
                    {selectedStep.nodeTitle}
                  </h3>
                  <span className="text-[10px] font-mono text-neutral-400 capitalize">
                    {selectedStep.app} · {selectedStep.status} · {selectedStep.durationMs}ms
                  </span>
                </div>

                <button
                  onClick={() => handleRetryStep(selectedStep)}
                  className="flex items-center gap-1 text-[11px] text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-700 px-2.5 py-1 rounded-lg transition-colors"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>Retry Step</span>
                </button>
              </div>

              {/* Step Error if failed */}
              {selectedStep.errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                  <span className="font-semibold block text-rose-200">Error Description:</span>
                  <p className="font-mono text-[11px] mt-1">{selectedStep.errorMessage}</p>
                </div>
              )}

              {/* Input Payload */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-neutral-300 block">
                  Input / Bound Variables
                </span>
                <JSONViewer
                  data={selectedStep.input || {}}
                  title="Resolved Input"
                  maxHeight="max-h-48"
                />
              </div>

              {/* Output Payload */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-neutral-300 block">
                  Step Output
                </span>
                <JSONViewer
                  data={selectedStep.output || { message: 'No output generated (step halted or failed)' }}
                  title="Output Result"
                  maxHeight="max-h-56"
                />
              </div>

              {/* Raw Request / Response */}
              {selectedStep.responsePayload && (
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-neutral-300 block">
                    Raw HTTP Response
                  </span>
                  <JSONViewer
                    data={selectedStep.responsePayload}
                    title="API Response Body"
                    maxHeight="max-h-40"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
