import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Inject,
  Optional,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { API_KEYS_VALIDATOR, IApiKeyValidator } from './api-key-auth.guard';

/**
 * JwtOrApiKeyAuthGuard supports dual authentication:
 *  1. If Authorization header starts with 'Bearer af_', validates using API key validator.
 *  2. Otherwise, delegates to Passport's 'jwt' strategy.
 *
 * This allows endpoints (e.g. workflow trigger/execute) to be invoked seamlessly
 * either by web UI sessions (via JWT) or by automated scripts/external webhooks (via API keys).
 */
@Injectable()
export class JwtOrApiKeyAuthGuard extends AuthGuard('jwt') {
  constructor(
    @Optional()
    @Inject(API_KEYS_VALIDATOR)
    private readonly apiKeyValidator?: IApiKeyValidator,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (authHeader?.startsWith('Bearer af_')) {
      if (!this.apiKeyValidator) {
        throw new UnauthorizedException('API key authentication is not configured');
      }

      const rawKey = authHeader.slice('Bearer '.length).trim();
      const { userId, workspaceId } = await this.apiKeyValidator.validate(rawKey);

      // Attach user context matching JwtAuthGuard output shape
      (request as Request & { user: Record<string, unknown> }).user = {
        id: userId,
        workspaceId,
      };

      return true;
    }

    return super.canActivate(context) as Promise<boolean>;
  }

  handleRequest<TUser = unknown>(
    err: unknown,
    user: unknown,
    _info: unknown,
    _context: ExecutionContext,
  ): TUser {
    if (err || !user) {
      if (err instanceof Error) {
        throw err;
      }
      throw new UnauthorizedException('Authentication token is missing or invalid');
    }
    return user as TUser;
  }
}
