import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtOrApiKeyAuthGuard } from './jwt-or-api-key-auth.guard';
import { IApiKeyValidator } from './api-key-auth.guard';

describe('JwtOrApiKeyAuthGuard', () => {
  let guard: JwtOrApiKeyAuthGuard;
  let mockValidator: jest.Mocked<IApiKeyValidator>;

  beforeEach(() => {
    mockValidator = {
      validate: jest.fn(),
    };
    guard = new JwtOrApiKeyAuthGuard(mockValidator);
  });

  const createMockContext = (authHeader?: string): { context: ExecutionContext; req: any } => {
    const req: any = {
      headers: authHeader ? { authorization: authHeader } : {},
    };
    const context = {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => ({}),
      }),
    } as unknown as ExecutionContext;
    return { context, req };
  };

  it('authenticates via API key when Bearer af_ token is provided', async () => {
    mockValidator.validate.mockResolvedValue({
      userId: 'user_123',
      workspaceId: 'ws_456',
    });

    const { context, req } = createMockContext('Bearer af_live_secret123');
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(mockValidator.validate).toHaveBeenCalledWith('af_live_secret123');
    expect(req.user).toEqual({
      id: 'user_123',
      workspaceId: 'ws_456',
    });
  });

  it('throws UnauthorizedException when af_ key is used but validator is not injected', async () => {
    const unconfiguredGuard = new JwtOrApiKeyAuthGuard(undefined);
    const { context } = createMockContext('Bearer af_live_secret123');

    await expect(unconfiguredGuard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('delegates to passport JWT guard when regular Bearer token is provided', async () => {
    const { context } = createMockContext('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    // Mock the super.canActivate call on Passport's AuthGuard
    jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate').mockResolvedValue(true);

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(mockValidator.validate).not.toHaveBeenCalled();
  });
});
