import { NodeType } from '@libs/domain';
import { WorkflowGraphValidator } from './graph-validator';

describe('WorkflowGraphValidator (DAG & Graph Structural Validation)', () => {
  it('should validate a valid linear workflow graph', () => {
    const graph = {
      nodes: [
        { nodeKey: 'trigger-1', type: NodeType.TRIGGER },
        { nodeKey: 'ai-1', type: NodeType.AI },
        { nodeKey: 'action-1', type: NodeType.ACTION },
      ],
      edges: [
        { sourceNode: 'trigger-1', targetNode: 'ai-1' },
        { sourceNode: 'ai-1', targetNode: 'action-1' },
      ],
    };

    const result = WorkflowGraphValidator.validate(graph);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.triggerNodeKey).toBe('trigger-1');
    expect(result.topologicalOrder).toEqual(['trigger-1', 'ai-1', 'action-1']);
  });

  it('should reject a graph with no trigger', () => {
    const graph = {
      nodes: [
        { nodeKey: 'action-1', type: NodeType.ACTION },
        { nodeKey: 'action-2', type: NodeType.ACTION },
      ],
      edges: [{ sourceNode: 'action-1', targetNode: 'action-2' }],
    };

    const result = WorkflowGraphValidator.validate(graph);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      'Workflow must contain a trigger node (TRIGGER or WEBHOOK)',
    );
  });

  it('should reject a graph with multiple triggers', () => {
    const graph = {
      nodes: [
        { nodeKey: 'trigger-1', type: NodeType.TRIGGER },
        { nodeKey: 'trigger-2', type: NodeType.WEBHOOK },
        { nodeKey: 'action-1', type: NodeType.ACTION },
      ],
      edges: [
        { sourceNode: 'trigger-1', targetNode: 'action-1' },
        { sourceNode: 'trigger-2', targetNode: 'action-1' },
      ],
    };

    const result = WorkflowGraphValidator.validate(graph);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('exactly one trigger node'))).toBe(true);
  });

  it('should reject a graph containing cycles (infinite loops)', () => {
    const graph = {
      nodes: [
        { nodeKey: 'trigger-1', type: NodeType.TRIGGER },
        { nodeKey: 'node-A', type: NodeType.ACTION },
        { nodeKey: 'node-B', type: NodeType.ACTION },
      ],
      edges: [
        { sourceNode: 'trigger-1', targetNode: 'node-A' },
        { sourceNode: 'node-A', targetNode: 'node-B' },
        { sourceNode: 'node-B', targetNode: 'node-A' }, // Cycle!
      ],
    };

    const result = WorkflowGraphValidator.validate(graph);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('Cycle detected'))).toBe(true);
  });

  it('should reject a graph with unreachable / orphaned nodes', () => {
    const graph = {
      nodes: [
        { nodeKey: 'trigger-1', type: NodeType.TRIGGER },
        { nodeKey: 'action-connected', type: NodeType.ACTION },
        { nodeKey: 'action-orphan', type: NodeType.ACTION },
      ],
      edges: [{ sourceNode: 'trigger-1', targetNode: 'action-connected' }],
    };

    const result = WorkflowGraphValidator.validate(graph);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('Unreachable nodes detected'))).toBe(true);
    expect(result.errors.some((e) => e.includes('action-orphan'))).toBe(true);
  });

  it('should reject edges with non-existent nodes or self-loops', () => {
    const graph = {
      nodes: [
        { nodeKey: 'trigger-1', type: NodeType.TRIGGER },
        { nodeKey: 'node-1', type: NodeType.ACTION },
      ],
      edges: [
        { sourceNode: 'trigger-1', targetNode: 'node-1' },
        { sourceNode: 'node-1', targetNode: 'node-1' }, // self-loop
        { sourceNode: 'node-1', targetNode: 'ghost-node' }, // missing node
      ],
    };

    const result = WorkflowGraphValidator.validate(graph);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('Self-loop detected'))).toBe(true);
    expect(result.errors.some((e) => e.includes('non-existent target node'))).toBe(true);
  });

  it('should validate a branching condition graph', () => {
    const graph = {
      nodes: [
        { nodeKey: 'trigger-1', type: NodeType.TRIGGER },
        { nodeKey: 'condition-1', type: NodeType.CONDITION },
        { nodeKey: 'action-true', type: NodeType.ACTION },
        { nodeKey: 'action-false', type: NodeType.ACTION },
      ],
      edges: [
        { sourceNode: 'trigger-1', targetNode: 'condition-1' },
        { sourceNode: 'condition-1', targetNode: 'action-true', sourceHandle: 'true' },
        { sourceNode: 'condition-1', targetNode: 'action-false', sourceHandle: 'false' },
      ],
    };

    const result = WorkflowGraphValidator.validate(graph);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.topologicalOrder).toContain('action-true');
    expect(result.topologicalOrder).toContain('action-false');
  });
});
