import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '@libs/database';
import { Role } from '@libs/domain';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  AddOrganizationMemberDto,
  UpdateOrganizationMemberRoleDto,
} from './dto/organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateOrganizationDto) {
    const slug =
      dto.slug?.toLowerCase().replace(/[^a-z0-9]/g, '-') ||
      `${dto.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${randomBytes(3).toString('hex')}`;

    const existingSlug = await this.prisma.organization.findUnique({
      where: { slug },
    });

    if (existingSlug) {
      throw new ConflictException(`Organization with slug '${slug}' already exists`);
    }

    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: dto.name,
          slug,
        },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          userId,
          role: Role.OWNER,
        },
      });

      const workspace = await tx.workspace.create({
        data: {
          organizationId: org.id,
          name: 'Main Workspace',
          slug: `default-${randomBytes(3).toString('hex')}`,
        },
      });

      return {
        ...org,
        role: Role.OWNER,
        defaultWorkspaceId: workspace.id,
      };
    });
  }

  async listUserOrganizations(userId: string) {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: {
          include: {
            workspaces: {
              select: {
                id: true,
                name: true,
                slug: true,
                createdAt: true,
              },
            },
            _count: {
              select: {
                members: true,
              },
            },
          },
        },
      },
    });

    return memberships.map((m) => ({
      ...m.organization,
      currentUserRole: m.role,
      memberCount: m.organization._count.members,
    }));
  }

  async getById(orgId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        workspaces: true,
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    if (!org) {
      throw new NotFoundException(`Organization '${orgId}' not found`);
    }

    return org;
  }

  async update(orgId: string, dto: UpdateOrganizationDto) {
    return this.prisma.organization.update({
      where: { id: orgId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
      },
    });
  }

  async listMembers(orgId: string) {
    return this.prisma.organizationMember.findMany({
      where: { organizationId: orgId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addMember(orgId: string, dto: AddOrganizationMemberDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      throw new NotFoundException(
        `User with email '${dto.email}' not found. The user must register an account first.`,
      );
    }

    const existingMember = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: user.id,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException('User is already a member of this organization');
    }

    return this.prisma.organizationMember.create({
      data: {
        organizationId: orgId,
        userId: user.id,
        role: dto.role,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async updateMemberRole(
    orgId: string,
    memberUserId: string,
    dto: UpdateOrganizationMemberRoleDto,
  ) {
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: memberUserId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this organization');
    }

    // Protect last owner demotion
    if (member.role === Role.OWNER && dto.role !== Role.OWNER) {
      const ownerCount = await this.prisma.organizationMember.count({
        where: {
          organizationId: orgId,
          role: Role.OWNER,
        },
      });

      if (ownerCount <= 1) {
        throw new BadRequestException('Cannot demote the last remaining OWNER of the organization');
      }
    }

    return this.prisma.organizationMember.update({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: memberUserId,
        },
      },
      data: { role: dto.role },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async removeMember(orgId: string, memberUserId: string) {
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: memberUserId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this organization');
    }

    if (member.role === Role.OWNER) {
      const ownerCount = await this.prisma.organizationMember.count({
        where: {
          organizationId: orgId,
          role: Role.OWNER,
        },
      });

      if (ownerCount <= 1) {
        throw new BadRequestException('Cannot remove the last remaining OWNER of the organization');
      }
    }

    await this.prisma.organizationMember.delete({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId: memberUserId,
        },
      },
    });

    return { message: 'Member removed successfully' };
  }
}
