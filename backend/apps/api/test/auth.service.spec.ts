import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AuthService } from '../src/auth/auth.service';
import { PrismaService } from '@libs/database';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      organization: {
        create: jest.fn(),
      },
      organizationMember: {
        create: jest.fn(),
      },
      workspace: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should register a new user and provision an organization and workspace', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'user-uuid-1',
        email: 'test@example.com',
        firstName: 'Alex',
        lastName: 'Smith',
      });
      prisma.organization.create.mockResolvedValue({
        id: 'org-uuid-1',
        name: "Alex's Org",
        slug: 'alex-org-abc',
      });
      prisma.workspace.create.mockResolvedValue({
        id: 'ws-uuid-1',
        name: 'Main Workspace',
        slug: 'default-xyz',
      });

      const result = await service.register({
        email: 'test@example.com',
        password: 'ValidPassword123!',
        firstName: 'Alex',
        lastName: 'Smith',
      });

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.email).toBe('test@example.com');
      expect(result.defaultWorkspaceId).toBe('ws-uuid-1');
      expect(prisma.organizationMember.create).toHaveBeenCalled();
    });

    it('should reject registration if email is already taken', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing-id', email: 'test@example.com' });

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'ValidPassword123!',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should authenticate user with valid credentials', async () => {
      const hashedPassword = await argon2.hash('Secret123!');
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-uuid-1',
        email: 'test@example.com',
        passwordHash: hashedPassword,
        isActive: true,
        memberships: [
          {
            organization: {
              workspaces: [{ id: 'ws-uuid-1' }],
            },
          },
        ],
      });

      const result = await service.login({
        email: 'test@example.com',
        password: 'Secret123!',
      });

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.user.id).toBe('user-uuid-1');
      expect(result.defaultWorkspaceId).toBe('ws-uuid-1');
    });

    it('should reject login with invalid password', async () => {
      const hashedPassword = await argon2.hash('Secret123!');
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-uuid-1',
        email: 'test@example.com',
        passwordHash: hashedPassword,
        isActive: true,
      });

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
