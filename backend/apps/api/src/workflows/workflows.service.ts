import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@libs/database';
import { NodeType, WorkflowStatus, RunStatus } from '@libs/domain';
import { QueueService } from '@libs/queue';
import {
  WorkflowGraphValidator,
  WorkflowGraphDefinition,
} from '@libs/engine';
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  SaveWorkflowDraftDto,
  ExecuteWorkflowDto,
} from './dto/workflow.dto';

@Injectable()
export class WorkflowsService {
  private readonly logger = new Logger(WorkflowsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  async create(workspaceId: string, dto: CreateWorkflowDto) {
    return this.prisma.$transaction(async (tx) => {
      const workflow = await tx.workflow.create({
        data: {
          workspaceId,
          name: dto.name,
          description: dto.description,
          isActive: false,
        },
      });

      const initialDefinition = {
        nodes: [
          {
            nodeKey: 'trigger-1',
            type: NodeType.TRIGGER,
            integration: 'webhook',
            operation: 'catch_hook',
            config: {},
          },
        ],
        edges: [],
      };

      const version = await tx.workflowVersion.create({
        data: {
          workflowId: workflow.id,
          versionNumber: 1,
          status: WorkflowStatus.DRAFT,
          definition: initialDefinition,
        },
      });

      await tx.workflowNode.create({
        data: {
          versionId: version.id,
          nodeKey: 'trigger-1',
          type: NodeType.TRIGGER,
          integration: 'webhook',
          operation: 'catch_hook',
          config: {},
        },
      });

      return {
        ...workflow,
        activeVersion: version,
      };
    });
  }

  async listByWorkspace(workspaceId: string) {
    const workflows = await this.prisma.workflow.findMany({
      where: { workspaceId },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
          select: {
            id: true,
            versionNumber: true,
            status: true,
            publishedAt: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            runs: true,
            versions: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return workflows.map((w) => ({
      id: w.id,
      workspaceId: w.workspaceId,
      name: w.name,
      description: w.description,
      isActive: w.isActive,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
      latestVersion: w.versions[0] || null,
      totalRuns: w._count.runs,
      totalVersions: w._count.versions,
    }));
  }

  async getById(workspaceId: string, workflowId: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, workspaceId },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: {
            nodes: true,
            edges: true,
          },
        },
      },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow '${workflowId}' not found in this workspace`);
    }

    const draftVersion = workflow.versions.find((v) => v.status === WorkflowStatus.DRAFT);
    const publishedVersion = workflow.versions.find((v) => v.status === WorkflowStatus.PUBLISHED);

    return {
      id: workflow.id,
      workspaceId: workflow.workspaceId,
      name: workflow.name,
      description: workflow.description,
      isActive: workflow.isActive,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
      draftVersion: draftVersion || null,
      publishedVersion: publishedVersion || null,
      versionsCount: workflow.versions.length,
    };
  }

  async update(workspaceId: string, workflowId: string, dto: UpdateWorkflowDto) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, workspaceId },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow '${workflowId}' not found in this workspace`);
    }

    return this.prisma.workflow.update({
      where: { id: workflowId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  /**
   * Saves graph modifications.
   * If a DRAFT exists, mutates that DRAFT.
   * If only a PUBLISHED version exists, auto-forks a new DRAFT to ensure published immutability.
   */
  async saveDraft(workspaceId: string, workflowId: string, dto: SaveWorkflowDraftDto) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, workspaceId },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
        },
      },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow '${workflowId}' not found in this workspace`);
    }

    let draftVersion = workflow.versions.find((v) => v.status === WorkflowStatus.DRAFT);

    return this.prisma.$transaction(async (tx) => {
      if (!draftVersion) {
        // Auto-fork: create a new DRAFT version from the latest version
        const latestVersionNumber = workflow.versions[0]?.versionNumber || 0;
        const definitionJson = JSON.parse(
          JSON.stringify({ nodes: dto.nodes, edges: dto.edges }),
        );

        draftVersion = await tx.workflowVersion.create({
          data: {
            workflowId,
            versionNumber: latestVersionNumber + 1,
            status: WorkflowStatus.DRAFT,
            definition: definitionJson,
          },
        });
      } else {
        const definitionJson = JSON.parse(
          JSON.stringify({ nodes: dto.nodes, edges: dto.edges }),
        );

        // Update definition JSON snapshot
        draftVersion = await tx.workflowVersion.update({
          where: { id: draftVersion.id },
          data: {
            definition: definitionJson,
          },
        });

        // Clear existing nodes and edges for this draft
        await tx.workflowEdge.deleteMany({ where: { versionId: draftVersion.id } });
        await tx.workflowNode.deleteMany({ where: { versionId: draftVersion.id } });
      }

      // Bulk recreate nodes
      if (dto.nodes.length > 0) {
        await tx.workflowNode.createMany({
          data: dto.nodes.map((node) => ({
            versionId: draftVersion!.id,
            nodeKey: node.nodeKey,
            type: node.type,
            integration: node.integration || null,
            operation: node.operation || null,
            config: (node.config as Prisma.InputJsonObject) ?? {},
            metadata: (node.metadata as Prisma.InputJsonObject) ?? undefined,
          })),
        });
      }

      // Bulk recreate edges
      if (dto.edges.length > 0) {
        await tx.workflowEdge.createMany({
          data: dto.edges.map((edge) => ({
            versionId: draftVersion!.id,
            sourceNode: edge.sourceNode,
            targetNode: edge.targetNode,
            sourceHandle: edge.sourceHandle || null,
            targetHandle: edge.targetHandle || null,
          })),
        });
      }

      // Return draft with recreated relations
      return tx.workflowVersion.findUniqueOrThrow({
        where: { id: draftVersion.id },
        include: {
          nodes: true,
          edges: true,
        },
      });
    });
  }

  /**
   * Validates the graph structure of a workflow's current draft version
   * or an arbitrary graph definition.
   */
  async validateDraft(workspaceId: string, workflowId: string, customGraph?: WorkflowGraphDefinition) {
    if (customGraph) {
      return WorkflowGraphValidator.validate(customGraph);
    }

    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, workspaceId },
      include: {
        versions: {
          where: { status: WorkflowStatus.DRAFT },
          include: { nodes: true, edges: true },
        },
      },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow '${workflowId}' not found in this workspace`);
    }

    const draft = workflow.versions[0];
    if (!draft) {
      throw new BadRequestException('No draft version exists for this workflow to validate');
    }

    return WorkflowGraphValidator.validate({
      nodes: draft.nodes.map((n) => ({
        nodeKey: n.nodeKey,
        type: n.type,
        integration: n.integration,
        operation: n.operation,
        config: n.config as Record<string, unknown>,
      })),
      edges: draft.edges.map((e) => ({
        sourceNode: e.sourceNode,
        targetNode: e.targetNode,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
      })),
    });
  }

  /**
   * Validates and publishes the current draft.
   * Generates a SHA-256 checksum and sets previous published versions to ARCHIVED.
   */
  async publish(workspaceId: string, workflowId: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, workspaceId },
      include: {
        versions: {
          where: { status: WorkflowStatus.DRAFT },
          include: { nodes: true, edges: true },
        },
      },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow '${workflowId}' not found in this workspace`);
    }

    const draft = workflow.versions[0];
    if (!draft) {
      throw new BadRequestException('No draft version available to publish');
    }

    // 1. Validate DAG graph rules
    const validation = WorkflowGraphValidator.validate({
      nodes: draft.nodes.map((n) => ({
        nodeKey: n.nodeKey,
        type: n.type,
        integration: n.integration,
        operation: n.operation,
        config: n.config as Record<string, unknown>,
      })),
      edges: draft.edges.map((e) => ({
        sourceNode: e.sourceNode,
        targetNode: e.targetNode,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
      })),
    });

    if (!validation.isValid) {
      throw new BadRequestException({
        message: 'Cannot publish invalid workflow graph',
        errors: validation.errors,
      });
    }

    // 2. Compute canonical SHA-256 integrity checksum
    const canonicalPayload = JSON.stringify({
      nodes: draft.nodes.map((n) => ({
        key: n.nodeKey,
        type: n.type,
        integration: n.integration,
        op: n.operation,
        config: n.config,
      })),
      edges: draft.edges.map((e) => ({
        src: e.sourceNode,
        dst: e.targetNode,
        srcH: e.sourceHandle,
        dstH: e.targetHandle,
      })),
    });
    const checksum = createHash('sha256').update(canonicalPayload).digest('hex');

    // 3. Atomically archive previous published versions and promote draft
    return this.prisma.$transaction(async (tx) => {
      // Archive any currently published versions
      await tx.workflowVersion.updateMany({
        where: {
          workflowId,
          status: WorkflowStatus.PUBLISHED,
        },
        data: {
          status: WorkflowStatus.ARCHIVED,
        },
      });

      // Promote draft to published
      const published = await tx.workflowVersion.update({
        where: { id: draft.id },
        data: {
          status: WorkflowStatus.PUBLISHED,
          publishedAt: new Date(),
          checksum,
        },
        include: {
          nodes: true,
          edges: true,
        },
      });

      // Activate parent workflow
      await tx.workflow.update({
        where: { id: workflowId },
        data: { isActive: true },
      });

      return published;
    });
  }

  async listVersions(workspaceId: string, workflowId: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, workspaceId },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow '${workflowId}' not found in this workspace`);
    }

    return this.prisma.workflowVersion.findMany({
      where: { workflowId },
      select: {
        id: true,
        versionNumber: true,
        status: true,
        checksum: true,
        publishedAt: true,
        createdAt: true,
        _count: {
          select: {
            nodes: true,
            edges: true,
            runs: true,
          },
        },
      },
      orderBy: { versionNumber: 'desc' },
    });
  }

  async getVersion(workspaceId: string, workflowId: string, versionNumber: number) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, workspaceId },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow '${workflowId}' not found in this workspace`);
    }

    const version = await this.prisma.workflowVersion.findUnique({
      where: {
        workflowId_versionNumber: {
          workflowId,
          versionNumber,
        },
      },
      include: {
        nodes: true,
        edges: true,
        _count: {
          select: {
            runs: true,
          },
        },
      },
    });

    if (!version) {
      throw new NotFoundException(`Version ${versionNumber} not found for this workflow`);
    }

    return version;
  }

  async delete(workspaceId: string, workflowId: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, workspaceId },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow '${workflowId}' not found in this workspace`);
    }

    await this.prisma.workflow.delete({
      where: { id: workflowId },
    });

    return { message: 'Workflow deleted successfully' };
  }

  /**
   * Enqueues an execution run for a published workflow.
   * Immediately returns 202 Accepted with execution ID and pending state.
   */
  async trigger(workspaceId: string, workflowId: string, dto: ExecuteWorkflowDto) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, workspaceId },
      include: {
        versions: {
          where: { status: WorkflowStatus.PUBLISHED },
          take: 1,
        },
      },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow '${workflowId}' not found in this workspace`);
    }

    if (!workflow.isActive || workflow.versions.length === 0) {
      throw new BadRequestException('Cannot execute workflow: workflow is not published or is inactive');
    }

    const publishedVersion = workflow.versions[0];
    const triggerPayload = dto.triggerPayload ?? {};

    // 1. Create durable workflow run record in PENDING status
    const run = await this.prisma.workflowRun.create({
      data: {
        workflowId,
        versionId: publishedVersion.id,
        status: RunStatus.PENDING,
        triggerType: 'MANUAL',
        triggerPayload: triggerPayload as Prisma.InputJsonObject,
      },
    });

    // 2. Enqueue background execution job with optional idempotency key
    await this.queueService.enqueueWorkflowExecution(
      {
        runId: run.id,
        workflowId,
        versionId: publishedVersion.id,
        triggerPayload,
      },
      dto.idempotencyKey,
    );

    return {
      runId: run.id,
      workflowId,
      versionNumber: publishedVersion.versionNumber,
      status: RunStatus.PENDING,
      queuedAt: run.createdAt,
    };
  }

  async listRuns(workspaceId: string, workflowId: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, workspaceId },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow '${workflowId}' not found in this workspace`);
    }

    return this.prisma.workflowRun.findMany({
      where: { workflowId },
      select: {
        id: true,
        status: true,
        triggerType: true,
        durationMs: true,
        startedAt: true,
        completedAt: true,
        errorMessage: true,
        createdAt: true,
        _count: {
          select: {
            stepRuns: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getRun(workspaceId: string, workflowId: string, runId: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, workspaceId },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow '${workflowId}' not found in this workspace`);
    }

    const run = await this.prisma.workflowRun.findFirst({
      where: { id: runId, workflowId },
      include: {
        version: {
          select: {
            versionNumber: true,
            status: true,
          },
        },
        stepRuns: {
          orderBy: { startedAt: 'asc' },
        },
      },
    });

    if (!run) {
      throw new NotFoundException(`Workflow run '${runId}' not found`);
    }

    return run;
  }

  async cancelRun(workspaceId: string, workflowId: string, runId: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, workspaceId },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow '${workflowId}' not found in this workspace`);
    }

    const run = await this.prisma.workflowRun.findFirst({
      where: { id: runId, workflowId },
    });

    if (!run) {
      throw new NotFoundException(`Workflow run '${runId}' not found`);
    }

    if (run.status === RunStatus.SUCCESS || run.status === RunStatus.FAILED) {
      throw new BadRequestException(`Cannot cancel workflow run that is already ${run.status}`);
    }

    return this.prisma.workflowRun.update({
      where: { id: runId },
      data: {
        status: RunStatus.CANCELLED,
        completedAt: new Date(),
      },
    });
  }
}
