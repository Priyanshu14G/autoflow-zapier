import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@libs/database';
import {
  SubscriptionPlan,
  PLAN_ENTITLEMENTS,
  PlanEntitlements,
} from '@libs/domain';
import { UsageTrackerService, MonthlyUsageSummary } from './usage-tracker.service';

export interface OrganizationEntitlementStatus {
  plan: SubscriptionPlan;
  status: string;
  entitlements: PlanEntitlements;
  usage: MonthlyUsageSummary;
}

@Injectable()
export class EntitlementService {
  private readonly logger = new Logger(EntitlementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usageTracker: UsageTrackerService,
  ) {}

  /**
   * Retrieves active plan for an organization. Defaults to FREE.
   */
  async getPlan(organizationId: string): Promise<SubscriptionPlan> {
    const sub = await this.prisma.subscription.findUnique({
      where: { organizationId },
    });

    if (!sub || sub.status !== 'active') {
      return SubscriptionPlan.FREE;
    }

    const plan = sub.plan.toUpperCase();
    if (plan === 'PRO') return SubscriptionPlan.PRO;
    if (plan === 'BUSINESS') return SubscriptionPlan.BUSINESS;
    return SubscriptionPlan.FREE;
  }

  /**
   * Full entitlement status: current plan, limits, and real-time monthly usage.
   */
  async getStatus(organizationId: string): Promise<OrganizationEntitlementStatus> {
    const sub = await this.prisma.subscription.findUnique({
      where: { organizationId },
    });

    const rawPlan = sub && sub.status === 'active'
      ? (sub.plan.toUpperCase() as SubscriptionPlan)
      : SubscriptionPlan.FREE;

    const resolvedPlan = PLAN_ENTITLEMENTS[rawPlan] ? rawPlan : SubscriptionPlan.FREE;
    const entitlements = PLAN_ENTITLEMENTS[resolvedPlan];
    const usage = await this.usageTracker.getMonthlyUsage(organizationId);

    return {
      plan: resolvedPlan,
      status: sub?.status ?? 'active',
      entitlements,
      usage,
    };
  }

  /**
   * Verifies if workflow execution can proceed under task limits.
   */
  async canExecuteWorkflow(organizationId: string): Promise<{ allowed: boolean; reason?: string }> {
    const status = await this.getStatus(organizationId);
    const { maxTasksPerMonth } = status.entitlements;

    if (maxTasksPerMonth !== -1 && status.usage.stepRuns >= maxTasksPerMonth) {
      return {
        allowed: false,
        reason: `Monthly task execution quota exceeded (${status.usage.stepRuns}/${maxTasksPerMonth} steps). Upgrade to Pro or Business.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Verifies if a new workflow can be created under organization workflow limits.
   */
  async canCreateWorkflow(organizationId: string): Promise<{ allowed: boolean; reason?: string }> {
    const status = await this.getStatus(organizationId);
    const { maxWorkflows } = status.entitlements;

    if (maxWorkflows === -1) {
      return { allowed: true };
    }

    const currentCount = await this.prisma.workflow.count({
      where: {
        workspace: { organizationId },
      },
    });

    if (currentCount >= maxWorkflows) {
      return {
        allowed: false,
        reason: `Maximum workflow limit reached for ${status.plan} plan (${currentCount}/${maxWorkflows}). Upgrade to create more workflows.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Verifies if an integration is permitted on the organization's plan.
   */
  async canUseIntegration(organizationId: string, integration: string): Promise<boolean> {
    const plan = await this.getPlan(organizationId);
    const entitlements = PLAN_ENTITLEMENTS[plan];

    if (entitlements.availableIntegrations.includes('*')) {
      return true;
    }

    return entitlements.availableIntegrations.includes(integration.toLowerCase());
  }
}
