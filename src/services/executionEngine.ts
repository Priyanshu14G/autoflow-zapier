import { Workflow, WorkflowRun, StepRun } from '../types';
import { StorageService } from './storageService';

export interface ExecutionEvent {
  stepIndex: number;
  nodeId: string;
  status: 'running' | 'success' | 'failed';
  stepRun?: StepRun;
}

export class ExecutionEngine {
  /**
   * Resolves {{node_key.field}} templates using upstream step outputs
   */
  static resolveVariables(text: string, context: Record<string, any>): string {
    if (!text || typeof text !== 'string') return text;
    return text.replace(/\{\{([a-zA-Z0-9_.]+)\}\}/g, (match, path) => {
      const parts = path.split('.');
      let current: any = context;
      for (const p of parts) {
        if (current && typeof current === 'object' && p in current) {
          current = current[p];
        } else {
          return match; // Keep unchanged if not found
        }
      }
      return typeof current === 'object' ? JSON.stringify(current) : String(current);
    });
  }

  /**
   * Simulates running the full workflow with progressive animation callbacks
   */
  static async executeWorkflow(
    workflow: Workflow,
    onStepUpdate?: (event: ExecutionEvent) => void
  ): Promise<WorkflowRun> {
    const runId = `run-${Math.floor(1000 + Math.random() * 9000)}`;
    const startedAt = new Date().toISOString();
    const startTime = Date.now();

    const stepRuns: StepRun[] = [];
    const executionContext: Record<string, any> = {
      trigger: {},
    };

    let runStatus: 'success' | 'failed' = 'success';
    let errorMessage: string | undefined;

    for (let i = 0; i < workflow.nodes.length; i++) {
      const node = workflow.nodes[i];
      const stepStartTime = Date.now();

      // Emit running state
      onStepUpdate?.({
        stepIndex: i,
        nodeId: node.id,
        status: 'running',
      });

      // Simulate network / processing delay (400ms - 800ms)
      await new Promise((resolve) => setTimeout(resolve, 600));

      // Resolve inputs
      const resolvedInputs: Record<string, any> = {};
      const nodeConfig = node.data.config || {};
      for (const [key, val] of Object.entries(nodeConfig)) {
        if (typeof val === 'string') {
          resolvedInputs[key] = this.resolveVariables(val, executionContext);
        } else {
          resolvedInputs[key] = val;
        }
      }

      // Generate realistic step outputs based on node category and app
      const stepOutputs: Record<string, any> = {};
      const nodeKey = i === 0 ? 'trigger' : `step_${i + 1}`;

      if (node.data.category === 'trigger') {
        stepOutputs.sender = 'client@fintech.io';
        stepOutputs.subject = 'Q4 Enterprise License Upgrade';
        stepOutputs.body = 'We need to upgrade our contract to 120 seats before next sprint.';
        stepOutputs.timestamp = new Date().toISOString();
        stepOutputs.payload = { event: 'inbound.message', id: 48102 };
      } else if (node.data.category === 'ai') {
        stepOutputs.summary = 'Enterprise customer requesting expansion to 120 seats with high urgency.';
        stepOutputs.urgency = 'High';
        stepOutputs.sentiment = 'Positive';
        stepOutputs.dealSize = '$72,000 ARR';
      } else if (node.data.app === 'sheets') {
        stepOutputs.rowId = `${150 + Math.floor(Math.random() * 50)}`;
        stepOutputs.updatedRange = `Sheet1!A${stepOutputs.rowId}:D${stepOutputs.rowId}`;
        stepOutputs.status = 'appended';
      } else if (node.data.app === 'slack') {
        stepOutputs.ok = true;
        stepOutputs.ts = `${Date.now() / 1000}`;
        stepOutputs.channel = node.data.config?.channel || '#general';
      } else if (node.data.app === 'postgresql') {
        stepOutputs.rowCount = 1;
        stepOutputs.insertedId = `${9000 + Math.floor(Math.random() * 999)}`;
      } else {
        stepOutputs.statusCode = 200;
        stepOutputs.success = true;
      }

      // Store in execution context for downstream steps
      executionContext[nodeKey] = stepOutputs;
      if (i === 0) {
        executionContext.trigger = stepOutputs;
      }

      const durationMs = Date.now() - stepStartTime;

      const stepRun: StepRun = {
        id: `st-${Date.now().toString(36)}-${i}`,
        nodeId: node.id,
        nodeTitle: node.data.title,
        app: node.data.app,
        status: 'success',
        startedAt: new Date(stepStartTime).toISOString(),
        finishedAt: new Date().toISOString(),
        durationMs,
        input: resolvedInputs,
        output: stepOutputs,
        requestPayload: resolvedInputs,
        responsePayload: stepOutputs,
      };

      stepRuns.push(stepRun);

      // Emit success state
      onStepUpdate?.({
        stepIndex: i,
        nodeId: node.id,
        status: 'success',
        stepRun,
      });
    }

    const totalDuration = Date.now() - startTime;
    const completedAt = new Date().toISOString();

    const workflowRun: WorkflowRun = {
      id: runId,
      workflowId: workflow.id,
      workflowName: workflow.name,
      status: runStatus,
      startedAt,
      completedAt,
      durationMs: totalDuration,
      triggerSource: workflow.nodes[0]?.data.title || 'Manual Test Trigger',
      stepsCount: stepRuns.length,
      steps: stepRuns,
      tasksConsumed: stepRuns.length,
      errorMessage,
    };

    // Save run to local store
    StorageService.addRun(workflowRun);

    return workflowRun;
  }
}
