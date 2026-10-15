import React, { useState } from 'react';
import { AIService, GeneratedWorkflowResponse } from '../../services/aiService';
import { Workflow, WorkflowNode, WorkflowEdge } from '../../types';
import { AppIcon } from '../ui/AppIcon';
import { useToast } from '../ui/Toast';
import {
  Sparkles,
  X,
  ArrowRight,
  Loader2,
  Check,
  Send,
  Zap,
  CheckCircle2,
  HelpCircle,
  Cpu
} from 'lucide-react';

interface AIWorkflowGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyWorkflow: (workflowData: {
    name: string;
    description: string;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  }) => void;
}

const EXAMPLE_PROMPTS = [
  'Whenever I receive a customer email, summarize it using AI, save the summary to Google Sheets and send it to Slack.',
  'When a new GitHub issue is created, classify severity with Gemini AI and alert our Discord on-call room.',
  'Catch Stripe payment failed webhooks, compose a warm recovery email with AI, and notify #revenue-leads.',
  'Every Monday morning, query weekly PostgreSQL metrics, synthesize executive brief, and email the leadership team.',
];

export const AIWorkflowGeneratorModal: React.FC<AIWorkflowGeneratorModalProps> = ({
  isOpen,
  onClose,
  onApplyWorkflow,
}) => {
  if (!isOpen) return null;

  const { showToast } = useToast();
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<GeneratedWorkflowResponse | null>(null);

  const handleGenerate = async (customPrompt?: string) => {
    const activePrompt = customPrompt || prompt;
    if (!activePrompt.trim()) {
      showToast('Please type an automation prompt first', 'info');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await AIService.generateWorkflow(activePrompt);
      setGeneratedResult(res);
      showToast('Workflow synthesized by Gemini AI', 'success');
    } catch (err: any) {
      showToast('Failed to generate workflow representation', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    if (!generatedResult) return;

    const wf = generatedResult.workflow;
    // Map nodes to visual canvas layout coordinates
    const mappedNodes: WorkflowNode[] = wf.nodes.map((n, idx) => ({
      id: n.id || `node-${idx + 1}`,
      type: 'workflowNode',
      position: { x: 80 + idx * 340, y: 150 },
      data: {
        title: n.title,
        subtitle: n.subtitle || n.config?.summary || '',
        app: n.app,
        category: n.category,
        configured: true,
        config: n.config || {},
        outputs: n.outputs || [],
        status: 'idle',
      },
    }));

    const mappedEdges: WorkflowEdge[] = (wf.edges || []).map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      animated: true,
    }));

    onApplyWorkflow({
      name: wf.name || 'AI Generated Automation',
      description: wf.description || prompt,
      nodes: mappedNodes,
      edges: mappedEdges,
    });

    showToast('Applied AI workflow to canvas!', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">
        {/* Header */}
        <div className="p-5 px-6 border-b border-neutral-800 bg-neutral-950/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-neutral-100">
                  AI Workflow Architect
                </h2>
                <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                  Gemini 3.8 Flash
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Describe your desired automation in plain English. Gemini will design the optimal steps and variable bindings.
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
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Prompt input */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-neutral-300 block">
              What would you like to automate?
            </label>

            <div className="relative">
              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Whenever I receive a customer email, summarize it using AI, save the summary to Google Sheets and send it to Slack."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 pr-28 text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500 leading-relaxed font-sans"
              />

              <button
                onClick={() => handleGenerate()}
                disabled={isGenerating || !prompt.trim()}
                className="absolute right-3 bottom-3 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors disabled:opacity-40"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Architecting...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Inspiration Prompts */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-neutral-500 font-medium">Try an example:</span>
              <div className="flex flex-wrap gap-1.5">
                {EXAMPLE_PROMPTS.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setPrompt(ex);
                      handleGenerate(ex);
                    }}
                    className="text-left text-[11px] text-neutral-400 hover:text-indigo-300 bg-neutral-950 hover:bg-neutral-800/80 border border-neutral-800/80 rounded-lg px-2.5 py-1.5 transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Generated Result Preview */}
          {generatedResult && (
            <div className="p-4 rounded-xl border border-indigo-500/30 bg-indigo-950/10 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-100">
                    {generatedResult.workflow.name}
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {generatedResult.workflow.description}
                  </p>
                </div>
                <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded whitespace-nowrap">
                  {generatedResult.workflow.nodes.length} Steps
                </span>
              </div>

              {/* Visual Pipeline Sequence Preview */}
              <div className="p-3 bg-neutral-950/70 border border-neutral-800 rounded-lg flex items-center gap-2 overflow-x-auto">
                {generatedResult.workflow.nodes.map((node, idx) => (
                  <React.Fragment key={node.id || idx}>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 shrink-0">
                      <div className="w-6 h-6 rounded bg-neutral-800 flex items-center justify-center shrink-0">
                        <AppIcon app={node.app} size={14} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold text-neutral-200 truncate max-w-[140px]">
                          {node.title}
                        </div>
                        <div className="text-[10px] text-neutral-400 truncate max-w-[140px]">
                          {node.app} · {node.category}
                        </div>
                      </div>
                    </div>
                    {idx < generatedResult.workflow.nodes.length - 1 && (
                      <ArrowRight className="w-4 h-4 text-neutral-600 shrink-0" />
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Rationale */}
              {generatedResult.workflow.rationale && (
                <div className="text-xs text-neutral-300 bg-neutral-900/60 p-3 rounded-lg border border-neutral-800/80 leading-relaxed">
                  <span className="font-semibold text-indigo-300">Architect Rationale: </span>
                  {generatedResult.workflow.rationale}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-neutral-800 bg-neutral-950/40 flex items-center justify-between">
          <span className="text-xs text-neutral-500 font-mono">
            Powered by Google Gemini SDK
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            {generatedResult && (
              <button
                onClick={handleApply}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply to Canvas</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
