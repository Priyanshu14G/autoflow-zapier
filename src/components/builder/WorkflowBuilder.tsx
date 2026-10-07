import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
import { Workflow, WorkflowNode, WorkflowNodeData, WorkflowEdge, WorkflowVersion } from '../../types';
import { CustomWorkflowNode } from './CustomWorkflowNode';
import { NodePalette, PaletteItem } from './NodePalette';
import { NodeConfigPanel } from './NodeConfigPanel';
import { WebhookModal } from '../webhooks/WebhookModal';
import { WorkflowVersionsModal } from '../workflows/WorkflowVersionsModal';
import { ExecutionEngine, ExecutionEvent } from '../../services/executionEngine';
import { StorageService } from '../../services/storageService';
import { useToast } from '../ui/Toast';
import {
  ArrowLeft,
  Play,
  Save,
  CheckCircle2,
  Globe,
  History,
  RotateCcw,
  RotateCw,
  Loader2,
  Layers,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Share2,
  Eye,
  Settings
} from 'lucide-react';

interface WorkflowBuilderProps {
  initialWorkflow: Workflow;
  onBack: () => void;
  onSave?: (workflow: Workflow) => void;
}

export const WorkflowBuilder: React.FC<WorkflowBuilderProps> = ({
  initialWorkflow,
  onBack,
  onSave,
}) => {
  const { showToast } = useToast();
  const [workflow, setWorkflow] = useState<Workflow>(initialWorkflow);
  const [workflowName, setWorkflowName] = useState(initialWorkflow.name);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [isPaletteOpen, setIsPaletteOpen] = useState(true);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Modals
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  const [isVersionsModalOpen, setIsVersionsModalOpen] = useState(false);

  // Execution state
  const [isRunningExecution, setIsRunningExecution] = useState(false);

  // History for Undo / Redo
  const [history, setHistory] = useState<Array<{ nodes: Node[]; edges: Edge[] }>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

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

  // Register custom node types
  const nodeTypes = useMemo(() => ({ workflowNode: CustomWorkflowNode }), []);

  // Sync back to workflow state on change
  const syncToStorage = useCallback(
    (currentNodes: Node[], currentEdges: Edge[], name = workflowName, status = workflow.status) => {
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

      setTimeout(() => {
        setSaveStatus('saved');
      }, 300);
    },
    [workflow, workflowName, onSave]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => {
        const nextEdges = addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: '#6366f1', strokeWidth: 2 },
          },
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

  // Add node from Palette
  const handleAddNodeFromPalette = (paletteItem: PaletteItem) => {
    const id = `node-${Date.now().toString(36)}`;

    // Calculate smart position to right of last node
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

    // Automatically connect from previous node if linear
    if (lastNode) {
      const edgeId = `e-${lastNode.id}-${id}`;
      nextEdges = [
        ...edges,
        {
          id: edgeId,
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

  // Update node data from config panel
  const handleUpdateNode = (nodeId: string, updatedData: Partial<WorkflowNodeData>) => {
    setNodes((nds) => {
      const next = nds.map((n) => {
        if (n.id === nodeId) {
          return {
            ...n,
            data: {
              ...(n.data as unknown as WorkflowNodeData),
              ...updatedData,
            },
          };
        }
        return n;
      });
      syncToStorage(next, edges);
      return next;
    });
  };

  // Delete node
  const handleDeleteNode = (nodeId: string) => {
    const nextNodes = nodes.filter((n) => n.id !== nodeId);
    const nextEdges = edges.filter((e) => e.source !== nodeId && e.target !== nodeId);
    setNodes(nextNodes);
    setEdges(nextEdges);
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
    syncToStorage(nextNodes, nextEdges);
    showToast('Step deleted from workflow', 'info');
  };

  // Test full workflow execution
  const handleTestWorkflow = async () => {
    if (isRunningExecution) return;
    setIsRunningExecution(true);
    showToast('Executing full workflow pipeline...', 'info');

    // Reset statuses to idle first
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...(n.data as unknown as WorkflowNodeData), status: 'idle' },
      }))
    );

    try {
      const currentWorkflowObj: Workflow = {
        ...workflow,
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type || 'workflowNode',
          position: n.position,
          data: n.data as unknown as WorkflowNodeData,
        })),
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
        })),
      };

      const run = await ExecutionEngine.executeWorkflow(
        currentWorkflowObj,
        (evt: ExecutionEvent) => {
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
        }
      );

      showToast(`Workflow execution complete (${run.durationMs}ms)`, 'success');
    } catch (err: any) {
      showToast('Workflow execution encountered an error', 'error');
    } finally {
      setIsRunningExecution(false);
    }
  };

  // Toggle active/pause status
  const handleToggleStatus = () => {
    const nextStatus = workflow.status === 'active' ? 'paused' : 'active';
    syncToStorage(nodes, edges, workflowName, nextStatus);
    showToast(
      `Workflow ${nextStatus === 'active' ? 'activated' : 'paused'} successfully`,
      nextStatus === 'active' ? 'success' : 'info'
    );
  };

  // Publish workflow as new version
  const handlePublish = () => {
    const nextVersion = (workflow.version || 1) + 1;
    const newVersionObj: WorkflowVersion = {
      version: nextVersion,
      createdAt: new Date().toISOString(),
      createdByName: 'Alex Chen',
      notes: `Published version ${nextVersion}`,
      nodesCount: nodes.length,
    };
    const versions = [newVersionObj, ...(workflow.versions || [])];
    const updatedWorkflow: Workflow = {
      ...workflow,
      version: nextVersion,
      versions,
      status: 'active',
      updatedAt: new Date().toISOString(),
    };
    setWorkflow(updatedWorkflow);
    StorageService.saveWorkflow(updatedWorkflow);
    showToast(`Published Version ${nextVersion} to production!`, 'success');
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

  return (
    <div className="w-screen h-screen flex flex-col bg-neutral-950 text-neutral-100 overflow-hidden select-none">
      {/* TOP BAR */}
      <header className="h-14 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-30">
        {/* Left: Back, Name & Save state */}
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

            <span className="text-[11px] font-mono text-neutral-500">
              v{workflow.version || 1}
            </span>

            <span className="text-[11px] text-neutral-500 flex items-center gap-1 font-mono">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>{saveStatus === 'saving' ? 'Saving...' : 'Saved'}</span>
            </span>
          </div>
        </div>

        {/* Center: Test and Palette Controls */}
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

        {/* Right: Actions */}
        <div className="flex items-center gap-2.5">
          {/* Status Switch */}
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

          {/* Test Workflow */}
          <button
            onClick={handleTestWorkflow}
            disabled={isRunningExecution}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            {isRunningExecution ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Running Pipeline...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Test Workflow</span>
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

      {/* WORKFLOW CANVAS & SIDEBARS */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Left Palette */}
        {isPaletteOpen && (
          <NodePalette onAddNode={handleAddNodeFromPalette} />
        )}

        {/* Main Flow Canvas */}
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
            <Background
              variant={BackgroundVariant.Dots}
              gap={24}
              size={1.5}
              color="rgba(255, 255, 255, 0.08)"
            />
            <Controls className="!bottom-4 !left-4" />
            <MiniMap
              className="!bottom-4 !right-4 !bg-neutral-900/80 !border !border-neutral-800 !rounded-xl overflow-hidden"
              nodeColor={() => '#6366f1'}
              maskColor="rgba(0, 0, 0, 0.7)"
            />
          </ReactFlow>

          {/* Quick Step Count & Canvas hint pill */}
          <div className="absolute top-4 left-4 z-10 pointer-events-none">
            <div className="bg-neutral-900/80 backdrop-blur-md border border-neutral-800/80 px-3 py-1.5 rounded-lg text-xs text-neutral-400 font-mono flex items-center gap-2 shadow-lg">
              <span>{nodes.length} Steps</span>
              <span aria-hidden="true">·</span>
              <span>{edges.length} Connections</span>
            </div>
          </div>
        </div>

        {/* Right Configuration Panel */}
        {selectedNode && (
          <NodeConfigPanel
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
    </div>
  );
};
