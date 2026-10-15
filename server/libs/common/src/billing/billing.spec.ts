import { UsageTrackerService } from './usage-tracker.service';
import { EntitlementService } from './entitlement.service';
import { UsageMetric, SubscriptionPlan, PLAN_ENTITLEMENTS } from '@libs/domain';

// ── Shared mock factory ───────────────────────────────────────────────────────

function buildPrismaSubscriptionMock(overrides: Partial<{
  plan: string;
  status: string;
}> = {}) {
  const sub = {
    id: 'sub_001',
    organizationId: 'org_test',
    plan: overrides.plan ?? 'FREE',
    status: overrides.status ?? 'active',
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return {
    subscription: {
      findUnique: jest.fn().mockResolvedValue(sub),
    },
    usageRecord: {
      create: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
    },
    workflow: {
      count: jest.fn().mockResolvedValue(0),
    },
  };
}

// ── UsageTrackerService ───────────────────────────────────────────────────────

describe('UsageTrackerService', () => {
  let service: UsageTrackerService;
  let mockPrisma: ReturnType<typeof buildPrismaSubscriptionMock>;

  beforeEach(() => {
    mockPrisma = buildPrismaSubscriptionMock();
    service = new UsageTrackerService(mockPrisma as never);
  });

  describe('getCurrentBillingPeriod', () => {
    it('returns a period starting at the first day of the current UTC month', () => {
      const { periodStart, periodEnd } = service.getCurrentBillingPeriod();
      expect(periodStart.getUTCDate()).toBe(1);
      expect(periodEnd > periodStart).toBe(true);
    });
  });

  describe('recordMetric', () => {
    it('fires-and-forgets a usageRecord.create call', async () => {
      service.recordMetric('org_001', UsageMetric.WORKFLOW_RUNS, 1);
      // Allow microtask to flush
      await new Promise((r) => setImmediate(r));
      expect(mockPrisma.usageRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: 'org_001',
            metric: UsageMetric.WORKFLOW_RUNS,
            quantity: 1,
          }),
        }),
      );
    });

    it('is a no-op when organizationId is empty string', async () => {
      service.recordMetric('', UsageMetric.API_CALLS, 5);
      await new Promise((r) => setImmediate(r));
      expect(mockPrisma.usageRecord.create).not.toHaveBeenCalled();
    });
  });

  describe('recordMetricAndAwait', () => {
    it('awaits the usageRecord.create call', async () => {
      await service.recordMetricAndAwait('org_002', UsageMetric.STEP_RUNS, 3);
      expect(mockPrisma.usageRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metric: UsageMetric.STEP_RUNS,
            quantity: 3,
          }),
        }),
      );
    });
  });

  describe('getMonthlyUsage', () => {
    it('aggregates usage records correctly', async () => {
      const { periodStart, periodEnd } = service.getCurrentBillingPeriod();
      mockPrisma.usageRecord.findMany.mockResolvedValue([
        { metric: UsageMetric.WORKFLOW_RUNS, quantity: 10, periodStart, periodEnd },
        { metric: UsageMetric.STEP_RUNS, quantity: 45, periodStart, periodEnd },
        { metric: UsageMetric.AI_CALLS, quantity: 7, periodStart, periodEnd },
        { metric: UsageMetric.API_CALLS, quantity: 200, periodStart, periodEnd },
        { metric: UsageMetric.EXECUTION_DURATION_MS, quantity: 15000, periodStart, periodEnd },
      ]);

      const summary = await service.getMonthlyUsage('org_003');
      expect(summary.workflowRuns).toBe(10);
      expect(summary.stepRuns).toBe(45);
      expect(summary.aiCalls).toBe(7);
      expect(summary.apiCalls).toBe(200);
      expect(summary.executionDurationMs).toBe(15000);
    });

    it('returns all-zero summary when there are no records', async () => {
      mockPrisma.usageRecord.findMany.mockResolvedValue([]);
      const summary = await service.getMonthlyUsage('org_empty');
      expect(summary.workflowRuns).toBe(0);
      expect(summary.stepRuns).toBe(0);
      expect(summary.aiCalls).toBe(0);
    });
  });
});

// ── EntitlementService ────────────────────────────────────────────────────────

describe('EntitlementService', () => {
  let service: EntitlementService;
  let usageTracker: UsageTrackerService;
  let mockPrisma: ReturnType<typeof buildPrismaSubscriptionMock>;

  function buildService(planOverride?: string, statusOverride?: string) {
    mockPrisma = buildPrismaSubscriptionMock({
      plan: planOverride,
      status: statusOverride,
    });
    usageTracker = new UsageTrackerService(mockPrisma as never);
    service = new EntitlementService(mockPrisma as never, usageTracker);
  }

  beforeEach(() => buildService());

  describe('getPlan', () => {
    it('returns FREE when no subscription exists', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);
      const plan = await service.getPlan('org_no_sub');
      expect(plan).toBe(SubscriptionPlan.FREE);
    });

    it('returns FREE when subscription is canceled', async () => {
      buildService('PRO', 'canceled');
      const plan = await service.getPlan('org_001');
      expect(plan).toBe(SubscriptionPlan.FREE);
    });

    it('returns PRO when subscription is active PRO', async () => {
      buildService('PRO', 'active');
      const plan = await service.getPlan('org_001');
      expect(plan).toBe(SubscriptionPlan.PRO);
    });

    it('returns BUSINESS when subscription is active BUSINESS', async () => {
      buildService('BUSINESS', 'active');
      const plan = await service.getPlan('org_001');
      expect(plan).toBe(SubscriptionPlan.BUSINESS);
    });
  });

  describe('getStatus', () => {
    it('returns FREE plan entitlements for an organization without subscription', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);
      const status = await service.getStatus('org_free');
      expect(status.plan).toBe(SubscriptionPlan.FREE);
      expect(status.entitlements).toEqual(PLAN_ENTITLEMENTS[SubscriptionPlan.FREE]);
    });

    it('returns PRO plan entitlements for active PRO subscription', async () => {
      buildService('PRO', 'active');
      const status = await service.getStatus('org_pro');
      expect(status.plan).toBe(SubscriptionPlan.PRO);
      expect(status.entitlements).toEqual(PLAN_ENTITLEMENTS[SubscriptionPlan.PRO]);
    });
  });

  describe('canExecuteWorkflow', () => {
    it('allows execution when stepRuns is below limit', async () => {
      buildService('FREE', 'active');
      const result = await service.canExecuteWorkflow('org_ok');
      expect(result.allowed).toBe(true);
    });

    it('denies execution when stepRuns equals maxTasksPerMonth', async () => {
      buildService('FREE', 'active');
      const freeLimit = PLAN_ENTITLEMENTS[SubscriptionPlan.FREE].maxTasksPerMonth;
      mockPrisma.usageRecord.findMany.mockResolvedValue([
        { metric: UsageMetric.STEP_RUNS, quantity: freeLimit, periodStart: new Date(), periodEnd: new Date() },
      ]);

      const result = await service.canExecuteWorkflow('org_over_limit');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('quota exceeded');
    });

    it('allows execution on BUSINESS plan when within 500,000 tasks limit', async () => {
      buildService('BUSINESS', 'active');
      mockPrisma.usageRecord.findMany.mockResolvedValue([
        { metric: UsageMetric.STEP_RUNS, quantity: 450000, periodStart: new Date(), periodEnd: new Date() },
      ]);

      const result = await service.canExecuteWorkflow('org_business');
      expect(result.allowed).toBe(true);
    });
  });

  describe('canCreateWorkflow', () => {
    it('allows workflow creation when count is below limit', async () => {
      buildService('FREE', 'active');
      mockPrisma.workflow.count.mockResolvedValue(2);
      const result = await service.canCreateWorkflow('org_few');
      expect(result.allowed).toBe(true);
    });

    it('denies workflow creation when count equals the limit', async () => {
      buildService('FREE', 'active');
      const limit = PLAN_ENTITLEMENTS[SubscriptionPlan.FREE].maxWorkflows;
      mockPrisma.workflow.count.mockResolvedValue(limit);
      const result = await service.canCreateWorkflow('org_full');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Maximum workflow limit reached');
    });

    it('allows unlimited workflows on BUSINESS plan', async () => {
      buildService('BUSINESS', 'active');
      mockPrisma.workflow.count.mockResolvedValue(9999);
      const result = await service.canCreateWorkflow('org_business');
      expect(result.allowed).toBe(true);
    });
  });

  describe('canUseIntegration', () => {
    it('allows all integrations on BUSINESS plan (wildcard)', async () => {
      buildService('BUSINESS', 'active');
      const allowed = await service.canUseIntegration('org_biz', 'salesforce');
      expect(allowed).toBe(true);
    });

    it('returns false for integrations not in FREE plan list', async () => {
      buildService('FREE', 'active');
      const allowed = await service.canUseIntegration('org_free', 'salesforce');
      expect(allowed).toBe(false);
    });
  });
});
