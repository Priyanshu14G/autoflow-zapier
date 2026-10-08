import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * Abstract interface that the ApiKeyAuthGuard depends on.
 * The concrete implementation (ApiKeysService) is injected via the
 * API_KEYS_VALIDATOR token to avoid circular imports between libs/common
 * and apps/api.
 */
export interface IApiKeyValidator {
  validate(rawKey: string): Promise<{ workspaceId: string; userId: string }>;
}

export const API_KEYS_VALIDATOR = 'API_KEYS_VALIDATOR';

/**
 * ApiKeyAuthGuard validates Bearer tokens that follow the `af_` prefix format.
 *
 * To use this guard, register ApiKeysService as the API_KEYS_VALIDATOR token:
 *
 *   providers: [
 *     ApiKeysService,
 *     { provide: API_KEYS_VALIDATOR, useExisting: ApiKeysService },
 *   ]
 *
 * The guard attaches `request.user` in the same shape as JwtAuthGuard so that
 * downstream guards and decorators (e.g. TenantGuard, @CurrentUser) work
 * without modification.
 */
@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(
    @Inject(API_KEYS_VALIDATOR) private readonly apiKeyValidator: IApiKeyValidator,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or malformed Authorization header');
    }

    const rawKey = authHeader.slice('Bearer '.length).trim();

    // Only intercept af_-prefixed keys; let JWT pass through if this guard is not needed
    if (!rawKey.startsWith('af_')) {
      throw new UnauthorizedException('Invalid API key format');
    }

    const { userId, workspaceId } = await this.apiKeyValidator.validate(rawKey);

    // Attach user context — compatible with JwtAuthGuard's output shape
    (request as Request & { user: Record<string, unknown> }).user = {
      id: userId,
      workspaceId,
    };

    return true;
  }
}
