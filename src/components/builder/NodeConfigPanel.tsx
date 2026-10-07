import React, { useState } from 'react';
import { WorkflowNode, WorkflowNodeData, NodeOutputVariable } from '../../types';
import { AppIcon } from '../ui/AppIcon';
import { VariablePicker } from './VariablePicker';
import { JSONViewer } from '../ui/JSONViewer';
import { AIService } from '../../services/aiService';
import {
  X,
  Play,
  Trash2,
  Variable,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  ShieldCheck,
  ChevronDown
} from 'lucide-react';

interface NodeConfigPanelProps {
  node: WorkflowNode | null;
  allNodes: WorkflowNode[];
  onUpdateNode: (nodeId: string, updatedData: Partial<WorkflowNodeData>) => void;
  onDeleteNode: (nodeId: string) => void;
  onClose: () => void;
}

export const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({
  node,
  allNodes,
  onUpdateNode,
  onDeleteNode,
  onClose,
}) => {
  if (!node) return null;

  const data = node.data;
  const [title, setTitle] = useState(data.title);
  const [subtitle, setSubtitle] = useState(data.subtitle);
  const [config, setConfig] = useState<Record<string, any>>(data.config || {});
  const [activeVariableField, setActiveVariableField] = useState<string | null>(null);

  // Testing step state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const handleFieldChange = (key: string, value: any) => {
    const updated = { ...config, [key]: value };
    setConfig(updated);
    onUpdateNode(node.id, { config: updated, configured: true });
  };

  const handleTitleBlur = () => {
    onUpdateNode(node.id, { title, subtitle });
  };

  const handleInsertVariable = (fieldKey: string, variableToken: string) => {
    const currentValue = config[fieldKey] || '';
    const updatedValue = `${currentValue} ${variableToken}`.trim();
    handleFieldChange(fieldKey, updatedValue);
    setActiveVariableField(null);
  };

  const handleRunStepTest = async () => {
    setIsTesting(true);
    setTestError(null);
    setTestResult(null);

    try {
      if (data.category === 'ai') {
        const instruction = config.instruction || 'Summarize the input text.';
        const inputData = config.promptTemplate || config.input || { sample: 'Enterprise lead wanting 80 seats' };
        const res = await AIService.testNodeStep('AI Reasoning & Extraction', inputData, instruction);
        setTestResult(res.output);
      } else {
        // Simulate step execution with 400ms delay
        await new Promise((r) => setTimeout(r, 500));
        setTestResult({
          status: 'success',
          statusCode: 200,
          deliveredAt: new Date().toISOString(),
          sampleOutput: {
            id: `rec_${Math.floor(Math.random() * 99999)}`,
            message: 'Step executed successfully with resolved payload.',
            variablesApplied: Object.keys(config).length
          }
        });
      }
    } catch (err: any) {
      setTestError(err.message || 'Test execution failed');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="w-96 h-full border-l border-neutral-800/80 bg-neutral-950/95 flex flex-col shrink-0 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-neutral-800/80 flex items-center justify-between bg-neutral-900/40">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700/60 flex items-center justify-center shrink-0">
            <AppIcon app={data.app} size={18} />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-semibold text-neutral-200 truncate">Step Configuration</h3>
            <span className="text-[10px] text-neutral-400 font-mono capitalize">
              {data.category} · {data.app}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onDeleteNode(node.id)}
            title="Delete this step"
            className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-5 flex-1">
        {/* Step Title & Subtitle */}
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-neutral-400 block mb-1">Step Name</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-100 focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-neutral-400 block mb-1">Description / Subtitle</label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-300 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Connected Account / Environment Badge */}
        <div className="p-2.5 rounded-lg border border-neutral-800/80 bg-neutral-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <div className="min-w-0">
              <span className="text-[11px] font-medium text-neutral-300 block truncate">
                {data.app === 'gemini' ? 'Native Gemini 3.8 Flash' : `${data.app} Connection`}
              </span>
              <span className="text-[10px] text-neutral-500 block">Workspace Verified</span>
            </div>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            Active
          </span>
        </div>

        {/* Dynamic Config Fields based on Category/App */}
        <div className="space-y-4 pt-2 border-t border-neutral-800/80">
          <h4 className="text-xs font-semibold text-neutral-200">Input Parameters</h4>

          {/* AI NODE CONFIG */}
          {data.category === 'ai' && (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-neutral-400 block mb-1">
                  Gemini Model
                </label>
                <div className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-neutral-200 flex items-center justify-between">
                  <span>gemini-3.8-flash</span>
                  <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                    Latest Flagship
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-neutral-400">AI Instruction</label>
                  <button
                    type="button"
                    onClick={() => setActiveVariableField(activeVariableField === 'instruction' ? null : 'instruction')}
                    className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300"
                  >
                    <Variable className="w-3 h-3" /> Insert Variable
                  </button>
                </div>
                {activeVariableField === 'instruction' && (
                  <div className="mb-2">
                    <VariablePicker
                      nodes={allNodes}
                      currentNodeId={node.id}
                      onSelectVariable={(v) => handleInsertVariable('instruction', v)}
                    />
                  </div>
                )}
                <textarea
                  rows={3}
                  value={config.instruction || ''}
                  onChange={(e) => handleFieldChange('instruction', e.target.value)}
                  placeholder="e.g. Summarize the customer inquiry, extract urgency score (Low/Medium/High), and list main request points."
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500 resize-none font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-neutral-400">Input Payload / Content</label>
                  <button
                    type="button"
                    onClick={() => setActiveVariableField(activeVariableField === 'promptTemplate' ? null : 'promptTemplate')}
                    className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300"
                  >
                    <Variable className="w-3 h-3" /> Insert Variable
                  </button>
                </div>
                {activeVariableField === 'promptTemplate' && (
                  <div className="mb-2">
                    <VariablePicker
                      nodes={allNodes}
                      currentNodeId={node.id}
                      onSelectVariable={(v) => handleInsertVariable('promptTemplate', v)}
                    />
                  </div>
                )}
                <textarea
                  rows={3}
                  value={config.promptTemplate || config.input || ''}
                  onChange={(e) => handleFieldChange('promptTemplate', e.target.value)}
                  placeholder="e.g. Email body: {{trigger.body}}"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500 resize-none font-mono"
                />
              </div>
            </div>
          )}

          {/* SLACK CONFIG */}
          {data.app === 'slack' && (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-neutral-400 block mb-1">Slack Channel</label>
                <input
                  type="text"
                  value={config.channel || ''}
                  onChange={(e) => handleFieldChange('channel', e.target.value)}
                  placeholder="#support-alerts or C0489AB12"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-neutral-400">Message Text</label>
                  <button
                    type="button"
                    onClick={() => setActiveVariableField(activeVariableField === 'message' ? null : 'message')}
                    className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300"
                  >
                    <Variable className="w-3 h-3" /> Insert Variable
                  </button>
                </div>
                {activeVariableField === 'message' && (
                  <div className="mb-2">
                    <VariablePicker
                      nodes={allNodes}
                      currentNodeId={node.id}
                      onSelectVariable={(v) => handleInsertVariable('message', v)}
                    />
                  </div>
                )}
                <textarea
                  rows={4}
                  value={config.message || ''}
                  onChange={(e) => handleFieldChange('message', e.target.value)}
                  placeholder="🚀 New Alert: {{trigger.subject}}\nSummary: {{step_2.summary}}"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500 resize-none font-mono"
                />
              </div>
            </div>
          )}

          {/* GMAIL CONFIG */}
          {data.app === 'gmail' && data.category === 'action' && (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-neutral-400">To Recipient</label>
                  <button
                    type="button"
                    onClick={() => setActiveVariableField(activeVariableField === 'to' ? null : 'to')}
                    className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300"
                  >
                    <Variable className="w-3 h-3" /> Insert Variable
                  </button>
                </div>
                {activeVariableField === 'to' && (
                  <div className="mb-2">
                    <VariablePicker
                      nodes={allNodes}
                      currentNodeId={node.id}
                      onSelectVariable={(v) => handleInsertVariable('to', v)}
                    />
                  </div>
                )}
                <input
                  type="text"
                  value={config.to || ''}
                  onChange={(e) => handleFieldChange('to', e.target.value)}
                  placeholder="{{trigger.sender}}"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-neutral-400 block mb-1">Subject</label>
                <input
                  type="text"
                  value={config.subject || ''}
                  onChange={(e) => handleFieldChange('subject', e.target.value)}
                  placeholder="Re: {{trigger.subject}}"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-neutral-400 block mb-1">Body Text</label>
                <textarea
                  rows={3}
                  value={config.body || ''}
                  onChange={(e) => handleFieldChange('body', e.target.value)}
                  placeholder="Hi there, here is the automated response:\n{{step_2.summary}}"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500 resize-none font-mono"
                />
              </div>
            </div>
          )}

          {/* SHEETS CONFIG */}
          {data.app === 'sheets' && (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-neutral-400 block mb-1">Spreadsheet</label>
                <input
                  type="text"
                  value={config.spreadsheetId || ''}
                  onChange={(e) => handleFieldChange('spreadsheetId', e.target.value)}
                  placeholder="Q4 Inbound Pipeline"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-medium text-neutral-400">Row Values</label>
                  <button
                    type="button"
                    onClick={() => setActiveVariableField(activeVariableField === 'values' ? null : 'values')}
                    className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300"
                  >
                    <Variable className="w-3 h-3" /> Insert Variable
                  </button>
                </div>
                {activeVariableField === 'values' && (
                  <div className="mb-2">
                    <VariablePicker
                      nodes={allNodes}
                      currentNodeId={node.id}
                      onSelectVariable={(v) => handleInsertVariable('values', v)}
                    />
                  </div>
                )}
                <textarea
                  rows={3}
                  value={config.values || ''}
                  onChange={(e) => handleFieldChange('values', e.target.value)}
                  placeholder="{{trigger.sender}}, {{step_2.summary}}, {{step_2.urgency}}"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500 resize-none font-mono"
                />
              </div>
            </div>
          )}

          {/* GENERIC / HTTP CONFIG */}
          {data.app === 'http' && (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-neutral-400 block mb-1">Endpoint URL</label>
                <input
                  type="text"
                  value={config.url || ''}
                  onChange={(e) => handleFieldChange('url', e.target.value)}
                  placeholder="https://api.external.com/v1/event"
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-neutral-400 block mb-1">HTTP Method</label>
                <select
                  value={config.method || 'POST'}
                  onChange={(e) => handleFieldChange('method', e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Output Variables Exposed */}
        <div className="pt-3 border-t border-neutral-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-neutral-200">Exposed Output Variables</h4>
            <span className="text-[10px] text-neutral-500 font-mono">
              {data.outputs?.length || 0} fields
            </span>
          </div>

          <div className="space-y-1.5">
            {data.outputs?.map((v: NodeOutputVariable) => (
              <div
                key={v.key}
                className="p-2 rounded-lg bg-neutral-900/60 border border-neutral-800/70 text-xs flex items-center justify-between"
              >
                <div className="min-w-0">
                  <span className="font-mono text-[11px] text-indigo-300 block truncate">
                    {`{{${v.key}}}`}
                  </span>
                  <span className="text-[10px] text-neutral-400 truncate block">
                    {v.label} {v.example && `· e.g. ${v.example}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step Testing Section */}
        <div className="pt-3 border-t border-neutral-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-neutral-200">Step Test & Verification</h4>
          </div>

          <button
            onClick={handleRunStepTest}
            disabled={isTesting}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Executing Test...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Test This Step</span>
              </>
            )}
          </button>

          {testError && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{testError}</span>
            </div>
          )}

          {testResult && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Step executed successfully</span>
              </div>
              <JSONViewer data={testResult} title="Test Response Payload" maxHeight="max-h-48" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
