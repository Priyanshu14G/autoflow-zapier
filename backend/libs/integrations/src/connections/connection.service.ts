import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@libs/database';
import { EncryptionService } from '../encryption/encryption.service';
import { Prisma } from '@prisma/client';

export interface CreateConnectionDto {
  integration: string;
  name: string;
  authType: string;
  credentials: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  expiresAt?: Date | string;
}

export interface ConnectionSummary {
  id: string;
  workspaceId: string;
  integration: string;
  name: string;
  authType: string;
  expiresAt: Date | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DecryptedConnection extends ConnectionSummary {
  credentials: Record<string, unknown>;
}

@Injectable()
export class ConnectionService {
  private readonly logger = new Logger(ConnectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  /**
   * Stores a new integration connection with AES-256-GCM encrypted credentials.
   */
  async createConnection(
    workspaceId: string,
    dto: CreateConnectionDto,
  ): Promise<ConnectionSummary> {
    const encrypted = this.encryption.encrypt(dto.credentials);

    const record = await this.prisma.connection.create({
      data: {
        workspaceId,
        integration: dto.integration,
        name: dto.name,
        authType: dto.authType,
        credentials: encrypted.ciphertext,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        metadata: (dto.metadata || {}) as Prisma.InputJsonObject,
      },
    });

    this.logger.log(`Created connection ${record.id} for integration ${dto.integration} in workspace ${workspaceId}`);

    return this.toSummary(record);
  }

  /**
   * Lists connections for a workspace (sanitized, omitting secret credentials).
   */
  async listConnections(
    workspaceId: string,
    integration?: string,
  ): Promise<ConnectionSummary[]> {
    const where: Prisma.ConnectionWhereInput = { workspaceId };
    if (integration) {
      where.integration = integration;
    }

    const records = await this.prisma.connection.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r) => this.toSummary(r));
  }

  /**
   * Retrieves sanitized connection details for a workspace.
   */
  async getConnection(workspaceId: string, id: string): Promise<ConnectionSummary> {
    const record = await this.prisma.connection.findFirst({
      where: { id, workspaceId },
    });

    if (!record) {
      throw new NotFoundException(`Connection '${id}' not found in workspace`);
    }

    return this.toSummary(record);
  }

  /**
   * Retrieves connection with decrypted credentials for worker step execution.
   */
  async getDecryptedConnection(
    workspaceId: string,
    id: string,
  ): Promise<DecryptedConnection> {
    const record = await this.prisma.connection.findFirst({
      where: { id, workspaceId },
    });

    if (!record) {
      throw new NotFoundException(`Connection '${id}' not found in workspace`);
    }

    const decrypted = this.encryption.decrypt<Record<string, unknown>>({
      ciphertext: record.credentials,
      iv: record.iv,
      authTag: record.authTag,
    });

    return {
      ...this.toSummary(record),
      credentials: decrypted,
    };
  }

  /**
   * Deletes a connection scoped to a workspace.
   */
  async deleteConnection(workspaceId: string, id: string): Promise<void> {
    const record = await this.prisma.connection.findFirst({
      where: { id, workspaceId },
    });

    if (!record) {
      throw new NotFoundException(`Connection '${id}' not found in workspace`);
    }

    await this.prisma.connection.delete({
      where: { id: record.id },
    });

    this.logger.log(`Deleted connection ${id} in workspace ${workspaceId}`);
  }

  private toSummary(record: {
    id: string;
    workspaceId: string;
    integration: string;
    name: string;
    authType: string;
    expiresAt: Date | null;
    metadata: unknown;
    createdAt: Date;
    updatedAt: Date;
  }): ConnectionSummary {
    return {
      id: record.id,
      workspaceId: record.workspaceId,
      integration: record.integration,
      name: record.name,
      authType: record.authType,
      expiresAt: record.expiresAt,
      metadata: (record.metadata as Record<string, unknown>) || null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
