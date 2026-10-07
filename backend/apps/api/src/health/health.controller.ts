import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorResult,
  HealthIndicator,
} from '@nestjs/terminus';
import { PrismaService } from '@libs/database';

class PrismaHealthIndicator extends HealthIndicator {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return this.getStatus(key, true);
    } catch (error) {
      return this.getStatus(key, false, {
        message: error instanceof Error ? error.message : 'Database ping failed',
      });
    }
  }
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly prismaHealth: PrismaHealthIndicator;

  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaService,
  ) {
    this.prismaHealth = new PrismaHealthIndicator(prisma);
  }

  @Get()
  @ApiOperation({ summary: 'Liveness check' })
  @ApiResponse({ status: 200, description: 'Application is running' })
  checkLiveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness check verifying database connectivity' })
  @ApiResponse({ status: 200, description: 'Application dependencies are ready' })
  checkReadiness() {
    return this.health.check([
      () => this.prismaHealth.isHealthy('database'),
    ]);
  }
}
