import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
} from '@xyflow/react';
import { Workflow, WorkflowNode, WorkflowNodeData, WorkflowEdge, WorkflowVersion, WorkflowRun, StepRun } from '../../types';
import { CustomWorkflowNode } from './CustomWorkflowNode';
import { NodePalette, PaletteItem } from './NodePalette';
import { NodeConfigPanel } from './NodeConfigPanel';
import { WebhookModal } from '../webhooks/WebhookModal';
import { WorkflowVersionsModal } from '../workflows/WorkflowVersionsModal';
import { StorageService } from '../../services/storageService';
import { WorkflowApi, apiRunToFrontend, TokenStore, WorkspaceStore } from '../../services/apiClient';
import { useToast } from '../ui/Toast';
import { RunDetailDrawer } from '../runs/RunDetailDrawer';
import {
  ArrowLeft,
  Play,
  CheckCircle2,
  Globe,
  History,
  Loader2,
  Layers,
  X,
  AlertCircle,
  RefreshCw,
  Save,
} from 'lucide-react';

interface WorkflowBuilderProps {
  initialWorkflow: Workflow;
  onBack: () => void;
  onSave?: (workflow: Workflow) => void;
}

// ─── Live Run Drawer ────────────────────────────────────────────────────────
interface LiveRunDrawerProps {
  runId: string;
  workflowId: string;
  workspaceId: string;
  workflowName: string;
  initialRun?: WorkflowRun | null;
  onClose: () => void;
}

const LiveRunDrawer: React.FC<LiveRunDrawerProps> = ({ runId, workflowId, workspaceId, workflowName, initialRun, onClose }) => {
  const [run, setRun] = useState<WorkflowRun | null>(initialRun || null);
  const [loading, setLoading] = useState(!initialRun);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchRun = useCallback(async () => {
    // If runId was generated locally or not authenticated, retrieve from StorageService
    if (!TokenStore.isAuthenticated() || runId.startsWith('run-') || runId.startsWith('sim-')) {
      const local = StorageService.getRuns().find((r) => r.id === runId);
      if (local) {
        setRun(local);
        setLoading(false);
        if (['success', 'failed', 'cancelled'].includes(local.status)) {
          if (pollRef.current) clearInterval(pollRef.current);
        }
        return;
      }
    }

    try {
      const apiRun = await WorkflowApi.getRun(workspaceId, workflowId, runId);
      const mapped = apiRunToFrontend(apiRun, workflowName);
      setRun(mapped);
      setLoading(false);

      // Stop polling when terminal state is reached
      const statusUpper = (apiRun.status || '').toUpperCase();
      if (['COMPLETED', 'SUCCESS', 'FAILED', 'CANCELLED'].includes(statusUpper)) {
        if (pollRef.current) clearInterval(pollRef.current);
      }
    } catch (e: any) {
      // Fallback: check local storage in case it was a local run
      const local = StorageService.getRuns().find((r) => r.id === runId);
      if (local) {
        setRun(local);
        setLoading(false);
      } else {
        setError(e.message);
        setLoading(false);
      }
      if (pollRef.current) clearInterval(pollRef.current);
    }
  }, [runId, workflowId, workspaceId, workflowName]);

  useEffect(() => {
    fetchRun();
    pollRef.current = setInterval(fetchRun, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchRun]);

  const statusColor = {
    running: 'text-indigo-400',
    success: 'text-emerald-400',
    failed: 'text-rose-400',
    cancelled: 'text-neutral-400',
  }[run?.status || 'running'];

  const statusIcon = {
    running: <Loader2 className="w-4 h-4 animate-spin" />,
    success: <CheckCircle2 className="w-4 h-4" />,
    failed: <AlertCircle className="w-4 h-4" />,
    cancelled: <X className="w-4 h-4" />,
  }[run?.status || 'running'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-[480px] h-full bg-neutral-950 border-l border-neutral-800 flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/60">
          <div>
            <h3 className="text-sm font-semibold text-neutral-100">Live Execution Monitor</h3>
            <p className="text-[11px] font-mono text-neutral-500 mt-0.5">#{runId}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchRun} className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status banner */}
        {run && (
          <div className={`px-5 py-3 border-b border-neutral-800/60 flex items-center gap-2 ${statusColor}`}>
            {statusIcon}
            <span className="text-sm font-semibold capitalize">{run.status}</span>
            {run.durationMs > 0 && (
              <span className="ml-auto text-xs font-mono text-neutral-400">{run.durationMs}ms</span>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading && (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
              <span className="ml-2 text-sm text-neutral-400">Fetching run status...</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              {error}
            </div>
          )}

          {run && !loading && (
            <>
              {/* Steps */}
              <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Step Execution</h4>
              {run.steps && run.steps.length > 0 ? (
                run.steps.map((step: StepRun, i: number) => (
                  <div key={step.id} className="rounded-xl border border-neutral-800 bg-neutral-900/40 overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-2.5">
                      <span className="text-[10px] font-mono text-neutral-600 w-5">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-neutral-200 truncate block">{step.nodeTitle || step.nodeId}</span>
                        {step.durationMs > 0 && <span className="text-[10px] font-mono text-neutral-500">{step.durationMs}ms</span>}
                      </div>
                      <span className={`text-[11px] font-semibold ${
                        step.status === 'success' ? 'text-emerald-400' :
                        step.status === 'failed' ? 'text-rose-400' :
                        step.status === 'running' ? 'text-indigo-400' : 'text-neutral-500'
                      }`}>
                        {step.status === 'running' && <Loader2 className="w-3 h-3 animate-spin inline mr-1" />}
                        {step.status}
                      </span>
                    </div>
                    {step.output && (
                      <div className="px-4 pb-3">
                        <pre className="text-[10px] font-mono text-neutral-400 bg-neutral-950/60 rounded-lg p-2 overflow-x-auto max-h-28 whitespace-pre-wrap break-all">
                          {JSON.stringify(step.output, null, 2)}
                        </pre>
                      </div>
                    )}
                    {step.errorMessage && (
                      <div className="px-4 pb-3 text-[10px] text-rose-400 font-mono">{step.errorMessage}</div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center text-neutral-500 text-sm py-8">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
                  Waiting for steps to begin...
                </div>
              )}

              {/* Error message */}
              {run.errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono">
                  {run.errorMessage}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main WorkflowBuilder ────────────────────────────────────────────────────
export const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({
  initialWorkflow,
  onBack,
  onSave,
}) => {
  const { showToast } = useToast();
  const [workflow, setWorkflow] = useState<Workflow>(initialWorkflow);
  const [workflowName, setWorkflowName] = useState(initialWorkflow.name);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [isPaletteOpen, setIsPaletteOpen] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Modals
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [isVersionsModalOpen, setIsVersionsModalOpen] = useState(false);

  // Execution state
  const [isRunningExecution, setIsRunningExecution] = useState(false);
  const [liveRunId, setLiveRunId] = useState<string | null>(null);
  const [liveRun, setLiveRun] = useState<WorkflowRun | null>(null);

  // React Flow state
  const initialNodes: Node[] = useMemo(() => {
    return initialWorkflow.nodes.map((n) => ({
      id: n.id,
      type: 'workflowNode',
      position: n.position,
      data: n.data as any,
    }));
  }, [initialWorkflow.nodes]);

  const initialEdges: Edge[] = useMemo(() => {
    return initialWorkflow.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      animated: e.animated ?? true,
      style: { stroke: '#6366f1', strokeWidth: 2 },
    }));
  }, [initialWorkflow.edges]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const nodeTypes = useMemo(() => ({ workflowNode: CustomWorkflowNode }), []);

  const workspaceId = WorkspaceStore.get() || workflow.workspaceId || 'ws-main';
  const isAuthenticated = TokenStore.isAuthenticated();

  // ── Save draft (local + backend) ──────────────────────────────────────────
  const syncToStorage = useCallback(
    async (currentNodes: Node[], currentEdges: Edge[], name = workflowName, status = workflow.status) => {
      setSaveStatus('saving');

      const updatedWorkflow: Workflow = {
        ...workflow,
        name,
        status,
        nodes: currentNodes.map((n) => ({
          id: n.id,
          type: n.type || 'workflowNode',
          position: n.position,
          data: n.data as unknown as WorkflowNodeData,
        })),
        edges: currentEdges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          animated: e.animated,
        })),
        updatedAt: new Date().toISOString(),
      };

      setWorkflow(updatedWorkflow);
      StorageService.saveWorkflow(updatedWorkflow);
      onSave?.(updatedWorkflow);

      // Persist draft to backend if authenticated
      if (isAuthenticated) {
        try {
          await WorkflowApi.saveDraft(workspaceId, workflow.id, {
            nodes: updatedWorkflow.nodes,
            edges: updatedWorkflow.edges,
          });
          // Also update name if changed
          if (name !== workflow.name) {
            await WorkflowApi.update(workspaceId, workflow.id, { name });
          }
          setSaveStatus('saved');
        } catch (e: any) {
          // If workflow doesn't exist on backend yet (404), create it and save draft
          if (e?.status === 404 || e?.message?.includes('not found')) {
            try {
              const created = await WorkflowApi.create(workspaceId, {
                name: updatedWorkflow.name,
                description: updatedWorkflow.description,
              });
              updatedWorkflow.id = created.id;
              setWorkflow((prev) => ({ ...prev, id: created.id }));
              StorageService.saveWorkflow(updatedWorkflow);
              await WorkflowApi.saveDraft(workspaceId, created.id, {
                nodes: updatedWorkflow.nodes,
                edges: updatedWorkflow.edges,
              });
              setSaveStatus('saved');
              return;
            } catch (err2) {
              console.warn('Auto-create workflow on backend failed:', err2);
            }
          }
          console.warn('Backend save failed, using local storage fallback:', e);
          setSaveStatus('error');
          setTimeout(() => setSaveStatus('saved'), 2000);
        }
      } else {
        setTimeout(() => setSaveStatus('saved'), 300);
      }
    },
    [workflow, workflowName, onSave, isAuthenticated, workspaceId]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => {
        const nextEdges = addEdge(
          { ...params, animated: true, style: { stroke: '#6366f1', strokeWidth: 2 } },
          eds
        );
        syncToStorage(nodes, nextEdges);
        return nextEdges;
      });
      showToast('Connection created between steps', 'info');
    },
    [setEdges, nodes, syncToStorage, showToast]
  );

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const handleAddNodeFromPalette = (paletteItem: PaletteItem) => {
    const id = `node-${Date.now().toString(36)}`;
    const lastNode = nodes[nodes.length - 1];
    const newPosition = lastNode
      ? { x: lastNode.position.x + 340, y: lastNode.position.y }
      : { x: 100, y: 150 };

    const newNode: Node = {
      id,
      type: 'workflowNode',
      position: newPosition,
      data: {
        title: paletteItem.title,
        subtitle: paletteItem.subtitle,
        app: paletteItem.app,
        category: paletteItem.category,
        configured: Object.keys(paletteItem.defaultConfig).length > 0,
        config: paletteItem.defaultConfig,
        outputs: paletteItem.outputs,
        status: 'idle',
      },
    };

    const nextNodes = [...nodes, newNode];
    let nextEdges = edges;

    if (lastNode) {
      nextEdges = [
        ...edges,
        {
          id: `e-${lastNode.id}-${id}`,
          source: lastNode.id,
          target: id,
          animated: true,
          style: { stroke: '#6366f1', strokeWidth: 2 },
        },
      ];
    }

    setNodes(nextNodes);
    setEdges(nextEdges);
    setSelectedNodeId(id);
    syncToStorage(nextNodes, nextEdges);
    showToast(`Added ${paletteItem.title} to workflow`, 'success');
  };

  const handleUpdateNode = (nodeId: string, updatedData: Partial<WorkflowNodeData>) => {
    setNodes((nds) => {
      const next = nds.map((n) => {
        if (n.id === nodeId) {
          return { ...n, data: { ...(n.data as unknown as WorkflowNodeData), ...updatedData } };
        }
        return n;
      });
      syncToStorage(next, edges);
      return next;
    });
  };

  const handleDeleteNode = (nodeId: string) => {
    const nextNodes = nodes.filter((n) => n.id !== nodeId);
    const nextEdges = edges.filter((e) => e.source !== nodeId && e.target !== nodeId);
    setNodes(nextNodes);
    setEdges(nextEdges);
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
    syncToStorage(nextNodes, nextEdges);
    showToast('Step deleted from workflow', 'info');
  };

  // ── Helper: Run workflow locally and stream to drawer ───────────────────
  const runLocalExecution = async () => {
    try {
      const { ExecutionEngine } = await import('../../services/executionEngine');
      const currentWorkflowObj: Workflow = {
        ...workflow,
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type || 'workflowNode',
          position: n.position,
          data: n.data as unknown as WorkflowNodeData,
        })),
        edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
      };

      const run = await ExecutionEngine.executeWorkflow(currentWorkflowObj, (evt) => {
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id === evt.nodeId) {
              return {
                ...n,
                data: {
                  ...(n.data as unknown as WorkflowNodeData),
                  status: evt.status,
                  lastRunOutput: evt.stepRun?.output,
                },
              };
            }
            return n;
          })
        );
      });

      // Save to localStorage so it appears in run history
      StorageService.addRun(run);
      setLiveRun(run);
      setLiveRunId(run.id);
      showToast(`Workflow execution complete (${run.durationMs}ms)`, 'success');
    } catch (err: any) {
      showToast('Workflow execution error: ' + err.message, 'error');
    }
  };

  // ── Execute workflow (real backend or local simulation) ───────────────────
  const handleTestWorkflow = async () => {
    if (isRunningExecution) return;
    setIsRunningExecution(true);

    // First save the draft
    await syncToStorage(nodes, edges);

    if (isAuthenticated) {
      try {
        showToast('Submitting workflow to backend execution queue...', 'info');
        let targetWfId = workflow.id;

        // Verify or create workflow in backend workspace
        try {
          await WorkflowApi.get(workspaceId, targetWfId);
        } catch {
          try {
            const created = await WorkflowApi.create(workspaceId, {
              name: workflowName || workflow.name,
              description: workflow.description || 'Created via builder',
            });
            targetWfId = created.id;
            setWorkflow((prev) => ({ ...prev, id: created.id }));
          } catch (createErr) {
            console.warn('Could not auto-create workflow on backend:', createErr);
          }
        }

        // Save latest draft on backend
        try {
          await WorkflowApi.saveDraft(workspaceId, targetWfId, {
            nodes: nodes.map((n) => ({
              id: n.id,
              type: n.type || 'workflowNode',
              position: n.position,
              data: n.data,
            })),
            edges: edges.map((e) => ({
              id: e.id,
              source: e.source,
              target: e.target,
              animated: e.animated,
            })),
          });
        } catch (draftErr) {
          console.warn('Draft save error:', draftErr);
        }

        // Ensure published version exists before execution
        try {
          await WorkflowApi.publish(workspaceId, targetWfId);
        } catch (pubErr) {
          console.warn('Publish note:', pubErr);
        }

        // Execute workflow via backend API
        const result = await WorkflowApi.execute(workspaceId, targetWfId);
        setLiveRunId(result.runId);
        showToast(`Backend execution started! ID: ${result.runId}`, 'success');
      } catch (err: any) {
        console.warn('Backend execute error, falling back to local simulation:', err);
        showToast(`Backend note: ${err.message}. Running local engine...`, 'info');
        await runLocalExecution();
      } finally {
        setIsRunningExecution(false);
      }
    } else {
      // Offline mode: execute locally and open drawer
      await runLocalExecution();
      setIsRunningExecution(false);
    }
  };

  // ── Toggle active / pause status ──────────────────────────────────────────
  const handleToggleStatus = () => {
    const nextStatus = workflow.status === 'active' ? 'paused' : 'active';
    syncToStorage(nodes, edges, workflowName, nextStatus);
    showToast(
      `Workflow ${nextStatus === 'active' ? 'activated' : 'paused'} successfully`,
      nextStatus === 'active' ? 'success' : 'info'
    );
  };

  // ── Publish workflow ─────────────────────────────────────────────────────
  const handlePublish = async () => {
    // Save draft first
    await syncToStorage(nodes, edges);

    if (isAuthenticated) {
      try {
        setSaveStatus('saving');
        await WorkflowApi.publish(workspaceId, workflow.id);
        const nextVersion = (workflow.version || 1) + 1;
        const newVersionObj: WorkflowVersion = {
          version: nextVersion,
          createdAt: new Date().toISOString(),
          createdByName: 'You',
          notes: `Published version ${nextVersion}`,
          nodesCount: nodes.length,
        };
        const updatedWorkflow: Workflow = {
          ...workflow,
          version: nextVersion,
          versions: [newVersionObj, ...(workflow.versions || [])],
          status: 'active',
          updatedAt: new Date().toISOString(),
        };
        setWorkflow(updatedWorkflow);
        StorageService.saveWorkflow(updatedWorkflow);
        setSaveStatus('saved');
        showToast(`Published Version ${nextVersion} to production!`, 'success');
      } catch (err: any) {
        setSaveStatus('error');
        showToast(`Publish failed: ${err.message}`, 'error');
      }
    } else {
      // Local publish
      const nextVersion = (workflow.version || 1) + 1;
      const updatedWorkflow: Workflow = {
        ...workflow,
        version: nextVersion,
        versions: [
          {
            version: nextVersion,
            createdAt: new Date().toISOString(),
            createdByName: 'You',
            notes: `Published version ${nextVersion}`,
            nodesCount: nodes.length,
          },
          ...(workflow.versions || []),
        ],
        status: 'active',
        updatedAt: new Date().toISOString(),
      };
      setWorkflow(updatedWorkflow);
      StorageService.saveWorkflow(updatedWorkflow);
      showToast(`Published Version ${nextVersion} (local mode)!`, 'success');
    }
  };

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) return null;
    const found = nodes.find((n) => n.id === selectedNodeId);
    if (!found) return null;
    return {
      id: found.id,
      type: found.type || 'workflowNode',
      position: found.position,
      data: found.data as unknown as WorkflowNodeData,
    };
  }, [nodes, selectedNodeId]);

  const saveStatusLabel = saveStatus === 'saving' ? 'Saving...' : saveStatus === 'error' ? 'Save failed' : 'Saved';
  const saveStatusColor = saveStatus === 'error' ? 'text-rose-400' : 'text-emerald-400';

  return (
    <div className="w-screen h-screen flex flex-col bg-neutral-950 text-neutral-100 overflow-hidden select-none">
      {/* TOP BAR */}
      <header className="h-14 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-30">
        {/* Left */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
            title="Back to workflows"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-neutral-800" />

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              onBlur={() => syncToStorage(nodes, edges, workflowName)}
              className="bg-transparent text-sm font-semibold text-neutral-100 hover:bg-neutral-900/60 focus:bg-neutral-900 px-2 py-1 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors max-w-xs truncate"
            />

            <span className="text-[11px] font-mono text-neutral-500">v{workflow.version || 1}</span>

            <span className={`text-[11px] flex items-center gap-1 font-mono ${saveStatusColor}`}>
              <CheckCircle2 className="w-3 h-3" />
              <span>{saveStatusLabel}</span>
            </span>

            {!isAuthenticated && (
              <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded font-mono">
                Offline Mode
              </span>
            )}
          </div>
        </div>

        {/* Center */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaletteOpen(!isPaletteOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isPaletteOpen
                ? 'bg-neutral-800 border-neutral-700 text-neutral-100'
                : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Steps Library</span>
          </button>

          <button
            onClick={() => setIsWebhookModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-cyan-400 transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Webhook URL</span>
          </button>

          <button
            onClick={() => setIsVersionsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-300 transition-colors"
          >
            <History className="w-3.5 h-3.5" />
            <span>Revisions</span>
          </button>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2.5">
          {/* Status toggle */}
          <button
            onClick={handleToggleStatus}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              workflow.status === 'active'
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                workflow.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-500'
              }`}
            />
            <span className="capitalize">{workflow.status}</span>
          </button>

          {/* Explicit Save Draft Button */}
          <button
            onClick={() => {
              syncToStorage(nodes, edges, workflowName);
              showToast('Workflow draft saved successfully!', 'success');
            }}
            disabled={saveStatus === 'saving'}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 hover:border-neutral-600 text-neutral-100 text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
            title="Save workflow draft"
          >
            {saveStatus === 'saving' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5 text-indigo-400" />
                <span>Save</span>
              </>
            )}
          </button>

          {/* Test / Execute */}
          <button
            onClick={handleTestWorkflow}
            disabled={isRunningExecution}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            {isRunningExecution ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Workflow</span>
              </>
            )}
          </button>

          {/* Publish */}
          <button
            onClick={handlePublish}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-neutral-100 hover:bg-white text-neutral-900 text-xs font-semibold transition-colors"
          >
            <span>Publish</span>
          </button>
        </div>
      </header>

      {/* WORKFLOW CANVAS */}
      <div className="flex-1 flex relative overflow-hidden">
        {isPaletteOpen && <NodePalette onAddNode={handleAddNodeFromPalette} />}

        <div className="flex-1 h-full relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            onPaneClick={handlePaneClick}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.2}
            maxZoom={1.8}
            className="bg-[#090a0f]"
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} color="rgba(255, 255, 255, 0.08)" />
            <Controls className="!bottom-4 !left-4" />
            <MiniMap
              className="!bottom-4 !right-4 !bg-neutral-900/80 !border !border-neutral-800 !rounded-xl overflow-hidden"
              nodeColor={() => '#6366f1'}
              maskColor="rgba(0, 0, 0, 0.7)"
            />
          </ReactFlow>

          <div className="absolute top-4 left-4 z-10 pointer-events-none">
            <div className="bg-neutral-900/80 backdrop-blur-md border border-neutral-800/80 px-3 py-1.5 rounded-lg text-xs text-neutral-400 font-mono flex items-center gap-2 shadow-lg">
              <span>{nodes.length} Steps</span>
              <span aria-hidden="true">·</span>
              <span>{edges.length} Connections</span>
            </div>
          </div>
        </div>

        {selectedNode && (
          <NodeConfigPanel
            key={selectedNode.id}
            node={selectedNode}
            allNodes={nodes.map((n) => ({
              id: n.id,
              type: n.type || 'workflowNode',
              position: n.position,
              data: n.data as unknown as WorkflowNodeData,
            }))}
            onUpdateNode={handleUpdateNode}
            onDeleteNode={handleDeleteNode}
            onClose={() => setSelectedNodeId(null)}
          />
        )}
      </div>

      {/* Webhook Modal */}
      <WebhookModal
        workflow={workflow}
        isOpen={isWebhookModalOpen}
        onClose={() => setIsWebhookModalOpen(false)}
      />

      {/* Versions Modal */}
      <WorkflowVersionsModal
        workflow={workflow}
        isOpen={isVersionsModalOpen}
        onClose={() => setIsVersionsModalOpen(false)}
        onRestoreVersion={(ver) => {
          setWorkflow((prev) => ({ ...prev, version: ver.version }));
        }}
      />

      {/* Live Run Drawer */}
      {liveRunId && (
        <LiveRunDrawer
          runId={liveRunId}
          workflowId={workflow.id}
          workspaceId={workspaceId}
          workflowName={workflow.name}
          initialRun={liveRun}
          onClose={() => {
            setLiveRunId(null);
            setLiveRun(null);
          }}
        />
      )}
    </div>
  );
};
