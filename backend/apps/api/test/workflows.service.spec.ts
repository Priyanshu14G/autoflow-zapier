import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { WorkflowsService } from '../src/workflows/workflows.service';
import { PrismaService } from '@libs/database';
import { NodeType, WorkflowStatus } from '@libs/domain';

describe('WorkflowsService (Versioning & Immutability)', () => {
  let service: WorkflowsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      workflow: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      workflowVersion: {
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      workflowNode: {
        create: jest.fn(),
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      workflowEdge: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<WorkflowsService>(WorkflowsService);
  });

  describe('create', () => {
    it('should create a workflow with initial v1 DRAFT version', async () => {
      prisma.workflow.create.mockResolvedValue({
        id: 'wf-1',
        workspaceId: 'ws-1',
        name: 'New Automation',
        isActive: false,
      });

      prisma.workflowVersion.create.mockResolvedValue({
        id: 'v-1',
        workflowId: 'wf-1',
        versionNumber: 1,
        status: WorkflowStatus.DRAFT,
      });

      const result = await service.create('ws-1', { name: 'New Automation' });
      expect(result.id).toBe('wf-1');
      expect(result.activeVersion.versionNumber).toBe(1);
      expect(result.activeVersion.status).toBe(WorkflowStatus.DRAFT);
    });
  });

  describe('saveDraft (Auto-forking)', () => {
    it('should auto-fork a new DRAFT version when modifying a published workflow', async () => {
      // Mock workflow where only version 1 exists and is already PUBLISHED
      prisma.workflow.findFirst.mockResolvedValue({
        id: 'wf-1',
        workspaceId: 'ws-1',
        versions: [
          {
            id: 'v-1',
            versionNumber: 1,
            status: WorkflowStatus.PUBLISHED,
          },
        ],
      });

      prisma.workflowVersion.create.mockResolvedValue({
        id: 'v-2',
        workflowId: 'wf-1',
        versionNumber: 2,
        status: WorkflowStatus.DRAFT,
      });

      prisma.workflowVersion.findUniqueOrThrow.mockResolvedValue({
        id: 'v-2',
        versionNumber: 2,
        status: WorkflowStatus.DRAFT,
        nodes: [{ nodeKey: 'trigger-1', type: NodeType.TRIGGER }],
        edges: [],
      });

      const draftDto = {
        nodes: [{ nodeKey: 'trigger-1', type: NodeType.TRIGGER }],
        edges: [],
      };

      const result = await service.saveDraft('ws-1', 'wf-1', draftDto);

      // Verify that versionNumber 2 was created without mutating version 1
      expect(prisma.workflowVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            versionNumber: 2,
            status: WorkflowStatus.DRAFT,
          }),
        }),
      );
      expect(result.versionNumber).toBe(2);
    });
  });

  describe('publish', () => {
    it('should reject publishing an invalid graph (e.g. cycle)', async () => {
      prisma.workflow.findFirst.mockResolvedValue({
        id: 'wf-1',
        workspaceId: 'ws-1',
        versions: [
          {
            id: 'v-1',
            versionNumber: 1,
            status: WorkflowStatus.DRAFT,
            nodes: [
              { nodeKey: 'trigger-1', type: NodeType.TRIGGER },
              { nodeKey: 'a', type: NodeType.ACTION },
            ],
            edges: [
              { sourceNode: 'trigger-1', targetNode: 'a' },
              { sourceNode: 'a', targetNode: 'a' }, // invalid self-loop!
            ],
          },
        ],
      });

      await expect(service.publish('ws-1', 'wf-1')).rejects.toThrow(BadRequestException);
    });

    it('should publish valid draft and archive existing published version', async () => {
      prisma.workflow.findFirst.mockResolvedValue({
        id: 'wf-1',
        workspaceId: 'ws-1',
        versions: [
          {
            id: 'v-2',
            versionNumber: 2,
            status: WorkflowStatus.DRAFT,
            nodes: [
              { nodeKey: 'trigger-1', type: NodeType.TRIGGER },
              { nodeKey: 'action-1', type: NodeType.ACTION },
            ],
            edges: [{ sourceNode: 'trigger-1', targetNode: 'action-1' }],
          },
        ],
      });

      prisma.workflowVersion.update.mockResolvedValue({
        id: 'v-2',
        versionNumber: 2,
        status: WorkflowStatus.PUBLISHED,
        checksum: 'mock-sha256',
      });

      const published = await service.publish('ws-1', 'wf-1');

      // Verify previous published versions are archived
      expect(prisma.workflowVersion.updateMany).toHaveBeenCalledWith({
        where: { workflowId: 'wf-1', status: WorkflowStatus.PUBLISHED },
        data: { status: WorkflowStatus.ARCHIVED },
      });

      // Verify draft is promoted with checksum
      expect(prisma.workflowVersion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'v-2' },
          data: expect.objectContaining({
            status: WorkflowStatus.PUBLISHED,
          }),
        }),
      );
      expect(published.status).toBe(WorkflowStatus.PUBLISHED);
    });
  });
});
