import React, { useState } from 'react';
import { WorkflowNode, NodeOutputVariable } from '../../types';
import { AppIcon } from '../ui/AppIcon';
import { Search, Variable, Plus, ChevronRight } from 'lucide-react';

interface VariablePickerProps {
  nodes: WorkflowNode[];
  currentNodeId: string;
  onSelectVariable: (variableTag: string) => void;
}

export const VariablePicker: React.FC<VariablePickerProps> = ({
  nodes,
  currentNodeId,
  onSelectVariable,
}) => {
  const [search, setSearch] = useState('');
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);

  // Find upstream nodes (all nodes occurring before this node)
  const currentIndex = nodes.findIndex((n) => n.id === currentNodeId);
  const upstreamNodes = currentIndex > 0 ? nodes.slice(0, currentIndex) : [];

  const filteredNodes = upstreamNodes.filter((node) => {
    if (!search) return true;
    const matchesNode = node.data.title.toLowerCase().includes(search.toLowerCase());
    const matchesVar = node.data.outputs?.some(
      (v) =>
        v.key.toLowerCase().includes(search.toLowerCase()) ||
        v.label.toLowerCase().includes(search.toLowerCase())
    );
    return matchesNode || matchesVar;
  });

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/95 shadow-2xl p-3 w-80 space-y-3 z-50">
      <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-200">
          <Variable className="w-3.5 h-3.5 text-indigo-400" />
          <span>Insert Variable</span>
        </div>
        <span className="text-[10px] text-neutral-500 font-mono">
          {upstreamNodes.length} upstream steps
        </span>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search variables..."
          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500"
          autoFocus
        />
      </div>

      {/* Upstream nodes list */}
      <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
        {filteredNodes.length === 0 ? (
          <div className="text-center py-6 text-xs text-neutral-500">
            {upstreamNodes.length === 0
              ? 'No upstream steps available yet. Add a trigger or preceding action first.'
              : 'No matching variables found.'}
          </div>
        ) : (
          filteredNodes.map((node, idx) => {
            const isExpanded = expandedNodeId === node.id || Boolean(search);
            const outputs = node.data.outputs || [];

            return (
              <div
                key={node.id}
                className="rounded-lg border border-neutral-800/80 bg-neutral-950/60 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedNodeId(isExpanded ? null : node.id)}
                  className="w-full flex items-center justify-between p-2 text-left hover:bg-neutral-800/40 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 rounded bg-neutral-800 flex items-center justify-center shrink-0">
                      <AppIcon app={node.data.app} size={12} />
                    </div>
                    <span className="text-xs font-medium text-neutral-300 truncate">
                      {idx === 0 ? 'Trigger' : `Step ${idx + 1}`}: {node.data.title}
                    </span>
                  </div>
                  <ChevronRight
                    className={`w-3.5 h-3.5 text-neutral-500 transition-transform ${
                      isExpanded ? 'rotate-90' : ''
                    }`}
                  />
                </button>

                {isExpanded && (
                  <div className="p-1.5 pt-0 space-y-1">
                    {outputs.length === 0 ? (
                      <p className="text-[11px] text-neutral-500 p-1.5 italic">
                        No exposed variables for this step
                      </p>
                    ) : (
                      outputs.map((v: NodeOutputVariable) => (
                        <button
                          key={v.key}
                          type="button"
                          onClick={() => onSelectVariable(`{{${v.key}}}`)}
                          className="w-full flex items-center justify-between p-1.5 rounded hover:bg-indigo-600/20 hover:text-indigo-200 text-left transition-colors group"
                        >
                          <div className="min-w-0">
                            <div className="text-[11px] font-mono text-indigo-300 truncate">
                              {`{{${v.key}}}`}
                            </div>
                            <div className="text-[10px] text-neutral-400 truncate">
                              {v.label} {v.example && `(e.g. ${v.example})`}
                            </div>
                          </div>
                          <Plus className="w-3.5 h-3.5 text-neutral-500 group-hover:text-indigo-300 shrink-0 ml-1" />
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
