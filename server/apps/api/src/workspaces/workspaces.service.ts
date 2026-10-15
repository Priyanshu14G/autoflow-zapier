import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '@libs/database';
import { CreateWorkspaceDto, UpdateWorkspaceDto } from './dto/workspace.dto';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateWorkspaceDto) {
    const slug =
      dto.slug?.toLowerCase().replace(/[^a-z0-9]/g, '-') ||
      `${dto.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${randomBytes(3).toString('hex')}`;

    const existingSlug = await this.prisma.workspace.findUnique({
      where: {
        organizationId_slug: {
          organizationId: dto.organizationId,
          slug,
        },
      },
    });

    if (existingSlug) {
      throw new ConflictException(
        `Workspace with slug '${slug}' already exists in this organization`,
      );
    }

    return this.prisma.workspace.create({
      data: {
        organizationId: dto.organizationId,
        name: dto.name,
        slug,
      },
    });
  }

  async listByOrg(orgId: string) {
    return this.prisma.workspace.findMany({
      where: { organizationId: orgId },
      include: {
        _count: {
          select: {
            workflows: true,
            connections: true,
            webhooks: true,
            apiKeys: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getById(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            workflows: true,
            connections: true,
            webhooks: true,
            apiKeys: true,
          },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace '${workspaceId}' not found`);
    }

    return workspace;
  }

  async update(workspaceId: string, dto: UpdateWorkspaceDto) {
    return this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
      },
    });
  }

  async delete(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException(`Workspace '${workspaceId}' not found`);
    }

    // Protect last workspace in organization from accidental removal
    const count = await this.prisma.workspace.count({
      where: { organizationId: workspace.organizationId },
    });

    if (count <= 1) {
      throw new BadRequestException('Cannot delete the only workspace in an organization');
    }

    await this.prisma.workspace.delete({
      where: { id: workspaceId },
    });

    return { message: 'Workspace deleted successfully' };
  }
}
