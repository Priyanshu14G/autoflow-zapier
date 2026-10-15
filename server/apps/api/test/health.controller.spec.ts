import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService } from '@nestjs/terminus';
import { HealthController } from '../src/health/health.controller';
import { PrismaService } from '@libs/database';

describe('HealthController', () => {
  let controller: HealthController;

  const mockPrismaService = {
    $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
  };

  const mockHealthCheckService = {
    check: jest.fn().mockImplementation((indicators) => {
      return Promise.all(indicators.map((fn: () => unknown) => fn())).then(() => ({
        status: 'ok',
        info: { database: { status: 'up' } },
        error: {},
        details: { database: { status: 'up' } },
      }));
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return liveness info', () => {
    const result = controller.checkLiveness();
    expect(result.status).toBe('ok');
    expect(result.uptime).toBeGreaterThanOrEqual(0);
  });

  it('should return readiness check', async () => {
    const result = await controller.checkReadiness();
    expect(result.status).toBe('ok');
    expect(result.details.database.status).toBe('up');
  });
});
