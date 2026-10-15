import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
  Logger,
  Optional,
} from '@nestjs/common';
import { randomBytes, createHash, timingSafeEqual } from 'crypto';
import { PrismaService } from '@libs/database';
import { AuditLogService } from '@libs/common';
import { CreateApiKeyDto } from './dto/api-key.dto';

const KEY_PREFIX_LENGTH = 8;
const KEY_BYTES = 32; // 64 hex chars of entropy

@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly auditLogService?: AuditLogService,
  ) {}

  /**
   * Generates a new API key.
   *
   * Format: `af_{prefix}_{randomHex}`
   *   - af_ — product namespace
   *   - prefix (8 chars) — stored in plaintext for lookup
   *   - randomHex (64 chars) — full entropy, SHA-256 hashed for storage
   *
   * The full raw key is returned ONCE at creation and never stored.
   */
  async create(workspaceId: string, userId: string, dto: CreateApiKeyDto) {
    const rawRandom = randomBytes(KEY_BYTES).toString('hex');
    const prefix = rawRandom.slice(0, KEY_PREFIX_LENGTH);
    const rawKey = `af_${prefix}_${rawRandom}`;
    const keyHash = createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await this.prisma.apiKey.create({
      data: {
        workspaceId,
        userId,
        name: dto.name,
        keyPrefix: prefix,
        keyHash,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    this.logger.log(`API key '${dto.name}' created for workspace ${workspaceId} (prefix: ${prefix})`);

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { organizationId: true },
    });
    if (workspace) {
      this.auditLogService?.log({
        organizationId: workspace.organizationId,
        userId,
        action: 'API_KEY_CREATED',
        entityType: 'API_KEY',
        entityId: apiKey.id,
        metadata: { name: apiKey.name, prefix },
      });
    }

    // Return the full raw key exactly once
    return {
      id: apiKey.id,
      workspaceId: apiKey.workspaceId,
      name: apiKey.name,
      keyPrefix: prefix,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
      // Full key returned only at creation — never retrievable again
      key: rawKey,
    };
  }

  async list(workspaceId: string) {
    const keys = await this.prisma.apiKey.findMany({
      where: { workspaceId, isRevoked: false },
      select: {
        id: true,
        workspaceId: true,
        userId: true,
        name: true,
        keyPrefix: true,
        lastUsedAt: true,
        expiresAt: true,
        isRevoked: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return keys;
  }

  async revoke(workspaceId: string, keyId: string) {
    const key = await this.prisma.apiKey.findFirst({
      where: { id: keyId, workspaceId },
    });
    if (!key) {
      throw new NotFoundException(`API key '${keyId}' not found in this workspace`);
    }
    if (key.isRevoked) {
      throw new ForbiddenException('API key is already revoked');
    }

    await this.prisma.apiKey.update({
      where: { id: keyId },
      data: { isRevoked: true },
    });

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { organizationId: true },
    });
    if (workspace) {
      this.auditLogService?.log({
        organizationId: workspace.organizationId,
        action: 'API_KEY_REVOKED',
        entityType: 'API_KEY',
        entityId: keyId,
      });
    }

    this.logger.log(`API key ${keyId} revoked in workspace ${workspaceId}`);
    return { message: 'API key revoked' };
  }

  /**
   * Validates a raw API key from an incoming Authorization header.
   * Returns the associated workspace ID and user ID on success.
   * Throws UnauthorizedException on any failure.
   *
   * This method is called by ApiKeyAuthGuard and must be timing-safe.
   */
  async validate(rawKey: string): Promise<{ workspaceId: string; userId: string }> {
    // Extract prefix from format: af_{prefix}_{randomHex}
    const parts = rawKey.split('_');
    if (parts.length < 3 || parts[0] !== 'af') {
      throw new UnauthorizedException('Invalid API key format');
    }

    const prefix = parts[1];
    const candidate = createHash('sha256').update(rawKey).digest('hex');

    const record = await this.prisma.apiKey.findFirst({
      where: {
        keyPrefix: prefix,
        isRevoked: false,
      },
      select: {
        id: true,
        keyHash: true,
        workspaceId: true,
        userId: true,
        expiresAt: true,
      },
    });

    if (!record) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Timing-safe comparison
    let valid = false;
    try {
      valid = timingSafeEqual(
        Buffer.from(candidate, 'hex'),
        Buffer.from(record.keyHash, 'hex'),
      );
    } catch {
      valid = false;
    }

    if (!valid) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (record.expiresAt && record.expiresAt < new Date()) {
      throw new UnauthorizedException('API key has expired');
    }

    // Async update of lastUsedAt — fire and forget, don't block the request
    void this.prisma.apiKey.update({
      where: { id: record.id },
      data: { lastUsedAt: new Date() },
    }).catch((err: unknown) => {
      this.logger.warn(`Failed to update lastUsedAt for API key ${record.id}: ${String(err)}`);
    });

    return { workspaceId: record.workspaceId, userId: record.userId };
  }
}
