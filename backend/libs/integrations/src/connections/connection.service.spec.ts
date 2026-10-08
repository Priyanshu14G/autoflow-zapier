import { ConnectionService } from './connection.service';
import { EncryptionService } from '../encryption/encryption.service';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';

describe('ConnectionService', () => {
  let service: ConnectionService;
  let encryptionService: EncryptionService;
  let prismaMock: any;

  beforeEach(() => {
    encryptionService = new EncryptionService(
      new ConfigService({ ENCRYPTION_KEY: 'test-encryption-key-for-connections-spec' }),
    );

    prismaMock = {
      connection: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
    };

    service = new ConnectionService(prismaMock, encryptionService);
  });

  it('should encrypt credentials and create a connection', async () => {
    const rawCredentials = { apiKey: 'secret-key-123' };
    prismaMock.connection.create.mockImplementation(({ data }: any) => ({
      id: 'conn_1',
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const result = await service.createConnection('ws_1', {
      integration: 'http',
      name: 'Production API',
      authType: 'API_KEY',
      credentials: rawCredentials,
      metadata: { env: 'prod' },
    });

    expect(result.id).toBe('conn_1');
    expect(result.name).toBe('Production API');
    expect(prismaMock.connection.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          workspaceId: 'ws_1',
          integration: 'http',
          authType: 'API_KEY',
          iv: expect.any(String),
          authTag: expect.any(String),
          credentials: expect.any(Buffer),
        }),
      }),
    );
  });

  it('should retrieve and decrypt connection credentials for worker execution', async () => {
    const rawCredentials = { token: 'oauth-token-abc' };
    const encrypted = encryptionService.encrypt(rawCredentials);

    prismaMock.connection.findFirst.mockResolvedValue({
      id: 'conn_1',
      workspaceId: 'ws_1',
      integration: 'slack',
      name: 'Slack Bot',
      authType: 'BEARER_TOKEN',
      credentials: encrypted.ciphertext,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      metadata: { team: 'Engineering' },
      expiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const decrypted = await service.getDecryptedConnection('ws_1', 'conn_1');

    expect(decrypted.id).toBe('conn_1');
    expect(decrypted.credentials).toEqual(rawCredentials);
  });

  it('should throw NotFoundException if connection is not in workspace', async () => {
    prismaMock.connection.findFirst.mockResolvedValue(null);

    await expect(
      service.getDecryptedConnection('ws_other', 'conn_1'),
    ).rejects.toThrow(NotFoundException);
  });
});
