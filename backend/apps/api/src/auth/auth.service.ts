import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
  Optional,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { PrismaService } from '@libs/database';
import { Role } from '@libs/domain';
import { AuditLogService } from '@libs/common';
import { RegisterDto, LoginDto, GoogleAuthDto, AuthResponseDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    @Optional() private readonly auditLogService?: AuditLogService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await argon2.hash(dto.password);
    const orgName = dto.organizationName || `${dto.firstName || 'Personal'}'s Org`;
    const orgSlug = `${orgName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${randomBytes(3).toString('hex')}`;
    const workspaceSlug = `default-${randomBytes(3).toString('hex')}`;

    // Execute atomic transaction for user and workspace provisioning
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
        },
      });

      const organization = await tx.organization.create({
        data: {
          name: orgName,
          slug: orgSlug,
        },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: Role.OWNER,
        },
      });

      const workspace = await tx.workspace.create({
        data: {
          organizationId: organization.id,
          name: 'Main Workspace',
          slug: workspaceSlug,
        },
      });

      return { user, organization, workspace };
    });

    const accessToken = this.generateToken(result.user.id, result.user.email);

    this.auditLogService?.log({
      organizationId: result.organization.id,
      userId: result.user.id,
      action: 'USER_REGISTERED',
      entityType: 'USER',
      entityId: result.user.id,
      metadata: { email: result.user.email },
    });

    return {
      accessToken,
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
      },
      defaultWorkspaceId: result.workspace.id,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: {
        memberships: {
          include: {
            organization: {
              include: {
                workspaces: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.passwordHash || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = this.generateToken(user.id, user.email);
    const defaultWorkspaceId =
      user.memberships[0]?.organization?.workspaces[0]?.id;

    if (user.memberships[0]?.organizationId) {
      this.auditLogService?.log({
        organizationId: user.memberships[0].organizationId,
        userId: user.id,
        action: 'USER_LOGIN',
        entityType: 'USER',
        entityId: user.id,
      });
    }

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      defaultWorkspaceId,
    };
  }

  async googleAuth(dto: GoogleAuthDto): Promise<AuthResponseDto> {
    const email = dto.email?.toLowerCase();
    if (!email) {
      throw new UnauthorizedException('Email is required for Google OAuth');
    }

    let user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          include: {
            organization: {
              include: {
                workspaces: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      const orgName = `${dto.firstName || 'Personal'}'s Org`;
      const orgSlug = `${orgName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${randomBytes(3).toString('hex')}`;
      const workspaceSlug = `default-${randomBytes(3).toString('hex')}`;

      user = await this.prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email,
            firstName: dto.firstName,
            lastName: dto.lastName,
          },
        });

        const org = await tx.organization.create({
          data: {
            name: orgName,
            slug: orgSlug,
          },
        });

        await tx.organizationMember.create({
          data: {
            organizationId: org.id,
            userId: newUser.id,
            role: Role.OWNER,
          },
        });

        await tx.workspace.create({
          data: {
            organizationId: org.id,
            name: 'Main Workspace',
            slug: workspaceSlug,
          },
        });

        return tx.user.findUniqueOrThrow({
          where: { id: newUser.id },
          include: {
            memberships: {
              include: {
                organization: {
                  include: {
                    workspaces: true,
                  },
                },
              },
            },
          },
        });
      });
    }

    const accessToken = this.generateToken(user.id, user.email);
    const defaultWorkspaceId =
      user.memberships[0]?.organization?.workspaces[0]?.id;

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      defaultWorkspaceId,
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
        memberships: {
          select: {
            role: true,
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                workspaces: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  private generateToken(userId: string, email: string): string {
    return this.jwtService.sign({
      sub: userId,
      email,
    });
  }
}
