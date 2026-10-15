import { NodeType } from '@libs/domain';

export interface WorkflowNodeDefinition {
  nodeKey: string;
  type: NodeType;
  integration?: string | null;
  operation?: string | null;
  config?: Record<string, unknown>;
  metadata?: Record<string, unknown> | null;
}

export interface WorkflowEdgeDefinition {
  sourceNode: string;
  targetNode: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface WorkflowGraphDefinition {
  nodes: WorkflowNodeDefinition[];
  edges: WorkflowEdgeDefinition[];
}

export interface GraphValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
  triggerNodeKey?: string;
  topologicalOrder?: string[];
}

export class WorkflowGraphValidator {
  /**
   * Validates a workflow definition graph for DAG correctness,
   * single trigger constraint, reachability, and absence of cycles.
   */
  static validate(graph: WorkflowGraphDefinition): GraphValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const { nodes, edges } = graph;

    if (!nodes || nodes.length === 0) {
      return {
        isValid: false,
        errors: ['Workflow must contain at least one node'],
      };
    }

    // 1. Verify unique node keys
    const nodeKeys = new Set<string>();
    const nodeMap = new Map<string, WorkflowNodeDefinition>();

    for (const node of nodes) {
      if (!node.nodeKey || typeof node.nodeKey !== 'string') {
        errors.push('Every node must have a non-empty string nodeKey');
        continue;
      }
      if (nodeKeys.has(node.nodeKey)) {
        errors.push(`Duplicate nodeKey detected: '${node.nodeKey}'`);
      }
      nodeKeys.add(node.nodeKey);
      nodeMap.set(node.nodeKey, node);
    }

    // 2. Identify and validate triggers
    const triggerNodes = nodes.filter(
      (n) => n.type === NodeType.TRIGGER || n.type === NodeType.WEBHOOK,
    );

    if (triggerNodes.length === 0) {
      errors.push('Workflow must contain a trigger node (TRIGGER or WEBHOOK)');
    } else if (triggerNodes.length > 1) {
      errors.push(
        `Workflow must have exactly one trigger node, found ${triggerNodes.length}: ${triggerNodes.map((n) => n.nodeKey).join(', ')}`,
      );
    }

    const triggerNodeKey = triggerNodes[0]?.nodeKey;

    // 3. Build adjacency lists and in-degree map
    const adj = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    for (const key of nodeKeys) {
      adj.set(key, []);
      inDegree.set(key, 0);
    }

    // 4. Validate edges
    const edgeSet = new Set<string>();

    for (const edge of edges) {
      const { sourceNode, targetNode } = edge;

      if (!nodeKeys.has(sourceNode)) {
        errors.push(`Edge references non-existent source node: '${sourceNode}'`);
        continue;
      }
      if (!nodeKeys.has(targetNode)) {
        errors.push(`Edge references non-existent target node: '${targetNode}'`);
        continue;
      }
      if (sourceNode === targetNode) {
        errors.push(`Self-loop detected on node: '${sourceNode}'`);
        continue;
      }

      const edgeKey = `${sourceNode}->${targetNode}:${edge.sourceHandle || ''}`;
      if (edgeSet.has(edgeKey)) {
        warnings.push(`Duplicate edge detected between '${sourceNode}' and '${targetNode}'`);
      }
      edgeSet.add(edgeKey);

      adj.get(sourceNode)?.push(targetNode);
      inDegree.set(targetNode, (inDegree.get(targetNode) || 0) + 1);
    }

    // 5. Ensure trigger has no incoming edges
    if (triggerNodeKey && (inDegree.get(triggerNodeKey) || 0) > 0) {
      errors.push(`Trigger node '${triggerNodeKey}' cannot have incoming edges`);
    }

    // 6. Cycle detection & Topological sorting via Kahn's algorithm
    const queue: string[] = [];
    const inDegreeCopy = new Map<string, number>(inDegree);
    const topologicalOrder: string[] = [];

    // Find all nodes with inDegree 0
    for (const [key, deg] of inDegreeCopy.entries()) {
      if (deg === 0) {
        queue.push(key);
      }
    }

    while (queue.length > 0) {
      const u = queue.shift()!;
      topologicalOrder.push(u);

      for (const v of adj.get(u) || []) {
        const curDeg = (inDegreeCopy.get(v) || 0) - 1;
        inDegreeCopy.set(v, curDeg);
        if (curDeg === 0) {
          queue.push(v);
        }
      }
    }

    if (topologicalOrder.length < nodeKeys.size) {
      errors.push('Cycle detected in workflow graph. Workflows must be a Directed Acyclic Graph (DAG)');
    }

    // 7. Reachability check: all nodes must be reachable from the trigger
    if (triggerNodeKey && errors.length === 0) {
      const visited = new Set<string>();
      const dfsQueue = [triggerNodeKey];
      visited.add(triggerNodeKey);

      while (dfsQueue.length > 0) {
        const current = dfsQueue.shift()!;
        for (const neighbor of adj.get(current) || []) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            dfsQueue.push(neighbor);
          }
        }
      }

      const unreachable = Array.from(nodeKeys).filter((k) => !visited.has(k));
      if (unreachable.length > 0) {
        errors.push(
          `Unreachable nodes detected (disconnected from trigger '${triggerNodeKey}'): ${unreachable.join(', ')}`,
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      triggerNodeKey,
      topologicalOrder: errors.length === 0 ? topologicalOrder : undefined,
    };
  }
}
