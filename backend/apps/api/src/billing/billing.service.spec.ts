import { Test, TestingModule } from '@nestjs/testing';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { PrismaService } from '@libs/database';
import { EntitlementService, AuditLogService } from '@libs/common';
import { SubscriptionPlan } from '@libs/domain';
import { BadRequestException } from '@nestjs/common';

describe('BillingService & BillingController', () => {
  let service: BillingService;
  let controller: BillingController;

  let prismaMock: {
    subscription: {
      upsert: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };

  let entitlementServiceMock: {
    getStatus: jest.Mock;
  };

  let auditLogServiceMock: {
    log: jest.Mock;
  };

  beforeEach(async () => {
    prismaMock = {
      subscription: {
        upsert: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    entitlementServiceMock = {
      getStatus: jest.fn().mockResolvedValue({
        plan: SubscriptionPlan.FREE,
        status: 'active',
        entitlements: {},
        usage: {},
      }),
    };

    auditLogServiceMock = {
      log: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BillingController],
      providers: [
        BillingService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: EntitlementService, useValue: entitlementServiceMock },
        { provide: AuditLogService, useValue: auditLogServiceMock },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
    controller = module.get<BillingController>(BillingController);
  });

  describe('getBillingStatus', () => {
    it('delegates status retrieval to EntitlementService', async () => {
      const res = await service.getBillingStatus('org_1');
      expect(entitlementServiceMock.getStatus).toHaveBeenCalledWith('org_1');
      expect(res.plan).toBe(SubscriptionPlan.FREE);
    });

    it('controller endpoint calls service', async () => {
      const res = await controller.getBillingStatus('org_1');
      expect(res.plan).toBe(SubscriptionPlan.FREE);
    });
  });

  describe('upgradePlan', () => {
    it('upserts subscription and logs audit event', async () => {
      prismaMock.subscription.upsert.mockResolvedValue({
        id: 'sub_new',
        organizationId: 'org_1',
        plan: SubscriptionPlan.PRO,
        status: 'active',
      });

      await service.upgradePlan('org_1', SubscriptionPlan.PRO, 'user_admin');

      expect(prismaMock.subscription.upsert).toHaveBeenCalledWith({
        where: { organizationId: 'org_1' },
        create: { organizationId: 'org_1', plan: SubscriptionPlan.PRO, status: 'active' },
        update: { plan: SubscriptionPlan.PRO, status: 'active' },
      });

      expect(auditLogServiceMock.log).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org_1',
          action: 'SUBSCRIPTION_UPDATED',
          metadata: { plan: SubscriptionPlan.PRO },
        }),
      );
    });

    it('throws BadRequestException for invalid plan', async () => {
      await expect(
        service.upgradePlan('org_1', 'ULTRA_INVALID' as SubscriptionPlan),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('handleStripeWebhook', () => {
    it('updates subscription status on customer webhook match', async () => {
      prismaMock.subscription.findFirst.mockResolvedValue({
        id: 'sub_1',
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_old',
      });
      prismaMock.subscription.update.mockResolvedValue({});

      const result = await service.handleStripeWebhook({
        type: 'customer.subscription.updated',
        data: {
          object: {
            customer: 'cus_123',
            id: 'sub_stripe_active',
            status: 'active',
          },
        },
      });

      expect(result).toEqual({ received: true });
      expect(prismaMock.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub_1' },
        data: {
          stripeSubscriptionId: 'sub_stripe_active',
          status: 'active',
        },
      });
    });

    it('sets status to canceled when status is not active or trialing', async () => {
      prismaMock.subscription.findFirst.mockResolvedValue({
        id: 'sub_1',
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_old',
      });
      prismaMock.subscription.update.mockResolvedValue({});

      await service.handleStripeWebhook({
        type: 'customer.subscription.deleted',
        data: {
          object: {
            customer: 'cus_123',
            id: 'sub_stripe_active',
            status: 'canceled',
          },
        },
      });

      expect(prismaMock.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub_1' },
        data: {
          stripeSubscriptionId: 'sub_stripe_active',
          status: 'canceled',
        },
      });
    });

    it('gracefully handles missing object or customer', async () => {
      const res = await service.handleStripeWebhook({ type: 'unknown.event' });
      expect(res).toEqual({ received: true });
      expect(prismaMock.subscription.findFirst).not.toHaveBeenCalled();
    });
  });
});
