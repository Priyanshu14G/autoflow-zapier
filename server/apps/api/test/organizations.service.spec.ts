import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { OrganizationsService } from '../src/organizations/organizations.service';
import { PrismaService } from '@libs/database';
import { AuditLogService } from '@libs/common';


describe('OrganizationsService & Audit Logs', () => {
  let service: OrganizationsService;
  let prisma: any;
  let auditLogService: any;

  beforeEach(async () => {
    prisma = {
      organization: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      organizationMember: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      workspace: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    auditLogService = {
      findByOrganization: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogService, useValue: auditLogService },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
  });

  describe('getAuditLogs', () => {
    it('queries audit logs scoped to the target organization', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          organizationId: 'org-123',
          action: 'WORKFLOW_PUBLISHED',
          entityType: 'WORKFLOW',
          entityId: 'wf-1',
          createdAt: new Date(),
        },
      ];
      auditLogService.findByOrganization.mockResolvedValue(mockLogs);

      const result = await service.getAuditLogs('org-123', {
        entityType: 'WORKFLOW',
        limit: 10,
        offset: 0,
      });

      expect(result).toEqual(mockLogs);
      expect(auditLogService.findByOrganization).toHaveBeenCalledWith('org-123', {
        entityType: 'WORKFLOW',
        userId: undefined,
        limit: 10,
        offset: 0,
      });
    });
  });

  describe('getById', () => {
    it('returns organization details when found', async () => {
      const mockOrg = {
        id: 'org-123',
        name: 'Test Org',
        workspaces: [],
        _count: { members: 2 },
      };
      prisma.organization.findUnique.mockResolvedValue(mockOrg);

      const result = await service.getById('org-123');
      expect(result).toEqual(mockOrg);
    });

    it('throws NotFoundException when organization is not found', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);

      await expect(service.getById('missing-org')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
