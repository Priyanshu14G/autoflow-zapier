import { Test, TestingModule } from '@nestjs/testing';
import { ApiKeysService } from './api-keys.service';
import { PrismaService } from '@libs/database';
import { AuditLogService } from '@libs/common';
import {
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'crypto';

describe('ApiKeysService', () => {
  let service: ApiKeysService;
  let prismaMock: {
    apiKey: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    workspace: {
      findUnique: jest.Mock;
    };
  };
  let auditLogServiceMock: {
    log: jest.Mock;
  };

  beforeEach(async () => {
    prismaMock = {
      apiKey: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      workspace: {
        findUnique: jest.fn().mockResolvedValue({ organizationId: 'org_1' }),
      },
    };

    auditLogServiceMock = {
      log: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeysService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditLogService, useValue: auditLogServiceMock },
      ],
    }).compile();

    service = module.get<ApiKeysService>(ApiKeysService);
  });

  describe('create', () => {
    it('creates an API key, hashes it, logs audit, and returns raw key', async () => {
      const now = new Date();
      prismaMock.apiKey.create.mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'key_123',
          workspaceId: data.workspaceId,
          userId: data.userId,
          name: data.name,
          keyPrefix: data.keyPrefix,
          keyHash: data.keyHash,
          expiresAt: data.expiresAt,
          createdAt: now,
        }),
      );

      const result = await service.create('ws_1', 'user_1', {
        name: 'CI/CD Key',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      });

      expect(result.id).toBe('key_123');
      expect(result.name).toBe('CI/CD Key');
      expect(result.key).toMatch(/^af_[a-f0-9]{8}_[a-f0-9]{64}$/);
      expect(result.keyPrefix).toBe(result.key.split('_')[1]);
      expect(prismaMock.apiKey.create).toHaveBeenCalled();
      expect(auditLogServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org_1',
          action: 'API_KEY_CREATED',
        }),
      );
    });
  });

  describe('list', () => {
    it('returns all unrevoked keys for a workspace', async () => {
      const keysList = [
        { id: 'k1', name: 'Key 1', keyPrefix: 'abc12345', isRevoked: false },
      ];
      prismaMock.apiKey.findMany.mockResolvedValue(keysList);

      const result = await service.list('ws_1');
      expect(result).toEqual(keysList);
      expect(prismaMock.apiKey.findMany).toHaveBeenCalledWith({
        where: { workspaceId: 'ws_1', isRevoked: false },
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('revoke', () => {
    it('revokes an active API key and logs audit event', async () => {
      prismaMock.apiKey.findFirst.mockResolvedValue({
        id: 'key_1',
        workspaceId: 'ws_1',
        isRevoked: false,
      });
      prismaMock.apiKey.update.mockResolvedValue({
        id: 'key_1',
        isRevoked: true,
      });

      const result = await service.revoke('ws_1', 'key_1');
      expect(result).toEqual({ message: 'API key revoked' });
      expect(prismaMock.apiKey.update).toHaveBeenCalledWith({
        where: { id: 'key_1' },
        data: { isRevoked: true },
      });
      expect(auditLogServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'API_KEY_REVOKED' }),
      );
    });

    it('throws NotFoundException if key does not exist', async () => {
      prismaMock.apiKey.findFirst.mockResolvedValue(null);
      await expect(service.revoke('ws_1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException if key is already revoked', async () => {
      prismaMock.apiKey.findFirst.mockResolvedValue({
        id: 'key_revoked',
        workspaceId: 'ws_1',
        isRevoked: true,
      });
      await expect(service.revoke('ws_1', 'key_revoked')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('validate', () => {
    it('validates a correct active key and updates lastUsedAt', async () => {
      const rawKey = 'af_12345678_abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
      const keyHash = createHash('sha256').update(rawKey).digest('hex');

      prismaMock.apiKey.findFirst.mockResolvedValue({
        id: 'key_valid',
        keyHash,
        workspaceId: 'ws_valid',
        userId: 'user_valid',
        expiresAt: null,
      });
      prismaMock.apiKey.update.mockResolvedValue({});

      const result = await service.validate(rawKey);
      expect(result).toEqual({
        workspaceId: 'ws_valid',
        userId: 'user_valid',
      });
    });

    it('throws UnauthorizedException for invalid prefix/format', async () => {
      await expect(service.validate('invalid_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException if key not found in db', async () => {
      prismaMock.apiKey.findFirst.mockResolvedValue(null);
      await expect(
        service.validate('af_12345678_0000000000000000000000000000000000000000000000000000000000000000'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException if hash does not match', async () => {
      prismaMock.apiKey.findFirst.mockResolvedValue({
        id: 'key_wrong_hash',
        keyHash: createHash('sha256').update('different_key').digest('hex'),
        workspaceId: 'ws_1',
        userId: 'user_1',
        expiresAt: null,
      });

      await expect(
        service.validate('af_12345678_0000000000000000000000000000000000000000000000000000000000000000'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException if key is expired', async () => {
      const rawKey = 'af_12345678_abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
      const keyHash = createHash('sha256').update(rawKey).digest('hex');

      prismaMock.apiKey.findFirst.mockResolvedValue({
        id: 'key_expired',
        keyHash,
        workspaceId: 'ws_1',
        userId: 'user_1',
        expiresAt: new Date(Date.now() - 10000), // expired 10s ago
      });

      await expect(service.validate(rawKey)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
